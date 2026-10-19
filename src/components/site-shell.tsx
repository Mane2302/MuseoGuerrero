import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Ecos de Guerrero, inicio">
        <span className="brand-mark" aria-hidden="true">✳</span>
        <span className="brand-name">Ecos de Guerrero<small>Museo digital comunitario</small></span>
      </Link>
      <nav className="header-nav" aria-label="Navegación principal">
        <Link href="/#coleccion">La colección</Link>
        <Link href="/#coleccion">Regiones</Link>
        <Link className="nav-cta" href="/login">Aula y comunidad <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="footer-identity" href="/">
        <span className="footer-brand">Ecos de Guerrero</span>
        <span className="footer-subtitle">De la Patria a la Eternidad</span>
      </Link>
      <span className="footer-course">Tecnología I y II</span>
    </footer>
  );
}

export function DemoNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <div className="demo-notice" role="status">
      Modo demostración: las fichas visibles son ejemplos locales. Configura Supabase para activar el registro, el inicio de sesión y la publicación de contenido real.
    </div>
  );
}
