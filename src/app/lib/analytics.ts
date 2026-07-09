import { supabase } from "./supabase";
import { getPlaces } from "./places";

export type DistrictCount = { district: string; count: number };
export type RatingBucket = { bucket: string; count: number };
export type GrowthPoint = { date: string; total: number };

export type PlaceAnalytics = {
  byDistrict: DistrictCount[];
  ratingBuckets: RatingBucket[];
  cafes: number;
  restaurants: number;
  avgRating: number;
};

// Aggregates the already-cached catalog — no extra network cost.
export async function getPlaceAnalytics(): Promise<PlaceAnalytics> {
  const places = await getPlaces();

  const byDistrictMap = new Map<string, number>();
  for (const p of places) {
    if (!p.district) continue;
    byDistrictMap.set(p.district, (byDistrictMap.get(p.district) ?? 0) + 1);
  }
  const byDistrict = [...byDistrictMap.entries()]
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const bucketDefs = [
    { bucket: "أقل من ٣٫٥", min: 0, max: 3.5 },
    { bucket: "٣٫٥ – ٤", min: 3.5, max: 4 },
    { bucket: "٤ – ٤٫٥", min: 4, max: 4.5 },
    { bucket: "٤٫٥ – ٥", min: 4.5, max: 5.01 },
  ];
  const ratingBuckets = bucketDefs.map(b => ({ bucket: b.bucket, count: 0 }));
  let ratingSum = 0;
  let rated = 0;
  for (const p of places) {
    const r = p.googleRating;
    if (r == null || r <= 0) continue;
    ratingSum += r;
    rated += 1;
    const i = bucketDefs.findIndex(b => r >= b.min && r < b.max);
    if (i >= 0) ratingBuckets[i].count += 1;
  }

  return {
    byDistrict,
    ratingBuckets,
    cafes: places.filter(p => p.type === "كافيه").length,
    restaurants: places.filter(p => p.type === "مطعم").length,
    avgRating: rated ? Math.round((ratingSum / rated) * 100) / 100 : 0,
  };
}

// Cumulative catalog size per day. created_at isn't part of the Place
// model, so fetch just that column (paged past the 1000-row cap).
export async function getPlaceGrowth(): Promise<GrowthPoint[]> {
  const PAGE = 1000;
  const dates: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("places")
      .select("created_at")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    dates.push(...data.map(r => (r.created_at as string).slice(0, 10)));
    if (data.length < PAGE) break;
  }
  const perDay = new Map<string, number>();
  for (const d of dates) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  let total = 0;
  return [...perDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => {
      total += count;
      return { date, total };
    });
}
