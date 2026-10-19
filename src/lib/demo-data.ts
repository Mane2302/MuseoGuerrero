import type { Tradition } from "@/lib/types";

const demoAuthor = "00000000-0000-0000-0000-000000000000";

export const demoTraditions: Tradition[] = [
  {
    id: "demo-textil-amuzgo",
    author_id: demoAuthor,
    title: "El telar de cintura amuzgo",
    category: "Artesanía",
    municipality: "Xochistlahuaca",
    region: "Costa Chica",
    tradition_author: "Dato de autoría por completar",
    description:
      "Cada hilo guarda una historia. En las comunidades amuzgas, las tejedoras crean huipiles y lienzos en telar de cintura, una labor transmitida de generación en generación.",
    history:
      "El tejido en telar de cintura forma parte de la vida comunitaria amuzga desde hace siglos. La técnica y sus diseños se aprenden en familia, observando, practicando y compartiendo saberes.",
    cultural_significance:
      "El huipil expresa pertenencia, memoria y creatividad. Sus formas y colores dialogan con la vida de la comunidad y con la identidad del pueblo Ñomndaa.",
    image_path: "demo:telar-amuzgo.svg",
    sources: ["Ejemplo demostrativo: completar con entrevista o fuente verificable."],
    status: "approved",
    review_note: null,
    reviewer_id: null,
    reviewed_at: null,
    created_at: "2026-01-15T12:00:00.000Z",
    updated_at: "2026-01-15T12:00:00.000Z",
    image_url: "/demo-images/telar-amuzgo.svg",
    is_demo: true,
  },
  {
    id: "demo-plateria-taxco",
    author_id: demoAuthor,
    title: "Plata que cuenta historias",
    category: "Artesanía",
    municipality: "Taxco de Alarcón",
    region: "Norte",
    tradition_author: "Dato de autoría por completar",
    description:
      "El trabajo de la plata ha convertido a Taxco en un referente artesanal. El oficio reúne diseño, paciencia y técnicas que se comparten en talleres familiares.",
    history:
      "La tradición platera de Taxco creció durante el siglo XX y reunió a maestros artesanos, aprendices y diseñadores. El trabajo manual sigue dando forma a piezas únicas.",
    cultural_significance:
      "La platería es una expresión de identidad local y de creatividad colectiva. También recuerda la importancia de cuidar y transmitir los oficios artesanales.",
    image_path: "demo:plateria-taxco.svg",
    sources: ["Ejemplo demostrativo: completar con entrevista o fuente verificable."],
    status: "approved",
    review_note: null,
    reviewer_id: null,
    reviewed_at: null,
    created_at: "2026-01-12T12:00:00.000Z",
    updated_at: "2026-01-12T12:00:00.000Z",
    image_url: "/demo-images/plateria-taxco.svg",
    is_demo: true,
  },
  {
    id: "demo-tlacololeros",
    author_id: demoAuthor,
    title: "La danza de los tlacololeros",
    category: "Danza",
    municipality: "Chilpancingo de los Bravo",
    region: "Centro",
    tradition_author: "Dato de autoría por completar",
    description:
      "Con máscaras, música y pasos enérgicos, los tlacololeros recrean la vida del campo y la relación de las comunidades con la tierra y las cosechas.",
    history:
      "La danza se presenta en fiestas y celebraciones de la región Centro. Sus personajes, música y coreografía se transmiten en grupos que mantienen viva la tradición.",
    cultural_significance:
      "La representación celebra el trabajo agrícola, la cooperación y el vínculo con el territorio. Cada comparsa aporta su propio estilo y memoria.",
    image_path: "demo:tlacololeros.svg",
    sources: ["Ejemplo demostrativo: completar con entrevista o fuente verificable."],
    status: "approved",
    review_note: null,
    reviewer_id: null,
    reviewed_at: null,
    created_at: "2026-01-10T12:00:00.000Z",
    updated_at: "2026-01-10T12:00:00.000Z",
    image_url: "/demo-images/tlacololeros.svg",
    is_demo: true,
  },
  {
    id: "demo-laca-olinala",
    author_id: demoAuthor,
    title: "La laca de Olinalá",
    category: "Artesanía",
    municipality: "Olinalá",
    region: "Montaña",
    tradition_author: "Dato de autoría por completar",
    description:
      "Cajitas, baúles y bandejas se transforman con laca y delicados motivos pintados a mano, un oficio que distingue a las familias artesanas de Olinalá.",
    history:
      "El maque de Olinalá combina preparación de materiales, color y dibujo. La enseñanza del oficio suele comenzar en casa y requiere práctica minuciosa.",
    cultural_significance:
      "La laca es una forma de conocimiento local y un sello de identidad. Sus motivos narran la relación de la comunidad con su entorno y sus recuerdos.",
    image_path: "demo:laca-olinala.svg",
    sources: ["Ejemplo demostrativo: completar con entrevista o fuente verificable."],
    status: "approved",
    review_note: null,
    reviewer_id: null,
    reviewed_at: null,
    created_at: "2026-01-08T12:00:00.000Z",
    updated_at: "2026-01-08T12:00:00.000Z",
    image_url: "/demo-images/laca-olinala.svg",
    is_demo: true,
  },
];

export const regions = [
  "Acapulco",
  "Centro",
  "Costa Chica",
  "Costa Grande",
  "Montaña",
  "Norte",
  "Tierra Caliente",
];

export const categories = [
  "Artesanía",
  "Danza",
  "Gastronomía",
  "Lengua",
  "Música",
  "Fiesta y celebración",
  "Conocimiento tradicional",
  "Otro",
];
