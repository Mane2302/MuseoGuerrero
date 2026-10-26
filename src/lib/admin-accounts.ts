import "server-only";

import { createClient, isAuthSessionMissingError, type SupabaseClient, type User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { AppRole, Database } from "@/lib/types";

/** What the accounts panel needs about each person; never raw auth records. */
export interface AccountSummary {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  fichas: number;
}

export type AccountsResult =
  | { ok: true; accounts: AccountSummary[] }
  | { ok: false; error: string; missingKey?: boolean };

export type UpdateResult = { ok: true; message: string } | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt ignores anything longer
const PAGE_SIZE = 200;

class AccessError extends Error {}

function createAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Re-checks the session on every call: a page-level check does not protect a Server Action. */
async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new AccessError("Supabase no está configurado.");
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && !isAuthSessionMissingError(error)) throw new AccessError("No se pudo verificar la sesión.");
  if (!user) throw new AccessError("Tu sesión expiró. Inicia sesión nuevamente.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin") throw new AccessError("Solo el equipo docente puede administrar cuentas.");
  return user;
}

async function listAllUsers(admin: SupabaseClient<Database>) {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`No se pudieron cargar las cuentas: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
}

export async function listAccounts(): Promise<AccountsResult> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    if (!admin) {
      return { ok: false, missingKey: true, error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." };
    }

    const [users, profilesResult, traditionsResult] = await Promise.all([
      listAllUsers(admin),
      admin.from("profiles").select("id, display_name, role"),
      admin.from("traditions").select("author_id"),
    ]);
    if (profilesResult.error) throw new Error(`No se pudieron cargar los perfiles: ${profilesResult.error.message}`);
    if (traditionsResult.error) throw new Error(`No se pudieron contar las fichas: ${traditionsResult.error.message}`);

    const profiles = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
    const fichas = new Map<string, number>();
    for (const { author_id } of traditionsResult.data) fichas.set(author_id, (fichas.get(author_id) ?? 0) + 1);

    const accounts = users.map((user): AccountSummary => {
      const profile = profiles.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        displayName: profile?.display_name ?? user.email ?? "Sin nombre",
        role: profile?.role ?? "student",
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        emailConfirmed: Boolean(user.email_confirmed_at),
        fichas: fichas.get(user.id) ?? 0,
      };
    });
    accounts.sort((a, b) => a.displayName.localeCompare(b.displayName, "es", { sensitivity: "base" }));
    return { ok: true, accounts };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudieron cargar las cuentas." };
  }
}

export async function updateStudentAccount(
  userId: unknown,
  changes: { email?: unknown; password?: unknown },
): Promise<UpdateResult> {
  try {
    const actor = await requireAdmin();
    const admin = createAdminClient();
    if (!admin) return { ok: false, error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." };

    if (typeof userId !== "string" || !UUID_PATTERN.test(userId)) return { ok: false, error: "Cuenta no válida." };

    const email = typeof changes.email === "string" ? changes.email.trim().toLowerCase() : undefined;
    const password = typeof changes.password === "string" ? changes.password : undefined;
    if (!email && !password) return { ok: false, error: "No hay cambios que guardar." };
    if (email !== undefined && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
      return { ok: false, error: "Escribe un correo electrónico válido." };
    }
    if (password !== undefined && (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)) {
      return { ok: false, error: `La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.` };
    }

    // Only student accounts can be changed here, so no admin can take over another admin account.
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) return { ok: false, error: `No se pudo verificar la cuenta: ${profileError.message}` };
    if (!profile) return { ok: false, error: "La cuenta no existe." };
    if (profile.role !== "student") return { ok: false, error: "Las cuentas del equipo docente no se modifican desde este panel." };

    const { error } = await admin.auth.admin.updateUserById(userId, {
      ...(email ? { email, email_confirm: true } : {}),
      ...(password ? { password } : {}),
    });
    if (error) {
      const taken = /already|registered|exists/i.test(error.message);
      return { ok: false, error: taken ? "Ese correo ya pertenece a otra cuenta." : `No se pudo actualizar la cuenta: ${error.message}` };
    }

    const changed = [email && "correo", password && "contraseña"].filter(Boolean).join(" y ");
    console.info(`[cuentas] ${actor.id} actualizó ${changed} de ${userId}`);
    return { ok: true, message: `Se actualizó ${changed} de la cuenta.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar la cuenta." };
  }
}
