export type Place = {
  id: string;
  name: string;
  nameEn: string;
  type: "كافيه" | "مطعم";
  category: string;
  district: string;
  address: string;
  image: string;
  images: string[];
  priceLevel: 1 | 2 | 3;
  rating: number;
  reviewCount: number;
  isFamilyFriendly: boolean;
  isKidsFriendly: boolean;
  isWorkFriendly: boolean;
  hasOutdoorSeating: boolean;
  hasParking: boolean;
  openingHours: string;
  isOpen: boolean;
  isNew: boolean;
  isVerified: boolean;
  description: string;
  tags: string[];
  orderLink?: string;
  bookingLink?: string;
  latitude: number;
  longitude: number;
  googleRating: number | null;
  googleReviewCount: number | null;
  googlePlaceId: string | null;
};

// Blend in-app reviews with Google reviews, weighted by count, so a
// single app review doesn't displace thousands of Google ratings —
// and Google-discovered places never show a permanent 0★.
export function displayRating(place: Place): { rating: number; count: number } {
  const own = place.reviewCount > 0 ? { rating: place.rating, count: place.reviewCount } : null;
  const google =
    place.googleRating != null && (place.googleReviewCount ?? 0) > 0
      ? { rating: place.googleRating, count: place.googleReviewCount! }
      : null;
  if (own && google) {
    const count = own.count + google.count;
    const rating = Math.round(((own.rating * own.count + google.rating * google.count) / count) * 10) / 10;
    return { rating, count };
  }
  return own ?? google ?? { rating: place.rating, count: place.reviewCount };
}

export type List = {
  id: string;
  userId: string;
  title: string;
  description: string;
  isPublic: boolean;
  coverImage: string;
  placeIds: string[];
  likes: number;
  followers: number;
  isPaid: boolean;
  price: number | null;
  placeCount: number;
};

export type Offer = {
  id: string;
  placeId: string;
  title: string;
  description: string;
  endDate: string;
  discount?: string;
};

export const DISTRICTS = [
  "الجميع", "العليا", "حي السفارات", "الملقا", "النخيل", "الربوة", "الغدير", "الورود", "شمال الرياض", "جنوب الرياض"
];
