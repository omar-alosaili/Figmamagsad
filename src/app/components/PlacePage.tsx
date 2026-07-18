import { useEffect, useRef, useState } from "react";
import { tappable } from "../lib/a11y";
import { motion } from "motion/react";
import {
  ArrowRight, Bookmark, Share2, MapPin, Clock, Star, Wifi, Users, Baby,
  Trees, Car, ExternalLink, ChevronLeft, Plus, X, Check
} from "lucide-react";
import { type Place, type List, displayRating } from "./data";
import { Button } from "./Button";
import { getPlaceById, invalidatePlacesCache } from "../lib/places";
import { getListsContainingPlace, getMyLists, addPlaceToList } from "../lib/lists";
import { getReviewsForPlace, addReview } from "../lib/reviews";
import { getVisitStatus, setVisitStatus, type VisitStatus } from "../lib/visitedPlaces";
import { toast } from "../lib/toast";
import { OpeningHours } from "./OpeningHours";
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
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewsFailed, setReviewsFailed] = useState(false);

  // The viewer's own review, if any — submitting again edits it.
  const myReview = userId ? reviews.find(r => r.userId === userId) : undefined;

  // In-flight guard: rapid taps raced the UPSERT against the DELETE and
  // could silently drop the user's last choice (same guard as handleSave).
  const visitInFlight = useRef(false);
  const visitTouched = useRef(false);

  useEffect(() => {
    // Reset per-place UI state so navigating place→place doesn't carry
    // over the previous place's tab, image, or half-typed review draft.
    setTab("info");
    setActiveImage(0);
    setShowReviewForm(false);
    setReviewRating(5);
    setReviewComment("");
    setReviewsFailed(false);
    getPlaceById(placeId).then(setPlace).catch(console.error);
    getListsContainingPlace(placeId).then(setPlaceLists).catch(console.error);
    getReviewsForPlace(placeId).then(setReviews).catch(() => setReviewsFailed(true));
    setLocalVisitStatus(null);
    visitTouched.current = false;
    if (userId) {
      getMyLists(userId).then(setMyLists).catch(console.error);
      // Ignore the fetched status if the user already toggled while it was
      // in flight — a slow response must not blank their optimistic choice.
      getVisitStatus(userId, placeId)
        .then(s => { if (!visitTouched.current) setLocalVisitStatus(s); })
        .catch(console.error);
    } else {
      setMyLists([]);
    }
  }, [placeId, userId]);

  const toggleVisitStatus = (status: VisitStatus) => {
    if (!userId) { toast.info("سجّل الدخول لتسجيل زياراتك"); return; }
    if (visitInFlight.current) return;
    visitTouched.current = true;
    const prev = visitStatus;
    const next = visitStatus === status ? null : status;
    setLocalVisitStatus(next);
    visitInFlight.current = true;
    setVisitStatus(userId, placeId, next)
      .catch(() => {
        setLocalVisitStatus(prev);
        toast.error("تعذّر تحديث حالة الزيارة — حاول مجدداً");
      })
      .finally(() => { visitInFlight.current = false; });
  };

  const submitReview = () => {
    if (!userId || !reviewComment.trim() || reviewSubmitting) return;
    const isEdit = !!myReview;
    setReviewSubmitting(true);
    addReview({ placeId, userId, rating: reviewRating, comment: reviewComment.trim() })
      .then(review => {
        // Replace an edited review instead of duplicating it in the list
        setReviews(prev => [review, ...prev.filter(r => r.id !== review.id)]);
        setShowReviewForm(false);
        setReviewComment("");
        setReviewRating(5);
        toast.success(isEdit ? "تم تحديث تقييمك" : "تم نشر تقييمك، شكراً لك");
        // The rating trigger just changed places.rating/review_count —
        // refetch so the blended header rating doesn't go stale, and drop
        // the shared catalog cache so other screens pick it up too.
        invalidatePlacesCache();
        getPlaceById(placeId).then(p => { if (p) setPlace(p); }).catch(() => {});
      })
      .catch(() => toast.error("تعذّر نشر التقييم — حاول مجدداً"))
      .finally(() => setReviewSubmitting(false));
  };

  const sharePlace = () => {
    if (!place) return;
    const url = `${window.location.origin}/?p=${place.id}`;
    if (navigator.share) navigator.share({ title: place.name, url }).catch(() => {});
    else navigator.clipboard.writeText(url)
      .then(() => toast.success("تم نسخ رابط المكان"))
      .catch(() => toast.error("تعذّر نسخ الرابط"));
  };

  const saveToList = (listId: string) => {
    addPlaceToList(listId, place!.id)
      .then(result => {
        if (result === "exists") {
          toast.info("المكان موجود في هذه القائمة مسبقاً");
          return;
        }
        toast.success("تمت إضافة المكان إلى القائمة");
        // keep the modal's place counts honest without a refetch
        setMyLists(prev => prev.map(l =>
          l.id === listId ? { ...l, placeCount: l.placeCount + 1, placeIds: [...l.placeIds, place!.id] } : l,
        ));
      })
      .catch(() => toast.error("تعذّرت إضافة المكان إلى القائمة — حاول مجدداً"));
    // Ensure saved — never toggle: adding an already-saved place to a
    // second list must not silently unsave it.
    if (!savedPlaces.has(place!.id)) onSave(place!.id);
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
          aria-label="رجوع"
          className="absolute top-14 right-5 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
        >
          <ArrowRight size={20} className="text-foreground" />
        </button>

        {/* Action Buttons */}
        <div className="absolute top-14 left-5 flex gap-2">
          <button
            onClick={sharePlace}
            aria-label="مشاركة المكان"
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md"
          >
            <Share2 size={16} className="text-foreground" />
          </button>
          {/* Guests can't have lists — onSave shows the login nudge
              instead of opening a dead-end modal. */}
          <button
            onClick={() => (userId ? setShowSaveModal(true) : onSave(place.id))}
            aria-label="حفظ المكان"
            aria-pressed={savedPlaces.has(place.id)}
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
                aria-label={`الصورة ${(i + 1).toLocaleString("en-US")}`}
                aria-current={i === activeImage}
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
              place.isOpen ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
            }`}
          >
            {place.isOpen ? "مفتوح" : "مغلق"}
          </span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star size={15} className="fill-rating text-rating" />
            <span className="font-semibold text-foreground">{displayRating(place).rating}</span>
            <span className="text-muted-foreground text-sm">({displayRating(place).count} تقييم)</span>
          </div>
          <span className="text-sm text-muted-foreground">{priceMap[place.priceLevel]}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <MapPin size={14} className="text-accent flex-shrink-0" />
          <span>{place.address}</span>
        </div>
        <OpeningHours value={place.openingHours} isOpen={place.isOpen} />

        {/* Quick Actions */}
        <div className="flex gap-3 mb-6">
          {/* Enabled for guests too — the tap shows the login nudge instead
              of a dead dimmed control (same pattern as save/review/follow). */}
          <button
            onClick={() => toggleVisitStatus("visited")}
            aria-pressed={visitStatus === "visited"}
            className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
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
            aria-pressed={visitStatus === "want_to_visit"}
            className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
              visitStatus === "want_to_visit"
                ? "bg-accent text-white border-accent"
                : "bg-card border-border text-foreground"
            }`}
          >
            {visitStatus === "want_to_visit" ? <Check size={15} /> : null}
            {visitStatus === "want_to_visit" ? "أرغب بالزيارة ✓" : "أرغب بالزيارة"}
          </button>
        </div>

        {/* Maps Button — query_place_id opens the actual Google listing
            (name, photos, reviews); the lat/lng query is the fallback pin
            for admin-created places without a Google ID. */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.latitude},${place.longitude}`)}${place.googlePlaceId ? `&query_place_id=${encodeURIComponent(place.googlePlaceId)}` : ""}`}
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
              {userId ? (
                <button
                  onClick={() => setShowReviewForm(v => {
                    // Editing: prefill the form with the existing review
                    if (!v && myReview) { setReviewRating(myReview.rating); setReviewComment(myReview.comment); }
                    return !v;
                  })}
                  className="flex items-center gap-1 text-sm text-accent font-medium"
                >
                  <Plus size={14} /> {myReview ? "عدّل تقييمك" : "أضف تقييمك"}
                </button>
              ) : (
                <button
                  onClick={() => toast.info("سجّل الدخول لإضافة تقييم")}
                  className="flex items-center gap-1 text-sm text-accent font-medium"
                >
                  <Plus size={14} /> أضف تقييمك
                </button>
              )}
            </div>
            {showReviewForm && (
              <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                <div className="flex gap-1 mb-3" style={{ direction: "ltr" }} role="radiogroup" aria-label="التقييم بالنجوم">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setReviewRating(n)}
                      role="radio"
                      aria-checked={reviewRating === n}
                      aria-label={`${n} من 5 نجوم`}
                    >
                      <Star size={20} className={n <= reviewRating ? "fill-rating text-rating" : "text-muted"} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="شاركنا تجربتك..."
                  rows={3}
                  className="w-full bg-input-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none mb-1"
                />
                {!reviewComment.trim() && (
                  <p className="text-xs text-muted-foreground mb-2">اكتب تعليقاً قصيراً لنشر تقييمك</p>
                )}
                <Button
                  fullWidth
                  size="md"
                  onClick={submitReview}
                  loading={reviewSubmitting}
                  disabled={!reviewComment.trim() || reviewSubmitting}
                >
                  {myReview ? "تحديث التقييم" : "نشر التقييم"}
                </Button>
              </div>
            )}
            {reviewsFailed ? (
              <div className="text-center py-8 text-muted-foreground text-sm">تعذّر تحميل التقييمات — تأكد من اتصالك</div>
            ) : reviews.length === 0 ? (
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
                              <Star key={i} size={11} className={i < review.rating ? "fill-rating text-rating" : "text-muted"} />
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
                    {...tappable(() => onListClick(list.id), list.title)}
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
              {myLists.map(list => {
                const inList = list.placeIds.includes(place.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => saveToList(list.id)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:border-accent/40 transition-colors text-right"
                  >
                    <img src={list.coverImage} alt={list.title} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{list.title}</p>
                      <p className="text-xs text-muted-foreground">{list.placeCount} أماكن</p>
                    </div>
                    {inList && <span className="flex-shrink-0 text-xs text-success font-semibold">محفوظ هنا ✓</span>}
                  </button>
                );
              })}
              <button
                onClick={() => { setShowSaveModal(false); onListClick(""); }}
                className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-accent/40 text-accent hover:bg-accent/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Plus size={20} className="text-accent" />
                </div>
                <span className="text-sm font-semibold">قائمة جديدة</span>
              </button>
              {savedPlaces.has(place.id) && (
                <button
                  onClick={() => { onSave(place.id); setShowSaveModal(false); }}
                  className="text-sm font-semibold text-destructive py-2"
                >
                  إزالة من المحفوظات
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
