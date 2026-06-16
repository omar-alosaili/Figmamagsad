import { motion, AnimatePresence } from "motion/react";
import { X, Bell, Bookmark, Heart, Shield, Tag } from "lucide-react";
import { USERS, PLACES } from "./data";

type Props = {
  open: boolean;
  onClose: () => void;
};

const NOTIFICATIONS = [
  {
    id: "n1",
    type: "offer",
    icon: <Tag size={16} className="text-accent" />,
    bg: "bg-accent/10",
    title: "عرض جديد في بلو ووتر",
    body: "٢٠٪ خصم على مشروبات الماتشا طوال الأسبوع",
    time: "منذ ٥ دقائق",
    unread: true,
    image: PLACES[1].image,
  },
  {
    id: "n2",
    type: "follow",
    icon: <Heart size={16} className="text-red-500" />,
    bg: "bg-red-50",
    title: "نوره الحربي بدأت تتابعك",
    body: "لديها ٢٤ قائمة وأكثر من ٨٩٠٠ متابع",
    time: "منذ ٣٠ دقيقة",
    unread: true,
    image: USERS[2].avatar,
  },
  {
    id: "n3",
    type: "save",
    icon: <Bookmark size={16} className="text-primary" />,
    bg: "bg-primary/8",
    title: "محمد حفظ ماتشا تايم",
    body: 'أضافه لقائمة "كافيهات للعمل"',
    time: "منذ ساعة",
    unread: false,
    image: PLACES[0].image,
  },
  {
    id: "n4",
    type: "verify",
    icon: <Shield size={16} className="text-green-600" />,
    bg: "bg-green-50",
    title: "تم قبول طلب التوثيق",
    body: "بلو ووتر الآن حساب موثق ✓",
    time: "منذ يومين",
    unread: false,
    image: PLACES[1].image,
  },
  {
    id: "n5",
    type: "new",
    icon: <Bell size={16} className="text-amber-600" />,
    bg: "bg-amber-50",
    title: "مكان جديد في حي العليا",
    body: 'تمت إضافة "هايد" في حي العليا — حي تتابعه',
    time: "منذ ٣ أيام",
    unread: false,
    image: PLACES[6].image,
  },
];

export function NotificationsPanel({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-50 bg-background shadow-2xl overflow-hidden flex flex-col"
            style={{ width: "90%", maxWidth: 380 }}
            dir="rtl"
          >
            <div className="flex items-center justify-between px-5 pt-14 pb-4 border-b border-border bg-card">
              <div>
                <h2 className="text-base font-bold text-foreground">الإشعارات</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {NOTIFICATIONS.filter(n => n.unread).length} جديد
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xs text-accent font-semibold">تعليم الكل مقروء</button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X size={16} className="text-foreground" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {NOTIFICATIONS.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-3 px-5 py-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors relative ${
                    notif.unread ? "bg-accent/3" : ""
                  }`}
                  style={{ backgroundColor: notif.unread ? "rgba(196,123,43,0.03)" : undefined }}
                >
                  {notif.unread && (
                    <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-accent" />
                  )}
                  <div className="relative flex-shrink-0">
                    <img
                      src={notif.image}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${notif.bg} flex items-center justify-center border-2 border-background`}>
                      {notif.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.body}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{notif.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
