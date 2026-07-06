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
};

// New Google-discovered places have no in-app reviews yet, so they'd
// otherwise show a permanent 0★ until someone reviews them.
export function displayRating(place: Place): { rating: number; count: number } {
  if (place.reviewCount > 0) return { rating: place.rating, count: place.reviewCount };
  if (place.googleRating != null) return { rating: place.googleRating, count: place.googleReviewCount ?? 0 };
  return { rating: place.rating, count: place.reviewCount };
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
