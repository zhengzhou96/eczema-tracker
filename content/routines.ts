export type RoutineCategory =
  | "skincare"
  | "lifestyle"
  | "flare"
  | "sleep"
  | "exercise"
  | "travel";

export interface RoutineStep {
  title: string;
  description: string;
}

export interface Routine {
  id: string;
  title: string;
  intro: string;
  estimatedMinutes: number;
  category: RoutineCategory;
  steps: RoutineStep[];
  source: string;
  sourceUrl: string;
}

export const CATEGORY_LABELS: Record<RoutineCategory, string> = {
  skincare: "Skincare",
  lifestyle: "Lifestyle",
  flare: "Flare",
  sleep: "Sleep",
  exercise: "Exercise",
  travel: "Travel",
};

export const routines: Routine[] = [
  {
    id: "morning-skin-maintenance",
    title: "Morning Skin Maintenance",
    intro:
      "A consistent morning routine sets the tone for your skin barrier throughout the day. Use this every morning, adjusting emollient thickness based on how your skin feels.",
    estimatedMinutes: 10,
    category: "skincare",
    steps: [
      {
        title: "Rinse with lukewarm water",
        description:
          "Splash your face and any affected areas with lukewarm water — not hot. Hot water strips protective skin oils. Pat dry gently with a soft cotton towel.",
      },
      {
        title: "Apply any prescribed topicals",
        description:
          "If your dermatologist has prescribed a topical (corticosteroid, calcineurin inhibitor, etc.), apply it now to affected areas only, using the fingertip unit guideline.",
      },
      {
        title: "Moisturise within 3 minutes",
        description:
          "Apply a fragrance-free emollient while skin is still slightly damp. This traps moisture and is the single most evidence-backed daily habit for eczema management.",
      },
      {
        title: "Choose cotton clothing",
        description:
          "Dress in soft, breathable cotton layers. Avoid wool and synthetic fabrics directly against skin, especially on areas currently flaring.",
      },
      {
        title: "Log your itch level",
        description:
          "Take 30 seconds to log your morning itch level in the app before you leave the house. Early data is the most reliable — your perception shifts through the day.",
      },
    ],
    source: "American Academy of Dermatology",
    sourceUrl:
      "https://www.aad.org/public/diseases/eczema/childhood/treating/treat-home",
  },
  {
    id: "evening-wind-down",
    title: "Evening Wind-Down Routine",
    intro:
      "Evening is when your skin does most of its repair. This routine maximises overnight recovery and reduces the chance of nocturnal scratching disrupting your sleep.",
    estimatedMinutes: 15,
    category: "sleep",
    steps: [
      {
        title: "Take a lukewarm bath or shower",
        description:
          "Limit to 10 minutes. Lukewarm — not hot. Use a gentle, fragrance-free wash on affected areas only. Hot water and over-washing break down the skin barrier.",
      },
      {
        title: "Pat dry, don't rub",
        description:
          "Use a soft cotton towel and pat the skin dry, leaving it slightly damp. Rubbing creates friction that worsens inflammation on sensitive skin.",
      },
      {
        title: "Apply prescribed topicals",
        description:
          "Apply any prescribed topical treatments to affected areas while skin is still warm and slightly damp — absorption is better at this point.",
      },
      {
        title: "Seal with a thick emollient",
        description:
          "Apply a generous layer of fragrance-free emollient over all treated and dry areas. Ointments (like white soft paraffin) are more occlusive than lotions and work better overnight.",
      },
      {
        title: "Prepare your sleep environment",
        description:
          "Set bedroom humidity to 40–50% if you have a humidifier. Keep the room cool. Lay out clean cotton bedding — wash bedding weekly in fragrance-free detergent.",
      },
      {
        title: "Trim nails and wear cotton gloves if needed",
        description:
          "Short nails reduce skin damage from unconscious scratching. On bad nights, thin cotton gloves protect the skin while you sleep without overheating your hands.",
      },
    ],
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/eczema/treatment/topicals/",
  },
  {
    id: "flare-day-protocol",
    title: "Flare Day Protocol",
    intro:
      "When a flare hits, the goal is to calm the skin fast and prevent the itch-scratch cycle from escalating. Use this routine on any day your itch level is 6 or higher.",
    estimatedMinutes: 20,
    category: "flare",
    steps: [
      {
        title: "Cool the area",
        description:
          "Apply a cool (not ice-cold) damp cloth to the most inflamed areas for 5–10 minutes. Cooling reduces the histamine response and temporarily interrupts the itch signal.",
      },
      {
        title: "Apply prescribed topical promptly",
        description:
          "Use your prescribed corticosteroid or other topical as directed — don't delay on flare days. Applying it early shortens the flare. Use the fingertip unit to apply enough.",
      },
      {
        title: "Soak and seal",
        description:
          "Soak in lukewarm water for 10 minutes, pat dry, apply topical to affected areas, then immediately seal with a thick emollient. This technique enhances topical absorption and hydration.",
      },
      {
        title: "Wear loose, cotton layers",
        description:
          "Change into the loosest, softest cotton clothing you own. Tight waistbands, seams, and synthetic fabrics all worsen itch during a flare.",
      },
      {
        title: "Identify and log the trigger",
        description:
          "Log what happened in the 24–48 hours before the flare: new food, stress spike, new product, temperature change? Even if you're unsure, log your guess. Patterns emerge over time.",
      },
      {
        title: "Avoid scratching — use tapping or cold instead",
        description:
          "If the itch is intense, tap or pat the skin with your palm rather than scratching. A cool damp cloth provides temporary relief without breaking the skin.",
      },
    ],
    source: "NHS",
    sourceUrl: "https://www.nhs.uk/conditions/atopic-eczema/self-help/",
  },
  {
    id: "post-exercise-care",
    title: "Post-Exercise Skin Care",
    intro:
      "Sweat is a common eczema trigger — it increases skin pH and introduces salts that irritate sensitive skin. This routine minimises post-exercise flares.",
    estimatedMinutes: 12,
    category: "exercise",
    steps: [
      {
        title: "Rinse within 20 minutes of finishing",
        description:
          "Don't let sweat dry on the skin. A quick lukewarm rinse (2–3 minutes) removes salt and sweat before they irritate. No soap needed unless visibly dirty.",
      },
      {
        title: "Pat dry and moisturise immediately",
        description:
          "Pat dry and apply your fragrance-free emollient while skin is still damp from the rinse. Skipping this step is a common cause of post-exercise flares.",
      },
      {
        title: "Change out of damp clothing",
        description:
          "Damp, sweaty fabric is a prolonged irritant. Change into clean, dry cotton as soon as possible after rinsing.",
      },
      {
        title: "Rehydrate",
        description:
          "Drink water after exercise. Internal hydration supports skin barrier function — well-hydrated skin handles barrier challenges better.",
      },
      {
        title: "Monitor your itch level",
        description:
          "Log your itch level after exercise. If you notice a consistent post-exercise spike, note the exercise type and intensity — it may help identify specific triggers like chlorine or cold outdoor air.",
      },
    ],
    source: "National Eczema Association",
    sourceUrl:
      "https://nationaleczema.org/eczema/causes-and-triggers-of-eczema/",
  },
  {
    id: "winter-dry-air-defence",
    title: "Winter Dry Air Defence",
    intro:
      "Cold air holds less moisture and indoor heating removes what little remains. Winter is the most common flare season. This routine adapts your skincare for the season.",
    estimatedMinutes: 10,
    category: "lifestyle",
    steps: [
      {
        title: "Switch to an ointment emollient",
        description:
          "In winter, upgrade from a lotion or cream to a thick ointment (e.g., white soft paraffin). Ointments are more occlusive and prevent trans-epidermal water loss in dry air.",
      },
      {
        title: "Set a bedroom humidifier to 40–50%",
        description:
          "Indoor heating can drop humidity below 20%. A humidifier in your bedroom — where you spend 7–9 hours — makes a significant difference to overnight skin condition.",
      },
      {
        title: "Protect exposed skin outdoors",
        description:
          "Apply emollient to face and hands before going outside. Wind and cold air together strip skin oils rapidly. Gloves and a scarf reduce direct cold-air exposure.",
      },
      {
        title: "Avoid overheating indoors",
        description:
          "Central heating set too high creates hot, dry air. Keep rooms at 18–20°C if possible. Overheating causes sweating, which is itself a trigger.",
      },
      {
        title: "Increase moisturising frequency",
        description:
          "In winter, apply emollient at least three times a day rather than twice: morning, after any wash, and before bed. Cold dry air raises your skin's water loss rate significantly.",
      },
    ],
    source: "British Association of Dermatologists",
    sourceUrl:
      "https://www.bad.org.uk/patient-information-leaflets/atopic-eczema/",
  },
  {
    id: "travel-skin-kit",
    title: "Travel Skin Kit",
    intro:
      "Travel disrupts routine, exposes you to new allergens, and involves air conditioning, hotel toiletries, and stress — all common triggers. Preparation reduces the risk of a holiday flare.",
    estimatedMinutes: 15,
    category: "travel",
    steps: [
      {
        title: "Pack your own skincare — no hotel products",
        description:
          "Bring your regular fragrance-free cleanser, emollient, and any prescribed topicals. Hotel toiletries almost always contain fragrance and preservatives that trigger eczema.",
      },
      {
        title: "Bring enough medication for the full trip plus 3 extra days",
        description:
          "Running out of a prescribed topical abroad is a serious risk. Pack more than you need and keep it in your carry-on, not checked luggage.",
      },
      {
        title: "Moisturise during flights",
        description:
          "Cabin air humidity is around 10–20% — extremely drying. Apply emollient at boarding and again mid-flight on long hauls. Drink water, not alcohol, in-flight.",
      },
      {
        title: "Identify laundry risks at your destination",
        description:
          "If you'll be doing laundry, check whether your accommodation has fragrance-free detergent or pack a small supply. One wash in a scented hotel detergent can trigger a week-long flare.",
      },
      {
        title: "Keep your daily log going while travelling",
        description:
          "New environments mean new potential triggers. Keep logging daily — even a 30-second entry. If you flare, you'll have data to trace the cause.",
      },
    ],
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/living-with-eczema/travel-tips/",
  },
  {
    id: "wet-wrap-therapy",
    title: "Wet Wrap Therapy",
    intro:
      "Wet wrap therapy is an intensive treatment for moderate-to-severe flares. It dramatically boosts emollient and topical absorption. Only use this when your normal routine isn't controlling a flare — discuss with your dermatologist first.",
    estimatedMinutes: 30,
    category: "flare",
    steps: [
      {
        title: "Soak in lukewarm water for 10 minutes",
        description:
          "A full bath is ideal. The goal is to hydrate the skin's outer layers before sealing moisture in. Keep the water lukewarm — hot water worsens inflammation.",
      },
      {
        title: "Pat dry and apply topical treatments",
        description:
          "Pat (don't rub) with a soft towel. Immediately apply any prescribed topical corticosteroid or calcineurin inhibitor to affected areas only.",
      },
      {
        title: "Apply a thick layer of emollient over everything",
        description:
          "Cover all treated and dry areas — face, limbs, trunk — with a generous layer of fragrance-free emollient ointment.",
      },
      {
        title: "Dampen the inner layer of bandages or clothing",
        description:
          "Dampen clean cotton bandages or a full cotton pyjama set with warm water until wet but not dripping. Wring out excess water.",
      },
      {
        title: "Apply wet layer directly over emollient",
        description:
          "Wrap the wet bandages or put on the wet cotton pyjamas over the emollient. The wet layer drives the emollient and topical into the skin barrier.",
      },
      {
        title: "Layer a dry layer over the wet layer",
        description:
          "Put a dry cotton layer over the wet one — dry pyjamas over wet, or dry tubular bandages over wet. This retains heat and prevents the wet layer from chilling you.",
      },
      {
        title: "Leave on for 2–6 hours or overnight",
        description:
          "The wraps can be left on during sleep for maximum benefit. Remove if the skin becomes uncomfortable or if you overheat. After removing, apply fresh emollient.",
      },
    ],
    source: "National Eczema Association",
    sourceUrl: "https://nationaleczema.org/eczema/treatment/wet-wrap-therapy/",
  },
  {
    id: "better-sleep-protocol",
    title: "Better Sleep Protocol",
    intro:
      "Poor sleep and eczema form a vicious cycle — itch worsens at night, disrupting sleep, and sleep deprivation lowers the itch threshold. This protocol targets both sides.",
    estimatedMinutes: 20,
    category: "sleep",
    steps: [
      {
        title: "Lower your bedroom temperature",
        description:
          "Heat is a major nocturnal itch trigger. Set your bedroom to 16–18°C if possible. Use lighter bedding layers you can adjust rather than one thick duvet.",
      },
      {
        title: "Complete your evening skin routine 30 minutes before bed",
        description:
          "Finish bathing, applying topicals, and moisturising at least 30 minutes before you try to sleep. This lets the emollient absorb and reduces itch spikes from the application itself.",
      },
      {
        title: "Use 100% cotton bedding, washed fragrance-free",
        description:
          "Synthetic bedding and scented detergents are significant nocturnal triggers. Wash pillowcases and sheets weekly. Change pillow covers every 2–3 days during a flare.",
      },
      {
        title: "Antihistamine if recommended by your doctor",
        description:
          "A sedating antihistamine taken before bed may reduce nocturnal itch and help you stay asleep through minor itch signals. Only use if your dermatologist has recommended this.",
      },
      {
        title: "Keep cotton gloves nearby",
        description:
          "Put thin cotton gloves on your bedside table. If itch wakes you, put them on before you become fully conscious — they prevent scratch damage during the half-asleep state.",
      },
      {
        title: "Log your sleep quality each morning",
        description:
          "Rate your sleep quality in the morning log. Over weeks, you'll see correlations between sleep quality and the previous day's itch level, food, stress, or skin routine.",
      },
    ],
    source: "British Association of Dermatologists",
    sourceUrl:
      "https://www.bad.org.uk/patient-information-leaflets/atopic-eczema/",
  },
];
