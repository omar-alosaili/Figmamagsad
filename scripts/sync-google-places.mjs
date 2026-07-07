// Monthly Google Places sync: discovers/refreshes cafes & restaurants in Riyadh.
// Run manually with `pnpm sync:google-places`, or scheduled via
// .github/workflows/sync-google-places.yml. Standalone Node script —
// never imported by the Vite app, so it never enters the client bundle.
//
// Writes only "base facts" (name on insert, address, lat/lng, opening
// hours, is_open, photos, google_rating/google_review_count, and
// Google-sourced attributes: outdoor seating, family/kids friendliness,
// breakfast tag). Curated editorial fields (category, district,
// work-friendliness, description, links, is_verified, price_level,
// owner_id, type after insert) are set once on insert and never
// touched again by this script.

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load keys from .env.script.local (gitignored), falling back to .env /
// process env (the GitHub workflow injects env vars directly).
dotenv.config({ path: ".env.script.local" });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_PLACES_API_KEY) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GOOGLE_PLACES_API_KEY in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Search centers — Riyadh's well-known commercial districts. Cost knob:
// trim or extend this list to control how many Nearby Search calls run
// per sync (districts x GOOGLE_TYPES.length = call count).
const DISTRICTS = [
  { name: "العليا", lat: 24.6939, lng: 46.6852 },
  { name: "حي السفارات", lat: 24.6877, lng: 46.6219 },
  { name: "الملقا", lat: 24.7944, lng: 46.6243 },
  { name: "النخيل", lat: 24.7569, lng: 46.6309 },
  { name: "الورود", lat: 24.7244, lng: 46.6634 },
  { name: "الياسمين", lat: 24.8240, lng: 46.6480 },
  { name: "غرناطة", lat: 24.7659, lng: 46.7470 },
  { name: "الملز", lat: 24.6685, lng: 46.7351 },
  { name: "الربوة", lat: 24.7058, lng: 46.7251 },
  { name: "قرطبة", lat: 24.7754, lng: 46.7587 },
];
const SEARCH_RADIUS_METERS = 3000;
const GOOGLE_TYPES = ["cafe", "restaurant"];
const MAX_PHOTOS_PER_PLACE = 3;
const PHOTO_MAX_WIDTH_PX = 800;

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
  "places.currentOpeningHours",
  "places.photos",
  "places.types",
  "places.businessStatus",
  // Atmosphere attributes — power the app's feature filters.
  "places.outdoorSeating",
  "places.goodForChildren",
  "places.goodForGroups",
  "places.menuForChildren",
  "places.servesBreakfast",
].join(",");

async function searchNearby(district, type) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: [type],
      languageCode: "ar",
      regionCode: "SA",
      locationRestriction: {
        circle: { center: { latitude: district.lat, longitude: district.lng }, radius: SEARCH_RADIUS_METERS },
      },
    }),
  });
  if (!res.ok) {
    console.error(`Nearby Search failed for ${district.name}/${type}: ${res.status} ${await res.text()}`);
    return [];
  }
  const json = await res.json();
  return (json.places ?? []).map((p) => ({ ...p, _searchDistrict: district.name }));
}

function mapGoogleType(types) {
  if (types?.some((t) => t === "cafe" || t === "coffee_shop")) return "كافيه";
  return "مطعم";
}

function mapOpeningHours(place) {
  const lines = place.regularOpeningHours?.weekdayDescriptions;
  return Array.isArray(lines) && lines.length ? lines.join("\n") : "";
}

function mapIsOpen(place) {
  if (place.businessStatus === "CLOSED_PERMANENTLY" || place.businessStatus === "CLOSED_TEMPORARILY") return false;
  if (typeof place.currentOpeningHours?.openNow === "boolean") return place.currentOpeningHours.openNow;
  return true;
}

async function downloadAndUploadPhotos(googlePlaceId, photos) {
  const urls = [];
  for (const photo of (photos ?? []).slice(0, MAX_PHOTOS_PER_PLACE)) {
    try {
      const mediaUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${PHOTO_MAX_WIDTH_PX}&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(mediaUrl);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const path = `google/${googlePlaceId}/${urls.length}.jpg`;
      const { error } = await supabase.storage.from("place-photos").upload(path, bytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) {
        console.error(`Photo upload failed for ${googlePlaceId}:`, error.message);
        continue;
      }
      const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    } catch (e) {
      console.error(`Photo fetch failed for ${googlePlaceId}:`, e.message);
    }
  }
  return urls;
}

// Google-sourced attributes shared by insert and update.
function mapAttributes(place) {
  return {
    has_outdoor_seating: place.outdoorSeating === true,
    is_family_friendly: place.goodForChildren === true || place.goodForGroups === true,
    is_kids_friendly: place.goodForChildren === true || place.menuForChildren === true,
  };
}

async function syncPlace(place) {
  const googlePlaceId = place.id;
  const { data: existing, error: selectError } = await supabase
    .from("places")
    .select("id, images, tags")
    .eq("google_place_id", googlePlaceId)
    .maybeSingle();
  if (selectError) throw selectError;

  const address = place.formattedAddress ?? "";
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const openingHours = mapOpeningHours(place);
  const isOpen = mapIsOpen(place);
  const googleRating = typeof place.rating === "number" ? place.rating : null;
  const googleReviewCount = typeof place.userRatingCount === "number" ? place.userRatingCount : null;
  const nameEn = /^[A-Za-z0-9 .,'&-]+$/.test(place.displayName?.text ?? "") ? place.displayName.text : "";

  if (existing) {
    // Photos rarely change and dominate API cost — only fetch them when
    // the place has none yet.
    const photos = existing.images?.length ? [] : await downloadAndUploadPhotos(googlePlaceId, place.photos);
    const update = {
      address,
      latitude,
      longitude,
      opening_hours: openingHours,
      is_open: isOpen,
      google_rating: googleRating,
      google_review_count: googleReviewCount,
      google_synced_at: new Date().toISOString(),
      ...mapAttributes(place),
    };
    if (photos.length) {
      update.image = photos[0];
      update.images = photos;
    }
    if (place.servesBreakfast === true && !(existing.tags ?? []).includes("فطور")) {
      update.tags = [...(existing.tags ?? []), "فطور"];
    }
    const { error } = await supabase.from("places").update(update).eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }

  const photos = await downloadAndUploadPhotos(googlePlaceId, place.photos);
  const insert = {
    name: place.displayName?.text ?? "",
    name_en: nameEn,
    type: mapGoogleType(place.types),
    category: "",
    district: place._searchDistrict,
    address,
    image: photos[0] ?? "",
    images: photos,
    latitude,
    longitude,
    opening_hours: openingHours,
    is_open: isOpen,
    description: "",
    tags: place.servesBreakfast === true ? ["فطور"] : [],
    is_new: true,
    is_verified: false,
    source: "google",
    google_place_id: googlePlaceId,
    google_rating: googleRating,
    google_review_count: googleReviewCount,
    google_synced_at: new Date().toISOString(),
    ...mapAttributes(place),
  };
  const { error } = await supabase.from("places").insert(insert);
  if (error) throw error;
  return "created";
}

async function main() {
  const found = new Map();
  for (const district of DISTRICTS) {
    for (const type of GOOGLE_TYPES) {
      const places = await searchNearby(district, type);
      for (const place of places) {
        if (!found.has(place.id)) found.set(place.id, place);
      }
    }
  }

  console.log(`Discovered ${found.size} unique places across ${DISTRICTS.length} districts.`);

  const counts = { created: 0, updated: 0, errors: 0 };
  for (const place of found.values()) {
    try {
      const result = await syncPlace(place);
      counts[result]++;
    } catch (e) {
      counts.errors++;
      console.error(`Failed to sync place ${place.id} (${place.displayName?.text}):`, e.message);
    }
  }

  // Age out the "new" badge: places stop being "جديد" two weeks after discovery.
  const { error: ageError } = await supabase
    .from("places")
    .update({ is_new: false })
    .eq("source", "google")
    .eq("is_new", true)
    .lt("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
  if (ageError) console.error("Failed to age is_new flags:", ageError.message);

  console.log(`Done. Created: ${counts.created}, Updated: ${counts.updated}, Errors: ${counts.errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
