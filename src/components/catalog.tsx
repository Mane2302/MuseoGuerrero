"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, regions } from "@/lib/demo-data";
import type { Tradition } from "@/lib/types";

export function Catalog({ traditions }: { traditions: Tradition[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
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
          tradition.category,
          tradition.municipality,
          tradition.region,
          tradition.description,
        ]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (!region || tradition.region === region) &&
        (!category || tradition.category === category) &&
        (!municipality || tradition.municipality === municipality)
      );
    });
  }, [category, municipality, query, region, traditions]);

  return (
    <>
      <div className="catalog-tools" aria-label="Buscar y filtrar tradiciones">
        <input
          className="search-field"
          type="search"
          placeholder="Busca una tradición, oficio o palabra…"
          aria-label="Buscar en la colección"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="filter-select" aria-label="Filtrar por región" value={region} onChange={(event) => setRegion(event.target.value)}>
          <option value="">Todas las regiones</option>
          {regions.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="filter-select" aria-label="Filtrar por categoría" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
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
                <span className="category-tag">{tradition.category}</span>
                {tradition.is_demo && <span className="demo-tag">Ejemplo de demostración</span>}
              </div>
              <div className="card-content">
                <p className="card-location">{tradition.municipality} · {tradition.region}</p>
                <p className="card-author">Por {tradition.tradition_author}</p>
                <h3>{tradition.title}</h3>
                <p>{tradition.description}</p>
                <span className="card-link">Conocer la historia <span aria-hidden="true">→</span></span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
