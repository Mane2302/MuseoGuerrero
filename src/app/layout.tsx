import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ecos de Guerrero — Museo digital comunitario",
    template: "%s | Ecos de Guerrero",
  },
  description:
    "Explora y comparte las tradiciones, los saberes y las historias de las siete regiones de Guerrero.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
