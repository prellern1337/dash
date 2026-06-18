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
  Newspaper,
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
  history: {
    NOK: { "3 Yr": [], "5 Yr": [], "10 Yr": [] },
    SEK: { "3 Yr": [], "5 Yr": [], "10 Yr": [] },
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

const fallbackNewsState = {
  status: "loading",
  sourceName: "DN, Finansavisen, E24 og Estate",
  fetchedAt: null,
  message: null,
  errors: [],
  items: [],
};

const fallbackIndices = {
  status: "loading",
  sourceName: "Market indices",
  fetchedAt: null,
  message: null,
  errors: [],
  items: [],
};

const fallbackWatchlist = {
  status: "loading",
  sourceName: "Watchlist",
  fetchedAt: null,
  message: null,
  errors: [],
  items: [],
};

const fallbackRealEstateWatchlist = {
  status: "loading",
  sourceName: "Eiendomsaksjer",
  fetchedAt: null,
  message: null,
  errors: [],
  items: [],
};

const formatPercent = (value) => `${value.toFixed(2).replace(".", ",")} %`;

function formatOptionalPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  return formatPercent(Number(value));
}

function formatIndexValue(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  return new Intl.NumberFormat("no-NO", {
    maximumFractionDigits: Number(value) >= 1000 ? 0 : 2,
  }).format(Number(value));
}

function formatSignedPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  const number = Number(value);
  const sign = number > 0 ? "+" : "";
  return `${sign}${formatNumber(number, 2)} %`;
}

function changeTone(value) {
  if (!Number.isFinite(Number(value))) return "text-stone-400";
  return Number(value) >= 0 ? "text-emerald-600" : "text-rose-600";
}

function formatPriceValue(value, currency) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";

  const number = Number(value);
  const decimals = currency === "USD" && number > 1000 ? 0 : number >= 100 ? 1 : number >= 10 ? 2 : 3;

  return new Intl.NumberFormat("no-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(number);
}

function isInverseRiskIndex(index) {
  return index?.id === "vix";
}

function indexChangeTone(index, value) {
  if (!Number.isFinite(Number(value))) return "text-stone-400";

  // For VIX, higher means more expected volatility/market stress.
  if (isInverseRiskIndex(index)) {
    return Number(value) <= 0 ? "text-emerald-600" : "text-rose-600";
  }

  return changeTone(value);
}

function indexAccent(index) {
  if (!Number.isFinite(Number(index?.change1d))) return "slate";

  // For VIX, negative is calmer/positive for risk sentiment.
  if (isInverseRiskIndex(index)) {
    return Number(index.change1d) <= 0 ? "emerald" : "rose";
  }

  return Number(index.change1d) >= 0 ? "emerald" : "rose";
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

function formatArticleDate(value) {
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

function formatSwapChartDate(value, data = []) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  const dates = (data || [])
    .map((point) => new Date(`${point.date}T12:00:00`))
    .filter((pointDate) => !Number.isNaN(pointDate.getTime()));

  if (!dates.length) {
    return new Intl.DateTimeFormat("no-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(date);
  }

  const min = Math.min(...dates.map((pointDate) => pointDate.getTime()));
  const max = Math.max(...dates.map((pointDate) => pointDate.getTime()));
  const spanDays = Math.round((max - min) / (1000 * 60 * 60 * 24));

  if (spanDays <= 90) {
    return new Intl.DateTimeFormat("no-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(date);
  }

  if (spanDays <= 730) {
    return new Intl.DateTimeFormat("no-NO", {
      month: "2-digit",
      year: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("no-NO", {
    year: "numeric",
  }).format(date);
}

function formatTooltipDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("no-NO", {
    day: "2-digit",
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


function formatSwapBps(value) {
  const bps = Number(value);
  if (!Number.isFinite(bps)) return "";
  const decimals = Math.abs(bps) >= 10 || Number.isInteger(bps) ? 0 : 1;
  return `${bps > 0 ? "+" : ""}${formatNumber(bps, decimals)}bp`;
}

function SwapChangeBadge({ changeBps }) {
  const hasValue = Number.isFinite(Number(changeBps));
  const bps = hasValue ? Number(changeBps) : 0;
  const isUp = hasValue && bps > 0;
  const isDown = hasValue && bps < 0;
  const className = isUp ? "text-rose-600" : isDown ? "text-emerald-600" : "text-stone-400";

  return (
    <span className={`ml-1 inline-flex w-[34px] shrink-0 items-center justify-end gap-0.5 whitespace-nowrap text-[9px] font-semibold tabular-nums ${className}`}>
      {isUp && <ArrowUpRight size={10} />}
      {isDown && <ArrowDownRight size={10} />}
      {!isUp && !isDown && <span className="inline-block w-[10px]" aria-hidden="true" />}
      {!hasValue ? "—" : !isUp && !isDown ? "0bp" : formatSwapBps(bps)}
    </span>
  );
}

function RateStack({ rows }) {
  return (
    <div className="mt-2 space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[26px_minmax(0,1fr)_38px] items-center gap-1 rounded-xl bg-stone-50 px-2 py-1.5">
          <span className="text-[11px] font-medium leading-tight text-stone-500">{row.label}</span>
          <span className="min-w-0 text-right text-[14px] font-semibold tabular-nums tracking-[-0.04em] text-stone-950">
            <span className="whitespace-nowrap">{row.value}</span>
          </span>
          <SwapChangeBadge changeBps={row.changeBps} />
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

function Overlay({ title, subtitle = "Detaljvisning", children, onClose, footer }) {
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
              <div className="mt-0.5 text-xs leading-snug text-stone-400">{subtitle}</div>
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


function mergeSwapHistory(historyForCurrency) {
  const byDate = new Map();
  for (const tenor of ["3 Yr", "5 Yr", "10 Yr"]) {
    for (const point of historyForCurrency?.[tenor] || []) {
      if (!byDate.has(point.date)) byDate.set(point.date, { date: point.date });
      byDate.get(point.date)[tenor] = point.value;
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function SwapOverlay({ currency, swapsState, onClose }) {
  const history = swapsState.history?.[currency] || {};
  const data = mergeSwapHistory(history);
  const current = swapsState.data?.[currency]?.rates || {};
  const values = data
    .flatMap((row) => ["3 Yr", "5 Yr", "10 Yr"].map((tenor) => row[tenor]))
    .filter((value) => Number.isFinite(Number(value)))
    .map(Number);

  const latestValues = Object.values(current)
    .filter((value) => Number.isFinite(Number(value)))
    .map(Number);

  const allValues = values.length ? values : latestValues;
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const padding = Math.max((max - min) * 0.18, 0.08);

  return (
    <Overlay
      title={`${currency} swap`}
      onClose={onClose}
      footer={
        <a
          className="flex items-center justify-between text-sm font-medium text-stone-700"
          href={swapsState.sourceUrl || "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates"}
          target="_blank"
          rel="noreferrer"
        >
          Åpne kilde hos SEB
          <ExternalLink size={16} />
        </a>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-2">
        {["3 Yr", "5 Yr", "10 Yr"].map((tenor) => (
          <div key={tenor} className="rounded-2xl bg-stone-50 p-3">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-stone-400">{tenor.replace(" Yr", "Y")}</div>
            <div className="mt-1 flex items-center text-lg font-semibold tracking-[-0.04em] text-stone-950">
              {formatOptionalPercent(current[tenor])}
              <SwapChangeBadge changeBps={swapsState.data?.[currency]?.changes?.[tenor]?.bps} />
            </div>
          </div>
        ))}
      </div>

      {data.length ? (
        <div className="h-64 rounded-3xl bg-stone-50 p-3">
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
                tickFormatter={(value) => formatSwapChartDate(value, data)}
              />
              <YAxis
                domain={[min - padding, max + padding]}
                tick={{ fontSize: 10, fill: "#57534e" }}
                tickLine={false}
                axisLine={false}
                width={58}
                tickMargin={8}
                tickFormatter={(value) => formatNumber(value, 2)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: "0", boxShadow: "0 14px 40px rgba(0,0,0,0.12)" }}
                formatter={(value, name) => [`${formatNumber(value, 2)} %`, name]}
                labelFormatter={(value) => `Dato: ${formatTooltipDate(value)}`}
              />
              <Line type="monotone" dataKey="3 Yr" name="3Y" stroke="#44403c" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="5 Yr" name="5Y" stroke="#78716c" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="10 Yr" name="10Y" stroke="#a8a29e" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-3xl bg-stone-50 p-4 text-sm text-stone-500">
          Ingen historikk lagret ennå. Historikken bygges opp etter hvert som <span className="font-medium text-stone-700">update-swaps</span> kjører.
        </div>
      )}

      <div className="mt-3 text-[11px] text-stone-400">
        Viser siste lagrede verdi per dag, inntil siste 60 dager. Pil/bp viser siste observasjon mot closing forrige arbeidsdag.
      </div>
    </Overlay>
  );
}



function RateHistoryOverlay({ rate, onClose }) {
  const data = rate.history || [];
  const values = data.map((point) => Number(point.value)).filter((value) => Number.isFinite(value));
  const min = values.length ? Math.min(...values) : Number(rate.value) || 0;
  const max = values.length ? Math.max(...values) : Number(rate.value) || 1;
  const padding = Math.max((max - min) * 0.18, 0.08);

  return (
    <Overlay
      title={rate.title}
      onClose={onClose}
      footer={
        <a
          className="flex items-center justify-between text-sm font-medium text-stone-700"
          href={rate.sourceUrl || "#"}
          target="_blank"
          rel="noreferrer"
        >
          Åpne kilde
          <ExternalLink size={16} />
        </a>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Siste verdi</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">
            {hasNumericValue(rate.value) ? `${formatNumber(rate.value, 2)} %` : "—"}
          </div>
          <div className="mt-1 text-[11px] text-stone-400">Hentet: {formatDateTimeShort(rate.fetchedAt)}</div>
        </div>
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Historikk</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">{data.length}</div>
          <div className="mt-1 text-[11px] text-stone-400">dagspunkter</div>
        </div>
      </div>

      {data.length >= 2 ? (
        <div className="h-64 rounded-3xl bg-stone-50 p-3">
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
                tickFormatter={(value) => formatSwapChartDate(value, data)}
              />
              <YAxis
                domain={[min - padding, max + padding]}
                tick={{ fontSize: 10, fill: "#57534e" }}
                tickLine={false}
                axisLine={false}
                width={58}
                tickMargin={8}
                tickFormatter={(value) => formatNumber(value, 2)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: "0", boxShadow: "0 14px 40px rgba(0,0,0,0.12)" }}
                formatter={(value) => [`${formatNumber(value, 2)} %`, rate.title]}
                labelFormatter={(value) => `Dato: ${formatTooltipDate(value)}`}
              />
              <Line type="monotone" dataKey="value" stroke="#44403c" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-3xl bg-stone-50 p-4 text-sm text-stone-500">
          For lite historikk til graf ennå. Grafen vises når det finnes minst to dagspunkter.
        </div>
      )}

      <div className="mt-3 text-[11px] text-stone-400">
        Viser siste lagrede verdi per dag, inntil siste 180 dager.
      </div>
    </Overlay>
  );
}





function NewsFeedTable({ items = [], compact = false }) {
  const rows = items || [];

  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-stone-50 px-3 py-4 text-center text-xs text-stone-400">
        Ingen nyheter lagret ennå. Kjør /api/news?action=update.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
      <table className="w-full table-fixed text-left">
        <thead className="sticky top-0 z-10 bg-stone-50 text-[9px] uppercase tracking-[0.08em] text-stone-400">
          <tr>
            <th className="w-[58%] px-2 py-2 font-semibold">Overskrift</th>
            <th className="w-[18%] px-1 py-2 font-semibold">Avis</th>
            <th className="w-[24%] px-2 py-2 text-right font-semibold">Publisert</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((article) => (
            <tr key={article.id || article.url || article.title} className="border-t border-stone-100">
              <td className={`${compact ? "px-2 py-1.5 text-[10px]" : "px-2 py-2 text-xs"} font-medium text-stone-800`}>
                <a
                  href={article.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-2 underline decoration-stone-300 underline-offset-4 active:scale-[0.98]"
                  onClick={(event) => event.stopPropagation()}
                >
                  {article.title}
                </a>
              </td>
              <td className={`${compact ? "px-1 py-1.5 text-[10px]" : "px-1 py-2 text-xs"} text-stone-500`}>
                {article.sourceName || "—"}
              </td>
              <td className={`${compact ? "px-2 py-1.5 text-[10px]" : "px-2 py-2 text-xs"} text-right tabular-nums text-stone-500`}>
                {formatArticleDate(article.publishedAt || article.fetchedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewsFeedTile({ newsState, onClick }) {
  const rows = newsState.items || [];

  return (
    <Tile
      title="Nyhetsfeed"
      source="DN / FA / E24 / Estate"
      accent="blue"
      icon={<Newspaper size={17} />}
      size="xlarge"
      wide
      onClick={onClick}
    >
      <div className="mt-2">
        <NewsFeedTable items={rows.slice(0, 9)} compact />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-stone-400">
        <span>{newsState.status === "loading" ? "Leser Supabase" : `Oppdatert: ${formatDateTimeShort(newsState.fetchedAt)}`}</span>
        <span>{rows.length} artikler</span>
      </div>
    </Tile>
  );
}

function NewsFeedOverlay({ newsState, onClose }) {
  const rows = newsState.items || [];

  return (
    <Overlay
      title="Nyhetsfeed"
      subtitle="De mest relevante sakene fra DN, Finansavisen, E24 og Estate."
      onClose={onClose}
      footer={
        <div className="text-xs leading-relaxed text-stone-500">
          Automatisk rangert på relevans for renter, marked og eiendom. Noen kilder kan ha betalingsmur.
        </div>
      }
    >
      <div className="mb-3 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
        {newsState.status === "loading"
          ? "Leser nyhetsfeed fra Supabase..."
          : newsState.status === "empty"
            ? "Ingen nyheter lagret ennå. Kjør /api/news?action=update."
            : `Sist oppdatert: ${formatDateTimeShort(newsState.fetchedAt)}. Viser ${rows.length} artikler.`}
      </div>
      <div className="max-h-[52vh] overflow-y-auto pr-1">
        <NewsFeedTable items={rows} />
      </div>
    </Overlay>
  );
}

function WatchlistTile({ watchlistState, onClick, title = "Watchlist", emptyText = "{emptyText}" }) {
  const rows = watchlistState.items || [];

  return (
    <Tile
      title={title}
      source="Yahoo"
      accent="slate"
      icon={<BarChart3 size={17} />}
      size="xlarge"
      wide
      onClick={onClick}
    >
      <div className="mt-2 overflow-hidden rounded-2xl border border-stone-100">
        <table className="w-full text-[11px]">
          <thead className="bg-stone-50 text-[9px] uppercase tracking-[0.08em] text-stone-400">
            <tr>
              <th className="px-2 py-2 text-left font-semibold">Navn</th>
              <th className="px-1 py-2 text-right font-semibold">Kurs</th>
              <th className="px-1 py-2 text-right font-semibold">1D</th>
              <th className="px-1 py-2 text-right font-semibold">1M</th>
              <th className="px-2 py-2 text-right font-semibold">1Å</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((asset) => (
              <tr key={asset.id} className="border-t border-stone-100">
                <td className="px-2 py-1.5 font-medium text-stone-800">
                  <a
                    href={asset.linkUrl || asset.sourceUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-stone-300 underline-offset-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {asset.name}
                  </a>
                </td>
                <td className="px-1 py-1.5 text-right tabular-nums text-stone-950">{formatPriceValue(asset.value, asset.currency)}</td>
                <td className={`px-1 py-1.5 text-right tabular-nums ${changeTone(asset.change1d)}`}>{formatSignedPercent(asset.change1d)}</td>
                <td className={`px-1 py-1.5 text-right tabular-nums ${changeTone(asset.change1m)}`}>{formatSignedPercent(asset.change1m)}</td>
                <td className={`px-2 py-1.5 text-right tabular-nums ${changeTone(asset.change1y)}`}>{formatSignedPercent(asset.change1y)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-stone-400">
                  Ingen kurser lagret ennå. Kjør /api/watchlist?action=backfill.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-stone-400">
        <span>{watchlistState.status === "loading" ? "Leser kurser" : `Live/delayed: ${formatDateTimeShort(watchlistState.fetchedAt)}`}</span>
        <span>{rows.length} instrumenter</span>
      </div>
    </Tile>
  );
}


function WatchlistOverlay({ watchlistState, onClose, title = "Watchlist" }) {
  const rows = watchlistState.items || [];

  return (
    <Overlay
      title={title}
      subtitle="Siste Yahoo-kurs/delayed quote, med endring mot historiske sluttkurser."
      onClose={onClose}
    >
      <div className="mb-3 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
        {watchlistState.status === "loading"
          ? "Leser kurser..."
          : `Live/delayed: ${formatDateTimeShort(watchlistState.fetchedAt)}. 1M og 1Å beregnes fra lagret historikk i Supabase.`}
      </div>

      <div className="max-h-[52vh] overflow-y-auto rounded-3xl border border-stone-100">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-stone-50 text-[10px] uppercase tracking-[0.08em] text-stone-400">
            <tr>
              <th className="px-3 py-3 text-left font-semibold">Ticker</th>
              <th className="px-2 py-3 text-right font-semibold">Kurs</th>
              <th className="px-2 py-3 text-right font-semibold">1D</th>
              <th className="px-2 py-3 text-right font-semibold">1M</th>
              <th className="px-3 py-3 text-right font-semibold">1Å</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((asset) => (
              <tr key={asset.id} className="border-t border-stone-100">
                <td className="px-3 py-3">
                  <a
                    href={asset.linkUrl || asset.sourceUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 active:scale-[0.98]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {asset.name}
                    <ExternalLink size={12} />
                  </a>
                  <div className="mt-0.5 text-[10px] text-stone-400">
                    {asset.symbol || asset.longName || ""} · {asset.linkSourceName || "Yahoo"}
                  </div>
                </td>
                <td className="px-2 py-3 text-right tabular-nums text-stone-950">
                  {formatPriceValue(asset.value, asset.currency)}
                  <div className="mt-0.5 text-[10px] text-stone-400">{asset.currency || ""}</div>
                </td>
                <td className={`px-2 py-3 text-right tabular-nums ${changeTone(asset.change1d)}`}>{formatSignedPercent(asset.change1d)}</td>
                <td className={`px-2 py-3 text-right tabular-nums ${changeTone(asset.change1m)}`}>{formatSignedPercent(asset.change1m)}</td>
                <td className={`px-3 py-3 text-right tabular-nums ${changeTone(asset.change1y)}`}>{formatSignedPercent(asset.change1y)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-stone-400">
                  Ingen kurser lagret ennå. Kjør /api/watchlist?action=backfill.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Overlay>
  );
}



function IndexMiniChart({ data = [], change, index }) {
  const values = data.map((point) => Number(point.value)).filter((value) => Number.isFinite(value));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const padding = Math.max((max - min) * 0.15, 0.01);

  if (data.length < 2) {
    return <div className="mt-2 h-14 rounded-2xl bg-stone-50" />;
  }

  return (
    <div className={`mt-2 h-14 ${indexChangeTone(index, change)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 2, left: 2, bottom: 2 }}>
          <YAxis hide domain={[min - padding, max + padding]} />
          <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function IndexTile({ index, onClick }) {
  return (
    <Tile
      title={index.name}
      source={index.sourceName || "Index"}
      accent={indexAccent(index)}
      icon={<LineChartIcon size={17} />}
      onClick={onClick}
      size="standard"
    >
      <div className="mt-1 flex items-start justify-between gap-2">
        <div>
          <div className="text-2xl font-semibold tracking-[-0.05em] text-stone-950">{formatIndexValue(index.value)}</div>
          <div className="mt-1 text-[11px] text-stone-400">{index.date || "—"}</div>
        </div>
        <div className={`rounded-full bg-stone-50 px-2 py-1 text-[11px] font-semibold tabular-nums ${indexChangeTone(index, index.change1d)}`}>
          {formatSignedPercent(index.change1d)}
        </div>
      </div>
      <IndexMiniChart data={index.sparkline || index.history || []} change={index.change1d} index={index} />
      <div className="mt-2 flex justify-between text-[10px] text-stone-400">
        <span>1M {formatSignedPercent(index.change1m)}</span>
        <span>YTD {formatSignedPercent(index.ytd)}</span>
      </div>
    </Tile>
  );
}

function IndexOverlay({ index, onClose }) {
  const data = index.history || [];
  const values = data.map((point) => Number(point.value)).filter((value) => Number.isFinite(value));
  const min = values.length ? Math.min(...values) : Number(index.value) || 0;
  const max = values.length ? Math.max(...values) : Number(index.value) || 1;
  const padding = Math.max((max - min) * 0.18, 0.01);

  return (
    <Overlay
      title={index.name}
      subtitle={index.description || index.longName || "Markedsindeks"}
      onClose={onClose}
      footer={
        <a
          className="flex items-center justify-between text-sm font-medium text-stone-700"
          href={index.sourceUrl || "#"}
          target="_blank"
          rel="noreferrer"
        >
          Åpne kilde
          <ExternalLink size={16} />
        </a>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Siste verdi</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-stone-950">{formatIndexValue(index.value)}</div>
          <div className="mt-1 text-[11px] text-stone-400">Dato: {index.date || "—"}</div>
        </div>
        <div className="rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">Siste dag</div>
          <div className={`mt-1 text-2xl font-semibold tracking-[-0.04em] ${indexChangeTone(index, index.change1d)}`}>{formatSignedPercent(index.change1d)}</div>
          <div className="mt-1 text-[11px] text-stone-400">1M {formatSignedPercent(index.change1m)} · YTD {formatSignedPercent(index.ytd)}</div>
        </div>
      </div>

      {data.length >= 2 ? (
        <div className="h-64 rounded-3xl bg-stone-50 p-3">
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
                tickFormatter={(value) => formatSwapChartDate(value, data)}
              />
              <YAxis
                domain={[min - padding, max + padding]}
                tick={{ fontSize: 10, fill: "#57534e" }}
                tickLine={false}
                axisLine={false}
                width={58}
                tickMargin={8}
                tickFormatter={(value) => formatIndexValue(value)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: "0", boxShadow: "0 14px 40px rgba(0,0,0,0.12)" }}
                formatter={(value) => [formatIndexValue(value), index.name]}
                labelFormatter={(value) => `Dato: ${formatTooltipDate(value)}`}
              />
              <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={3} dot={false} className="text-stone-900" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-3xl bg-stone-50 p-4 text-sm text-stone-500">
          For lite historikk til graf ennå. Kjør <span className="font-medium text-stone-700">/api/indices?action=backfill</span> etter deploy.
        </div>
      )}
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
        <thead className="sticky top-0 z-10 bg-stone-50 text-[9px] uppercase tracking-[0.08em] text-stone-400">
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
              <td className="truncate px-1 py-1.5 text-[10px] font-semibold text-stone-800">
                {!compact && trade.messageUrl ? (
                  <a
                    href={trade.messageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-stone-300 underline-offset-4 active:scale-[0.98]"
                    onClick={(event) => event.stopPropagation()}
                    title={trade.title || "Åpne NewsWeb-melding"}
                  >
                    {displayCompany(trade)}
                  </a>
                ) : (
                  displayCompany(trade)
                )}
              </td>
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
  const getRowSourceUrl = (row) => row.office?.sourceUrl || row.retail?.sourceUrl || row.logistics?.sourceUrl;
  const periodSummary = rows.map((row) => row.period
    ? `${row.source}${row.source === "Newsec" ? " " : " per "}${row.period}`
    : `${row.source}: periode ikke oppgitt`
  );

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
      <div className="mb-3 rounded-2xl border border-stone-200 bg-white p-3 text-xs leading-relaxed text-stone-600">
        <span className="font-semibold text-stone-800">Perioder for tallgrunnlaget:</span>{" "}
        {periodSummary.length
          ? `${periodSummary.join(", ")}. Periodene hentes automatisk fra kildene ved hver yield-oppdatering.`
          : "Periodene blir tilgjengelige ved neste yield-oppdatering."}
      </div>

      <div className="mb-3 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
        {yieldState.status === "ok"
          ? `Sist oppdatert: ${formatDateTimeShort(yieldState.fetchedAt)}`
          : yieldState.status === "partial"
            ? `Delvis oppdatert: ${formatDateTimeShort(yieldState.fetchedAt)}. ${yieldState.errors?.[0] || ""}`
            : yieldState.status === "loading"
              ? "Leser prime yield fra Supabase..."
              : yieldState.status === "empty"
                ? "Ingen prime yield-data lagret ennå. Kjør /api/yields?action=update."
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
                  {getRowSourceUrl(row) ? (
                    <a
                      href={getRowSourceUrl(row)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 active:scale-[0.98]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {row.source}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <div className="font-medium text-stone-800">{row.source}</div>
                  )}
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
  const [selectedSwap, setSelectedSwap] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showRealEstateWatchlist, setShowRealEstateWatchlist] = useState(false);
  const [showInsiderTrades, setShowInsiderTrades] = useState(false);
  const [showNewsFeed, setShowNewsFeed] = useState(false);
  const [showYield, setShowYield] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [insiderState, setInsiderState] = useState(fallbackInsiderTrades);
  const [indicesState, setIndicesState] = useState(fallbackIndices);
  const [watchlistState, setWatchlistState] = useState(fallbackWatchlist);
  const [realEstateWatchlistState, setRealEstateWatchlistState] = useState(fallbackRealEstateWatchlist);
  const [newsState, setNewsState] = useState(fallbackNewsState);
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

    async function loadNews() {
      try {
        const response = await fetch(`/api/news?ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente nyhetsfeed.");
        }

        if (!cancelled) {
          setNewsState({
            status: payload.status || "empty",
            sourceName: payload.sourceName || "DN, Finansavisen, E24 og Estate",
            fetchedAt: payload.fetchedAt || null,
            message: payload.message || null,
            errors: payload.errors || [],
            items: payload.items || [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setNewsState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente nyhetsfeed.",
          }));
        }
      }
    }

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
            history: payload.history || fallbackSwaps.history,
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
        const response = await fetch(`/api/fx?ts=${Date.now()}`, { cache: "no-store" });
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
        const response = await fetch(`/api/rates?type=stibor&ts=${Date.now()}`, { cache: "no-store" });
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
            history: payload.history || [],
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
        const response = await fetch(`/api/rates?type=nibor&ts=${Date.now()}`, { cache: "no-store" });
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
            history: payload.history || [],
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

    async function loadWatchlist(group = "main", setState = setWatchlistState, fallbackName = "Watchlist") {
      try {
        const groupQuery = group === "main" ? "" : `&group=${group}`;
        const response = await fetch(`/api/watchlist?ts=${Date.now()}${groupQuery}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente watchlist-kurser.");
        }

        if (!cancelled) {
          setState({
            status: payload.status || "empty",
            sourceName: payload.sourceName || fallbackName,
            fetchedAt: payload.fetchedAt || null,
            message: payload.message || (payload.errors?.length ? payload.errors.join(" | ") : null),
            errors: payload.errors || [],
            items: payload.items || [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente watchlist-kurser.",
          }));
        }
      }
    }

    async function loadIndices() {
      try {
        const response = await fetch(`/api/indices?ts=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente markedsindekser.");
        }

        if (!cancelled) {
          setIndicesState({
            status: payload.status || "empty",
            sourceName: payload.sourceName || "Market indices",
            fetchedAt: payload.fetchedAt || null,
            message: payload.message || (payload.errors?.length ? payload.errors.join(" | ") : null),
            errors: payload.errors || [],
            items: payload.items || [],
          });
        }
      } catch (error) {
        if (!cancelled) {
          setIndicesState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente markedsindekser.",
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

    loadNews();
    loadInsiderTrades();
    loadSwaps();
    loadFx();
    loadStibor();
    loadNibor();
    loadWatchlist();
    loadWatchlist("real_estate", setRealEstateWatchlistState, "Watchlist eiendom");
    loadIndices();
    loadYields();

    return () => {
      cancelled = true;
    };
  }, []);

  const latestFetchedAt = useMemo(() => {
    const dates = [newsState.fetchedAt, watchlistState.fetchedAt, realEstateWatchlistState.fetchedAt, indicesState.fetchedAt, insiderState.fetchedAt, swapsState.fetchedAt, fxState.fetchedAt, stiborState.fetchedAt, niborState.fetchedAt, yieldState.fetchedAt]
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return dates[0]?.toISOString() || null;
  }, [newsState.fetchedAt, watchlistState.fetchedAt, realEstateWatchlistState.fetchedAt, indicesState.fetchedAt, insiderState.fetchedAt, swapsState.fetchedAt, fxState.fetchedAt, stiborState.fetchedAt, niborState.fetchedAt, yieldState.fetchedAt]);

  const hasError = newsState.status === "error" || insiderState.status === "error" || watchlistState.status === "error" || realEstateWatchlistState.status === "error" || indicesState.status === "error" || swapsState.status === "error" || fxState.status === "error" || stiborState.status === "error" || niborState.status === "error" || yieldState.status === "error";

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
    if (newsState.status === "error") {
      return {
        title: "Nyhetsfeed feilet",
        message: newsState.message || "Kunne ikke lese nyhetsfeed.",
      };
    }

    if (watchlistState.status === "error") {
      return {
        title: "Watchlist feilet",
        message: watchlistState.message || "Kunne ikke lese aksje-/Bitcoin-kurser.",
      };
    }

    if (realEstateWatchlistState.status === "error") {
      return {
        title: "Eiendomsaksjer feilet",
        message: realEstateWatchlistState.message || "Kunne ikke lese eiendomsaksjer.",
      };
    }

    if (indicesState.status === "error") {
      return {
        title: "Markedsindekser feilet",
        message: indicesState.message || "Kunne ikke lese markedsindekser.",
      };
    }

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
        message: "Kjør /api/rates?action=update&type=stibor én gang etter deploy. Deretter leser appen sist vellykkede verdi fra Supabase.",
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
        message: "Kjør /api/rates?action=update&type=nibor én gang etter deploy. Da henter appen 3M NIBOR fra SpareBank 1 Markets og lagrer verdien i Supabase.",
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

        <section className="mb-3">
          <h2 className="text-sm font-semibold text-stone-800">Renter, valuta & yield</h2>
        </section>

        <main className="grid grid-cols-2 gap-3">
          <Tile title="SWAP NOK" source="SEB" accent="violet" icon={<TrendingUp size={17} />} size="large" onClick={() => setSelectedSwap("NOK")}>
            <RateStack
              rows={[
                { label: "3Y", value: formatOptionalPercent(swapsState.data.NOK.rates["3 Yr"]), changeBps: swapsState.data.NOK.changes?.["3 Yr"]?.bps },
                { label: "5Y", value: formatOptionalPercent(swapsState.data.NOK.rates["5 Yr"]), changeBps: swapsState.data.NOK.changes?.["5 Yr"]?.bps },
                { label: "10Y", value: formatOptionalPercent(swapsState.data.NOK.rates["10 Yr"]), changeBps: swapsState.data.NOK.changes?.["10 Yr"]?.bps },
              ]}
            />
          </Tile>

          <Tile title="SWAP SEK" source="SEB" accent="blue" icon={<TrendingUp size={17} />} size="large" onClick={() => setSelectedSwap("SEK")}>
            <RateStack
              rows={[
                { label: "3Y", value: formatOptionalPercent(swapsState.data.SEK.rates["3 Yr"]), changeBps: swapsState.data.SEK.changes?.["3 Yr"]?.bps },
                { label: "5Y", value: formatOptionalPercent(swapsState.data.SEK.rates["5 Yr"]), changeBps: swapsState.data.SEK.changes?.["5 Yr"]?.bps },
                { label: "10Y", value: formatOptionalPercent(swapsState.data.SEK.rates["10 Yr"]), changeBps: swapsState.data.SEK.changes?.["10 Yr"]?.bps },
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
            onClick={() => setSelectedRate({ ...niborState, title: "3M NIBOR" })}
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
            onClick={() => setSelectedRate({ ...stiborState, title: "3M STIBOR" })}
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

          <div className="col-span-2 mt-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">Nyheter</h3>
          </div>

          <NewsFeedTile newsState={newsState} onClick={() => setShowNewsFeed(true)} />

          {indicesState.items.length > 0 && (
            <div className="col-span-2 mt-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">Markedsindekser</h3>
              <span className="text-[11px] text-stone-400">Mini-graf: siste 60 dager</span>
            </div>
          )}

          {indicesState.items.map((index) => (
            <IndexTile key={index.id} index={index} onClick={() => setSelectedIndex(index)} />
          ))}

                    <div className="col-span-2 mt-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">Aksjer</h3>
          </div>

<WatchlistTile watchlistState={watchlistState} onClick={() => setShowWatchlist(true)} />

          <WatchlistTile
            watchlistState={realEstateWatchlistState}
            title="Eiendomsaksjer"
            emptyText="Ingen eiendomskurser lagret ennå. Kjør /api/watchlist?action=backfill&group=real_estate."
            onClick={() => setShowRealEstateWatchlist(true)}
          />

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
      {selectedSwap && <SwapOverlay currency={selectedSwap} swapsState={swapsState} onClose={() => setSelectedSwap(null)} />}
      {selectedRate && <RateHistoryOverlay rate={selectedRate} onClose={() => setSelectedRate(null)} />}
      {selectedIndex && <IndexOverlay index={selectedIndex} onClose={() => setSelectedIndex(null)} />}
      {showWatchlist && <WatchlistOverlay watchlistState={watchlistState} onClose={() => setShowWatchlist(false)} />}
      {showRealEstateWatchlist && (
        <WatchlistOverlay
          title="Eiendomsaksjer"
          watchlistState={realEstateWatchlistState}
          onClose={() => setShowRealEstateWatchlist(false)}
        />
      )}
      {showInsiderTrades && <InsiderTradesOverlay insiderState={insiderState} onClose={() => setShowInsiderTrades(false)} />}
      {showNewsFeed && <NewsFeedOverlay newsState={newsState} onClose={() => setShowNewsFeed(false)} />}
      {showYield && <YieldOverlay yieldState={yieldState} onClose={() => setShowYield(false)} />}
    </div>
  );
}
