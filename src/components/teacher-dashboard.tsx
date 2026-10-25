"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TraditionForm, type SubmitImage, type TraditionDraft } from "@/components/tradition-form";
import { TraditionContent } from "@/components/tradition-content";
import { getEntryTypeLabel } from "@/lib/entry-content";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { Tradition, TraditionStatus } from "@/lib/types";

const statusLabels: Record<TraditionStatus, string> = {
  pending: "Pendiente",
  approved: "Publicada",
  rejected: "No aprobada",
  changes_requested: "Correcciones solicitadas",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(value));
}

export function TeacherDashboard({ userId }: { userId: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [traditions, setTraditions] = useState<Tradition[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [selectedStatus, setSelectedStatus] = useState<"all" | TraditionStatus>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const loadTraditions = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setErrorMessage("");
    const { data, error } = await supabase
      .from("traditions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      setErrorMessage(`No se pudieron cargar las fichas: ${error.message}`);
      return;
    }
    try {
      const authorIds = [...new Set((data ?? []).map((tradition) => tradition.author_id))];
      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", authorIds);
        if (profilesError) throw new Error(`No se pudieron cargar los autores: ${profilesError.message}`);
        setAuthorNames(Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile.display_name])));
      } else {
        setAuthorNames({});
      }
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
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las imágenes.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadTraditions);
  }, [loadTraditions]);

  async function review(tradition: Tradition, status: TraditionStatus) {
    if (!supabase) return;
    const reviewNote = notes[tradition.id]?.trim() ?? "";
    if (status === "changes_requested" && !reviewNote) {
      setErrorMessage("Escribe una nota con las correcciones solicitadas antes de enviar.");
      return;
    }
    setErrorMessage("");
    const { error } = await supabase
      .from("traditions")
      .update({
        status,
        review_note: reviewNote || null,
        reviewer_id: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", tradition.id);
    if (error) {
      setErrorMessage(`No se pudo actualizar la revisión: ${error.message}`);
      return;
    }
    setNotice(`La ficha “${tradition.title}” ahora está ${statusLabels[status].toLocaleLowerCase("es")}.`);
    await loadTraditions();
  }

  async function saveEdit(tradition: Tradition, draft: TraditionDraft, { file: image }: SubmitImage) {
    if (!supabase) throw new Error("Configura Supabase antes de revisar fichas.");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user || user.id !== userId) throw new Error("La sesión expiró. Inicia sesión nuevamente.");

    let uploadedPath: string | null = null;
    if (image) {
      if (!tradition.author_id) throw new Error("No se encontró el autor de esta ficha.");
      const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/png" ? "png" : "webp";
      uploadedPath = `${tradition.author_id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("tradition-images")
        .upload(uploadedPath, image, { contentType: image.type, cacheControl: "3600" });
      if (uploadError) throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
    }

    const { error } = await supabase
      .from("traditions")
      .update({ ...draft, ...(uploadedPath ? { image_path: uploadedPath } : {}) })
      .eq("id", tradition.id);
    if (error) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage.from("tradition-images").remove([uploadedPath]);
        if (cleanupError) throw new Error(`No se pudo guardar: ${error.message}. No se pudo retirar la imagen temporal: ${cleanupError.message}`);
      }
      throw new Error(`No se pudo guardar la edición: ${error.message}`);
    }

    let cleanupWarning = "";
    if (tradition.image_path && uploadedPath) {
      const { error: cleanupError } = await supabase.storage.from("tradition-images").remove([tradition.image_path]);
      if (cleanupError) cleanupWarning = ` No se pudo retirar la imagen anterior: ${cleanupError.message}`;
    }
    setEditingId(null);
    setNotice(`Se guardaron los cambios de “${tradition.title}”.${cleanupWarning}`);
    await loadTraditions();
  }

  async function removeTradition(tradition: Tradition) {
    if (!supabase || !window.confirm(`¿Eliminar definitivamente la ficha “${tradition.title}”?`)) return;
    setErrorMessage("");
    const { error } = await supabase.from("traditions").delete().eq("id", tradition.id);
    if (error) {
      setErrorMessage(`No se pudo eliminar la ficha: ${error.message}`);
      return;
    }
    let cleanupWarning = "";
    if (tradition.image_path && !tradition.image_path.startsWith("demo:")) {
      const { error: storageError } = await supabase.storage.from("tradition-images").remove([tradition.image_path]);
      if (storageError) cleanupWarning = ` La ficha se eliminó, pero no se pudo retirar su imagen: ${storageError.message}`;
    }
    setNotice(`Se eliminó la ficha “${tradition.title}”.${cleanupWarning}`);
    setEditingId(null);
    await loadTraditions();
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(`No se pudo cerrar la sesión: ${error.message}`);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  if (!supabase) {
    return <div className="panel-card"><h3>Conecta tu proyecto Supabase</h3><p>El panel de moderación se activa después de configurar Supabase y asignar de forma segura el rol de administrador.</p><Link className="text-link" href="/">← Volver al museo</Link></div>;
  }

  const visible = traditions.filter((tradition) => selectedStatus === "all" || tradition.status === selectedStatus);
  // Fichas sent more than once by the same student (same type and title) before duplicates were prevented.
  const duplicateKey = (tradition: Tradition) => `${tradition.author_id}|${tradition.entry_type}|${tradition.title.trim().toLocaleLowerCase("es")}`;
  const duplicateCounts = traditions.reduce((counts, tradition) => {
    const key = duplicateKey(tradition);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  return (
    <>
      <div className="panel-toolbar">
        <h2>Fichas del museo <span className="form-hint">({traditions.filter((item) => item.status === "pending").length} pendientes)</span></h2>
        <div className="footer-actions"><Link className="text-link" href="/">Ver museo ↗</Link><button className="logout-button" type="button" onClick={signOut}>Cerrar sesión</button></div>
      </div>
      {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
      {notice && <div className="success-message" role="status">{notice}</div>}
      <div className="catalog-tools">
        <select className="filter-select" aria-label="Filtrar fichas por estado" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as "all" | TraditionStatus)}>
          <option value="pending">Pendientes</option>
          <option value="changes_requested">Correcciones solicitadas</option>
          <option value="approved">Publicadas</option>
          <option value="rejected">No aprobadas</option>
          <option value="all">Todos los estados</option>
        </select>
      </div>
      {loading ? <p className="form-hint">Cargando fichas…</p> : visible.length === 0 ? (
        <div className="empty-state">No hay fichas en este estado.</div>
      ) : (
        <div className="submission-list">
          {visible.map((tradition) => (
            <article className="submission-card" key={tradition.id}>
              <div className="submission-top">
                <div><h3>{tradition.title}</h3><p className="submission-meta">{getEntryTypeLabel(tradition.entry_type)} · Por {authorNames[tradition.author_id] ?? "Estudiante"} · {tradition.municipality} · Enviada {formatDate(tradition.created_at)} · Modificada {formatDate(tradition.updated_at)}</p></div>
                <div className="badge-stack">
                  <span className={`status-badge status-${tradition.status}`}>{statusLabels[tradition.status]}</span>
                  {(duplicateCounts.get(duplicateKey(tradition)) ?? 0) > 1 && (
                    <span className="status-badge status-duplicate" title="El mismo estudiante envió otra ficha con este título. Revisa y elimina la copia que sobre.">
                      Posible duplicado ×{duplicateCounts.get(duplicateKey(tradition))}
                    </span>
                  )}
                </div>
              </div>
              <details className="preview-details">
                <summary>Vista previa de la ficha</summary>
                <p><strong>Autor o autora:</strong> {tradition.tradition_author}</p>
                <TraditionContent tradition={tradition} />
                {tradition.image_url && <div className="preview-image"><Image src={tradition.image_url} alt={`Imagen de ${tradition.title}`} width={640} height={360} unoptimized /></div>}
              </details>
              <label className="form-field review-note-field">
                <span className="form-label">Nota de revisión (necesaria para solicitar correcciones)</span>
                <textarea className="form-textarea" rows={2} value={notes[tradition.id] ?? tradition.review_note ?? ""} onChange={(event) => setNotes({ ...notes, [tradition.id]: event.target.value })} />
              </label>
              {editingId === tradition.id ? (
                <div className="panel-card edit-card">
                  <h3>Editar ficha: {tradition.title}</h3>
                  <TraditionForm key={`edit-${tradition.id}`} initial={tradition} submitLabel="Guardar cambios" onSubmit={(draft, image) => saveEdit(tradition, draft, image)} onCancel={() => setEditingId(null)} />
                </div>
              ) : (
                <div className="review-actions">
                  <button className="small-button" type="button" onClick={() => review(tradition, "approved")}>Aprobar y publicar</button>
                  <button className="small-button" type="button" onClick={() => review(tradition, "changes_requested")}>Solicitar correcciones</button>
                  <button className="small-button" type="button" onClick={() => review(tradition, "rejected")}>Rechazar</button>
                  <button className="small-button" type="button" onClick={() => setEditingId(tradition.id)}>Editar</button>
                  <button className="small-button small-button-danger" type="button" onClick={() => void removeTradition(tradition)}>Eliminar</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
