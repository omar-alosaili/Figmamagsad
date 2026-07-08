import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowRight, Bookmark, Share2, MapPin, Clock, Star, Wifi, Users, Baby,
  Trees, Car, ExternalLink, ChevronLeft, Plus, X, Check
} from "lucide-react";
import { type Place, type List, displayRating } from "./data";
import { getPlaceById } from "../lib/places";
import { getListsContainingPlace, getMyLists, addPlaceToList } from "../lib/lists";
import { getReviewsForPlace, addReview } from "../lib/reviews";
import { getVisitStatus, setVisitStatus, type VisitStatus } from "../lib/visitedPlaces";
import type { Review } from "../lib/types";

type Props = {
  placeId: string;
  userId: string | null;
  onBack: () => void;
  savedPlaces: Set<string>;
  onSave: (id: string) => void;
  onListClick: (id: string) => void;
};

const priceMap = { 1: "＄ اقتصادي", 2: "＄＄ متوسط", 3: "＄＄＄ مرتفع" };

export function PlacePage({ placeId, userId, onBack, savedPlaces, onSave, onListClick }: Props) {
  const [place, setPlace] = useState<Place | null>(null);
  const [placeLists, setPlaceLists] = useState<List[]>([]);
  const [myLists, setMyLists] = useState<List[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [visitStatus, setLocalVisitStatus] = useState<VisitStatus | null>(null);
  const [tab, setTab] = useState<"info" | "reviews" | "lists">("info");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    getPlaceById(placeId).then(setPlace).catch(console.error);
    getListsContainingPlace(placeId).then(setPlaceLists).catch(console.error);
    getReviewsForPlace(placeId).then(setReviews).catch(console.error);
    if (userId) {
      getMyLists(userId).then(setMyLists).catch(console.error);
      getVisitStatus(userId, placeId).then(setLocalVisitStatus).catch(console.error);
    } else {
      setMyLists([]);
    }
  }, [placeId, userId]);

  const toggleVisitStatus = (status: VisitStatus) => {
    if (!userId) return;
    const next = visitStatus === status ? null : status;
    setLocalVisitStatus(next);
    setVisitStatus(userId, placeId, next).catch(console.error);
  };

  const submitReview = () => {
    if (!userId || !reviewComment.trim()) return;
    addReview({ placeId, userId, rating: reviewRating, comment: reviewComment.trim() })
      .then(review => {
        setReviews(prev => [review, ...prev]);
        setShowReviewForm(false);
        setReviewComment("");
        setReviewRating(5);
      })
      .catch(console.error);
  };

  const sharePlace = () => {
    if (!place) return;
    const url = `${window.location.origin}/?p=${place.id}`;
    if (navigator.share) navigator.share({ title: place.name, url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  };

  const saveToList = (listId: string) => {
    if (!userId) { onSave(place!.id); setShowSaveModal(false); return; }
    addPlaceToList(listId, place!.id).catch(console.error);
    onSave(place!.id);
    setShowSaveModal(false);
  };

  if (!place) return null;

  return (
    <div className="flex-1 overflow-y-auto pb-24" dir="rtl">
      {/* Images Carousel */}
      <div className="relative h-72 bg-muted">
        <img
          src={place.images[activeImage]}
          alt={place.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-14 right-5 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
        >
          <ArrowRight size={20} className="text-foreground" />
        </button>

        {/* Action Buttons */}
        <div className="absolute top-14 left-5 flex gap-2">
          <button
            onClick={sharePlace}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <Share2 size={16} className="text-foreground" />
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <Bookmark
              size={16}
              className={savedPlaces.has(place.id) ? "fill-accent text-accent" : "text-foreground"}
            />
          </button>
        </div>

        {/* Image Dots */}
        {place.images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {place.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`rounded-full transition-all ${
                  i === activeImage ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="absolute bottom-8 right-4 flex gap-2">
          {place.isNew && (
            <span className="bg-accent text-white text-xs px-2.5 py-1 rounded-full font-medium">جديد</span>
          )}
          {place.isVerified && (
            <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full font-medium">✓ موثق</span>
          )}
        </div>
      </div>

      {/* Place Info */}
      <div className="px-5 py-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{place.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {place.category ? `${place.type} · ${place.category}` : place.type}
            </p>
          </div>
          <span
            className={`text-sm px-3 py-1.5 rounded-full font-medium flex-shrink-0 mt-1 ${
              place.isOpen ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500"
            }`}
          >
            {place.isOpen ? "مفتوح" : "مغلق"}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star size={15} className="fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{displayRating(place).rating}</span>
            <span className="text-muted-foreground text-sm">({displayRating(place).count} تقييم)</span>
          </div>
          <span className="text-sm text-muted-foreground">{priceMap[place.priceLevel]}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <MapPin size={14} className="text-accent flex-shrink-0" />
          <span>{place.address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
          <Clock size={14} className="text-accent flex-shrink-0" />
          <span>{place.openingHours}</span>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => toggleVisitStatus("visited")}
            disabled={!userId}
            className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              visitStatus === "visited"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-foreground"
            }`}
          >
            {visitStatus === "visited" ? <Check size={15} /> : null}
            {visitStatus === "visited" ? "زرته ✓" : "زرته"}
          </button>
          <button
            onClick={() => toggleVisitStatus("want_to_visit")}
            disabled={!userId}
            className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              visitStatus === "want_to_visit"
                ? "bg-accent text-white border-accent"
                : "bg-card border-border text-foreground"
            }`}
          >
            {visitStatus === "want_to_visit" ? <Check size={15} /> : null}
            {visitStatus === "want_to_visit" ? "أرغب بالزيارة ✓" : "أرغب بالزيارة"}
          </button>
        </div>

        {/* Maps Button */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 rounded-2xl bg-muted text-foreground text-sm font-semibold flex items-center justify-center gap-2 mb-6 hover:bg-secondary transition-colors"
        >
          <MapPin size={15} className="text-accent" />
          فتح الاتجاهات في الخريطة
          <ExternalLink size={13} className="text-muted-foreground" />
        </a>

        {/* Features Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {place.isWorkFriendly && (
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-xl text-foreground">
              <Wifi size={13} className="text-accent" /> مناسب للعمل
            </span>
          )}
          {place.isFamilyFriendly && (
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-xl text-foreground">
              <Users size={13} className="text-accent" /> عائلي
            </span>
          )}
          {place.isKidsFriendly && (
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-xl text-foreground">
              <Baby size={13} className="text-accent" /> مناسب للأطفال
            </span>
          )}
          {place.hasOutdoorSeating && (
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-xl text-foreground">
              <Trees size={13} className="text-accent" /> جلسات خارجية
            </span>
          )}
          {place.hasParking && (
            <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-xl text-foreground">
              <Car size={13} className="text-accent" /> مواقف
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-2xl mb-5">
          {(["info", "reviews", "lists"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "info" ? "المعلومات" : t === "reviews" ? "التقييمات" : "القوائم"}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div>
            <p className="text-sm text-foreground leading-relaxed mb-4">{place.description}</p>
            <div className="flex flex-wrap gap-2">
              {place.tags.map(tag => (
                <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
            {place.orderLink && (
              <a
                href={place.orderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                اطلب الآن <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{reviews.length} تقييم</p>
              {userId && (
                <button
                  onClick={() => setShowReviewForm(v => !v)}
                  className="flex items-center gap-1 text-sm text-accent font-medium"
                >
                  <Plus size={14} /> أضف تقييمك
                </button>
              )}
            </div>
            {showReviewForm && (
              <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                <div className="flex gap-1 mb-3" style={{ direction: "ltr" }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewRating(n)}>
                      <Star size={20} className={n <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted"} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="شاركنا تجربتك..."
                  rows={3}
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none mb-3"
                />
                <button
                  onClick={submitReview}
                  disabled={!reviewComment.trim()}
                  className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  نشر التقييم
                </button>
              </div>
            )}
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">لا توجد تقييمات بعد</div>
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {review.avatar && (
                        <img src={review.avatar} alt={review.user} className="w-9 h-9 rounded-full object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{review.user}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={11} className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted"} />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "lists" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">المكان في {placeLists.length} قوائم</p>
            {placeLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">لم يُضف بعد لأي قائمة</div>
            ) : (
              <div className="flex flex-col gap-3">
                {placeLists.map(list => (
                  <div
                    key={list.id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl cursor-pointer hover:border-accent/30 transition-colors"
                    onClick={() => onListClick(list.id)}
                  >
                    <img src={list.coverImage} alt={list.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">{list.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{list.placeCount} أماكن · {list.followers} متابع</p>
                    </div>
                    <ChevronLeft size={16} className="text-muted-foreground rotate-180" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 z-50 flex items-end" dir="rtl">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSaveModal(false)} />
          <div className="relative w-full bg-card rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold">احفظ في قائمة</h3>
              <button onClick={() => setShowSaveModal(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {userId && myLists.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">لا توجد قوائم بعد، أنشئ واحدة من تبويب القوائم</p>
              )}
              {myLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => saveToList(list.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:border-accent/40 transition-colors text-right"
                >
                  <img src={list.coverImage} alt={list.title} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{list.title}</p>
                    <p className="text-xs text-muted-foreground">{list.placeCount} أماكن</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setShowSaveModal(false); onListClick(""); }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-accent/40 text-accent hover:bg-accent/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Plus size={20} className="text-accent" />
                </div>
                <span className="text-sm font-semibold">قائمة جديدة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
