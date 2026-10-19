"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getEntrySummary, getEntryTypeLabel } from "@/lib/entry-content";
import type { Tradition } from "@/lib/types";

export function Catalog({ traditions }: { traditions: Tradition[] }) {
  const [query, setQuery] = useState("");
  const [municipality, setMunicipality] = useState("");

  const municipalities = useMemo(
    () => [...new Set(traditions.map((tradition) => tradition.municipality))].sort(),
    [traditions],
  );
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return traditions.filter((tradition) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          tradition.title,
          tradition.municipality,
          getEntryTypeLabel(tradition.entry_type),
          getEntrySummary(tradition),
        ]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (!municipality || tradition.municipality === municipality)
      );
    });
  }, [municipality, query, traditions]);

  return (
    <>
      <div className="catalog-tools catalog-tools-municipality" aria-label="Buscar y filtrar fichas">
        <input
          className="search-field"
          type="search"
          placeholder="Busca una celebración, personaje o municipio…"
          aria-label="Buscar en la colección"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="filter-select" aria-label="Filtrar por municipio" value={municipality} onChange={(event) => setMunicipality(event.target.value)}>
          <option value="">Todos los municipios</option>
          {municipalities.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <div className="catalog-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
        {filtered.length === 0 ? (
          <div className="empty-state">No encontramos fichas con esos filtros. Prueba con otra búsqueda.</div>
        ) : filtered.map((tradition) => (
          <article className="tradition-card" key={tradition.id}>
            <Link href={`/tradiciones/${tradition.id}`} aria-label={`Leer sobre ${tradition.title}`}>
              <div className="card-image">
                {tradition.image_url ? (
                  <Image
                    src={tradition.image_url}
                    alt={`Imagen de ${tradition.title}`}
                    fill
                    sizes="(max-width: 620px) 100vw, (max-width: 860px) 50vw, 33vw"
                    unoptimized
                  />
                ) : <div className="image-placeholder" aria-hidden="true" />}
                <span className="entry-type-tag">{getEntryTypeLabel(tradition.entry_type)}</span>
                {tradition.is_demo && <span className="demo-tag">Ejemplo de demostración</span>}
              </div>
              <div className="card-content">
                <p className="card-location">{tradition.municipality}</p>
                <p className="card-author">Por {tradition.tradition_author}</p>
                <h3>{tradition.title}</h3>
                <p>{getEntrySummary(tradition)}</p>
                <span className="card-link">Abrir ficha <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
