import React, { useEffect, useMemo, useState } from "react";
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

const fallbackFxSeries = {
  "EUR/NOK": [
    { date: "2023-05-18", value: 10.85 },
    { date: "2023-08-18", value: 11.18 },
    { date: "2023-11-18", value: 11.42 },
    { date: "2024-02-18", value: 11.31 },
    { date: "2024-05-18", value: 11.26 },
    { date: "2024-08-18", value: 11.58 },
    { date: "2024-11-18", value: 11.72 },
    { date: "2025-02-18", value: 11.64 },
    { date: "2025-05-18", value: 11.43 },
    { date: "2025-08-18", value: 11.71 },
    { date: "2025-11-18", value: 11.82 },
    { date: "2026-02-18", value: 11.66 },
    { date: "2026-05-18", value: 11.53 },
  ],
  "USD/NOK": [
    { date: "2023-05-18", value: 10.12 },
    { date: "2023-08-18", value: 10.61 },
    { date: "2023-11-18", value: 10.89 },
    { date: "2024-02-18", value: 10.41 },
    { date: "2024-05-18", value: 10.36 },
    { date: "2024-08-18", value: 10.79 },
    { date: "2024-11-18", value: 10.95 },
    { date: "2025-02-18", value: 11.12 },
    { date: "2025-05-18", value: 11.06 },
    { date: "2025-08-18", value: 10.87 },
    { date: "2025-11-18", value: 10.65 },
    { date: "2026-02-18", value: 10.51 },
    { date: "2026-05-18", value: 10.38 },
  ],
  "SEK/NOK": [
    { date: "2023-05-18", value: 0.94 },
    { date: "2023-08-18", value: 0.96 },
    { date: "2023-11-18", value: 0.98 },
    { date: "2024-02-18", value: 0.99 },
    { date: "2024-05-18", value: 1.01 },
    { date: "2024-08-18", value: 1.0 },
    { date: "2024-11-18", value: 0.99 },
    { date: "2025-02-18", value: 0.98 },
    { date: "2025-05-18", value: 0.97 },
    { date: "2025-08-18", value: 0.96 },
    { date: "2025-11-18", value: 0.95 },
    { date: "2026-02-18", value: 0.96 },
    { date: "2026-05-18", value: 0.97 },
  ],
};

const fallbackFxPairs = [
  { name: "EUR/NOK", value: 11.53, change30dNok: 1.2, date: "mock", series3y: fallbackFxSeries["EUR/NOK"] },
  { name: "USD/NOK", value: 10.38, change30dNok: -0.8, date: "mock", series3y: fallbackFxSeries["USD/NOK"] },
  { name: "SEK/NOK", value: 0.97, change30dNok: 0.4, date: "mock", series3y: fallbackFxSeries["SEK/NOK"] },
];

const fallbackStibor = {
  status: "loading",
  sourceName: "SFBF STIBOR",
  sourceUrl: "https://swfbf.se/stibor/rates/",
  value: null,
  unit: "%",
  sourceDocument: null,
  observedDate: null,
  fetchedAt: null,
  message: null,
  lastRun: null,
};

const fallbackNibor = {
  status: "loading",
  sourceName: "SpareBank 1 Markets",
  sourceUrl: "https://www.sparebank1.no/content/dam/SB1/bank/sor-norge/markedsrapporter/markets/daglig_oppdatering/morgenmelding_valuta.pdf",
  value: null,
  unit: "%",
  sourceDocument: null,
  observedDate: null,
  fetchedAt: null,
  message: null,
  lastRun: null,
};

const fallbackSwaps = {
  status: "loading",
  sourceName: "SEB",
  sourceUrl: "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates",
  fetchedAt: null,
  message: null,
  data: {
    NOK: {
      currency: "NOK",
      rates: {
        "3 Yr": null,
        "5 Yr": null,
        "10 Yr": null,
      },
    },
    SEK: {
      currency: "SEK",
      rates: {
        "3 Yr": null,
        "5 Yr": null,
        "10 Yr": null,
      },
    },
  },
};

const fallbackYieldState = {
  status: "loading",
  sourceName: "Prime yield",
  fetchedAt: null,
  message: null,
  errors: [],
  rows: [
    { source: "UNION", office: { value: null }, retail: { value: null }, logistics: { value: null } },
    { source: "Newsec", office: { value: null }, retail: { value: null }, logistics: { value: null } },
    { source: "Akershus", office: { value: null }, retail: { value: null }, logistics: { value: null } },
  ],
  data: {
    office: { label: "Kontor", average: null, sources: {} },
    retail: { label: "Handel", average: null, sources: {} },
    logistics: { label: "Logistikk", average: null, sources: {} },
  },
};

const fallbackInsiderTrades = {
  status: "loading",
  sourceName: "Oslo Børs NewsWeb",
  fetchedAt: null,
  message: null,
  latest: [],
  week: [],
};

const formatPercent = (value) => `${value.toFixed(2).replace(".", ",")} %`;

function formatOptionalPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  return formatPercent(Number(value));
}
const formatNumber = (value, decimals = 2) => Number(value).toFixed(decimals).replace(".", ",");

function hasNumericValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function getFxDecimals(pairName) {
  return pairName === "SEK/NOK" ? 3 : 2;
}

function formatDateTimeShort(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("no-NO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatChartDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("no-NO", {
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("no-NO", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatShares(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) || Number(value) <= 0) return "—";
  return new Intl.NumberFormat("no-NO", { maximumFractionDigits: 0 }).format(Number(value));
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("no-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
}

function displayCompany(trade) {
  const issuerId = trade?.issuerId;
  const issuerName = trade?.issuerName;

  if (issuerId && issuerId !== "MESSAGE" && issuerId !== "—") return issuerId;
  if (issuerName && issuerName !== "MESSAGE" && issuerName !== "—") return issuerName;
  return "—";
}

function TypeBadge({ type }) {
  const clean = type || "—";
  const cls =
    clean === "Kjøp"
      ? "bg-emerald-50 text-emerald-700"
      : clean === "Salg"
        ? "bg-rose-50 text-rose-700"
        : "bg-stone-100 text-stone-500";
  return <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${cls}`}>{clean}</span>;
}

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

function Tile({ title, subtitle, value, unit, icon, accent = "slate", children, onClick, source, size = "standard", wide = false }) {
  const heightClasses = {
    standard: "min-h-36",
    large: "min-h-48",
    xlarge: "min-h-56",
    insider: "min-h-[20rem]",
  };

  const contentPaddingClasses = {
    standard: "",
    large: "pb-1",
    xlarge: "pb-2",
    insider: "pb-2",
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
      className={`${wide ? "col-span-2" : ""} rounded-[1.65rem] bg-white p-4 text-left shadow-sm ring-1 ring-black/[0.04] ${heightClasses[size]} ${
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
  const data = pair.series3y || fallbackFxSeries[pair.name] || [];
  const values = data.map((d) => d.value).filter((value) => Number.isFinite(value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.15 || 0.1;
  const decimals = getFxDecimals(pair.name);

  return (
    <Overlay
      title={pair.name}
      onClose={onClose}
      footer={
        <a
          className="flex items-center justify-between text-sm font-medium text-stone-700"
          href={pair.sourceUrl || "https://www.norges-bank.no/tema/Statistikk/Valutakurser/"}
          target="_blank"
          rel="noreferrer"
        >
          Åpne kilde hos Norges Bank
          <ExternalLink size={16} />
        </a>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Siste kurs</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">{formatNumber(pair.value, decimals)}</div>
          <div className="mt-1 text-[11px] text-stone-400">Dato: {pair.date || "—"}</div>
        </div>
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">30 dager</div>
          <FxChange change={pair.change30dNok} />
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
              minTickGap={28}
              interval="preserveStartEnd"
              tickFormatter={formatChartDate}
            />
            <YAxis
              domain={[min - padding, max + padding]}
              tick={{ fontSize: 10, fill: "#57534e" }}
              tickLine={false}
              axisLine={false}
              width={58}
              tickMargin={8}
              tickFormatter={(value) => formatNumber(value, decimals)}
            />
            <Tooltip
              contentStyle={{ borderRadius: 16, border: "0", boxShadow: "0 14px 40px rgba(0,0,0,0.12)" }}
              formatter={(value) => [formatNumber(value, decimals), pair.name]}
              labelFormatter={(value) => `Dato: ${value}`}
            />
            <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={3} dot={false} className="text-stone-900" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Overlay>
  );
}

function InsiderTradesTable({ trades, compact = false }) {
  const visible = trades || [];

  if (!visible.length) {
    return (
      <div className="rounded-2xl bg-stone-50 px-3 py-4 text-center text-xs text-stone-400">
        Ingen innsidehandler lagret ennå.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
      <table className="w-full table-fixed text-left">
        <thead className="bg-stone-50 text-[9px] uppercase tracking-[0.08em] text-stone-400">
          <tr>
            <th className="w-[13%] px-2 py-2 font-semibold">Dato</th>
            <th className="w-[15%] px-1 py-2 font-semibold">Selskap</th>
            <th className="w-[13%] px-1 py-2 font-semibold">Type</th>
            <th className="w-[25%] px-1 py-2 font-semibold">Stilling</th>
            <th className="w-[17%] px-1 py-2 text-right font-semibold">Aksjer</th>
            <th className="w-[17%] px-2 py-2 text-right font-semibold">Pris</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((trade) => (
            <tr key={trade.id || trade.messageId || trade.messageUrl} className="border-t border-stone-100">
              <td className="px-2 py-1.5 text-[10px] tabular-nums text-stone-500">{formatShortDate(trade.date)}</td>
              <td className="truncate px-1 py-1.5 text-[10px] font-semibold text-stone-800">{displayCompany(trade)}</td>
              <td className="px-1 py-1.5"><TypeBadge type={trade.type} /></td>
              <td className="truncate px-1 py-1.5 text-[10px] text-stone-500">{trade.personRole || "—"}</td>
              <td className="px-1 py-1.5 text-right text-[10px] tabular-nums text-stone-600">{formatShares(trade.shares)}</td>
              <td className="px-2 py-1.5 text-right text-[10px] tabular-nums text-stone-600">{formatPrice(trade.pricePerShare)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsiderTradesOverlay({ onClose, insiderState }) {
  return (
    <Overlay
      title="Innsidehandler"
      onClose={onClose}
      footer={
        <a
          className="flex items-center justify-between text-sm font-medium text-stone-700"
          href={insiderState.sourceUrl || "https://newsweb.oslobors.no/search?category=1102"}
          target="_blank"
          rel="noreferrer"
        >
          Åpne NewsWeb
          <ExternalLink size={16} />
        </a>
      }
    >
      <div className="mb-3 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
        {insiderState.status === "ok"
          ? `Siste uke: ${insiderState.week.length} meldinger.`
          : insiderState.status === "loading"
            ? "Leser innsidehandler fra Supabase..."
            : insiderState.message || "Ingen innsidehandler lagret ennå. Kjør /api/insider-trades?action=update."}
      </div>
      <div className="max-h-[52vh] overflow-y-auto pr-1">
        <InsiderTradesTable trades={insiderState.week} />
      </div>
    </Overlay>
  );
}

function YieldOverlay({ onClose, yieldState }) {
  const rows = yieldState.rows || fallbackYieldState.rows;

  return (
    <Overlay
      title="Prime yield"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>
            Snitt beregnes av tilgjengelige kilder: UNION, Newsec og Akershus.
          </span>
          <ExternalLink size={15} />
        </div>
      }
    >
      <div className="mb-3 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
        {yieldState.status === "ok"
          ? `Sist oppdatert: ${formatDateTimeShort(yieldState.fetchedAt)}`
          : yieldState.status === "partial"
            ? `Delvis oppdatert: ${formatDateTimeShort(yieldState.fetchedAt)}. ${yieldState.errors?.[0] || ""}`
            : yieldState.status === "loading"
              ? "Leser prime yield fra Supabase..."
              : yieldState.status === "empty"
                ? "Ingen prime yield-data lagret ennå. Kjør /api/update-yields."
                : `Kunne ikke lese prime yield: ${yieldState.message || "Ukjent feil"}`}
      </div>

      <div className="overflow-hidden rounded-3xl border border-stone-100">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-[10px] uppercase tracking-[0.08em] text-stone-400">
            <tr>
              <th className="px-3 py-3 text-left font-semibold">Kilde</th>
              <th className="px-2 py-3 text-right font-semibold">Kontor</th>
              <th className="px-2 py-3 text-right font-semibold">Handel</th>
              <th className="px-3 py-3 text-right font-semibold">Log.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.source} className="border-t border-stone-100">
                <td className="px-3 py-3">
                  <div className="font-medium text-stone-800">{row.source}</div>
                  <div className="mt-0.5 text-[10px] text-stone-400">
                    {[row.office?.status, row.retail?.status, row.logistics?.status].includes("stale")
                      ? "Delvis gammel"
                      : [row.office?.value, row.retail?.value, row.logistics?.value].some((value) => hasNumericValue(value))
                        ? "Lagret"
                        : "Mangler"}
                  </div>
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-stone-600">{formatOptionalPercent(row.office?.value)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-stone-600">{formatOptionalPercent(row.retail?.value)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-stone-600">{formatOptionalPercent(row.logistics?.value)}</td>
              </tr>
            ))}
            <tr className="border-t border-stone-200 bg-stone-50 font-semibold">
              <td className="px-3 py-3 text-stone-950">Snitt</td>
              <td className="px-2 py-3 text-right tabular-nums text-stone-950">{formatOptionalPercent(yieldState.data.office.average)}</td>
              <td className="px-2 py-3 text-right tabular-nums text-stone-950">{formatOptionalPercent(yieldState.data.retail.average)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-stone-950">{formatOptionalPercent(yieldState.data.logistics.average)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Overlay>
  );
}

export default function MarketDashboardPrototype() {
  const [selectedFx, setSelectedFx] = useState(null);
  const [showInsiderTrades, setShowInsiderTrades] = useState(false);
  const [showYield, setShowYield] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [insiderState, setInsiderState] = useState(fallbackInsiderTrades);
  const [swapsState, setSwapsState] = useState(fallbackSwaps);
  const [fxState, setFxState] = useState({
    status: "loading",
    fetchedAt: null,
    sourceName: "Norges Bank",
    sourceUrl: "https://www.norges-bank.no/tema/Statistikk/Valutakurser/",
    pairs: fallbackFxPairs,
    message: null,
  });
  const [stiborState, setStiborState] = useState(fallbackStibor);
  const [niborState, setNiborState] = useState(fallbackNibor);
  const [yieldState, setYieldState] = useState(fallbackYieldState);

  useEffect(() => {
    let cancelled = false;

    async function loadInsiderTrades() {
      try {
        const response = await fetch(`/api/insider-trades?ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente innsidehandler.");
        }

        if (!cancelled) {
          setInsiderState({
            status: payload.status || "empty",
            sourceName: payload.sourceName || "Oslo Børs NewsWeb",
            sourceUrl: payload.sourceUrl || "https://newsweb.oslobors.no/search?category=1102",
            fetchedAt: payload.fetchedAt,
            message: payload.message || null,
            latest: payload.latest || [],
            week: payload.week || [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setInsiderState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente innsidehandler.",
          }));
        }
      }
    }

    async function loadSwaps() {
      try {
        const response = await fetch(`/api/swaps?ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente SEB swap-renter.");
        }

        if (!cancelled) {
          setSwapsState({
            status: payload.status === "partial" ? "partial" : "ok",
            sourceName: payload.sourceName || "SEB",
            sourceUrl: payload.sourceUrl || fallbackSwaps.sourceUrl,
            fetchedAt: payload.fetchedAt,
            message: payload.errors?.length ? payload.errors.join(" | ") : null,
            data: payload.data || fallbackSwaps.data,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setSwapsState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente SEB swap-renter.",
          }));
        }
      }
    }

    async function loadFx() {
      try {
        const response = await fetch("/api/fx");
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente valutakurser.");
        }

        if (!cancelled) {
          setFxState({
            status: "ok",
            fetchedAt: payload.fetchedAt,
            sourceName: payload.sourceName || "Norges Bank",
            sourceUrl: payload.sourceUrl,
            pairs: payload.pairs.map((pair) => ({
              ...pair,
              sourceUrl: payload.sourceUrl,
            })),
            message: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setFxState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente valutakurser.",
          }));
        }
      }
    }

    async function loadStibor() {
      try {
        const response = await fetch(`/api/stibor?ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente 3M STIBOR.");
        }

        if (!cancelled) {
          setStiborState({
            status: payload.status || "empty",
            sourceName: payload.sourceName || "SFBF STIBOR",
            sourceUrl: payload.sourceUrl || "https://swfbf.se/stibor/rates/",
            value: payload.value,
            unit: payload.unit || "%",
            sourceDocument: payload.sourceDocument || null,
            observedDate: payload.observedDate || null,
            fetchedAt: payload.fetchedAt || null,
            message: payload.message || null,
            lastRun: payload.lastRun || null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setStiborState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente 3M STIBOR.",
          }));
        }
      }
    }

    async function loadNibor() {
      try {
        const response = await fetch(`/api/nibor?ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke lese 3M NIBOR fra database.");
        }

        if (!cancelled) {
          setNiborState({
            status: payload.status || "empty",
            sourceName: payload.sourceName || "SpareBank 1 Markets",
            sourceUrl: payload.sourceUrl || "https://www.sparebank1.no/content/dam/SB1/bank/sor-norge/markedsrapporter/markets/daglig_oppdatering/morgenmelding_valuta.pdf",
            value: payload.value,
            unit: payload.unit || "%",
            sourceDocument: payload.sourceDocument || null,
            observedDate: payload.observedDate || null,
            fetchedAt: payload.fetchedAt || null,
            message: payload.message || null,
            lastRun: payload.lastRun || null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setNiborState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke lese 3M NIBOR.",
          }));
        }
      }
    }

    async function loadYields() {
      try {
        const response = await fetch(`/api/yields?ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente UNION M2-yielder.");
        }

        if (!cancelled) {
          setYieldState({
            status: payload.status || "empty",
            sourceName: payload.sourceName || "Prime yield",
            fetchedAt: payload.fetchedAt,
            message: payload.message || (payload.errors?.length ? payload.errors.join(" | ") : null),
            errors: payload.errors || [],
            data: payload.data || fallbackYieldState.data,
            rows: payload.rows || fallbackYieldState.rows,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setYieldState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente UNION M2-yielder.",
          }));
        }
      }
    }

    loadInsiderTrades();
    loadSwaps();
    loadFx();
    loadStibor();
    loadNibor();
    loadYields();

    return () => {
      cancelled = true;
    };
  }, []);

  const latestFetchedAt = useMemo(() => {
    const dates = [insiderState.fetchedAt, swapsState.fetchedAt, fxState.fetchedAt, stiborState.fetchedAt, niborState.fetchedAt, yieldState.fetchedAt]
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return dates[0]?.toISOString() || null;
  }, [insiderState.fetchedAt, swapsState.fetchedAt, fxState.fetchedAt, stiborState.fetchedAt, niborState.fetchedAt, yieldState.fetchedAt]);

  const hasError = insiderState.status === "error" || swapsState.status === "error" || fxState.status === "error" || stiborState.status === "error" || niborState.status === "error" || yieldState.status === "error";

  const statusPill = useMemo(() => {
    if (swapsState.status === "ok" && fxState.status === "ok" && stiborState.status === "ok" && niborState.status === "ok" && yieldState.status === "ok") {
      return { tone: "good", label: "Renter, FX + yield live" };
    }
    if (swapsState.status === "error") {
      return { tone: "bad", label: "SEB swap feilet" };
    }
    if (stiborState.status === "stale") {
      return { tone: "warn", label: "STIBOR sist vellykket" };
    }
    if (stiborState.status === "empty") {
      return { tone: "warn", label: "STIBOR ikke initialisert" };
    }
    if (niborState.status === "stale") {
      return { tone: "warn", label: "NIBOR sist vellykket" };
    }
    if (niborState.status === "empty") {
      return { tone: "warn", label: "NIBOR ikke initialisert" };
    }
    if (fxState.status === "ok" && stiborState.status === "ok" && yieldState.status === "ok") {
      return { tone: "good", label: "FX + STIBOR + UNION live" };
    }
    if (fxState.status === "ok" && stiborState.status === "ok" && yieldState.status === "partial") {
      return { tone: "warn", label: "FX/STIBOR live · UNION delvis" };
    }
    if (fxState.status === "ok" && stiborState.status === "fallback" && yieldState.status === "ok") {
      return { tone: "warn", label: "FX + UNION live · STIBOR siste kjente" };
    }
    if (hasError) return { tone: "bad", label: "Noen kilder feilet" };
    return { tone: "warn", label: "Henter markedsdata" };
  }, [swapsState.status, fxState.status, stiborState.status, niborState.status, yieldState.status, hasError]);

  const warningContent = useMemo(() => {
    if (insiderState.status === "error") {
      return {
        title: "Innsidehandler feilet",
        message: insiderState.message || "Kunne ikke lese innsidehandler fra NewsWeb/Supabase.",
      };
    }

    if (swapsState.status === "error") {
      return {
        title: "SEB swap-kilde feilet",
        message: `${swapsState.message} Swap-tilene viser tomme verdier til kilden fungerer igjen.`,
      };
    }

    if (fxState.status === "error") {
      return {
        title: "Valutakilde feilet",
        message: `${fxState.message} Appen viser midlertidig mock-data for valuta.`,
      };
    }

    if (stiborState.status === "error") {
      return {
        title: "STIBOR-lesing feilet",
        message: `${stiborState.message} Appen leser STIBOR fra Supabase, ikke fra hardkodet fallback.`,
      };
    }

    if (stiborState.status === "empty") {
      return {
        title: "STIBOR er ikke initialisert",
        message: "Kjør /api/update-stibor én gang etter deploy. Deretter leser appen sist vellykkede verdi fra Supabase.",
      };
    }

    if (stiborState.status === "stale") {
      return {
        title: "STIBOR viser sist vellykkede verdi",
        message: `${stiborState.message || "Siste oppdatering feilet."} Viser verdien lagret ${formatDateTimeShort(stiborState.fetchedAt)}.`,
      };
    }

    if (niborState.status === "error") {
      return {
        title: "NIBOR-lesing feilet",
        message: `${niborState.message} Appen leser NIBOR fra Supabase, ikke fra hardkodet fallback.`,
      };
    }

    if (yieldState.status === "error") {
      return {
        title: "UNION M2-kilde feilet",
        message: `${yieldState.message} Prime yield viser tomme verdier til kilden fungerer igjen.`,
      };
    }

    if (niborState.status === "empty") {
      return {
        title: "NIBOR er ikke initialisert",
        message: "Kjør /api/update-nibor én gang etter deploy. Da henter appen 3M NIBOR fra SpareBank 1 Markets og lagrer verdien i Supabase.",
      };
    }

    if (niborState.status === "stale") {
      return {
        title: "NIBOR viser sist vellykkede verdi",
        message: `${niborState.message || "Siste oppdatering feilet."} Viser verdien lagret ${formatDateTimeShort(niborState.fetchedAt)}.`,
      };
    }

    if (yieldState.status === "partial") {
      return {
        title: "UNION M2 delvis hentet",
        message: yieldState.message || "Minst ett segment mangler fra UNION M2. Appen viser segmentene som ble hentet.",
      };
    }

    return null;
  }, [
    swapsState.status,
    swapsState.message,
    fxState.status,
    fxState.message,
    stiborState.status,
    stiborState.message,
    stiborState.value,
    stiborState.date,
    niborState.status,
    niborState.message,
    niborState.fetchedAt,
    yieldState.status,
    yieldState.message,
  ]);

  return (
    <div className="min-h-screen bg-[#f1efeb] text-stone-950">
      <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-8 pt-5">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-stone-950 text-white">
                <BarChart3 size={17} />
              </span>
              <Pill tone={statusPill.tone}>{statusPill.label}</Pill>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.06em] text-stone-950">Marked</h1>
            <p className="mt-1 text-sm leading-snug text-stone-500">Renter, valuta og prime yield samlet i én mobilvisning.</p>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-black/[0.04]">
            <div className="flex items-center justify-end gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
              <Clock3 size={12} /> Sjekket
            </div>
            <div className="mt-1 text-xs font-semibold text-stone-700">{formatDateTimeShort(latestFetchedAt) || "—"}</div>
          </div>
        </header>

        <AnimatePresence>
          {showWarning && warningContent && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-4 rounded-[1.4rem] bg-white p-3 shadow-sm ring-1 ${
                hasError ? "ring-rose-200/80" : "ring-amber-200/70"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${
                    hasError ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <AlertTriangle size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-stone-900">{warningContent.title}</div>
                  <p className="mt-0.5 text-xs leading-snug text-stone-500">{warningContent.message}</p>
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
          <Pill>{niborState.status === "ok" && yieldState.status === "ok" ? "UNION live" : niborState.status === "loading" || yieldState.status === "loading" ? "Henter UNION" : "Delvis/fallback"}</Pill>
        </section>

        <main className="grid grid-cols-2 gap-3">
          <Tile title="Norge" source="SEB" accent="violet" icon={<TrendingUp size={17} />} size="large">
            <RateStack
              rows={[
                { label: "3Y swap", value: formatOptionalPercent(swapsState.data.NOK.rates["3 Yr"]) },
                { label: "5Y swap", value: formatOptionalPercent(swapsState.data.NOK.rates["5 Yr"]) },
                { label: "10Y swap", value: formatOptionalPercent(swapsState.data.NOK.rates["10 Yr"]) },
              ]}
            />
          </Tile>

          <Tile title="Sverige" source="SEB" accent="blue" icon={<TrendingUp size={17} />} size="large">
            <RateStack
              rows={[
                { label: "3Y swap", value: formatOptionalPercent(swapsState.data.SEK.rates["3 Yr"]) },
                { label: "5Y swap", value: formatOptionalPercent(swapsState.data.SEK.rates["5 Yr"]) },
                { label: "10Y swap", value: formatOptionalPercent(swapsState.data.SEK.rates["10 Yr"]) },
              ]}
            />
          </Tile>

          <Tile
            title="3M NIBOR"
            source={niborState.sourceName}
            value={hasNumericValue(niborState.value) ? formatNumber(niborState.value, 2) : "—"}
            unit="%"
            subtitle={
              niborState.status === "ok"
                ? `Hentet: ${formatDateTimeShort(niborState.fetchedAt)}`
                : niborState.status === "stale"
                  ? `Sist vellykket: ${formatDateTimeShort(niborState.fetchedAt)}`
                  : niborState.status === "empty"
                    ? "Kjør update-nibor"
                    : niborState.status === "loading"
                      ? "Leser Supabase"
                      : "Ingen verdi"
            }
            accent="amber"
            icon={<CircleDollarSign size={17} />}
          />

          <Tile
            title="3M STIBOR"
            source={stiborState.sourceName}
            value={hasNumericValue(stiborState.value) ? formatNumber(stiborState.value, 2) : "—"}
            unit="%"
            subtitle={
              stiborState.status === "ok"
                ? `Hentet: ${formatDateTimeShort(stiborState.fetchedAt)}`
                : stiborState.status === "stale"
                  ? `Sist vellykket: ${formatDateTimeShort(stiborState.fetchedAt)}`
                  : stiborState.status === "empty"
                    ? "Kjør update-stibor"
                    : stiborState.status === "loading"
                      ? "Leser Supabase"
                      : "Ingen verdi"
            }
            accent="cyan"
            icon={<CircleDollarSign size={17} />}
          />

          {fxState.pairs.map((pair, index) => (
            <Tile
              key={pair.name}
              title={pair.name}
              source="Norges Bank"
              value={formatNumber(pair.value, getFxDecimals(pair.name))}
              accent={index === 0 ? "emerald" : index === 1 ? "rose" : "blue"}
              icon={<LineChartIcon size={17} />}
              onClick={() => setSelectedFx(pair)}
            >
              <FxChange change={pair.change30dNok} />
              {pair.date && pair.date !== "mock" && <div className="mt-1 text-[10px] text-stone-400">Dato: {pair.date}</div>}
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
                { label: "Kontor", value: formatOptionalPercent(yieldState.data.office.average) },
                { label: "Handel", value: formatOptionalPercent(yieldState.data.retail.average) },
                { label: "Logistikk", value: formatOptionalPercent(yieldState.data.logistics.average) },
              ]}
            />
          </Tile>

          <Tile
            title="Innsidehandler"
            source="NewsWeb"
            accent="amber"
            icon={<BriefcaseBusiness size={17} />}
            onClick={() => setShowInsiderTrades(true)}
            size="insider"
            wide
          >
            <div className="mt-2">
              <InsiderTradesTable trades={insiderState.latest.slice(0, 10)} compact />
            </div>
          </Tile>

        </main>

        <footer className="mt-5 rounded-[1.5rem] bg-white/65 p-4 text-xs leading-relaxed text-stone-500 ring-1 ring-black/[0.03]">
          SEB swap, renter, valuta og prime yield lagres/leses via Supabase der det gir raskere dashboard og historikk.
        </footer>
      </div>

      {selectedFx && <FxOverlay pair={selectedFx} onClose={() => setSelectedFx(null)} />}
      {showInsiderTrades && <InsiderTradesOverlay insiderState={insiderState} onClose={() => setShowInsiderTrades(false)} />}
      {showYield && <YieldOverlay yieldState={yieldState} onClose={() => setShowYield(false)} />}
    </div>
  );
}
