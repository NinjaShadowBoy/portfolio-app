/**
 * Research papers I co-authored, hard-coded from cv_database.yaml (`publications`).
 * Each text field carries both locales; the page picks one with LOCALE_ID.
 */
export interface Publication {
  id: string;
  title: string;
  authors: string[];
  /** 1-based position of my name in `authors`. */
  myPosition: number;
  venue: { en: string; fr: string };
  /** ISO month, for sorting and the <time> element. */
  date: string;
  summary: { en: string; fr: string };
  presented?: boolean;
  note?: { en: string; fr: string };
  link?: string;
  /** Path of the PDF under public/, served from the site root. */
  pdf: string;
  tags: string[];
}

export const MY_NAME = 'Alex Nelson Ryan Abena';

const CERC = {
  en: 'Collaborative European Research Conference (CERC 2026), ATU Galway, Ireland',
  fr: 'Collaborative European Research Conference (CERC 2026), ATU Galway, Irlande',
};

const CERC_AUTHORS_THIRD = [
  'Philippe Tamla',
  'Ruth Stephie Darelle Bilogui Tiguena',
  MY_NAME,
  'Gladys Kouakam',
  'Haithem Afli',
];

export const PUBLICATIONS: Publication[] = [
  {
    id: 'cerc2026-tonal',
    pdf: 'papers/linguomt-cascade-vs-end-to-end-tonal-languages.pdf',
    title: 'LinguoMT: Cascade versus End-to-End Speech Translation for Tonal African Languages',
    authors: ['Philippe Tamla', MY_NAME, 'Ruth Stephie Darelle Bilogui Tiguena', 'Gladys Kouakam', 'Haithem Afli'],
    myPosition: 2,
    venue: CERC,
    date: '2026-10',
    presented: true,
    summary: {
      en: 'Compares a cascade (Whisper-large-v3 + NLLB) with an end-to-end model (SeamlessM4T-v2) for speech translation of tonal Niger-Congo languages, Igbo and Yoruba, in zero-shot conditions. I defined a six-category error taxonomy and annotated 30 Igbo samples by hand to separate hallucination, semantic drift and speech recognition failures.',
      fr: "Compare une cascade (Whisper-large-v3 + NLLB) et un modèle de bout en bout (SeamlessM4T-v2) pour la traduction vocale de langues nigéro-congolaises tonales, l'igbo et le yoruba, en zero-shot. J'ai défini une taxonomie d'erreurs à six catégories et annoté 30 échantillons igbo à la main pour distinguer hallucination, dérive sémantique et échecs de reconnaissance vocale.",
    },
    tags: ['Speech translation', 'Error analysis', 'PyTorch'],
  },
  {
    id: 'cerc2026-benchmark',
    pdf: 'papers/linguomt-zero-shot-pilot-benchmark.pdf',
    title: 'LinguoMT: A Zero-Shot Pilot Benchmark for African Language Speech Translation and Recognition',
    authors: CERC_AUTHORS_THIRD,
    myPosition: 3,
    venue: CERC,
    date: '2026-10',
    summary: {
      en: 'A modular, reproducible benchmark of speech translation and speech recognition on Yoruba, Igbo, Hausa and Swahili, comparing SeamlessM4T-v2 Large with Whisper-large-v3 + NLLB. Validity checks, such as source-reference alignment and empty-output detection, ruled out invalid scores.',
      fr: "Un benchmark modulaire et reproductible de traduction et de reconnaissance vocales sur le yoruba, l'igbo, le haoussa et le swahili, comparant SeamlessM4T-v2 Large à Whisper-large-v3 + NLLB. Des contrôles de validité, comme l'alignement source-référence et la détection des sorties vides, ont permis d'écarter des scores invalides.",
    },
    tags: ['Benchmark', 'Speech recognition', 'Low-resource languages'],
  },
  {
    id: 'cerc2026-audio',
    pdf: 'papers/linguomt-audio-preprocessing-strategies.pdf',
    title: 'LinguoMT: Audio Preprocessing Strategies for Low-Resource African Language Speech Translation',
    authors: CERC_AUTHORS_THIRD,
    myPosition: 3,
    venue: CERC,
    date: '2026-10',
    summary: {
      en: 'A controlled evaluation of four audio preprocessing strategies (direct, trimmed, normalized, chunk-based) on SeamlessM4T-v2 Large and the Whisper + NLLB pipeline, using noisy field recordings. Trimming silence improved Yoruba to English by 1.22 BLEU in the pilot (n=3), fixed-size chunking made results worse, and the cascade failed silently with empty outputs.',
      fr: "Une évaluation contrôlée de quatre stratégies de prétraitement audio (direct, silences retirés, normalisé, découpage fixe) sur SeamlessM4T-v2 Large et la chaîne Whisper + NLLB, à partir d'enregistrements de terrain bruités. Le retrait des silences améliore le yoruba vers l'anglais de 1,22 BLEU dans le pilote (n=3), le découpage fixe dégrade les résultats, et la cascade échoue en silence avec des sorties vides.",
    },
    tags: ['Audio preprocessing', 'Speech translation', 'Robustness'],
  },
  {
    id: 'acadai',
    pdf: 'papers/acadai-bilingual-rag-academic-assistant.pdf',
    title:
      'AcadAI: A Bilingual LLM-Based Academic Assistant for Campus Service Access in Central African Universities Using RAG and Quiizy Integration',
    authors: [
      MY_NAME,
      'Gift Anderson Moutcheu Somo',
      'Luc-Xavier Foning Lackmata',
      'Weber Fotsing Kengne',
      'Marie Louise Chengho Fongang',
      'Yann Kouetche Simo',
      'Ismael Ulrich Takam Sokoudjo',
    ],
    myPosition: 1,
    venue: {
      en: 'Research Methodology Paper, Institut Universitaire Saint Jean du Cameroun',
      fr: 'Article de méthodologie de recherche, Institut Universitaire Saint Jean du Cameroun',
    },
    date: '2026-04',
    summary: {
      en: 'A bilingual (English and French) RAG assistant built on FastAPI and ChromaDB, integrated with the Quiizy platform and deployed on AWS with Docker. I led the AI work: the chatbot, the component integration and the cloud deployment. In a TAM survey of 23 students, mean scores ranged from 4.27 to 4.35 out of 5, and 21 of 23 (91%) wanted to keep using it.',
      fr: "Un assistant bilingue (anglais et français) fondé sur le RAG, construit avec FastAPI et ChromaDB, intégré à la plateforme Quiizy et déployé sur AWS avec Docker. J'ai dirigé la partie IA : le chatbot, l'intégration des composants et le déploiement cloud. Dans une enquête TAM auprès de 23 étudiants, les moyennes vont de 4,27 à 4,35 sur 5, et 21 étudiants sur 23 (91 %) souhaitent continuer à l'utiliser.",
    },
    note: { en: 'Supervised by Dr. Philippe Tamla', fr: 'Supervisé par le Dr Philippe Tamla' },
    link: 'https://sites.google.com/view/ds4dhresearchlab/workshops/upcoming-workshop',
    tags: ['RAG', 'LLM', 'FastAPI', 'AWS'],
  },
];
