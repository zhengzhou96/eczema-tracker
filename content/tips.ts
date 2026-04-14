export type TipCategory =
  | "triggers"
  | "skincare"
  | "lifestyle"
  | "medical"
  | "diet";

export interface Tip {
  id: string;
  category: TipCategory;
  title: string;
  body: string;
  source: string;
  sourceUrl: string;
}

export const tips: Tip[] = [
  {
    id: "moisturize-after-bathing",
    category: "skincare",
    title: "Moisturize within 3 minutes of bathing",
    body:
      "Pat your skin dry and apply a fragrance-free moisturizer while your skin is still damp. This traps water and is one of the most effective daily habits for managing eczema.",
    source: "American Academy of Dermatology",
    sourceUrl: "https://www.aad.org/public/diseases/eczema/childhood/treating/treat-home",
  },
  {
    id: "lukewarm-showers",
    category: "lifestyle",
    title: "Keep showers lukewarm, not hot",
    body:
      "Hot water strips the natural oils that protect your skin barrier. Aim for lukewarm baths or showers lasting 10 minutes or less.",
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/atopic-eczema/self-help/",
  },
  {
    id: "cotton-over-wool",
    category: "lifestyle",
    title: "Choose cotton over wool and synthetics",
    body:
      "Rough fabrics like wool can trigger flares. Soft breathable cotton is gentler on inflamed skin. Wash new clothes before wearing.",
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/atopic-eczema/self-help/",
  },
  {
    id: "stress-trigger",
    category: "triggers",
    title: "Stress is a real trigger — manage it like one",
    body:
      "Emotional stress can worsen itch and flares. Short daily practices like deep breathing, walks, or journaling can reduce the impact. Track your stress level alongside your itch to see the correlation.",
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/eczema/causes-and-triggers-of-eczema/",
  },
  {
    id: "fingertip-unit",
    category: "medical",
    title: "Learn the fingertip unit",
    body:
      "One fingertip unit of topical cream — squeezed from the tube along the length of an adult fingertip — covers roughly two palm-sized areas. It's the guideline clinicians use to make sure you apply enough, not too little.",
    source: "NICE",
    sourceUrl: "https://cks.nice.org.uk/topics/eczema-atopic/",
  },
  {
    id: "food-journal-first",
    category: "diet",
    title: "Food journal before you eliminate",
    body:
      "Before cutting foods from your diet, log what you eat alongside your symptoms for at least two weeks. True food triggers are less common than people assume, and cutting foods without evidence can cause nutritional gaps.",
    source: "American Academy of Dermatology",
    sourceUrl: "https://www.aad.org/public/diseases/eczema/insider/food-allergies",
  },
  {
    id: "humidify-winter",
    category: "lifestyle",
    title: "Add humidity in winter",
    body:
      "Indoor heating dries the air and your skin with it. A bedroom humidifier set around 40–50% can reduce nighttime itch significantly.",
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/eczema/causes-and-triggers-of-eczema/",
  },
  {
    id: "patch-test-new-products",
    category: "skincare",
    title: "Patch test new skincare products",
    body:
      "Apply a small amount of any new product to your inner forearm for three days before using it widely. This catches most reactions before they become a full flare.",
    source: "American Academy of Dermatology",
    sourceUrl: "https://www.aad.org/public/diseases/eczema/insider/products",
  },
  {
    id: "sweat-management",
    category: "triggers",
    title: "Rinse off sweat sooner rather than later",
    body:
      "Sweat is a common trigger. After exercise or on hot days, a quick lukewarm rinse and fresh moisturizer prevents salt and minerals from irritating sensitive skin.",
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/eczema/causes-and-triggers-of-eczema/",
  },
  {
    id: "short-nails-night-gloves",
    category: "lifestyle",
    title: "Short nails and soft cotton gloves at night",
    body:
      "Scratching during sleep damages skin without you noticing. Keep nails short, and consider thin cotton gloves on bad nights to protect the skin while you rest.",
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/atopic-eczema/self-help/",
  },
  {
    id: "emollients-liberal",
    category: "medical",
    title: "Use emollients liberally and often",
    body:
      "Most adults with eczema should apply emollient moisturizer at least twice a day, and more on flare days. It's the foundation of everything else your dermatologist might recommend.",
    source: "NICE",
    sourceUrl: "https://cks.nice.org.uk/topics/eczema-atopic/",
  },
  {
    id: "fragrance-free",
    category: "triggers",
    title: "Fragrance-free across the board",
    body:
      "Fragrance is one of the most common contact irritants. Choose fragrance-free detergents, soaps, moisturizers, and body washes — even if the label says \"natural\" or \"hypoallergenic\".",
    source: "American Academy of Dermatology",
    sourceUrl: "https://www.aad.org/public/diseases/eczema/insider/products",
  },
  {
    id: "soak-and-seal",
    category: "skincare",
    title: "The soak-and-seal technique",
    body:
      "For stubborn flares, soak in lukewarm water for 10 minutes, pat dry, apply any prescribed topical, then seal everything in with a thick moisturizer. Used at bedtime it can break a flare cycle.",
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/eczema/treatment/topicals/",
  },
  {
    id: "gentle-detergents",
    category: "lifestyle",
    title: "Switch to gentle laundry detergent",
    body:
      "Regular detergents often leave residues that irritate eczema-prone skin. A fragrance-free, dye-free detergent and an extra rinse cycle can make a noticeable difference in a few weeks.",
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/atopic-eczema/self-help/",
  },
  {
    id: "trigger-diary",
    category: "triggers",
    title: "Keep a trigger diary, even briefly",
    body:
      "Most people's triggers are a unique combination — a food, a soap, a stress pattern, weather. Logging daily for 2–4 weeks usually reveals patterns that surprise even experienced patients.",
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/eczema/causes-and-triggers-of-eczema/",
  },
];
