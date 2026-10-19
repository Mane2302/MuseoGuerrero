"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import type { EntryType, Tradition } from "@/lib/types";

export interface TraditionDraft {
  entry_type: EntryType;
  title: string;
  category: null;
  municipality: string;
  region: null;
  tradition_author: string;
  description: null;
  history: null;
  cultural_significance: null;
  celebration_origin_history: string | null;
  celebration_customs: string | null;
  celebration_social_importance: string | null;
  celebration_conclusion: string | null;
  interviewee_name: string | null;
  person_name: string | null;
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  occupation: string | null;
  biography_life_formation: string | null;
  independence_participation: string | null;
  achievements: string | null;
  legacy: string | null;
  biography_summary: string | null;
  personal_conclusion: string | null;
  sources: string[];
}

interface TraditionFormProps {
  initial?: Tradition;
  onSubmit: (draft: TraditionDraft, image: File | null) => Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
}

export function TraditionForm({ initial, onSubmit, submitLabel, onCancel }: TraditionFormProps) {
  const [entryType, setEntryType] = useState<EntryType | null>(initial?.entry_type ?? null);
  const [title, setTitle] = useState(initial?.entry_type === "biography" ? initial.person_name ?? initial.title : initial?.title ?? "");
  const [municipality, setMunicipality] = useState(initial?.municipality ?? "");
  const [traditionAuthor, setTraditionAuthor] = useState(initial?.tradition_author ?? "");
  const [originHistory, setOriginHistory] = useState(initial?.celebration_origin_history ?? "");
  const [customs, setCustoms] = useState(initial?.celebration_customs ?? "");
  const [socialImportance, setSocialImportance] = useState(initial?.celebration_social_importance ?? "");
  const [celebrationConclusion, setCelebrationConclusion] = useState(initial?.celebration_conclusion ?? "");
  const [intervieweeName, setIntervieweeName] = useState(initial?.interviewee_name ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? "");
  const [birthPlace, setBirthPlace] = useState(initial?.birth_place ?? "");
  const [deathDate, setDeathDate] = useState(initial?.death_date ?? "");
  const [deathPlace, setDeathPlace] = useState(initial?.death_place ?? "");
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [lifeFormation, setLifeFormation] = useState(initial?.biography_life_formation ?? "");
  const [independenceParticipation, setIndependenceParticipation] = useState(initial?.independence_participation ?? "");
  const [achievements, setAchievements] = useState(initial?.achievements ?? "");
  const [legacy, setLegacy] = useState(initial?.legacy ?? "");
  const [biographySummary, setBiographySummary] = useState(initial?.biography_summary ?? "");
  const [personalConclusion, setPersonalConclusion] = useState(initial?.personal_conclusion ?? "");
  const [sources, setSources] = useState(initial?.sources.join("\n") ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!entryType) {
      setErrorMessage("Selecciona el tipo de ficha que vas a elaborar.");
      return;
    }
    if (!initial?.image_path && !image) {
      setErrorMessage(entryType === "celebration" ? "Agrega una fotografía o dibujo de la celebración." : "Agrega una imagen o retrato del personaje.");
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
        entry_type: entryType,
        title: title.trim(),
        category: null,
        municipality: municipality.trim(),
        region: null,
        tradition_author: traditionAuthor.trim(),
        description: null,
        history: null,
        cultural_significance: null,
        celebration_origin_history: entryType === "celebration" ? originHistory.trim() : null,
        celebration_customs: entryType === "celebration" ? customs.trim() : null,
        celebration_social_importance: entryType === "celebration" ? socialImportance.trim() : null,
        celebration_conclusion: entryType === "celebration" ? celebrationConclusion.trim() : null,
        interviewee_name: entryType === "celebration" ? intervieweeName.trim() || null : null,
        person_name: entryType === "biography" ? title.trim() : null,
        birth_date: entryType === "biography" ? birthDate : null,
        birth_place: entryType === "biography" ? birthPlace.trim() : null,
        death_date: entryType === "biography" ? deathDate : null,
        death_place: entryType === "biography" ? deathPlace.trim() : null,
        occupation: entryType === "biography" ? occupation.trim() : null,
        biography_life_formation: entryType === "biography" ? lifeFormation.trim() : null,
        independence_participation: entryType === "biography" ? independenceParticipation.trim() : null,
        achievements: entryType === "biography" ? achievements.trim() : null,
        legacy: entryType === "biography" ? legacy.trim() : null,
        biography_summary: entryType === "biography" ? biographySummary.trim() : null,
        personal_conclusion: entryType === "biography" ? personalConclusion.trim() : null,
        sources: sources.split("\n").map((source) => source.trim()).filter(Boolean),
      }, image);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la ficha.");
    } finally {
      setSaving(false);
    }
  }

  const imageField = (
    <label className="form-field">
      <span className="form-label">{entryType === "celebration" ? "Fotografía o dibujo de la celebración" : "Imagen o retrato del personaje"}</span>
      {initial?.image_url && !image && <div className="current-image"><Image src={initial.image_url} alt={`Imagen actual de ${initial.title}`} width={240} height={140} unoptimized /></div>}
      <input className="form-input" type="file" accept="image/jpeg,image/png,image/webp" required={!initial?.image_path} onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
      <span className="form-hint">Formatos JPG, PNG o WebP; máximo 5 MB. Usa una imagen propia o con permiso de uso.</span>
    </label>
  );

  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset className="entry-type-fieldset">
        <legend className="form-label">Elige el tipo de ficha</legend>
        <div className="entry-type-options">
          <button className={`entry-type-option${entryType === "celebration" ? " is-selected" : ""}`} type="button" aria-pressed={entryType === "celebration"} onClick={() => setEntryType("celebration")}>
            <strong>Celebración del Día de Muertos</strong>
            <span>Investiga cómo se celebra en un municipio de Guerrero.</span>
          </button>
          <button className={`entry-type-option${entryType === "biography" ? " is-selected" : ""}`} type="button" aria-pressed={entryType === "biography"} onClick={() => setEntryType("biography")}>
            <strong>Personaje de la Independencia</strong>
            <span>Elabora una ficha biográfica de una persona que participó en la Independencia de México.</span>
          </button>
        </div>
      </fieldset>

      {entryType && (
        <>
          <section className="activity-brief">
            <strong>Propósito de la actividad</strong>
            <p>Vincular la memoria histórica de la Independencia de México en Guerrero con la tradición del Día de Muertos. Elige una de las dos fichas para reconocer, valorar y difundir el patrimonio cultural, cívico e histórico que define la identidad nacional actual.</p>
            <p>Escribe con tus propias palabras y respalda la información con fuentes. Distingue los datos comprobables de los testimonios y opiniones.</p>
          </section>

          {entryType === "celebration" ? (
            <>
              <h3 className="form-section-title">A. Datos generales</h3>
              <label className="form-field"><span className="form-label">Nombre de la celebración</span><input className="form-input" required minLength={3} maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label className="form-field"><span className="form-label">Municipio donde se celebra</span><input className="form-input" required minLength={2} maxLength={100} value={municipality} onChange={(event) => setMunicipality(event.target.value)} /></label>
              <label className="form-field"><span className="form-label">Autor o autora de la ficha</span><input className="form-input" required minLength={2} maxLength={120} value={traditionAuthor} onChange={(event) => setTraditionAuthor(event.target.value)} placeholder="Tu nombre o el de tu equipo" /></label>
              <h3 className="form-section-title">B. Origen e historia de la celebración</h3>
              <label className="form-field"><span className="form-label">Origen e historia</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={originHistory} onChange={(event) => setOriginHistory(event.target.value)} /></label>
              <h3 className="form-section-title">C. Costumbres y actividades tradicionales</h3>
              <label className="form-field"><span className="form-label">Costumbres y actividades</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={customs} onChange={(event) => setCustoms(event.target.value)} placeholder="Describe las actividades, los espacios y los elementos que observaste o investigaste." /></label>
              <h3 className="form-section-title">D. Participación e importancia social</h3>
              <label className="form-field"><span className="form-label">Participación e importancia social</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={socialImportance} onChange={(event) => setSocialImportance(event.target.value)} /></label>
              <h3 className="form-section-title">E. Evidencias, fuentes y conclusión</h3>
              {imageField}
              <label className="form-field"><span className="form-label">Nombre de la persona entrevistada (opcional)</span><input className="form-input" maxLength={120} value={intervieweeName} onChange={(event) => setIntervieweeName(event.target.value)} /><span className="form-hint">Pide permiso antes de compartir el nombre o el testimonio.</span></label>
              <label className="form-field"><span className="form-label">Fuentes de información</span><textarea className="form-textarea" required value={sources} onChange={(event) => setSources(event.target.value)} placeholder={"Una fuente por línea: libro, página web, documento o testimonio"} /></label>
              <label className="form-field"><span className="form-label">Conclusión: ¿qué aprendiste sobre esta tradición y por qué es importante conservarla?</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={celebrationConclusion} onChange={(event) => setCelebrationConclusion(event.target.value)} /></label>
            </>
          ) : (
            <>
              <h3 className="form-section-title">A. Datos de identificación</h3>
              <label className="form-field"><span className="form-label">Nombre completo del personaje</span><input className="form-input" required minLength={3} maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <div className="detail-copy">
                <label className="form-field"><span className="form-label">Fecha de nacimiento</span><input className="form-input" type="date" required value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
                <label className="form-field"><span className="form-label">Lugar de nacimiento</span><input className="form-input" required minLength={2} maxLength={160} value={birthPlace} onChange={(event) => setBirthPlace(event.target.value)} /></label>
                <label className="form-field"><span className="form-label">Fecha de fallecimiento</span><input className="form-input" type="date" required value={deathDate} onChange={(event) => setDeathDate(event.target.value)} /></label>
                <label className="form-field"><span className="form-label">Lugar de fallecimiento</span><input className="form-input" required minLength={2} maxLength={160} value={deathPlace} onChange={(event) => setDeathPlace(event.target.value)} /></label>
              </div>
              <label className="form-field"><span className="form-label">Ocupación o actividad principal</span><input className="form-input" required minLength={2} maxLength={160} value={occupation} onChange={(event) => setOccupation(event.target.value)} /></label>
              <label className="form-field"><span className="form-label">Municipio de Guerrero relacionado con el personaje</span><input className="form-input" required minLength={2} maxLength={100} value={municipality} onChange={(event) => setMunicipality(event.target.value)} /></label>
              <label className="form-field"><span className="form-label">Autor o autora de la ficha</span><input className="form-input" required minLength={2} maxLength={120} value={traditionAuthor} onChange={(event) => setTraditionAuthor(event.target.value)} placeholder="Tu nombre o el de tu equipo" /></label>
              {imageField}
              <h3 className="form-section-title">B. Vida personal y formación</h3>
              <label className="form-field"><span className="form-label">Vida personal y formación</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={lifeFormation} onChange={(event) => setLifeFormation(event.target.value)} /></label>
              <h3 className="form-section-title">C. Participación en la Independencia de México</h3>
              <label className="form-field"><span className="form-label">Participación en la Independencia</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={independenceParticipation} onChange={(event) => setIndependenceParticipation(event.target.value)} /></label>
              <h3 className="form-section-title">D. Logros y aportaciones</h3>
              <label className="form-field"><span className="form-label">Logros y aportaciones</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={achievements} onChange={(event) => setAchievements(event.target.value)} /></label>
              <h3 className="form-section-title">E. Legado e importancia histórica</h3>
              <label className="form-field"><span className="form-label">Legado e importancia histórica</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={legacy} onChange={(event) => setLegacy(event.target.value)} /></label>
              <h3 className="form-section-title">F. Síntesis y fuentes</h3>
              <label className="form-field"><span className="form-label">Resumen de su vida: ¿quién fue, qué hizo y por qué es importante?</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={biographySummary} onChange={(event) => setBiographySummary(event.target.value)} /></label>
              <label className="form-field"><span className="form-label">Conclusión personal: ¿por qué merece ser recordado?</span><textarea className="form-textarea" required minLength={20} maxLength={2000} value={personalConclusion} onChange={(event) => setPersonalConclusion(event.target.value)} /></label>
              <label className="form-field"><span className="form-label">Fuentes de información</span><textarea className="form-textarea" required value={sources} onChange={(event) => setSources(event.target.value)} placeholder={"Una fuente por línea: libro, documento, página web o material consultado"} /></label>
            </>
          )}
        </>
      )}

      {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
      <div className="footer-actions">
        <button className="button button-dark" type="submit" disabled={saving || !entryType}>{saving ? "Guardando…" : submitLabel}</button>
        {onCancel && <button className="small-button" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}
