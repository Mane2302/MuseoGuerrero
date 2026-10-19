import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { DemoNotice, SiteHeader } from "@/components/site-shell";

export const metadata: Metadata = { title: "Acceso de estudiantes" };

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="auth-layout">
        <div className="auth-story">
          <p className="eyebrow"><span /> Un museo de todas y todos</p>
          <h1>Las historias de Guerrero también <em>son tuyas.</em></h1>
          <p>Inicia sesión o crea una cuenta para compartir una tradición de tu comunidad. Cada ficha es revisada antes de aparecer en el museo.</p>
          <Link className="text-link" href="/">Explorar la colección <span aria-hidden="true">→</span></Link>
          <DemoNotice />
        </div>
        <AuthForm />
      </main>
    </>
  );
}
