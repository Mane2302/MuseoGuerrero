"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useId, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserSupabaseClient();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    if (!supabase) {
      setErrorMessage("La autenticación no está disponible hasta configurar Supabase. Consulta el archivo README.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Revisa tu correo para confirmar la cuenta. Después podrás iniciar sesión y crear tu ficha.");
          return;
        }
        router.push("/alumno");
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("No se pudo verificar la sesión. Vuelve a iniciar sesión.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      router.push(profile?.role === "admin" ? "/profesor" : "/alumno");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo completar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <h2>{mode === "login" ? "Qué gusto verte" : "Únete a la comunidad"}</h2>
      <p>{mode === "login" ? "Ingresa a tu espacio para continuar con tus fichas." : "Crea una cuenta de estudiante para documentar una celebración o personaje histórico."}</p>
      <form className="form-stack" onSubmit={submit}>
        {mode === "signup" && (
          <label className="form-field">
            <span className="form-label">Nombre para mostrar</span>
            <input className="form-input" autoComplete="name" required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        )}
        <label className="form-field">
          <span className="form-label">Correo electrónico</span>
          <input className="form-input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <div className="form-field">
          <label className="form-label" htmlFor={passwordId}>Contraseña</label>
          <div className="password-field">
            <input
              id={passwordId}
              className="form-input"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="password-toggle"
              type="button"
              aria-controls={passwordId}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {mode === "signup" && <span className="form-hint">Usa al menos 8 caracteres.</span>}
        </div>
        {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
        {notice && <div className="success-message" role="status">{notice}</div>}
        <button className="button button-dark button-full" type="submit" disabled={loading}>
          {loading ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </form>
      <div className="auth-switch">
        {mode === "login" ? "¿Aún no tienes cuenta? " : "¿Ya tienes una cuenta? "}
        <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrorMessage(""); setNotice(""); }}>
          {mode === "login" ? "Regístrate" : "Inicia sesión"}
        </button>
      </div>
      <div className="auth-switch"><Link href="/">← Volver al museo</Link></div>
    </section>
  );
}

/* Eye icons from Lucide (https://lucide.dev), ISC License: free to use without attribution. */
function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
