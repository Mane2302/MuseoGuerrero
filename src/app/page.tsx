import { Catalog } from "@/components/catalog";
import { HeroCarousel } from "@/components/hero-carousel";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { getPublishedTraditions } from "@/lib/traditions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const traditions = await getPublishedTraditions();

  return (
    <>
      <SiteHeader />
      <main>
        <HeroCarousel traditions={traditions} />

        <section className="intro-strip" aria-label="Acerca del museo">
          <p>La memoria no se mira desde lejos.<br /><strong>Se honra, se comparte y se conserva.</strong></p>
          <div><span>01</span> Celebraciones del Día de Muertos y personajes de la Independencia en Guerrero</div>
        </section>

        <section className="collection-section" id="coleccion">
          <div className="section-heading">
            <div><p className="eyebrow">Celebraciones y memoria histórica</p><h2>El Día de Muertos en Guerrero</h2></div>
            <p>Explora cómo se celebra en los municipios y conoce a los personajes de la Independencia de México relacionados con nuestra historia.</p>
          </div>
          <Catalog traditions={traditions} />
        </section>

        <section className="contribute-banner">
          <div className="banner-mark" aria-hidden="true">✳</div>
          <div><p className="eyebrow">Tu voz también es patrimonio</p><h2>¿Qué celebración o personaje merece ser recordado?</h2><p>Investiga, documenta y comparte una ficha de tu municipio.</p></div>
          <a className="button button-light" href="/login">Crea una ficha <span aria-hidden="true">↗</span></a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
