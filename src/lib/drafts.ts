import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database, EntryType, Tradition } from "@/lib/types";

export interface DraftContent {
  entryType: EntryType | null;
  title: string;
  municipality: string;
  traditionAuthor: string;
  originHistory: string;
  customs: string;
  celebrationConclusion: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  occupation: string;
  independenceParticipation: string;
  achievements: string;
  biographySummary: string;
  personalConclusion: string;
  sources: string;
}

/** A saved, unsent version of a ficha. `id` is the same id the ficha has (or will have) in `traditions`. */
export interface FichaDraft {
  id: string;
  content: DraftContent;
  imagePath: string | null;
  updatedAt: string;
  imageUrl?: string;
}

export type DraftSaveOutcome = "server" | "local";

export const emptyDraftContent: DraftContent = {
  entryType: null,
  title: "",
  municipality: "",
  traditionAuthor: "",
  originHistory: "",
  customs: "",
  celebrationConclusion: "",
  birthDate: "",
  birthPlace: "",
  deathDate: "",
  deathPlace: "",
  occupation: "",
  independenceParticipation: "",
  achievements: "",
  biographySummary: "",
  personalConclusion: "",
  sources: "",
};

const textKeys = (Object.keys(emptyDraftContent) as (keyof DraftContent)[]).filter((key) => key !== "entryType");

export function contentFromTradition(tradition: Tradition): DraftContent {
  return {
    entryType: tradition.entry_type,
    title: tradition.entry_type === "biography" ? tradition.person_name ?? tradition.title : tradition.title,
    municipality: tradition.municipality ?? "",
    traditionAuthor: tradition.tradition_author ?? "",
    originHistory: tradition.celebration_origin_history ?? "",
    customs: tradition.celebration_customs ?? "",
    celebrationConclusion: tradition.celebration_conclusion ?? "",
    birthDate: tradition.birth_date ?? "",
    birthPlace: tradition.birth_place ?? "",
    deathDate: tradition.death_date ?? "",
    deathPlace: tradition.death_place ?? "",
    occupation: tradition.occupation ?? "",
    independenceParticipation: tradition.independence_participation ?? "",
    achievements: tradition.achievements ?? "",
    biographySummary: tradition.biography_summary ?? "",
    personalConclusion: tradition.personal_conclusion ?? "",
    sources: tradition.sources.join(", "),
  };
}

/** Rebuilds trusted content from untrusted JSON (local storage or the jsonb column). */
export function normalizeDraftContent(value: unknown): DraftContent {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const content: DraftContent = { ...emptyDraftContent };
  for (const key of textKeys) {
    const field = source[key];
    if (typeof field === "string") (content[key] as string) = field.slice(0, 4000);
  }
  content.entryType = source.entryType === "celebration" || source.entryType === "biography" ? source.entryType : null;
  return content;
}

export function isDraftContentEmpty(content: DraftContent) {
  return textKeys.every((key) => !(content[key] as string).trim());
}

export function draftTitle(draft: FichaDraft) {
  return draft.content.title.trim() || (draft.content.entryType === "biography" ? "Personaje sin nombre" : draft.content.entryType === "celebration" ? "Celebración sin nombre" : "Ficha sin título");
}

/* ---------- Copia local (respaldo en este dispositivo) ---------- */

const localPrefix = (userId: string) => `ecos-guerrero:borrador:${userId}:`;

export function readLocalDrafts(userId: string): FichaDraft[] {
  try {
    const prefix = localPrefix(userId);
    const drafts: FichaDraft[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null") as Partial<FichaDraft> | null;
      if (!parsed || typeof parsed.id !== "string" || typeof parsed.updatedAt !== "string") continue;
      drafts.push({
        id: parsed.id,
        content: normalizeDraftContent(parsed.content),
        imagePath: typeof parsed.imagePath === "string" ? parsed.imagePath : null,
        updatedAt: parsed.updatedAt,
      });
    }
    return drafts;
  } catch {
    return [];
  }
}

export function writeLocalDraft(userId: string, draft: FichaDraft) {
  try {
    const { id, content, imagePath, updatedAt } = draft;
    window.localStorage.setItem(localPrefix(userId) + id, JSON.stringify({ id, content, imagePath, updatedAt }));
    return true;
  } catch {
    return false;
  }
}

export function removeLocalDraft(userId: string, id: string) {
  try {
    window.localStorage.removeItem(localPrefix(userId) + id);
  } catch {
    // Local storage can be unavailable (private mode); the server copy is the source of truth.
  }
}

/* ---------- Copia en Supabase (disponible desde cualquier dispositivo) ---------- */

type Client = SupabaseClient<Database>;

/** True when the drafts migration has not been applied yet, so drafts stay on this device only. */
export function isMissingDraftsTable(error: PostgrestError | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /could not find the table/i.test(error.message);
}

export async function fetchServerDrafts(client: Client, userId: string) {
  const { data, error } = await client
    .from("tradition_drafts")
    .select("*")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  if (isMissingDraftsTable(error)) return { drafts: [] as FichaDraft[], available: false };
  if (error) throw new Error(`No se pudieron cargar tus borradores: ${error.message}`);
  const drafts: FichaDraft[] = (data ?? []).map((row) => ({
    id: row.id,
    content: normalizeDraftContent(row.content),
    imagePath: row.image_path,
    updatedAt: row.updated_at,
  }));
  return { drafts, available: true };
}

export async function upsertServerDraft(client: Client, userId: string, draft: FichaDraft) {
  const { data, error } = await client
    .from("tradition_drafts")
    .upsert({
      id: draft.id,
      author_id: userId,
      content: { ...draft.content },
      image_path: draft.imagePath,
    })
    .select("updated_at")
    .single();
  if (isMissingDraftsTable(error)) return null;
  if (error) throw new Error(error.message);
  return data.updated_at;
}

export async function deleteServerDraft(client: Client, userId: string, id: string) {
  const { error } = await client.from("tradition_drafts").delete().eq("id", id).eq("author_id", userId);
  if (error && !isMissingDraftsTable(error)) throw new Error(`No se pudo eliminar el borrador: ${error.message}`);
}

/** Keeps the most recent copy of each draft when both the device and the server have one. */
export function mergeDrafts(...lists: FichaDraft[][]) {
  const byId = new Map<string, FichaDraft>();
  for (const draft of lists.flat()) {
    const current = byId.get(draft.id);
    if (!current || Date.parse(draft.updatedAt) > Date.parse(current.updatedAt)) byId.set(draft.id, draft);
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
