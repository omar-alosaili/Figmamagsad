import { useState } from "react";
import { Clock, ChevronDown } from "lucide-react";

// getDay() 0..6 (Sun..Sat) → the Arabic day label Google uses in the data.
const DAY_BY_INDEX = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type DayHours = { day: string; hours: string; isToday: boolean };

// The stored value is newline-separated "اليوم: الساعات" lines (Google's
// weekdayDescriptions). Rendered in a <span> the newlines collapsed into
// one run-on line — parse it into rows instead.
function parseHours(raw: string): DayHours[] {
  const today = DAY_BY_INDEX[new Date().getDay()];
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const i = line.indexOf(":"); // day has no colon; times do → split on the first
      const day = i >= 0 ? line.slice(0, i).trim() : line;
      const hours = i >= 0 ? line.slice(i + 1).trim() : "";
      return { day, hours, isToday: day === today };
    });
}

export function OpeningHours({ value, isOpen }: { value: string; isOpen: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const days = parseHours(value);

  if (days.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Clock size={14} className="text-accent flex-shrink-0" />
        <span>ساعات العمل غير متوفرة</span>
      </div>
    );
  }

  const today = days.find(d => d.isToday);

  return (
    <div className="mb-5">
      {/* Summary row — today's hours + open/closed, tap to expand the week */}
      <button
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 text-sm"
      >
        <Clock size={14} className="text-accent flex-shrink-0" />
        <span className={`font-medium ${isOpen ? "text-success" : "text-danger"}`}>
          {isOpen ? "مفتوح الآن" : "مغلق الآن"}
        </span>
        {today && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground" dir="rtl">{today.hours || "—"}</span>
          </>
        )}
        <ChevronDown
          size={15}
          className={`text-muted-foreground mr-auto transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Full week */}
      {expanded && (
        <div className="flex flex-col gap-1 mt-3 pr-6">
          {days.map(d => (
            <div
              key={d.day}
              className={`flex items-center justify-between text-sm rounded-lg px-2 py-1 ${
                d.isToday ? "bg-muted text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              <span className="flex-shrink-0">{d.day}</span>
              <span dir="rtl" className="whitespace-nowrap">{d.hours || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
