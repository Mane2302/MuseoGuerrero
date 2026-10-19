import { isAuthSessionMissingError } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { TraditionContent } from "@/components/tradition-content";
import { getEntryTypeLabel } from "@/lib/entry-content";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { TraditionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusLabels: Record<TraditionStatus, string> = {
  pending: "En revisión",
  approved: "Publicada",
  rejected: "No aprobada",
  changes_requested: "Correcciones solicitadas",
};

export default async function StudentTraditionPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login");

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && !isAuthSessionMissingError(authError)) {
    throw new Error(`No se pudo verificar la sesión: ${authError.message}`);
  }
  if (!user) redirect("/login");

  const { data: tradition, error } = await supabase
    .from("traditions")
    .select("*")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la ficha: ${error.message}`);
  if (!tradition) notFound();

  const { data: image, error: imageError } = await supabase.storage
    .from("tradition-images")
    .createSignedUrl(tradition.image_path, 3600);
  if (imageError) throw new Error(`No se pudo cargar la imagen de la ficha: ${imageError.message}`);

  return (
    <>
      <SiteHeader />
      <main className="page-main detail-body">
        <Link className="back-link" href="/alumno">← Volver a mis fichas</Link>
        <p className="eyebrow"><span /> Vista privada de tu envío</p>
        <span className={`status-badge status-${tradition.status}`}>{statusLabels[tradition.status]}</span>
        <h1 className="student-preview-title">{tradition.title}</h1>
        <p className="detail-location">{getEntryTypeLabel(tradition.entry_type)} · {tradition.municipality}</p>
        <p className="detail-author">Por {tradition.tradition_author}</p>
        {tradition.review_note && <p className="review-note"><strong>Nota del equipo:</strong> {tradition.review_note}</p>}
        {image && <div className="detail-cover"><Image src={image.signedUrl} alt={`Imagen de ${tradition.title}`} fill sizes="(max-width: 1100px) 100vw, 1100px" unoptimized priority /></div>}
        <TraditionContent tradition={tradition} />
      </main>
      <SiteFooter />
    </>
  );
}
