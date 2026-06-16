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
};

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

export type User = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  listsCount: number;
  savedCount: number;
};

export const PLACES: Place[] = [
  {
    id: "1",
    name: "ماتشا تايم",
    nameEn: "Matcha Time",
    type: "كافيه",
    category: "مشروبات",
    district: "العليا",
    address: "طريق الملك فهد، العليا، الرياض",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 2,
    rating: 4.8,
    reviewCount: 234,
    isFamilyFriendly: true,
    isKidsFriendly: false,
    isWorkFriendly: true,
    hasOutdoorSeating: true,
    hasParking: true,
    openingHours: "٨ص – ١١م",
    isOpen: true,
    isNew: true,
    isVerified: true,
    description: "كافيه متخصص في الماتشا الياباني والمشروبات الصحية. بيئة هادئة تناسب العمل والدراسة.",
    tags: ["ماتشا", "صحي", "هادئ", "للعمل"],
    latitude: 24.6877,
    longitude: 46.7219,
  },
  {
    id: "2",
    name: "بلو ووتر",
    nameEn: "Blue Water",
    type: "كافيه",
    category: "قهوة مختصة",
    district: "حي السفارات",
    address: "شارع الأمير سلطان، حي السفارات، الرياض",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 3,
    rating: 4.9,
    reviewCount: 512,
    isFamilyFriendly: true,
    isKidsFriendly: true,
    isWorkFriendly: true,
    hasOutdoorSeating: true,
    hasParking: true,
    openingHours: "٧ص – ١٢م",
    isOpen: true,
    isNew: false,
    isVerified: true,
    description: "من أفضل كافيهات القهوة المختصة في الرياض. يقدمون قهوة من أجود المصادر العالمية.",
    tags: ["قهوة مختصة", "فخم", "للعائلة"],
    latitude: 24.6910,
    longitude: 46.6895,
  },
  {
    id: "3",
    name: "مطعم نوره",
    nameEn: "Noura Restaurant",
    type: "مطعم",
    category: "سعودي",
    district: "الملقا",
    address: "طريق أنس بن مالك، الملقا، الرياض",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 2,
    rating: 4.7,
    reviewCount: 891,
    isFamilyFriendly: true,
    isKidsFriendly: true,
    isWorkFriendly: false,
    hasOutdoorSeating: false,
    hasParking: true,
    openingHours: "١ظ – ١١م",
    isOpen: true,
    isNew: false,
    isVerified: true,
    description: "مطعم سعودي أصيل يقدم أشهى المأكولات المحلية بطريقة عصرية.",
    tags: ["سعودي", "عائلي", "أطفال"],
    latitude: 24.7512,
    longitude: 46.6734,
  },
  {
    id: "4",
    name: "ذا روستري",
    nameEn: "The Roastery",
    type: "كافيه",
    category: "قهوة مختصة",
    district: "النخيل",
    address: "طريق الملك عبدالله، النخيل، الرياض",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 2,
    rating: 4.6,
    reviewCount: 367,
    isFamilyFriendly: false,
    isKidsFriendly: false,
    isWorkFriendly: true,
    hasOutdoorSeating: false,
    hasParking: false,
    openingHours: "٩ص – ١٠م",
    isOpen: true,
    isNew: true,
    isVerified: true,
    description: "كافيه متخصص في تحميص القهوة. يقدمون تجربة فريدة لمحبي القهوة.",
    tags: ["قهوة", "للعمل", "هادئ", "جديد"],
    latitude: 24.7234,
    longitude: 46.6987,
  },
  {
    id: "5",
    name: "جلسة",
    nameEn: "Jalsa",
    type: "كافيه",
    category: "كافيه",
    district: "الربوة",
    address: "شارع الوادي، الربوة، الرياض",
    image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 1,
    rating: 4.5,
    reviewCount: 198,
    isFamilyFriendly: true,
    isKidsFriendly: true,
    isWorkFriendly: false,
    hasOutdoorSeating: true,
    hasParking: true,
    openingHours: "٤م – ١٢م",
    isOpen: false,
    isNew: false,
    isVerified: false,
    description: "كافيه دافئ بأجواء عائلية رائعة. مثالي للجلسات الخارجية مساءً.",
    tags: ["عائلي", "خارجي", "دافئ", "أطفال"],
    latitude: 24.6712,
    longitude: 46.7345,
  },
  {
    id: "6",
    name: "سحاب",
    nameEn: "Sahab",
    type: "مطعم",
    category: "فطور وغداء",
    district: "الغدير",
    address: "طريق الدائري الشمالي، الغدير، الرياض",
    image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1484723091739-30990106e50b?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 2,
    rating: 4.8,
    reviewCount: 445,
    isFamilyFriendly: true,
    isKidsFriendly: true,
    isWorkFriendly: false,
    hasOutdoorSeating: true,
    hasParking: true,
    openingHours: "٦ص – ٤م",
    isOpen: true,
    isNew: false,
    isVerified: true,
    description: "أفضل مكان للفطور في الرياض. يقدم فطاير شام وبيض وكل أصناف الفطور.",
    tags: ["فطور", "عائلي", "أطفال"],
    latitude: 24.7892,
    longitude: 46.7123,
  },
  {
    id: "7",
    name: "هايد",
    nameEn: "Hyde",
    type: "كافيه",
    category: "كافيه عصري",
    district: "العليا",
    address: "برج المملكة، العليا، الرياض",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 3,
    rating: 4.7,
    reviewCount: 623,
    isFamilyFriendly: false,
    isKidsFriendly: false,
    isWorkFriendly: true,
    hasOutdoorSeating: false,
    hasParking: true,
    openingHours: "٨ص – ١م",
    isOpen: true,
    isNew: false,
    isVerified: true,
    description: "كافيه فاخر في قلب العليا. تجربة راقية بإطلالة مميزة.",
    tags: ["فاخر", "للعمل", "راقي"],
    latitude: 24.6891,
    longitude: 46.7034,
    orderLink: "https://app.com",
  },
  {
    id: "8",
    name: "فيراندا",
    nameEn: "Veranda",
    type: "مطعم",
    category: "متنوع",
    district: "الورود",
    address: "شارع العروبة، الورود، الرياض",
    image: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format",
    ],
    priceLevel: 2,
    rating: 4.6,
    reviewCount: 312,
    isFamilyFriendly: true,
    isKidsFriendly: true,
    isWorkFriendly: false,
    hasOutdoorSeating: true,
    hasParking: true,
    openingHours: "١٢ظ – ١١م",
    isOpen: true,
    isNew: true,
    isVerified: false,
    description: "مطعم برازيلي عصري بأجواء جميلة وجلسات خارجية رائعة.",
    tags: ["عائلي", "خارجي", "أطفال", "جديد"],
    latitude: 24.6634,
    longitude: 46.6823,
  },
];

export const LISTS: List[] = [
  {
    id: "l1",
    userId: "u1",
    title: "كافيهات للعمل 💻",
    description: "أفضل كافيهات الرياض اللي تقدر تشتغل فيها",
    isPublic: true,
    coverImage: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop&auto=format",
    placeIds: ["1", "4", "7"],
    likes: 234,
    followers: 89,
  },
  {
    id: "l2",
    userId: "u2",
    title: "أماكن فطور 🍳",
    description: "وجهاتي المفضلة للفطور في الرياض",
    isPublic: true,
    coverImage: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=400&fit=crop&auto=format",
    placeIds: ["6", "3"],
    likes: 412,
    followers: 167,
  },
  {
    id: "l3",
    userId: "u3",
    title: "مطاعم عائلية 👨‍👩‍👧‍👦",
    description: "أماكن كاملة للعائلة والأطفال",
    isPublic: true,
    coverImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format",
    placeIds: ["3", "5", "6", "8"],
    likes: 891,
    followers: 334,
  },
  {
    id: "l4",
    userId: "u4",
    title: "كافيهات هادئة 🧘",
    description: "أماكن تلقى فيها جو هادئ وراقي",
    isPublic: true,
    coverImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop&auto=format",
    placeIds: ["1", "2", "4"],
    likes: 567,
    followers: 201,
  },
  {
    id: "l5",
    userId: "u5",
    title: "جلسات خارجية 🌿",
    description: "أحسن مكان تجلس برا بدون دفا",
    isPublic: true,
    coverImage: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&h=400&fit=crop&auto=format",
    placeIds: ["5", "6", "8"],
    likes: 323,
    followers: 112,
  },
];

export const OFFERS: Offer[] = [
  {
    id: "o1",
    placeId: "2",
    title: "٢٠٪ على كل مشروبات الماتشا",
    description: "طوال الأسبوع الجاري على كل مشروبات الماتشا الباردة والساخنة",
    endDate: "٢٠ يونيو",
    discount: "٢٠٪",
  },
  {
    id: "o2",
    placeId: "6",
    title: "فطور اثنين بسعر واحد",
    description: "كل خميس وجمعة - فطور اثنين بسعر واحد عند الطلب قبل ١٠ص",
    endDate: "٣٠ يونيو",
    discount: "٥٠٪",
  },
  {
    id: "o3",
    placeId: "7",
    title: "قهوة مجانية مع كل كيكة",
    description: "اطلب أي كيكة واحصل على قهوتك مجاناً",
    endDate: "١٥ يونيو",
  },
];

export const USERS: User[] = [
  {
    id: "u1",
    name: "سارة العتيبي",
    username: "@sara_eats",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format",
    bio: "أحب القهوة المختصة والأماكن الهادئة 🤍",
    followers: 2341,
    following: 189,
    listsCount: 8,
    savedCount: 124,
  },
  {
    id: "u2",
    name: "محمد الشمري",
    username: "@m7md_foodie",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format",
    bio: "صياد الأماكن الجديدة في الرياض 🍽",
    followers: 5621,
    following: 312,
    listsCount: 15,
    savedCount: 287,
  },
  {
    id: "u3",
    name: "نوره الحربي",
    username: "@noura_lists",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&auto=format",
    bio: "قوائم منظمة لكل مناسبة 📋✨",
    followers: 8934,
    following: 234,
    listsCount: 24,
    savedCount: 412,
  },
];

export const DISTRICTS = [
  "الجميع", "العليا", "حي السفارات", "الملقا", "النخيل", "الربوة", "الغدير", "الورود", "شمال الرياض", "جنوب الرياض"
];
