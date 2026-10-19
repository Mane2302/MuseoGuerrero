import type { Tradition } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "Sin dato";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function TraditionContent({ tradition }: { tradition: Tradition }) {
  if (tradition.entry_type === "celebration") {
    return (
      <div className="detail-copy">
        <section><h2>Origen e historia de la celebración</h2><p>{tradition.celebration_origin_history}</p></section>
        <section><h2>Costumbres y actividades tradicionales</h2><p>{tradition.celebration_customs}</p></section>
        <section><h2>Participación e importancia social</h2><p>{tradition.celebration_social_importance}</p></section>
        <section><h2>Conclusión</h2><p>{tradition.celebration_conclusion}</p></section>
        {tradition.interviewee_name && <section><h2>Persona entrevistada</h2><p>{tradition.interviewee_name}</p></section>}
        <section><h2>Fuentes de información</h2><ul className="source-list">{tradition.sources.map((source, index) => <li key={`${index}-${source}`}>{source}</li>)}</ul></section>
      </div>
    );
  }

  return (
    <div className="detail-copy">
      <section>
        <h2>Datos de identificación</h2>
        <dl className="biography-facts">
          <div><dt>Nombre completo</dt><dd>{tradition.person_name}</dd></div>
          <div><dt>Fecha de nacimiento</dt><dd>{formatDate(tradition.birth_date)}</dd></div>
          <div><dt>Lugar de nacimiento</dt><dd>{tradition.birth_place}</dd></div>
          <div><dt>Fecha de fallecimiento</dt><dd>{formatDate(tradition.death_date)}</dd></div>
          <div><dt>Lugar de fallecimiento</dt><dd>{tradition.death_place}</dd></div>
          <div><dt>Ocupación o actividad principal</dt><dd>{tradition.occupation}</dd></div>
        </dl>
      </section>
      <section><h2>Vida personal y formación</h2><p>{tradition.biography_life_formation}</p></section>
      <section><h2>Participación en la Independencia de México</h2><p>{tradition.independence_participation}</p></section>
      <section><h2>Logros y aportaciones</h2><p>{tradition.achievements}</p></section>
      <section><h2>Legado e importancia histórica</h2><p>{tradition.legacy}</p></section>
      <section><h2>Síntesis de su vida</h2><p>{tradition.biography_summary}</p></section>
      <section><h2>Conclusión personal</h2><p>{tradition.personal_conclusion}</p></section>
      <section><h2>Fuentes de información</h2><ul className="source-list">{tradition.sources.map((source, index) => <li key={`${index}-${source}`}>{source}</li>)}</ul></section>
    </div>
  );
}
