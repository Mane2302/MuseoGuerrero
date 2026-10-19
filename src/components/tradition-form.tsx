"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { categories, regions } from "@/lib/demo-data";
import type { Tradition } from "@/lib/types";

export interface TraditionDraft {
  title: string;
  category: string;
  municipality: string;
  region: string;
  tradition_author: string;
  description: string;
  history: string;
  cultural_significance: string;
  sources: string[];
}

interface TraditionFormProps {
  initial?: Tradition;
  onSubmit: (draft: TraditionDraft, image: File | null) => Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
}

export function TraditionForm({ initial, onSubmit, submitLabel, onCancel }: TraditionFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [municipality, setMunicipality] = useState(initial?.municipality ?? "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [traditionAuthor, setTraditionAuthor] = useState(initial?.tradition_author ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [history, setHistory] = useState(initial?.history ?? "");
  const [significance, setSignificance] = useState(initial?.cultural_significance ?? "");
  const [sources, setSources] = useState(initial?.sources.join("\n") ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!initial?.image_path && !image) {
      setErrorMessage("Agrega una imagen para completar la ficha.");
      return;
    }
    if (!sources.split("\n").some((source) => source.trim())) {
      setErrorMessage("Agrega al menos una fuente consultada.");
      return;
    }
    if (image && !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      setErrorMessage("El formato debe ser JPG, PNG o WebP.");
      return;
    }
    if (image && image.size > 5 * 1024 * 1024) {
      setErrorMessage("La imagen no puede superar los 5 MB.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        category,
        municipality: municipality.trim(),
        region,
        tradition_author: traditionAuthor.trim(),
        description: description.trim(),
        history: history.trim(),
        cultural_significance: significance.trim(),
        sources: sources.split("\n").map((source) => source.trim()).filter(Boolean),
      }, image);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la ficha.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label className="form-field"><span className="form-label">Título de la tradición</span><input className="form-input" required maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="detail-copy">
        <label className="form-field"><span className="form-label">Categoría</span><select className="form-select" required value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Selecciona una categoría</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="form-field"><span className="form-label">Región</span><select className="form-select" required value={region} onChange={(event) => setRegion(event.target.value)}><option value="">Selecciona una región</option>{regions.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label className="form-field"><span className="form-label">Municipio</span><input className="form-input" required maxLength={100} value={municipality} onChange={(event) => setMunicipality(event.target.value)} /></label>
      <label className="form-field"><span className="form-label">Autor o autora de la ficha</span><input className="form-input" required minLength={2} maxLength={120} value={traditionAuthor} onChange={(event) => setTraditionAuthor(event.target.value)} placeholder="Nombre de la persona, colectivo o comunidad" /><span className="form-hint">Escribe quién comparte o documenta esta ficha. Pide permiso antes de publicar nombres.</span></label>
      <label className="form-field"><span className="form-label">Descripción</span><textarea className="form-textarea" required minLength={20} maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} /><span className="form-hint">Cuenta brevemente en qué consiste. (20–1,200 caracteres)</span></label>
      <label className="form-field"><span className="form-label">Historia</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={history} onChange={(event) => setHistory(event.target.value)} /></label>
      <label className="form-field"><span className="form-label">Significado cultural</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={significance} onChange={(event) => setSignificance(event.target.value)} /></label>
      <label className="form-field">
        <span className="form-label">Imagen de la tradición</span>
        {initial?.image_url && !image && <div className="current-image"><Image src={initial.image_url} alt={`Imagen actual de ${initial.title}`} width={240} height={140} unoptimized /></div>}
        <input className="form-input" type="file" accept="image/jpeg,image/png,image/webp" required={!initial?.image_path} onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
        <span className="form-hint">Formatos JPG, PNG o WebP; máximo 5 MB. Respeta los derechos y el consentimiento de las personas fotografiadas.</span>
      </label>
      <label className="form-field"><span className="form-label">Fuentes consultadas</span><textarea className="form-textarea" required value={sources} onChange={(event) => setSources(event.target.value)} placeholder={"Una fuente por línea: entrevista, libro, archivo o sitio web"} /><span className="form-hint">Incluye una fuente o entrevista por línea para respaldar la información.</span></label>
      {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
      <div className="footer-actions">
        <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Guardando…" : submitLabel}</button>
        {onCancel && <button className="small-button" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}
