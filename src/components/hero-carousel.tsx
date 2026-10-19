"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getEntrySummary, getEntryTypeLabel } from "@/lib/entry-content";
import type { Tradition } from "@/lib/types";

export function HeroCarousel({ traditions }: { traditions: Tradition[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = traditions[activeIndex];
  const summary = current ? getEntrySummary(current) : "";

  useEffect(() => {
    if (traditions.length < 2 || paused) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % traditions.length);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [paused, traditions.length]);

  function move(direction: -1 | 1) {
    setActiveIndex((index) => (index + direction + traditions.length) % traditions.length);
  }

  return (
    <section
      className="hero-section"
      aria-label="Celebraciones y personajes destacados"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="hero-copy" aria-live="polite" aria-atomic="true">
        {current ? (
          <>
            <p className="eyebrow"><span /> Memorias que nos unen</p>
            <p className="hero-kicker">{getEntryTypeLabel(current.entry_type)} · {current.municipality}, Guerrero</p>
            <h1>{current.title}</h1>
            <p className="hero-byline">Por {current.tradition_author}</p>
            <p className="hero-lede">{summary.length > 240 ? `${summary.slice(0, 237).trimEnd()}…` : summary}</p>
            <div className="hero-actions">
              <Link className="button button-dark" href={`/tradiciones/${current.id}`}>Descubrir esta historia <span aria-hidden="true">↗</span></Link>
              <Link className="text-link" href="#coleccion">Explorar todas las fichas <span aria-hidden="true">→</span></Link>
            </div>
            <p className="hero-note"><span className="note-stamp">GRO</span><span>Una historia creada y compartida desde Guerrero</span></p>
          </>
        ) : (
          <>
            <p className="eyebrow"><span /> Un museo vivo, hecho en comunidad</p>
            <h1>Ecos de Guerrero:<br /><em>de la Patria a la Eternidad</em></h1>
            <p className="hero-lede">Las celebraciones municipales del Día de Muertos y las biografías de personajes de la Independencia aparecerán aquí cuando sus fichas sean aprobadas.</p>
            <div className="hero-actions">
              <Link className="button button-dark" href="/login">Crea una ficha <span aria-hidden="true">↗</span></Link>
            </div>
          </>
        )}
      </div>
      <div className="hero-art-wrap">
        <div className="hero-art">
          <Image
            key={current?.id ?? "cover"}
            src={current?.image_url ?? "/demo-images/portada-guerrero.svg"}
            alt={current ? `Imagen de la tradición ${current.title}` : "Ilustración de una montaña y un telar guerrerense"}
            fill
            sizes="(max-width: 620px) 100vw, 50vw"
            unoptimized
            priority
          />
          <div className="art-caption">
            <span>{current ? `${String(activeIndex + 1).padStart(2, "0")} / ${String(traditions.length).padStart(2, "0")}` : "ECOS DE GUERRERO"}</span>
            <span>{current?.is_demo ? "Ejemplo de demostración" : current ? "Voces de nuestra tierra" : "Patrimonio vivo"}</span>
          </div>
          {traditions.length > 1 && (
            <div className="carousel-controls" aria-label="Controles del carrusel">
              <button className="carousel-arrow" type="button" aria-label="Mostrar tradición anterior" onClick={() => move(-1)}>←</button>
              <div className="carousel-dots" aria-label="Elegir tradición">
                {traditions.map((tradition, index) => (
                  <button
                    key={tradition.id}
                    className={`carousel-dot${index === activeIndex ? " is-active" : ""}`}
                    type="button"
                    aria-label={`Mostrar ${tradition.title}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>
              <button className="carousel-arrow" type="button" aria-label="Mostrar siguiente tradición" onClick={() => move(1)}>→</button>
            </div>
          )}
        </div>
        <div className="hero-seal" aria-hidden="true"><span>RAÍCES</span><strong>GRO</strong><span>VIVAS</span></div>
      </div>
    </section>
  );
}
