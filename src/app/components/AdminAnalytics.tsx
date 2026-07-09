import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, LabelList,
} from "recharts";
import { getPlaceAnalytics, getPlaceGrowth, type PlaceAnalytics, type GrowthPoint } from "../lib/analytics";

// Chart colors from the app theme (validated against the white card
// surface: lightness, chroma, and 3:1 contrast all pass).
const MARK = "#C47B2B";      // --accent
const INK_MUTED = "#8A7268"; // --muted-foreground
const GRID = "#EDE8E1";      // --muted

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid rgba(44,24,16,0.12)",
  borderRadius: 12,
  fontSize: 12,
  fontFamily: "inherit",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <h3 className="text-sm font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<PlaceAnalytics | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);

  useEffect(() => {
    getPlaceAnalytics().then(setAnalytics).catch(console.error);
    getPlaceGrowth().then(setGrowth).catch(console.error);
  }, []);

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 mx-auto mb-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">جارٍ تحميل التحليلات...</p>
      </div>
    );
  }

  const tiles = [
    { label: "كافيهات", value: analytics.cafes.toLocaleString("ar") },
    { label: "مطاعم", value: analytics.restaurants.toLocaleString("ar") },
    { label: "متوسط التقييم", value: `${analytics.avgRating} ★` },
  ];

  return (
    <div className="mb-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {tiles.map(t => (
          <div key={t.label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-xl font-bold text-foreground">{t.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <ChartCard title="الأماكن حسب الحي (أعلى ١٢)">
        {/* Horizontal bars read best with Arabic district names */}
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={analytics.byDistrict.length * 28 + 20}>
            {/* reversed: bars grow right-to-left (RTL-native), putting the
                value end — and its label — away from the district names */}
            <BarChart data={analytics.byDistrict} layout="vertical" margin={{ top: 0, right: 4, left: 34, bottom: 0 }}>
              <XAxis type="number" hide reversed />
              <YAxis
                type="category"
                dataKey="district"
                orientation="right"
                width={86}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: INK_MUTED, fontFamily: "inherit" }}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: GRID, opacity: 0.5 }} formatter={(v: number) => [v, "مكان"]} />
              {/* exact values live in the tooltip — bar-end labels collide
                  with the district names on a reversed axis */}
              <Bar dataKey="count" fill={MARK} barSize={14} radius={[4, 0, 0, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="توزيع التقييمات (قوقل)">
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.ratingBuckets} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: INK_MUTED, fontFamily: "inherit" }} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: GRID, opacity: 0.5 }} formatter={(v: number) => [v, "مكان"]} />
              <Bar dataKey="count" fill={MARK} barSize={36} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: INK_MUTED }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="نمو دليل الأماكن">
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={growth} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: INK_MUTED }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={40}
                tick={{ fontSize: 10, fill: INK_MUTED }}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "مكان"]} />
              <Area type="monotone" dataKey="total" stroke={MARK} strokeWidth={2} fill={MARK} fillOpacity={0.12} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
