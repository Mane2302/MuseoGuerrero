"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type TouchEvent } from "react";
import { getEntrySummary, getEntryTypeLabel } from "@/lib/entry-content";
import type { Tradition } from "@/lib/types";

const MAX_SLIDES = 6;
const SWIPE_THRESHOLD_PX = 45;
const COVER_IMAGE = "/demo-images/portada-guerrero.svg";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function excerpt(text: string, max = 230) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function HeroCarousel({ traditions }: { traditions: Tradition[] }) {
  const slides = traditions.slice(0, MAX_SLIDES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  const current = slides[activeIndex];
  if (!current) return <EmptyHero />;

  const autoplay = slides.length > 1 && !reducedMotion && !userPaused;
  const playState = !autoplay ? "static" : hovered ? "paused" : "running";

  function go(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === "ArrowRight") go(activeIndex + 1);
    if (event.key === "ArrowLeft") go(activeIndex - 1);
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) >= SWIPE_THRESHOLD_PX) go(activeIndex + (distance < 0 ? 1 : -1));
  }

  return (
    <section
      className="hero"
      data-state={playState}
      aria-roledescription="carrusel"
      aria-label="Celebraciones y personajes destacados"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false);
      }}
    >
      <div className="hero-ambient" aria-hidden="true">
        {slides.map((slide, index) => (
          <Image key={slide.id} className={index === activeIndex ? "is-active" : undefined} src={slide.image_url ?? COVER_IMAGE} alt="" fill sizes="40vw" unoptimized />
        ))}
      </div>

      <div className="hero-inner">
        <div className="hero-copy" key={current.id} aria-live={playState === "running" ? "off" : "polite"} aria-atomic="true">
          <p className="eyebrow"><span /> Memorias que nos unen</p>
          <p className="hero-kicker">
            <span className="hero-chip">{getEntryTypeLabel(current.entry_type)}</span>
            <span>{current.municipality}, Guerrero</span>
          </p>
          <h1>{current.title}</h1>
          <p className="hero-byline">Por {current.tradition_author}</p>
          <p className="hero-lede">{excerpt(getEntrySummary(current))}</p>
          <div className="hero-actions">
            <Link className="button button-dark" href={`/tradiciones/${current.id}`}>Descubrir esta historia <span aria-hidden="true">↗</span></Link>
            <Link className="text-link" href="#coleccion">Explorar todas las fichas <span aria-hidden="true">→</span></Link>
          </div>
        </div>

        <div
          className="hero-stage"
          onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
          onTouchEnd={handleTouchEnd}
        >
          <div className="hero-frame">
            {slides.map((slide, index) => (
              <div className={`hero-slide${index === activeIndex ? " is-active" : ""}`} key={slide.id} aria-hidden={index !== activeIndex}>
                <Image
                  src={slide.image_url ?? COVER_IMAGE}
                  alt={index === activeIndex ? `Imagen de ${slide.title}` : ""}
                  fill
                  sizes="(max-width: 620px) 100vw, 50vw"
                  unoptimized
                  priority={index === 0}
                />
              </div>
            ))}
            <div className="hero-frame-caption">
              <span className="hero-counter">{pad(activeIndex + 1)}<span> / {pad(slides.length)}</span></span>
              <span>{current.is_demo ? "Ejemplo de demostración" : "Voces de nuestra tierra"}</span>
            </div>
          </div>
          <div className="hero-seal" aria-hidden="true"><span>RAÍCES</span><strong>GRO</strong><span>VIVAS</span></div>

          {slides.length > 1 && (
            <div className="hero-controls">
              <button className="hero-control" type="button" aria-label="Historia anterior" onClick={() => go(activeIndex - 1)}>←</button>
              <div className="hero-progress" aria-hidden="true">
                <span key={`${activeIndex}-${autoplay}`} onAnimationEnd={() => go(activeIndex + 1)} />
              </div>
              {!reducedMotion && (
                <button
                  className="hero-control"
                  type="button"
                  aria-label={userPaused ? "Reanudar el carrusel" : "Pausar el carrusel"}
                  aria-pressed={userPaused}
                  onClick={() => setUserPaused((paused) => !paused)}
                >
                  {userPaused ? "▶" : "❚❚"}
                </button>
              )}
              <button className="hero-control" type="button" aria-label="Historia siguiente" onClick={() => go(activeIndex + 1)}>→</button>
            </div>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <ol className="hero-rail" aria-label="Elegir historia destacada">
          {slides.map((slide, index) => (
            <li key={slide.id}>
              <button
                className={index === activeIndex ? "is-active" : undefined}
                type="button"
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => go(index)}
              >
                <span className="rail-thumb">
                  <Image src={slide.image_url ?? COVER_IMAGE} alt="" fill sizes="56px" unoptimized />
                </span>
                <span className="rail-text">
                  <span className="rail-index">{pad(index + 1)}</span>
                  <strong>{slide.title}</strong>
                  <small>{getEntryTypeLabel(slide.entry_type)} · {slide.municipality}</small>
                </span>
                <span className="rail-progress" key={`${index}-${activeIndex}-${autoplay}`} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EmptyHero() {
  return (
    <section className="hero" data-state="static" aria-label="Ecos de Guerrero">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Un museo vivo, hecho en comunidad</p>
          <h1>Ecos de Guerrero:<br /><em>de la Patria a la Eternidad</em></h1>
          <p className="hero-lede">Las celebraciones municipales del Día de Muertos y las biografías de personajes de la Independencia aparecerán aquí cuando sus fichas sean aprobadas.</p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/login">Crea una ficha <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="hero-stage">
          <div className="hero-frame">
            <div className="hero-slide is-active">
              <Image src={COVER_IMAGE} alt="Ilustración de una montaña y un telar guerrerense" fill sizes="(max-width: 620px) 100vw, 50vw" unoptimized priority />
            </div>
            <div className="hero-frame-caption"><span>ECOS DE GUERRERO</span><span>Patrimonio vivo</span></div>
          </div>
          <div className="hero-seal" aria-hidden="true"><span>RAÍCES</span><strong>GRO</strong><span>VIVAS</span></div>
        </div>
      </div>
    </section>
  );
}
