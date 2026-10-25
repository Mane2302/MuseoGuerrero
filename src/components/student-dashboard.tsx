"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TraditionForm, type DraftAutosave, type SubmitImage, type TraditionDraft } from "@/components/tradition-form";
import {
  deleteServerDraft,
  draftTitle,
  fetchServerDrafts,
  mergeDrafts,
  readLocalDrafts,
  removeLocalDraft,
  upsertServerDraft,
  writeLocalDraft,
  type DraftSaveOutcome,
  type FichaDraft,
} from "@/lib/drafts";
import { getEntryTypeLabel } from "@/lib/entry-content";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { Tradition, TraditionStatus } from "@/lib/types";

const statusLabels: Record<TraditionStatus, string> = {
  pending: "En revisión",
  approved: "Publicada",
  rejected: "No aprobada",
  changes_requested: "Correcciones solicitadas",
};

/** Matches the RLS policy: students can only resend fichas that have not been approved or rejected. */
const editableStatuses: TraditionStatus[] = ["pending", "changes_requested"];

interface FormTarget {
  key: string;
  /** Id of the ficha being written. New fichas get it up front, so a repeated send cannot create a copy. */
  id: string;
  tradition: Tradition | null;
  draft: FichaDraft | null;
  resumed?: boolean;
}

function newTarget(): FormTarget {
  const id = crypto.randomUUID();
  return { key: id, id, tradition: null, draft: null };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function imageExtension(file: File) {
  return file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
}

export function StudentDashboard({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [traditions, setTraditions] = useState<Tradition[]>([]);
  const [drafts, setDrafts] = useState<FichaDraft[]>([]);
  const [serverDrafts, setServerDrafts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<FormTarget>(newTarget);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const formRef = useRef<HTMLElement>(null);
  const resumedRef = useRef(false);
  /** Last image path persisted for each draft, so a replaced draft image can be removed safely. */
  const savedImagesRef = useRef(new Map<string, string | null>());

  const signImage = useCallback(async (path: string) => {
    if (!supabase) return undefined;
    if (path.startsWith("demo:")) return `/demo-images/${path.slice(5)}`;
    const { data, error } = await supabase.storage.from("tradition-images").createSignedUrl(path, 3600);
    return error ? undefined : data.signedUrl;
  }, [supabase]);

  const loadTraditions = useCallback(async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("traditions")
      .select("*")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`No se pudieron cargar tus fichas: ${error.message}`);
    const withImages = await Promise.all((data ?? []).map(async (tradition) => (
      tradition.image_path ? { ...tradition, image_url: await signImage(tradition.image_path) } : tradition
    )));
    setTraditions(withImages);
    return withImages;
  }, [signImage, supabase, userId]);

  const loadDrafts = useCallback(async (knownTraditions: Tradition[]) => {
    if (!supabase) return [];
    const local = readLocalDrafts(userId);
    let remote: FichaDraft[] = [];
    let available = false;
    try {
      ({ drafts: remote, available } = await fetchServerDrafts(supabase, userId));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "No se pudieron cargar tus borradores.");
    }
    setServerDrafts(available);

    // A copy that only exists on this device and is older than its sent ficha was already submitted.
    const remoteIds = new Set(remote.map((draft) => draft.id));
    const freshLocal = local.filter((draft) => {
      const sent = knownTraditions.find((tradition) => tradition.id === draft.id);
      const stale = !remoteIds.has(draft.id) && sent && Date.parse(sent.updated_at) >= Date.parse(draft.updatedAt);
      if (stale) removeLocalDraft(userId, draft.id);
      return !stale;
    });

    const merged = mergeDrafts(remote, freshLocal);
    for (const draft of merged) savedImagesRef.current.set(draft.id, draft.imagePath);
    setDrafts(merged);

    // Upload copies that were saved on this device while offline, so they reach other devices too.
    if (available) {
      for (const draft of merged) {
        const onServer = remote.find((item) => item.id === draft.id);
        if (!onServer || Date.parse(draft.updatedAt) > Date.parse(onServer.updatedAt)) {
          void upsertServerDraft(supabase, userId, draft).catch(() => undefined);
        }
      }
    }
    return merged;
  }, [supabase, userId]);

  const openDraft = useCallback(async (draft: FichaDraft, tradition: Tradition | null, resumed = false) => {
    const imageUrl = draft.imagePath ? await signImage(draft.imagePath) : undefined;
    setTarget({ key: crypto.randomUUID(), id: draft.id, tradition, draft: { ...draft, imageUrl }, resumed });
  }, [signImage]);

  const loadAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setPageError("");
    let loadedTraditions: Tradition[] = [];
    try {
      loadedTraditions = await loadTraditions();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "No se pudieron cargar tus fichas.");
    }
    const loadedDrafts = await loadDrafts(loadedTraditions);

    // Reopen the latest unsent new ficha so nobody has to look for their work.
    if (!resumedRef.current) {
      resumedRef.current = true;
      const latestNew = loadedDrafts.find((draft) => !loadedTraditions.some((tradition) => tradition.id === draft.id));
      if (latestNew) await openDraft(latestNew, null, true);
    }
    setLoading(false);
  }, [loadDrafts, loadTraditions, openDraft, supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadAll);
  }, [loadAll]);

  function focusForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startNew() {
    setTarget(newTarget());
    setNotice("");
    focusForm();
  }

  async function startEdit(tradition: Tradition) {
    setNotice("");
    const draft = drafts.find((item) => item.id === tradition.id);
    if (draft) await openDraft(draft, tradition);
    else setTarget({ key: crypto.randomUUID(), id: tradition.id, tradition, draft: null });
    focusForm();
  }

  async function continueDraft(draft: FichaDraft) {
    setNotice("");
    await openDraft(draft, null);
    focusForm();
  }

  function isImageInUse(path: string, ignoreDraftId?: string) {
    return traditions.some((tradition) => tradition.image_path === path)
      || drafts.some((draft) => draft.id !== ignoreDraftId && draft.imagePath === path);
  }

  async function removeImageQuietly(path: string | null | undefined, ignoreDraftId?: string) {
    if (!supabase || !path || path.startsWith("demo:") || isImageInUse(path, ignoreDraftId)) return;
    await supabase.storage.from("tradition-images").remove([path]);
  }

  async function saveDraft(draft: FichaDraft): Promise<DraftSaveOutcome> {
    const previousImage = savedImagesRef.current.get(draft.id) ?? null;
    writeLocalDraft(userId, draft);
    setDrafts((current) => mergeDrafts(current.filter((item) => item.id !== draft.id), [draft]));

    let outcome: DraftSaveOutcome = "local";
    if (supabase && serverDrafts) {
      const updatedAt = await upsertServerDraft(supabase, userId, draft);
      if (updatedAt) {
        const saved = { ...draft, updatedAt };
        writeLocalDraft(userId, saved);
        setDrafts((current) => mergeDrafts(current.filter((item) => item.id !== draft.id), [saved]));
        outcome = "server";
      } else {
        setServerDrafts(false);
      }
    }

    savedImagesRef.current.set(draft.id, draft.imagePath);
    if (previousImage && previousImage !== draft.imagePath) await removeImageQuietly(previousImage, draft.id);
    return outcome;
  }

  async function uploadDraftImage(file: File) {
    if (!supabase) throw new Error("Supabase no está configurado.");
    const path = `${userId}/${crypto.randomUUID()}.${imageExtension(file)}`;
    const { error } = await supabase.storage
      .from("tradition-images")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (error) throw new Error(error.message);
    return path;
  }

  async function forgetDraft(id: string) {
    removeLocalDraft(userId, id);
    savedImagesRef.current.delete(id);
    setDrafts((current) => current.filter((draft) => draft.id !== id));
    if (supabase) await deleteServerDraft(supabase, userId, id);
  }

  async function discardDraft(draft: FichaDraft, isEdit: boolean) {
    const question = isEdit
      ? `¿Descartar los cambios sin enviar de “${draftTitle(draft)}”? La ficha enviada no se modifica.`
      : `¿Eliminar el borrador “${draftTitle(draft)}”? Esta acción no se puede deshacer.`;
    if (!window.confirm(question)) return;
    setPageError("");
    try {
      await forgetDraft(draft.id);
      await removeImageQuietly(draft.imagePath, draft.id);
      if (target.id === draft.id) setTarget(newTarget());
      setNotice(isEdit ? "Se descartaron los cambios sin enviar." : "Borrador eliminado.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "No se pudo eliminar el borrador.");
    }
  }

  async function submitFicha(values: TraditionDraft, image: SubmitImage) {
    if (!supabase) throw new Error("Configura Supabase antes de enviar una ficha.");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user || user.id !== userId) throw new Error("La sesión expiró. Inicia sesión nuevamente; tu borrador sigue guardado.");

    const editing = target.tradition;
    const fichaId = target.id;
    const previousDraftImage = savedImagesRef.current.get(fichaId) ?? null;

    let uploadedPath: string | null = null;
    if (image.file) {
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${imageExtension(image.file)}`;
      const { error: uploadError } = await supabase.storage
        .from("tradition-images")
        .upload(uploadedPath, image.file, { contentType: image.file.type, cacheControl: "3600" });
      if (uploadError) throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
    }

    const imagePath = uploadedPath ?? image.path ?? editing?.image_path;
    if (!imagePath) throw new Error("Agrega una imagen para completar la ficha.");

    const row = {
      ...values,
      image_path: imagePath,
      status: "pending" as const,
      review_note: null,
      reviewer_id: null,
      reviewed_at: null,
    };

    let failure: string | null = null;
    let alreadyReceived = false;
    if (editing) {
      const { data, error } = await supabase.from("traditions").update(row).eq("id", editing.id).eq("author_id", user.id).select("id");
      if (error) failure = error.message;
      else if (!data?.length) failure = "esta ficha ya fue revisada y no admite cambios. Pide a tu profesor que solicite correcciones.";
    } else {
      const { error } = await supabase.from("traditions").insert({ ...row, id: fichaId, author_id: user.id });
      if (error?.code === "23505") {
        // The same ficha was already received (double click, retry after a lost connection…): never create a copy.
        alreadyReceived = true;
        await supabase.from("traditions").update(row).eq("id", fichaId).eq("author_id", user.id);
      } else if (error) {
        failure = error.message;
      }
    }

    if (failure) {
      if (uploadedPath) await supabase.storage.from("tradition-images").remove([uploadedPath]);
      throw new Error(`No se pudo enviar la ficha: ${failure} Tu borrador sigue guardado.`);
    }

    const warnings: string[] = [];
    if (editing?.image_path && editing.image_path !== imagePath) {
      const { error } = await supabase.storage.from("tradition-images").remove([editing.image_path]);
      if (error) warnings.push(`No se pudo retirar la imagen anterior: ${error.message}`);
    }
    if (uploadedPath && previousDraftImage && previousDraftImage !== imagePath) {
      await supabase.storage.from("tradition-images").remove([previousDraftImage]);
    }
    try {
      await forgetDraft(fichaId);
    } catch {
      warnings.push("El borrador no se pudo eliminar; puedes borrarlo desde la lista.");
    }

    setTarget(newTarget());
    setNotice([
      alreadyReceived
        ? "Esta ficha ya se había recibido; se actualizó sin crear una copia."
        : editing ? "Correcciones enviadas a revisión." : "¡Ficha enviada a revisión! Puedes comenzar otra cuando quieras.",
      ...warnings,
    ].join(" "));
    try {
      await loadTraditions();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "No se pudieron actualizar tus fichas.");
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setPageError(`No se pudo cerrar la sesión: ${error.message}`);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  if (!supabase) {
    return <div className="panel-card"><h3>Conecta tu proyecto Supabase</h3><p>El panel está desactivado en modo demostración. Agrega las variables de entorno indicadas en README para habilitar cuentas y envíos.</p><Link className="text-link" href="/">← Volver al museo</Link></div>;
  }

  const sentIds = new Set(traditions.map((tradition) => tradition.id));
  const newDrafts = drafts.filter((draft) => !sentIds.has(draft.id));
  const autosave: DraftAutosave = { draftId: target.id, save: saveDraft, uploadImage: uploadDraftImage };
  const formHeading = target.tradition ? "Corregir ficha enviada" : target.draft ? "Continuar borrador" : "Nueva ficha cultural";

  return (
    <>
      <div className="panel-toolbar">
        <h2>Tu espacio cultural</h2>
        <div className="footer-actions"><Link className="text-link" href="/">Ver museo ↗</Link><button className="logout-button" type="button" onClick={signOut}>Cerrar sesión</button></div>
      </div>
      {pageError && <div className="error-message" role="alert">{pageError}</div>}
      {!loading && !serverDrafts && (
        <div className="demo-notice">Por ahora tus borradores se guardan solo en este navegador. Termina y envía tu ficha desde el mismo dispositivo donde la empezaste.</div>
      )}
      <div className="panel-grid">
        <section className="panel-card form-card" ref={formRef} aria-labelledby="form-heading">
          <div className="form-card-head">
            <h3 id="form-heading">{formHeading}</h3>
            {(target.tradition || target.draft) && <button className="small-button" type="button" onClick={startNew}>+ Nueva ficha</button>}
          </div>
          <p className="form-hint form-card-hint">Tu ficha aparecerá en el museo después de ser revisada por el equipo docente.</p>
          {notice && <div className="success-message" role="status">{notice}</div>}
          {target.resumed && target.draft && (
            <div className="resume-banner">Retomamos tu borrador guardado el {formatDateTime(target.draft.updatedAt)}.</div>
          )}
          {target.tradition?.review_note && <p className="review-note"><strong>Nota del equipo:</strong> {target.tradition.review_note}</p>}
          {loading ? (
            <p className="form-hint">Cargando tu espacio…</p>
          ) : (
            <TraditionForm
              key={target.key}
              initial={target.tradition ?? undefined}
              draft={target.draft}
              autosave={autosave}
              submitLabel={target.tradition ? "Enviar correcciones" : "Enviar para revisión"}
              onSubmit={submitFicha}
              onCancel={target.tradition || target.draft ? startNew : undefined}
            />
          )}
        </section>

        <aside className="panel-side">
          {newDrafts.length > 0 && (
            <section aria-labelledby="drafts-heading">
              <div className="panel-toolbar"><h2 id="drafts-heading">Borradores</h2><span className="form-hint">{newDrafts.length} sin enviar</span></div>
              <div className="submission-list">
                {newDrafts.map((draft) => (
                  <article className={`submission-card draft-card${target.id === draft.id ? " is-open" : ""}`} key={draft.id}>
                    <div className="submission-top">
                      <div>
                        <h3>{draftTitle(draft)}</h3>
                        <p className="submission-meta">{draft.content.entryType ? getEntryTypeLabel(draft.content.entryType) : "Tipo sin elegir"} · Guardado {formatDateTime(draft.updatedAt)}</p>
                      </div>
                      <span className="status-badge status-draft">Borrador</span>
                    </div>
                    <div className="submission-actions">
                      {target.id === draft.id
                        ? <span className="form-hint">Abierto en el formulario</span>
                        : <button className="small-button" type="button" onClick={() => void continueDraft(draft)}>Continuar</button>}
                      <button className="small-button small-button-danger" type="button" onClick={() => void discardDraft(draft, false)}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="sent-heading">
            <div className="panel-toolbar"><h2 id="sent-heading">Fichas enviadas</h2><span className="form-hint">{traditions.length} fichas</span></div>
            {loading ? <p className="form-hint">Cargando tus fichas…</p> : traditions.length === 0 ? (
              <div className="empty-state">Aún no has enviado una ficha. Tu investigación puede ser la primera.</div>
            ) : (
              <div className="submission-list">
                {traditions.map((tradition) => {
                  const pendingChanges = drafts.find((draft) => draft.id === tradition.id);
                  const editable = editableStatuses.includes(tradition.status);
                  return (
                    <article className={`submission-card${target.id === tradition.id ? " is-open" : ""}`} key={tradition.id}>
                      <div className="submission-top">
                        <div><h3>{tradition.title}</h3><p className="submission-meta">{getEntryTypeLabel(tradition.entry_type)} · {tradition.municipality} · Modificada {formatDate(tradition.updated_at)}</p></div>
                        <span className={`status-badge status-${tradition.status}`}>{statusLabels[tradition.status]}</span>
                      </div>
                      {tradition.review_note && <p className="review-note"><strong>Nota del equipo:</strong> {tradition.review_note}</p>}
                      {pendingChanges && editable && <p className="draft-flag">Tienes cambios sin enviar · guardados {formatDateTime(pendingChanges.updatedAt)}</p>}
                      <div className="submission-actions">
                        {editable && target.id !== tradition.id && (
                          <button className="small-button" type="button" onClick={() => void startEdit(tradition)}>{pendingChanges ? "Continuar corrección" : "Editar ficha"}</button>
                        )}
                        {pendingChanges && editable && (
                          <button className="small-button small-button-danger" type="button" onClick={() => void discardDraft(pendingChanges, true)}>Descartar cambios</button>
                        )}
                        <Link className="small-button" href={`/alumno/fichas/${tradition.id}`} target="_blank" rel="noopener noreferrer">Ver ficha ↗</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
