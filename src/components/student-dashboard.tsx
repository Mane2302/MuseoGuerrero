"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TraditionForm, type TraditionDraft } from "@/components/tradition-form";
import { getEntryTypeLabel } from "@/lib/entry-content";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { Tradition, TraditionStatus } from "@/lib/types";

const statusLabels: Record<TraditionStatus, string> = {
  pending: "En revisión",
  approved: "Publicada",
  rejected: "No aprobada",
  changes_requested: "Correcciones solicitadas",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

export function StudentDashboard({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [traditions, setTraditions] = useState<Tradition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tradition | null>(null);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTraditions = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setPageError("");
    const { data, error } = await supabase
      .from("traditions")
      .select("*")
      .eq("author_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      setPageError(`No se pudieron cargar tus fichas: ${error.message}`);
      return;
    }

    try {
      const withImages = await Promise.all((data ?? []).map(async (tradition) => {
        if (!tradition.image_path) return tradition;
        if (tradition.image_path.startsWith("demo:")) {
          return { ...tradition, image_url: `/demo-images/${tradition.image_path.slice(5)}` };
        }
        const { data: imageData, error: imageError } = await supabase.storage
          .from("tradition-images")
          .createSignedUrl(tradition.image_path, 3600);
        if (imageError) throw new Error(`No se pudo abrir la imagen: ${imageError.message}`);
        return { ...tradition, image_url: imageData.signedUrl };
      }));
      setTraditions(withImages);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "No se pudieron cargar las imágenes.");
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    void Promise.resolve().then(loadTraditions);
  }, [loadTraditions]);

  async function saveTradition(draft: TraditionDraft, image: File | null) {
    if (!supabase) throw new Error("Configura Supabase antes de enviar una ficha.");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user || user.id !== userId) throw new Error("La sesión expiró. Inicia sesión nuevamente.");

    let uploadedPath: string | null = null;
    if (image) {
      const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : "webp";
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("tradition-images")
        .upload(uploadedPath, image, { contentType: image.type, cacheControl: "3600" });
      if (uploadError) throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
    }

    const imagePath = uploadedPath ?? editing?.image_path;
    if (!imagePath) throw new Error("Agrega una imagen para completar la ficha.");

    const values = {
      ...draft,
      image_path: imagePath,
      status: "pending" as const,
      review_note: null,
      reviewer_id: null,
      reviewed_at: null,
    };
    const result = editing
      ? await supabase.from("traditions").update(values).eq("id", editing.id).eq("author_id", user.id)
      : await supabase.from("traditions").insert({ ...values, author_id: user.id });

    if (result.error) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from("tradition-images").remove([uploadedPath]);
        if (cleanupError) {
          throw new Error(`No se pudo guardar la ficha: ${result.error.message}. Tampoco se pudo retirar la imagen temporal: ${cleanupError.message}`);
        }
      }
      throw new Error(`No se pudo guardar la ficha: ${result.error.message}`);
    }

    let cleanupWarning = "";
    if (editing?.image_path && uploadedPath) {
      const { error: cleanupError } = await supabase.storage.from("tradition-images").remove([editing.image_path]);
      if (cleanupError) cleanupWarning = ` La ficha se guardó, pero no se pudo retirar la imagen anterior: ${cleanupError.message}`;
    }
    setEditing(null);
    setNotice(`${editing ? "Ficha actualizada y enviada a revisión." : "Ficha enviada a revisión."}${cleanupWarning}`);
    await loadTraditions();
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

  return (
    <>
      <div className="panel-toolbar">
        <h2>Tu espacio cultural</h2>
        <div className="footer-actions"><Link className="text-link" href="/">Ver museo ↗</Link><button className="logout-button" type="button" onClick={signOut}>Cerrar sesión</button></div>
      </div>
      {pageError && <div className="error-message" role="alert">{pageError}</div>}
      {notice && <div className="success-message" role="status">{notice}</div>}
      <div className="panel-grid grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="panel-card">
          <h3>{editing ? "Editar ficha cultural" : "Nueva ficha cultural"}</h3>
          {editing?.status === "approved" && <div className="review-note">Esta ficha ya está publicada. Al enviar una edición, volverá a revisión y dejará de aparecer públicamente hasta que se apruebe de nuevo.</div>}
          <TraditionForm
            key={editing?.id ?? "new"}
            initial={editing ?? undefined}
            submitLabel={editing ? "Enviar correcciones" : "Enviar para revisión"}
            onSubmit={saveTradition}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
          <p className="form-hint">Tu ficha aparecerá en el museo después de ser revisada por el equipo docente.</p>
        </section>
        <section>
          <div className="panel-toolbar"><h2>Tus publicaciones</h2><span className="form-hint">{traditions.length} fichas</span></div>
          {loading ? <p className="form-hint">Cargando tus fichas…</p> : traditions.length === 0 ? (
            <div className="empty-state">Aún no has creado una ficha. Tu investigación puede ser la primera.</div>
          ) : (
            <div className="submission-list">
              {traditions.map((tradition) => (
                <article className="submission-card" key={tradition.id}>
                  <div className="submission-top">
                    <div><h3>{tradition.title}</h3><p className="submission-meta">{getEntryTypeLabel(tradition.entry_type)} · {tradition.municipality} · Modificada {formatDate(tradition.updated_at)}</p></div>
                    <span className={`status-badge status-${tradition.status}`}>{statusLabels[tradition.status]}</span>
                  </div>
                  {tradition.review_note && <p className="review-note"><strong>Nota del equipo:</strong> {tradition.review_note}</p>}
                  <div className="submission-actions">
                    {tradition.status !== "rejected" && <button className="small-button" type="button" onClick={() => { setEditing(tradition); setNotice(""); }}>Editar ficha</button>}
                    <Link className="small-button" href={`/alumno/fichas/${tradition.id}`} target="_blank" rel="noopener noreferrer">Ver ficha enviada ↗</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
