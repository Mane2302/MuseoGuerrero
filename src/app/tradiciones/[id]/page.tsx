import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { TraditionContent } from "@/components/tradition-content";
import { getEntryTypeLabel } from "@/lib/entry-content";
import { getPublishedTradition } from "@/lib/traditions";

export const dynamic = "force-dynamic";

interface TraditionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TraditionPageProps): Promise<Metadata> {
  const { id } = await params;
  const tradition = await getPublishedTradition(id);
  return { title: tradition?.title ?? "Tradición no encontrada" };
}

export default async function TraditionPage({ params }: TraditionPageProps) {
  const { id } = await params;
  const tradition = await getPublishedTradition(id);
  if (!tradition) notFound();

  return (
    <>
      <SiteHeader />
      <main className="page-main detail-body">
        <Link className="back-link" href="/#coleccion">← Volver a la colección</Link>
        <p className="eyebrow"><span /> {getEntryTypeLabel(tradition.entry_type)}{tradition.is_demo ? " · Ejemplo demostrativo" : ""}</p>
        <h1>{tradition.title}</h1>
        <p className="detail-location">{tradition.municipality}</p>
        <p className="detail-author">Por {tradition.tradition_author}</p>
        {tradition.image_url && <div className="detail-cover"><Image src={tradition.image_url} alt={`Imagen de ${tradition.title}`} fill sizes="(max-width: 1100px) 100vw, 1100px" unoptimized priority /></div>}
        <TraditionContent tradition={tradition} />
        {tradition.is_demo && <div className="demo-notice">Ficha de muestra demostrativa. Verifica y sustituye su contenido por fuentes y testimonios comunitarios antes de presentarla como una investigación.</div>}
      </main>
      <SiteFooter />
    </>
  );
}
