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
          <p>La cultura no se mira desde lejos.<br /><strong>Se vive, se recuerda y se comparte.</strong></p>
          <div><span>01</span> Un archivo colectivo para las nuevas generaciones</div>
        </section>

        <section className="collection-section" id="coleccion">
          <div className="section-heading">
            <div><p className="eyebrow">El patrimonio que nos cuenta</p><h2>Historias de nuestra tierra</h2></div>
            <p>De la Costa Chica a la Montaña, cada comunidad guarda un universo de conocimiento.</p>
          </div>
          <Catalog traditions={traditions} />
        </section>

        <section className="contribute-banner">
          <div className="banner-mark" aria-hidden="true">✳</div>
          <div><p className="eyebrow">Tu voz también es patrimonio</p><h2>¿Qué historia de Guerrero merece ser contada?</h2><p>Invita a tu comunidad a compartir sus saberes con el mundo.</p></div>
          <a className="button button-light" href="/login">Crea una ficha <span aria-hidden="true">↗</span></a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
