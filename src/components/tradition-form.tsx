"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import {
  contentFromTradition,
  emptyDraftContent,
  isDraftContentEmpty,
  type DraftContent,
  type DraftSaveOutcome,
  type FichaDraft,
} from "@/lib/drafts";
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
  celebration_social_importance: null;
  celebration_conclusion: string | null;
  interviewee_name: null;
  person_name: string | null;
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  occupation: string | null;
  biography_life_formation: null;
  independence_participation: string | null;
  achievements: string | null;
  legacy: null;
  biography_summary: string | null;
  personal_conclusion: string | null;
  sources: string[];
}

/** `path` is an image already uploaded for the draft; `file` still has to be uploaded. */
export interface SubmitImage {
  file: File | null;
  path: string | null;
}

export interface DraftAutosave {
  draftId: string;
  save: (draft: FichaDraft) => Promise<DraftSaveOutcome>;
  uploadImage: (file: File, previousPath: string | null) => Promise<string>;
}

interface TraditionFormProps {
  initial?: Tradition;
  draft?: FichaDraft | null;
  onSubmit: (values: TraditionDraft, image: SubmitImage) => Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
  autosave?: DraftAutosave;
}

type SaveState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "saving" }
  | { status: "saved"; outcome: DraftSaveOutcome; at: number }
  | { status: "error"; message: string };

const AUTOSAVE_DELAY_MS = 1500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const LONG_MIN = 20;
const LONG_MAX = 2000;

function splitSources(value: string) {
  return value.split(/[,\n]/).map((source) => source.trim()).filter(Boolean);
}

function formatSavedAt(timestamp: number) {
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("es-MX", sameDay ? { timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toTraditionValues(fields: DraftContent, entryType: EntryType): TraditionDraft {
  const isCelebration = entryType === "celebration";
  const isBiography = entryType === "biography";
  const title = fields.title.trim();
  return {
    entry_type: entryType,
    title,
    category: null,
    municipality: fields.municipality.trim(),
    region: null,
    tradition_author: fields.traditionAuthor.trim(),
    description: null,
    history: null,
    cultural_significance: null,
    celebration_origin_history: isCelebration ? fields.originHistory.trim() : null,
    celebration_customs: isCelebration ? fields.customs.trim() : null,
    celebration_social_importance: null,
    celebration_conclusion: isCelebration ? fields.celebrationConclusion.trim() : null,
    interviewee_name: null,
    person_name: isBiography ? title : null,
    birth_date: isBiography ? fields.birthDate : null,
    birth_place: isBiography ? fields.birthPlace.trim() : null,
    death_date: isBiography ? fields.deathDate : null,
    death_place: isBiography ? fields.deathPlace.trim() : null,
    occupation: isBiography ? fields.occupation.trim() : null,
    biography_life_formation: null,
    independence_participation: isBiography ? fields.independenceParticipation.trim() : null,
    achievements: isBiography ? fields.achievements.trim() : null,
    legacy: null,
    biography_summary: isBiography ? fields.biographySummary.trim() : null,
    personal_conclusion: isBiography ? fields.personalConclusion.trim() : null,
    sources: splitSources(fields.sources),
  };
}

export function TraditionForm({ initial, draft, onSubmit, submitLabel, onCancel, autosave }: TraditionFormProps) {
  const [fields, setFields] = useState<DraftContent>(() => draft?.content ?? (initial ? contentFromTradition(initial) : emptyDraftContent));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(draft?.imagePath ?? null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(() =>
    draft ? { status: "saved", outcome: "server", at: Date.parse(draft.updatedAt) } : { status: "idle" },
  );

  const autosaveRef = useRef(autosave);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const submittingRef = useRef(false);
  const autosaveEnabled = Boolean(autosave);
  const draftId = autosave?.draftId ?? "";
  const entryType = fields.entryType;
  const pendingFile = imageFile && imageFile !== uploadedFile ? imageFile : null;

  useEffect(() => {
    autosaveRef.current = autosave;
  });

  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  const savedImageUrl = imagePath && imagePath === draft?.imagePath ? draft.imageUrl : !imagePath ? initial?.image_url : undefined;
  const shownImageUrl = previewUrl ?? savedImageUrl;

  // Saves run one after another so an older snapshot can never overwrite a newer one.
  const queueSave = useCallback((snapshot: FichaDraft) => {
    const run = async () => {
      const current = autosaveRef.current;
      if (!current) return;
      setSaveState({ status: "saving" });
      try {
        const outcome = await current.save(snapshot);
        setSaveState({ status: "saved", outcome, at: Date.now() });
      } catch (error) {
        setSaveState({ status: "error", message: error instanceof Error ? error.message : "Error desconocido" });
      }
    };
    const next = saveChainRef.current.then(run);
    saveChainRef.current = next;
    return next;
  }, []);

  useEffect(() => {
    if (!autosaveEnabled || !dirty) return;
    const timer = window.setTimeout(() => {
      if (submittingRef.current) return;
      setDirty(false);
      if (isDraftContentEmpty(fields) && !imagePath) {
        setSaveState({ status: "idle" });
        return;
      }
      void queueSave({ id: draftId, content: fields, imagePath, updatedAt: new Date().toISOString() });
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autosaveEnabled, dirty, draftId, fields, imagePath, queueSave]);

  const hasUnsavedWork = dirty || uploadingImage || saveState.status === "pending" || saveState.status === "saving";
  useEffect(() => {
    if (!hasUnsavedWork) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedWork]);

  function markChanged() {
    setDirty(true);
    if (autosaveEnabled) setSaveState({ status: "pending" });
  }

  function update<K extends keyof DraftContent>(key: K, value: DraftContent[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    markChanged();
  }

  async function saveDraftNow() {
    if (!autosave) return;
    if (isDraftContentEmpty(fields) && !imagePath) {
      setErrorMessage("Escribe al menos un dato antes de guardar el borrador.");
      return;
    }
    setErrorMessage("");
    setDirty(false);
    await queueSave({ id: autosave.draftId, content: fields, imagePath, updatedAt: new Date().toISOString() });
  }

  async function chooseImage(file: File | null) {
    setErrorMessage("");
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage("El formato debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMessage("La imagen no puede superar los 5 MB.");
      return;
    }
    setImageFile(file);
    if (!autosave) {
      markChanged();
      return;
    }
    setUploadingImage(true);
    try {
      const path = await autosave.uploadImage(file, imagePath);
      setImagePath(path);
      setUploadedFile(file);
      markChanged();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "error desconocido";
      setErrorMessage(`No se pudo guardar la imagen en el borrador (${reason}). Se intentará subir de nuevo al enviar la ficha.`);
    } finally {
      setUploadingImage(false);
    }
  }

  function validate(): string | null {
    if (!entryType) return "Selecciona el tipo de ficha que vas a elaborar.";
    if (uploadingImage) return "Espera a que termine de subir la imagen.";
    if (!initial?.image_path && !imagePath && !imageFile) {
      return entryType === "celebration" ? "Agrega una fotografía o dibujo de la celebración." : "Agrega una imagen o retrato del personaje.";
    }
    if (!splitSources(fields.sources).length) return "Agrega al menos una fuente consultada.";
    if (entryType === "biography" && fields.birthDate && fields.deathDate && fields.deathDate < fields.birthDate) {
      return "La fecha de fallecimiento no puede ser anterior a la fecha de nacimiento.";
    }
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    setErrorMessage("");
    const problem = validate();
    if (problem || !entryType) {
      setErrorMessage(problem ?? "Revisa la ficha.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setDirty(false);
    try {
      // Let in-flight autosaves finish first so they cannot recreate the draft after it is sent.
      await saveChainRef.current;
      await onSubmit(toTraditionValues(fields, entryType), { file: pendingFile, path: pendingFile ? null : imagePath });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar la ficha.");
      if (autosaveEnabled) markChanged();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const hasImage = Boolean(initial?.image_path || imagePath || imageFile);
  const checks = entryType === "celebration"
    ? [
        fields.title.trim().length >= 3,
        fields.municipality.trim().length >= 2,
        fields.traditionAuthor.trim().length >= 2,
        fields.originHistory.trim().length >= LONG_MIN,
        fields.customs.trim().length >= LONG_MIN,
        hasImage,
        splitSources(fields.sources).length > 0,
        fields.celebrationConclusion.trim().length >= LONG_MIN,
      ]
    : entryType === "biography"
      ? [
          fields.title.trim().length >= 3,
          Boolean(fields.birthDate),
          fields.birthPlace.trim().length >= 2,
          Boolean(fields.deathDate),
          fields.deathPlace.trim().length >= 2,
          fields.occupation.trim().length >= 2,
          fields.municipality.trim().length >= 2,
          fields.traditionAuthor.trim().length >= 2,
          hasImage,
          fields.independenceParticipation.trim().length >= LONG_MIN,
          fields.achievements.trim().length >= LONG_MIN,
          fields.biographySummary.trim().length >= LONG_MIN,
          fields.personalConclusion.trim().length >= LONG_MIN,
          splitSources(fields.sources).length > 0,
        ]
      : [];
  const completed = checks.filter(Boolean).length;
  const progress = checks.length ? Math.round((completed / checks.length) * 100) : 0;

  const imageField = (
    <div className="form-field">
      <span className="form-label">{entryType === "celebration" ? "Fotografía o dibujo de la celebración" : "Imagen o retrato del personaje"}</span>
      <div className="image-picker">
        {shownImageUrl ? (
          <div className="current-image"><Image src={shownImageUrl} alt="Vista previa de la imagen de la ficha" width={240} height={160} unoptimized /></div>
        ) : hasImage ? (
          <div className="current-image current-image-empty">Imagen guardada</div>
        ) : null}
        <label className="file-button">
          <input
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void chooseImage(event.target.files?.[0] ?? null)}
          />
          <span aria-hidden="true">↑</span> {hasImage ? "Cambiar imagen" : "Elegir imagen"}
        </label>
        {uploadingImage && <span className="form-hint">Subiendo imagen…</span>}
      </div>
      <span className="form-hint">JPG, PNG o WebP; máximo 5 MB. Usa una imagen propia o con permiso de uso.</span>
    </div>
  );

  return (
    <form className="form-stack" onSubmit={submit}>
      <fieldset className="entry-type-fieldset">
        <legend className="form-label">Elige el tipo de ficha</legend>
        <div className="entry-type-options">
          <button className={`entry-type-option${entryType === "celebration" ? " is-selected" : ""}`} type="button" aria-pressed={entryType === "celebration"} onClick={() => update("entryType", "celebration")}>
            <strong>Celebración del Día de Muertos</strong>
            <span>Investiga cómo se celebra en un municipio de Guerrero.</span>
          </button>
          <button className={`entry-type-option${entryType === "biography" ? " is-selected" : ""}`} type="button" aria-pressed={entryType === "biography"} onClick={() => update("entryType", "biography")}>
            <strong>Personaje de la Independencia</strong>
            <span>Elabora una ficha biográfica de una persona que participó en la Independencia de México.</span>
          </button>
        </div>
      </fieldset>

      {entryType && (
        <>
          <details className="activity-brief">
            <summary>Propósito de la actividad</summary>
            <p>Vincular la memoria histórica de la Independencia de México en Guerrero con la tradición del Día de Muertos. Elige una de las dos fichas para reconocer, valorar y difundir el patrimonio cultural, cívico e histórico que define la identidad nacional actual.</p>
            <p>Escribe con tus propias palabras y respalda la información con fuentes. Distingue los datos comprobables de los testimonios y opiniones.</p>
          </details>

          {entryType === "celebration" ? (
            <>
              <h3 className="form-section-title"><span>A</span> Datos generales</h3>
              <TextField label="Nombre de la celebración" required minLength={3} maxLength={140} value={fields.title} onValue={(value) => update("title", value)} />
              <TextField label="Municipio donde se celebra" required minLength={2} maxLength={100} value={fields.municipality} onValue={(value) => update("municipality", value)} />
              <TextField label="Autor o autora de la ficha" required minLength={2} maxLength={120} value={fields.traditionAuthor} onValue={(value) => update("traditionAuthor", value)} placeholder="Tu nombre o el de tu equipo" />
              <h3 className="form-section-title"><span>B</span> Historia de la celebración</h3>
              <LongField label="Historia de la celebración" value={fields.originHistory} onValue={(value) => update("originHistory", value)} />
              <h3 className="form-section-title"><span>C</span> Costumbres y actividades tradicionales</h3>
              <LongField label="Costumbres y actividades tradicionales" value={fields.customs} onValue={(value) => update("customs", value)} placeholder="Describe las actividades, los espacios y los elementos que observaste o investigaste." />
              <h3 className="form-section-title"><span>E</span> Evidencias, fuentes y conclusión</h3>
              {imageField}
              <SourcesField value={fields.sources} onValue={(value) => update("sources", value)} />
              <LongField label="Conclusión: ¿qué aprendiste sobre esta tradición y por qué es importante conservarla?" value={fields.celebrationConclusion} onValue={(value) => update("celebrationConclusion", value)} />
            </>
          ) : (
            <>
              <h3 className="form-section-title"><span>A</span> Datos de identificación</h3>
              <TextField label="Nombre completo del personaje" required minLength={3} maxLength={140} value={fields.title} onValue={(value) => update("title", value)} />
              <div className="form-grid-2">
                <TextField label="Fecha de nacimiento" type="date" required value={fields.birthDate} onValue={(value) => update("birthDate", value)} />
                <TextField label="Lugar de nacimiento" required minLength={2} maxLength={160} value={fields.birthPlace} onValue={(value) => update("birthPlace", value)} />
                <TextField label="Fecha de fallecimiento" type="date" required min={fields.birthDate || undefined} value={fields.deathDate} onValue={(value) => update("deathDate", value)} />
                <TextField label="Lugar de fallecimiento" required minLength={2} maxLength={160} value={fields.deathPlace} onValue={(value) => update("deathPlace", value)} />
              </div>
              <TextField label="Ocupación o actividad principal" required minLength={2} maxLength={160} value={fields.occupation} onValue={(value) => update("occupation", value)} />
              <TextField label="Municipio de Guerrero relacionado con el personaje" required minLength={2} maxLength={100} value={fields.municipality} onValue={(value) => update("municipality", value)} />
              <TextField label="Autor o autora de la ficha" required minLength={2} maxLength={120} value={fields.traditionAuthor} onValue={(value) => update("traditionAuthor", value)} placeholder="Tu nombre o el de tu equipo" />
              {imageField}
              <h3 className="form-section-title"><span>B</span> Participación en la Independencia de México</h3>
              <LongField label="Participación en la Independencia" value={fields.independenceParticipation} onValue={(value) => update("independenceParticipation", value)} />
              <h3 className="form-section-title"><span>C</span> Logros y aportaciones</h3>
              <LongField label="Logros y aportaciones" value={fields.achievements} onValue={(value) => update("achievements", value)} />
              <h3 className="form-section-title"><span>D</span> Síntesis y fuentes</h3>
              <LongField label="Resumen de su vida: ¿quién fue, qué hizo y por qué es importante?" value={fields.biographySummary} onValue={(value) => update("biographySummary", value)} />
              <LongField label="Conclusión personal: ¿por qué merece ser recordado?" value={fields.personalConclusion} onValue={(value) => update("personalConclusion", value)} />
              <SourcesField value={fields.sources} onValue={(value) => update("sources", value)} />
            </>
          )}
        </>
      )}

      {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}

      <div className="form-actionbar">
        {entryType && (
          <div className="form-progress">
            <div className="progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
            <span className="progress-label">{completed} de {checks.length} apartados completos</span>
          </div>
        )}
        {autosave && <SaveIndicator state={saveState} />}
        <div className="form-actionbar-buttons">
          {onCancel && <button className="button button-ghost" type="button" onClick={onCancel} disabled={submitting}>Cancelar</button>}
          {autosave && (
            <button className="button button-ghost" type="button" onClick={() => void saveDraftNow()} disabled={submitting || uploadingImage || saveState.status === "saving"}>
              Guardar borrador
            </button>
          )}
          <button className="button button-dark" type="submit" disabled={submitting || uploadingImage || !entryType}>
            {submitting ? "Enviando…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  let text = "Tu avance se guarda automáticamente mientras escribes.";
  let tone = "";
  if (state.status === "pending") text = "Cambios sin guardar…";
  if (state.status === "saving") text = "Guardando borrador…";
  if (state.status === "saved") {
    text = state.outcome === "server"
      ? `Borrador guardado · ${formatSavedAt(state.at)}`
      : `Guardado solo en este dispositivo · ${formatSavedAt(state.at)}`;
    tone = state.outcome === "server" ? " is-saved" : " is-local";
  }
  if (state.status === "error") {
    text = `No se pudo guardar en línea; hay una copia en este dispositivo. (${state.message})`;
    tone = " is-error";
  }
  return <p className={`save-status${tone}`} role="status" aria-live="polite"><span className="save-dot" aria-hidden="true" />{text}</p>;
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onValue: (value: string) => void;
};

function TextField({ label, value, onValue, ...inputProps }: TextFieldProps) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <input className="form-input" value={value} onChange={(event) => onValue(event.target.value)} {...inputProps} />
    </label>
  );
}

function LongField({ label, value, onValue, placeholder }: { label: string; value: string; onValue: (value: string) => void; placeholder?: string }) {
  const length = value.trim().length;
  const short = length > 0 && length < LONG_MIN;
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <textarea className="form-textarea" required minLength={LONG_MIN} maxLength={LONG_MAX} value={value} onChange={(event) => onValue(event.target.value)} placeholder={placeholder} />
      <span className={`char-count${short ? " is-short" : ""}`}>
        {short ? `Escribe al menos ${LONG_MIN} caracteres · ` : ""}{value.length} / {LONG_MAX}
      </span>
    </label>
  );
}

function SourcesField({ value, onValue }: { value: string; onValue: (value: string) => void }) {
  return (
    <label className="form-field">
      <span className="form-label">Fuentes consultadas</span>
      <textarea className="form-textarea form-textarea-short" required value={value} onChange={(event) => onValue(event.target.value)} placeholder="Escribe una fuente por línea o sepáralas con comas." />
      <span className="form-hint">{splitSources(value).length} fuente(s) registrada(s)</span>
    </label>
  );
}
