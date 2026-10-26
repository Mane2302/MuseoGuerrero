"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { listAccountsAction, updateStudentAccountAction } from "@/app/profesor/actions";
import type { AccountSummary } from "@/lib/admin-accounts";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Readable temporary password without look-alike characters (0/O, 1/l/I), e.g. "Kp7m-Q2xz-Hd4R". */
function generatePassword() {
  const values = crypto.getRandomValues(new Uint32Array(12));
  const chars = Array.from(values, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map((group) => group.join("")).join("-");
}

function formatDate(value: string | null) {
  if (!value) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

export function StudentAccounts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [missingKey, setMissingKey] = useState(false);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listAccountsAction();
    if (result.ok) {
      setAccounts(result.accounts);
      setErrorMessage("");
      setMissingKey(false);
    } else {
      setErrorMessage(result.error);
      setMissingKey(Boolean(result.missingKey));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    if (!needle) return accounts;
    return accounts.filter((account) => `${account.displayName} ${account.email}`.toLocaleLowerCase("es").includes(needle));
  }, [accounts, query]);
  const studentCount = accounts.filter((account) => account.role === "student").length;

  if (missingKey) {
    return (
      <div className="panel-card setup-card">
        <h3>Activa la administración de cuentas</h3>
        <p>Para cambiar contraseñas y correos, el servidor necesita la clave secreta <code>service_role</code> de Supabase:</p>
        <ol>
          <li>En Supabase abre <strong>Project Settings → API</strong> y copia la clave <strong>service_role</strong>.</li>
          <li>En Vercel, agrega la variable de entorno <code>SUPABASE_SERVICE_ROLE_KEY</code> con ese valor (y también en <code>.env.local</code> para trabajar en tu computadora).</li>
          <li>Vuelve a desplegar el proyecto.</li>
        </ol>
        <p className="form-hint">No uses el prefijo <code>NEXT_PUBLIC_</code>: esta clave nunca debe llegar al navegador.</p>
      </div>
    );
  }

  return (
    <>
      <div className="panel-toolbar">
        <h2>Personas registradas <span className="form-hint">({studentCount} estudiantes)</span></h2>
        <button className="small-button" type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading}>Actualizar lista</button>
      </div>
      {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
      <div className="catalog-tools catalog-tools-single">
        <input className="search-field" type="search" placeholder="Buscar por nombre o correo…" aria-label="Buscar cuentas" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {loading ? <p className="form-hint">Cargando cuentas…</p> : visible.length === 0 ? (
        <div className="empty-state">{accounts.length ? "Ninguna cuenta coincide con la búsqueda." : "Aún no hay cuentas registradas."}</div>
      ) : (
        <div className="submission-list">
          {visible.map((account) => (
            <article className={`submission-card account-card${openId === account.id ? " is-open" : ""}`} key={account.id}>
              <div className="submission-top">
                <div>
                  <h3>{account.displayName}</h3>
                  <p className="submission-meta account-email">{account.email || "Sin correo"}</p>
                  <p className="submission-meta">
                    {account.fichas} {account.fichas === 1 ? "ficha" : "fichas"} · Registrada {formatDate(account.createdAt)} · Último acceso {formatDate(account.lastSignInAt)}
                  </p>
                </div>
                <div className="badge-stack">
                  <span className={`status-badge ${account.role === "admin" ? "status-approved" : "status-draft"}`}>{account.role === "admin" ? "Docente" : "Estudiante"}</span>
                  {!account.emailConfirmed && <span className="status-badge status-changes_requested">Correo sin confirmar</span>}
                </div>
              </div>
              {account.role === "student" ? (
                openId === account.id ? (
                  <AccountEditor
                    account={account}
                    onClose={() => setOpenId(null)}
                    onEmailChanged={(email) => setAccounts((current) => current.map((item) => (item.id === account.id ? { ...item, email, emailConfirmed: true } : item)))}
                  />
                ) : (
                  <div className="submission-actions">
                    <button className="small-button" type="button" onClick={() => setOpenId(account.id)}>Cambiar contraseña o correo</button>
                  </div>
                )
              ) : (
                <p className="form-hint account-locked">Las cuentas del equipo docente se administran desde Supabase.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function AccountEditor({ account, onClose, onEmailChanged }: { account: AccountSummary; onClose: () => void; onEmailChanged: (email: string) => void }) {
  const [email, setEmail] = useState(account.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"email" | "password" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [sharedPassword, setSharedPassword] = useState("");
  const [copied, setCopied] = useState(false);

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim().toLowerCase();
    if (next === account.email) {
      setErrorMessage("El correo es el mismo que ya tiene la cuenta.");
      return;
    }
    if (!window.confirm(`¿Cambiar el correo de ${account.displayName} a ${next}? Deberá iniciar sesión con el correo nuevo.`)) return;
    setBusy("email");
    setErrorMessage("");
    setNotice("");
    const result = await updateStudentAccountAction(account.id, { email: next });
    setBusy(null);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }
    onEmailChanged(next);
    setNotice(`${result.message} Ahora inicia sesión con ${next}.`);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(`¿Asignar una contraseña nueva a ${account.displayName}? La anterior dejará de funcionar.`)) return;
    setBusy("password");
    setErrorMessage("");
    setNotice("");
    setCopied(false);
    const result = await updateStudentAccountAction(account.id, { password });
    setBusy(null);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }
    setSharedPassword(password);
    setPassword("");
    setShowPassword(false);
    setNotice(result.message);
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(sharedPassword);
      setCopied(true);
    } catch {
      setErrorMessage("No se pudo copiar; selecciona la contraseña y cópiala manualmente.");
    }
  }

  return (
    <div className="account-editor">
      <form className="form-field" onSubmit={saveEmail}>
        <span className="form-label">Correo electrónico</span>
        <div className="inline-field">
          <input className="form-input" type="email" required maxLength={254} autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="button button-ghost" type="submit" disabled={busy !== null}>{busy === "email" ? "Guardando…" : "Guardar correo"}</button>
        </div>
        <span className="form-hint">El correo nuevo queda confirmado; no se envía ningún mensaje al estudiante.</span>
      </form>

      <form className="form-field" onSubmit={savePassword}>
        <span className="form-label">Contraseña nueva</span>
        <div className="inline-field">
          <input
            className="form-input"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
          <button className="button button-ghost" type="button" onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}>Generar</button>
          <button className="button button-ghost" type="button" aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Ocultar" : "Mostrar"}</button>
        </div>
        <div className="inline-field-end">
          <button className="button button-dark" type="submit" disabled={busy !== null || password.length < 8}>{busy === "password" ? "Guardando…" : "Asignar contraseña"}</button>
        </div>
      </form>

      {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
      {notice && (
        <div className="success-message" role="status">
          {notice}
          {sharedPassword && (
            <div className="shared-password">
              <span>Entrégale esta contraseña de forma privada:</span>
              <code>{sharedPassword}</code>
              <button className="small-button" type="button" onClick={() => void copyPassword()}>{copied ? "Copiada ✓" : "Copiar"}</button>
            </div>
          )}
        </div>
      )}
      <div className="submission-actions">
        <button className="small-button" type="button" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
