import type { Tradition } from "@/lib/types";

/** Sections up to this length can sit next to another short one; longer ones use the full width. */
const SHORT_SECTION_CHARS = 480;
/** Two sections only share a row when their lengths differ by about two lines at most, so neither column leaves a gap. */
const MAX_PAIR_DIFFERENCE_CHARS = 110;

function canPair(a: Block, b: Block) {
  const [shorter, longer] = [blockLength(a), blockLength(b)].sort((x, y) => x - y);
  return longer <= SHORT_SECTION_CHARS && longer - shorter <= MAX_PAIR_DIFFERENCE_CHARS;
}

interface Block {
  title: string;
  body?: string | null;
  sources?: string[];
}

function formatDate(value: string | null) {
  if (!value) return "Sin dato";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function blockLength(block: Block) {
  return block.sources ? block.sources.join(" ").length : (block.body ?? "").length;
}

/** Pairs consecutive short sections side by side and keeps reading order, so no column is left with a gap. */
function SectionFlow({ blocks }: { blocks: Block[] }) {
  const visible = blocks.filter((block) => (block.sources ? block.sources.length > 0 : Boolean(block.body?.trim())));
  const sized: { block: Block; wide: boolean }[] = [];
  for (let index = 0; index < visible.length;) {
    const current = visible[index];
    const next = visible[index + 1];
    if (next && canPair(current, next)) {
      sized.push({ block: current, wide: false }, { block: next, wide: false });
      index += 2;
    } else {
      sized.push({ block: current, wide: true });
      index += 1;
    }
  }

  return sized.map(({ block, wide }) => (
    <section className={`detail-section${wide ? " is-wide" : ""}`} key={block.title}>
      <h2>{block.title}</h2>
      {block.sources ? (
        <ul className="source-list">{block.sources.map((source, index) => <li key={`${index}-${source}`}>{source}</li>)}</ul>
      ) : (
        <p>{block.body}</p>
      )}
    </section>
  ));
}

export function TraditionContent({ tradition }: { tradition: Tradition }) {
  if (tradition.entry_type === "celebration") {
    return (
      <div className="detail-copy">
        <SectionFlow
          blocks={[
            { title: "Historia de la celebración", body: tradition.celebration_origin_history },
            { title: "Costumbres y actividades tradicionales", body: tradition.celebration_customs },
            { title: "Conclusión", body: tradition.celebration_conclusion },
            { title: "Fuentes consultadas", sources: tradition.sources },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="detail-copy biography-copy">
      <section className="detail-section is-wide biography-card">
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
      <SectionFlow
        blocks={[
          { title: "Participación en la Independencia de México", body: tradition.independence_participation },
          { title: "Logros y aportaciones", body: tradition.achievements },
          { title: "Síntesis de su vida", body: tradition.biography_summary },
          { title: "Conclusión personal", body: tradition.personal_conclusion },
          { title: "Fuentes consultadas", sources: tradition.sources },
        ]}
      />
    </div>
  );
}
