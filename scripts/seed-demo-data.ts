/**
 * Seed 30 days of realistic demo data for a test user.
 *
 * Usage:
 *   pnpm tsx scripts/seed-demo-data.ts <user-email>
 *   pnpm tsx scripts/seed-demo-data.ts <user-email> --clear
 *
 * The --clear flag deletes all existing logs for the user before seeding.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const shouldClear = args.includes("--clear");

if (!email) {
  console.error("Usage: pnpm tsx scripts/seed-demo-data.ts <user-email> [--clear]");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}


// ---------------------------------------------------------------------------
// Data design — 30 days with realistic patterns:
//   • stress_flare: stress tag precedes flare 4× (→ likely confidence)
//   • food_flare:   dairy appears before flare 4× (→ likely confidence)
//   • clear_streak: 7 consecutive clear days
//   • frequent_flares: 4 flares in a 7-day window
// ---------------------------------------------------------------------------

type SkinStatus = "clear" | "mild" | "flare";
type QuickTag = "stress" | "poor_sleep" | "food" | "exercise" | "alcohol";

interface DaySpec {
  daysAgoN: number;
  skin_status: SkinStatus;
  itch_level: number;
  stress_level: number;
  sleep_hours: number;
  sleep_quality: number;
  affected_areas: string[];
  quick_tags: QuickTag[];
  notes: string | null;
  foods: { name: string; category: string }[];
}

const FACE_ARMS: string[] = ["face", "arms"];
const ARMS_HANDS: string[] = ["arms", "hands"];
const NECK_CHEST: string[] = ["neck", "chest"];
const NONE: string[] = [];

const DAYS: DaySpec[] = [
  // ── Week 4 ago: stress cycle triggering flares ──────────────────────────
  { daysAgoN: 29, skin_status: "mild",  itch_level: 4, stress_level: 6, sleep_hours: 6.5, sleep_quality: 5, affected_areas: ARMS_HANDS, quick_tags: ["stress"], notes: "Work deadline stress", foods: [] },
  { daysAgoN: 28, skin_status: "flare", itch_level: 8, stress_level: 7, sleep_hours: 5,   sleep_quality: 3, affected_areas: FACE_ARMS,  quick_tags: ["stress", "poor_sleep"], notes: "Really bad night", foods: [{ name: "Coffee", category: "drink" }] },
  { daysAgoN: 27, skin_status: "flare", itch_level: 7, stress_level: 6, sleep_hours: 5.5, sleep_quality: 4, affected_areas: FACE_ARMS,  quick_tags: ["poor_sleep"], notes: null, foods: [] },
  { daysAgoN: 26, skin_status: "mild",  itch_level: 5, stress_level: 5, sleep_hours: 7,   sleep_quality: 6, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [{ name: "Dairy milk", category: "dairy" }, { name: "Cheese", category: "dairy" }] },
  { daysAgoN: 25, skin_status: "flare", itch_level: 7, stress_level: 4, sleep_hours: 6,   sleep_quality: 5, affected_areas: FACE_ARMS,  quick_tags: ["food"], notes: "Had dairy again, skin bad", foods: [{ name: "Dairy milk", category: "dairy" }] },
  { daysAgoN: 24, skin_status: "mild",  itch_level: 4, stress_level: 3, sleep_hours: 7.5, sleep_quality: 7, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },
  { daysAgoN: 23, skin_status: "mild",  itch_level: 3, stress_level: 3, sleep_hours: 8,   sleep_quality: 8, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },

  // ── Week 3 ago: clear streak (7 days) ───────────────────────────────────
  { daysAgoN: 22, skin_status: "clear", itch_level: 1, stress_level: 2, sleep_hours: 8,   sleep_quality: 9, affected_areas: NONE,       quick_tags: ["exercise"], notes: "Feeling good!", foods: [] },
  { daysAgoN: 21, skin_status: "clear", itch_level: 1, stress_level: 2, sleep_hours: 8.5, sleep_quality: 9, affected_areas: NONE,       quick_tags: ["exercise"], notes: null, foods: [] },
  { daysAgoN: 20, skin_status: "clear", itch_level: 2, stress_level: 2, sleep_hours: 8,   sleep_quality: 8, affected_areas: NONE,       quick_tags: [], notes: null, foods: [] },
  { daysAgoN: 19, skin_status: "clear", itch_level: 1, stress_level: 1, sleep_hours: 9,   sleep_quality: 9, affected_areas: NONE,       quick_tags: [], notes: "Best week in months", foods: [] },
  { daysAgoN: 18, skin_status: "clear", itch_level: 2, stress_level: 2, sleep_hours: 8,   sleep_quality: 8, affected_areas: NONE,       quick_tags: ["exercise"], notes: null, foods: [] },
  { daysAgoN: 17, skin_status: "clear", itch_level: 1, stress_level: 2, sleep_hours: 8,   sleep_quality: 9, affected_areas: NONE,       quick_tags: [], notes: null, foods: [] },
  { daysAgoN: 16, skin_status: "clear", itch_level: 2, stress_level: 3, sleep_hours: 7.5, sleep_quality: 8, affected_areas: NONE,       quick_tags: [], notes: null, foods: [] },

  // ── Week 2 ago: dairy re-introduced, flares follow ──────────────────────
  { daysAgoN: 15, skin_status: "mild",  itch_level: 3, stress_level: 3, sleep_hours: 7,   sleep_quality: 7, affected_areas: ARMS_HANDS, quick_tags: ["food"], notes: "Had ice cream", foods: [{ name: "Ice cream", category: "dairy" }, { name: "Cheese pizza", category: "dairy" }] },
  { daysAgoN: 14, skin_status: "flare", itch_level: 7, stress_level: 4, sleep_hours: 6.5, sleep_quality: 5, affected_areas: FACE_ARMS,  quick_tags: ["food"], notes: "Dairy again, same reaction", foods: [{ name: "Dairy milk", category: "dairy" }] },
  { daysAgoN: 13, skin_status: "flare", itch_level: 8, stress_level: 5, sleep_hours: 5.5, sleep_quality: 4, affected_areas: FACE_ARMS,  quick_tags: ["poor_sleep", "stress"], notes: null, foods: [] },
  { daysAgoN: 12, skin_status: "flare", itch_level: 6, stress_level: 6, sleep_hours: 6,   sleep_quality: 5, affected_areas: FACE_ARMS,  quick_tags: ["stress"], notes: "Presentation at work", foods: [] },
  { daysAgoN: 11, skin_status: "mild",  itch_level: 5, stress_level: 5, sleep_hours: 6.5, sleep_quality: 6, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },
  { daysAgoN: 10, skin_status: "mild",  itch_level: 4, stress_level: 4, sleep_hours: 7,   sleep_quality: 6, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },
  { daysAgoN:  9, skin_status: "mild",  itch_level: 3, stress_level: 3, sleep_hours: 7.5, sleep_quality: 7, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },

  // ── Last week: stress cycle + dairy trigger ──────────────────────────────
  { daysAgoN:  8, skin_status: "mild",  itch_level: 3, stress_level: 3, sleep_hours: 7,   sleep_quality: 7, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },
  { daysAgoN:  7, skin_status: "mild",  itch_level: 4, stress_level: 6, sleep_hours: 6,   sleep_quality: 5, affected_areas: NECK_CHEST, quick_tags: ["stress", "food"], notes: "Late night, cheese board at dinner", foods: [{ name: "Cheese", category: "dairy" }, { name: "Crackers", category: "snack" }] },
  { daysAgoN:  6, skin_status: "flare", itch_level: 8, stress_level: 7, sleep_hours: 5,   sleep_quality: 3, affected_areas: FACE_ARMS,  quick_tags: ["stress", "poor_sleep"], notes: "Worst flare in two weeks", foods: [] },
  { daysAgoN:  5, skin_status: "flare", itch_level: 7, stress_level: 6, sleep_hours: 5.5, sleep_quality: 4, affected_areas: FACE_ARMS,  quick_tags: ["poor_sleep"], notes: null, foods: [] },
  { daysAgoN:  4, skin_status: "mild",  itch_level: 5, stress_level: 5, sleep_hours: 6.5, sleep_quality: 6, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },
  { daysAgoN:  3, skin_status: "mild",  itch_level: 4, stress_level: 4, sleep_hours: 7,   sleep_quality: 6, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [] },
  { daysAgoN:  2, skin_status: "mild",  itch_level: 3, stress_level: 3, sleep_hours: 7.5, sleep_quality: 7, affected_areas: ARMS_HANDS, quick_tags: [], notes: null, foods: [{ name: "Dairy milk", category: "dairy" }] },
  { daysAgoN:  1, skin_status: "flare", itch_level: 7, stress_level: 5, sleep_hours: 6,   sleep_quality: 5, affected_areas: FACE_ARMS,  quick_tags: ["food"], notes: "Dairy yesterday, flare today", foods: [] },
  { daysAgoN:  0, skin_status: "mild",  itch_level: 5, stress_level: 4, sleep_hours: 7,   sleep_quality: 6, affected_areas: ARMS_HANDS, quick_tags: [], notes: "Avoiding dairy today", foods: [] },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Looking up user: ${email}`);

  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) { console.error("Error listing users:", userErr.message); process.exit(1); }

  const user = users.users.find((u) => u.email === email);
  if (!user) { console.error(`No user found with email: ${email}`); process.exit(1); }

  const userId = user.id;
  console.log(`Found user: ${userId}`);

  if (shouldClear) {
    console.log("Clearing existing logs…");
    await supabase.from("ai_analyses").delete().eq("user_id", userId);
    await supabase.from("daily_logs").delete().eq("user_id", userId);
    console.log("Cleared.");
  }

  console.log(`Seeding ${DAYS.length} days of data…`);
  let inserted = 0;
  let skipped = 0;

  for (const day of DAYS) {
    const log_date = daysAgo(day.daysAgoN);

    // Skip if log already exists for this date (don't overwrite)
    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id")
      .eq("user_id", userId)
      .eq("log_date", log_date)
      .maybeSingle();

    if (existing && !shouldClear) {
      skipped++;
      continue;
    }

    const { data: log, error: logErr } = await supabase
      .from("daily_logs")
      .insert({
        user_id: userId,
        log_date,
        itch_level: day.itch_level,
        stress_level: day.stress_level,
        sleep_hours: day.sleep_hours,
        sleep_quality: day.sleep_quality,
        affected_areas: day.affected_areas,
        skin_status: day.skin_status,
        quick_tags: day.quick_tags,
        notes: day.notes,
      })
      .select("id")
      .single();

    if (logErr) { console.error(`Error inserting ${log_date}:`, logErr.message); continue; }

    if (day.foods.length > 0) {
      await supabase.from("food_entries").insert(
        day.foods.map((f) => ({
          log_id: log.id,
          food_name: f.name,
          category: f.category,
        })),
      );
    }

    inserted++;
  }

  console.log(`Done. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
  console.log(`\nExpected rule engine findings:`);
  console.log(`  • stress_flare   — 4 occurrences → likely confidence`);
  console.log(`  • food_flare     — dairy 4× before flare → likely confidence`);
  console.log(`  • clear_streak   — 7 consecutive clear days → strong confidence`);
  console.log(`  • frequent_flares — 4 flares in 7-day window → likely confidence`);
}

main().catch((err) => { console.error(err); process.exit(1); });
