import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ecos de Guerrero — Museo digital comunitario",
    template: "%s | Ecos de Guerrero",
  },
  description:
    "Documenta las celebraciones del Día de Muertos en los municipios de Guerrero y conoce a personajes de la Independencia de México.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
