import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  LineChart as LineChartIcon,
  TrendingUp,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const fxSeries = {
  "EUR/NOK": [
    { date: "2023", value: 10.85 },
    { date: "Q2", value: 11.18 },
    { date: "Q3", value: 11.42 },
    { date: "Q4", value: 11.31 },
    { date: "2024", value: 11.26 },
    { date: "Q2", value: 11.58 },
    { date: "Q3", value: 11.72 },
    { date: "Q4", value: 11.64 },
    { date: "2025", value: 11.43 },
    { date: "Q2", value: 11.71 },
    { date: "Q3", value: 11.82 },
    { date: "Q4", value: 11.66 },
    { date: "2026", value: 11.53 },
  ],
  "USD/NOK": [
    { date: "2023", value: 10.12 },
    { date: "Q2", value: 10.61 },
    { date: "Q3", value: 10.89 },
    { date: "Q4", value: 10.41 },
    { date: "2024", value: 10.36 },
    { date: "Q2", value: 10.79 },
    { date: "Q3", value: 10.95 },
    { date: "Q4", value: 11.12 },
    { date: "2025", value: 11.06 },
    { date: "Q2", value: 10.87 },
    { date: "Q3", value: 10.65 },
    { date: "Q4", value: 10.51 },
    { date: "2026", value: 10.38 },
  ],
  "SEK/NOK": [
    { date: "2023", value: 0.94 },
    { date: "Q2", value: 0.96 },
    { date: "Q3", value: 0.98 },
    { date: "Q4", value: 0.99 },
    { date: "2024", value: 1.01 },
    { date: "Q2", value: 1.0 },
    { date: "Q3", value: 0.99 },
    { date: "Q4", value: 0.98 },
    { date: "2025", value: 0.97 },
    { date: "Q2", value: 0.96 },
    { date: "Q3", value: 0.95 },
    { date: "Q4", value: 0.96 },
    { date: "2026", value: 0.97 },
  ],
};

const yieldRows = [
  { source: "Newsec", office: 4.5, retail: 5.1, logistics: 5.0 },
  { source: "UNION", office: 4.75, retail: 5.0, logistics: 5.25 },
  { source: "Akershus", office: 4.5, retail: 5.25, logistics: 5.0 },
];

const yieldAverage = yieldRows.reduce(
  (acc, row) => ({
    office: acc.office + row.office / yieldRows.length,
    retail: acc.retail + row.retail / yieldRows.length,
    logistics: acc.logistics + row.logistics / yieldRows.length,
  }),
  { office: 0, retail: 0, logistics: 0 }
);

const formatPercent = (value) => `${value.toFixed(2).replace(".", ",")} %`;
const formatNumber = (value, decimals = 2) => value.toFixed(decimals).replace(".", ",");

function Pill({ children, tone = "neutral" }) {
  const classes = {
    neutral: "bg-stone-100 text-stone-600",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${classes[tone]}`}>
      {children}
    </span>
  );
}

function Tile({ title, subtitle, value, unit, icon, accent = "slate", children, onClick, source, size = "standard" }) {
  const heightClasses = {
    standard: "min-h-36",
    large: "min-h-48",
    xlarge: "min-h-56",
  };

  const contentPaddingClasses = {
    standard: "",
    large: "pb-1",
    xlarge: "pb-2",
  };

  const accentClasses = {
    slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-100 text-violet-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    cyan: "bg-cyan-100 text-cyan-700",
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: onClick ? 0.985 : 1 }}
      onClick={onClick}
      className={`rounded-[1.65rem] bg-white p-4 text-left shadow-sm ring-1 ring-black/[0.04] ${heightClasses[size]} ${
        onClick ? "cursor-pointer active:shadow-none" : "cursor-default"
      }`}
    >
      <div className="flex min-h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${accentClasses[accent]}`}>
            {icon}
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">{title}</div>
            {source && <div className="mt-0.5 text-[10px] text-stone-400">{source}</div>}
          </div>
        </div>

        <div className={contentPaddingClasses[size]}>
          {value && (
            <div className="flex items-end gap-1">
              <span className="text-[1.55rem] font-semibold tracking-[-0.04em] text-stone-950">{value}</span>
              {unit && <span className="pb-1 text-xs font-medium text-stone-400">{unit}</span>}
            </div>
          )}
          {subtitle && <div className="mt-1 text-xs leading-snug text-stone-500">{subtitle}</div>}
          {children}
        </div>
      </div>
    </motion.button>
  );
}

function RateStack({ rows }) {
  return (
    <div className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between rounded-xl bg-stone-50 px-2.5 py-1.5">
          <span className="text-[12px] font-medium text-stone-500">{row.label}</span>
          <span className="text-[15px] font-semibold tabular-nums tracking-[-0.03em] text-stone-950">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function FxChange({ change }) {
  const strengthened = change > 0;
  return (
    <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${strengthened ? "text-emerald-600" : "text-rose-600"}`}>
      {strengthened ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      NOK {strengthened ? "+" : ""}{formatNumber(change, 1)} % / 30d
    </div>
  );
}

function Overlay({ title, children, onClose, footer }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 px-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ y: 18, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 12, scale: 0.98, opacity: 0 }}
          className="max-h-[84vh] w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-stone-950">{title}</div>
              <div className="mt-0.5 text-xs text-stone-400">Detaljvisning</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 active:scale-95"
              aria-label="Lukk"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-5">{children}</div>
          {footer && <div className="border-t border-stone-100 px-5 py-4">{footer}</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FxOverlay({ pair, onClose }) {
  const data = fxSeries[pair.name];
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const padding = (max - min) * 0.15 || 0.1;

  return (
    <Overlay
      title={pair.name}
      onClose={onClose}
      footer={
        <a className="flex items-center justify-between text-sm font-medium text-stone-700" href="#">
          Åpne kilde hos Norges Bank
          <ExternalLink size={16} />
        </a>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Siste kurs</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">{pair.value}</div>
        </div>
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">30 dager</div>
          <FxChange change={pair.change} />
        </div>
      </div>
      <div className="h-60 rounded-3xl bg-stone-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 14, left: 6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120,113,108,0.18)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#78716c" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[min - padding, max + padding]}
              tick={{ fontSize: 10, fill: "#57534e" }}
              tickLine={false}
              axisLine={false}
              width={58}
              tickMargin={8}
              tickFormatter={(value) => formatNumber(value, pair.name === "SEK/NOK" ? 3 : 2)}
            />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "0", boxShadow: "0 14px 40px rgba(0,0,0,0.12)" }}
              formatter={(value) => [formatNumber(value, pair.name === "SEK/NOK" ? 3 : 2), pair.name]}
            />
            <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={3} dot={false} className="text-stone-900" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Overlay>
  );
}

function YieldOverlay({ onClose }) {
  return (
    <Overlay
      title="Prime yield"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>Kilder: Newsec, UNION, Akershus Eiendom</span>
          <ExternalLink size={15} />
        </div>
      }
    >
      <div className="overflow-hidden rounded-3xl border border-stone-100">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.08em] text-stone-400">
            <tr>
              <th className="px-3 py-3 text-left font-semibold">Kilde</th>
              <th className="px-2 py-3 text-right font-semibold">Kontor</th>
              <th className="px-2 py-3 text-right font-semibold">Handel</th>
              <th className="px-3 py-3 text-right font-semibold">Logistikk</th>
            </tr>
          </thead>
          <tbody>
            {yieldRows.map((row) => (
              <tr key={row.source} className="border-t border-stone-100">
                <td className="px-3 py-3 font-medium text-stone-800">{row.source}</td>
                <td className="px-2 py-3 text-right tabular-nums text-stone-600">{formatPercent(row.office)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-stone-600">{formatPercent(row.retail)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-stone-600">{formatPercent(row.logistics)}</td>
              </tr>
            ))}
            <tr className="border-t border-stone-200 bg-stone-50 font-semibold">
              <td className="px-3 py-3 text-stone-950">Snitt</td>
              <td className="px-2 py-3 text-right tabular-nums text-stone-950">{formatPercent(yieldAverage.office)}</td>
              <td className="px-2 py-3 text-right tabular-nums text-stone-950">{formatPercent(yieldAverage.retail)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-stone-950">{formatPercent(yieldAverage.logistics)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Overlay>
  );
}

export default function MarketDashboardPrototype() {
  const [selectedFx, setSelectedFx] = useState(null);
  const [showYield, setShowYield] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  const fxTiles = useMemo(
    () => [
      { name: "EUR/NOK", value: "11,53", change: 1.2, decimals: 2 },
      { name: "USD/NOK", value: "10,38", change: -0.8, decimals: 2 },
      { name: "SEK/NOK", value: "0,97", change: 0.4, decimals: 3 },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#f1efeb] text-stone-950">
      <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-8 pt-5">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-stone-950 text-white">
                <BarChart3 size={17} />
              </span>
              <Pill tone="good">MVP prototype</Pill>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.06em] text-stone-950">Marked</h1>
            <p className="mt-1 text-sm leading-snug text-stone-500">Renter, valuta og prime yield samlet i én mobilvisning.</p>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-black/[0.04]">
            <div className="flex items-center justify-end gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
              <Clock3 size={12} /> Sjekket
            </div>
            <div className="mt-1 text-xs font-semibold text-stone-700">18.05 · 09:05</div>
          </div>
        </header>

        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-[1.4rem] bg-white p-3 shadow-sm ring-1 ring-amber-200/70"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <AlertTriangle size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-stone-900">1 kilde bør sjekkes</div>
                  <p className="mt-0.5 text-xs leading-snug text-stone-500">
                    Akershus yield er merket som interaktiv kilde. Appen viser forrige lagrede verdi hvis henting feiler.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWarning(false)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500"
                  aria-label="Lukk varsel"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-800">Quick update</h2>
          <Pill>Alle tall er mock-data</Pill>
        </section>

        <main className="grid grid-cols-2 gap-3">
          <Tile title="Norge" source="SEB" accent="violet" icon={<TrendingUp size={17} />} size="large">
            <RateStack
              rows={[
                { label: "3Y swap", value: "4,12 %" },
                { label: "5Y swap", value: "4,05 %" },
                { label: "10Y swap", value: "4,02 %" },
              ]}
            />
          </Tile>

          <Tile title="Sverige" source="SEB" accent="blue" icon={<TrendingUp size={17} />} size="large">
            <RateStack
              rows={[
                { label: "3Y swap", value: "2,83 %" },
                { label: "5Y swap", value: "2,92 %" },
                { label: "10Y swap", value: "3,07 %" },
              ]}
            />
          </Tile>

          <Tile
            title="3M NIBOR"
            source="UNION"
            value="4,67"
            unit="%"
            subtitle="Ukentlig publisert verdi"
            accent="amber"
            icon={<CircleDollarSign size={17} />}
          />

          <Tile
            title="3M STIBOR"
            source="SFBF"
            value="2,48"
            unit="%"
            subtitle="Siste daglige fixing"
            accent="cyan"
            icon={<CircleDollarSign size={17} />}
          />

          {fxTiles.map((pair, index) => (
            <Tile
              key={pair.name}
              title={pair.name}
              source="Norges Bank"
              value={pair.value}
              accent={index === 0 ? "emerald" : index === 1 ? "rose" : "blue"}
              icon={<LineChartIcon size={17} />}
              onClick={() => setSelectedFx(pair)}
            >
              <FxChange change={pair.change} />
            </Tile>
          ))}

          <Tile
            title="Prime yield"
            source="Snitt"
            accent="slate"
            icon={<Building2 size={17} />}
            onClick={() => setShowYield(true)}
            size="large"
          >
            <RateStack
              rows={[
                { label: "Kontor", value: formatPercent(yieldAverage.office) },
                { label: "Handel", value: formatPercent(yieldAverage.retail) },
                { label: "Logistikk", value: formatPercent(yieldAverage.logistics) },
              ]}
            />
          </Tile>

          <Tile
            title="Neste"
            source="Planlagt"
            value="+"
            subtitle="Aksjer, indekser eller egne eiendoms-KPIer kan legges inn her."
            accent="slate"
            icon={<BriefcaseBusiness size={17} />}
          />
        </main>

        <footer className="mt-5 rounded-[1.5rem] bg-white/65 p-4 text-xs leading-relaxed text-stone-500 ring-1 ring-black/[0.03]">
          Datakilder bør caches i backend. Hver tile får egen kilde-status, datodato og fallback til sist vellykkede verdi.
        </footer>
      </div>

      {selectedFx && <FxOverlay pair={selectedFx} onClose={() => setSelectedFx(null)} />}
      {showYield && <YieldOverlay onClose={() => setShowYield(false)} />}
    </div>
  );
}
