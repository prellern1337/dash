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
  sourceName: "SFBF",
  sourceUrl: "https://swfbf.se/stibor/rates/",
  value: null,
  date: null,
  fetchedAt: null,
  message: null,
  note: null,
};

const fallbackSwapState = {
  status: "loading",
  sourceName: "SEB",
  sourceUrl: "https://sebgroup.com/our-offering/reports-and-publications/rates-and-iban/swap-rates",
  fetchedAt: null,
  message: null,
  data: {
    NOK: {
      label: "Norge",
      currency: "NOK",
      source: "SEB",
      status: "loading",
      rates: { "3Y": null, "5Y": null, "10Y": null },
    },
    SEK: {
      label: "Sverige",
      currency: "SEK",
      source: "SEB",
      status: "loading",
      rates: { "3Y": null, "5Y": null, "10Y": null },
    },
  },
};

const fallbackYieldState = {
  status: "loading",
  sourceName: "UNION M2 / Newsec",
  fetchedAt: null,
  message: null,
  data: {
    office: {
      id: "office",
      label: "Kontor",
      value: null,
      sources: [
        { source: "UNION", value: null, status: "loading", sourceUrl: "https://m2.union.no/segmenter/kontor" },
        { source: "Newsec", value: null, status: "loading", sourceUrl: "https://www.newsec.no/insights/reports/yieldtabell" },
        { source: "Akershus", value: null, status: "not_connected", sourceUrl: "https://akershuseiendom.no/markedsinnsikt/nokkeltall" },
      ],
    },
    retail: {
      id: "retail",
      label: "Handel",
      value: null,
      sources: [
        { source: "UNION", value: null, status: "loading", sourceUrl: "https://m2.union.no/segmenter/handel" },
        { source: "Newsec", value: null, status: "loading", sourceUrl: "https://www.newsec.no/insights/reports/yieldtabell" },
        { source: "Akershus", value: null, status: "not_connected", sourceUrl: "https://akershuseiendom.no/markedsinnsikt/nokkeltall" },
      ],
    },
    logistics: {
      id: "logistics",
      label: "Logistikk",
      value: null,
      sources: [
        { source: "UNION", value: null, status: "loading", sourceUrl: "https://m2.union.no/segmenter/logistikk" },
        { source: "Newsec", value: null, status: "loading", sourceUrl: "https://www.newsec.no/insights/reports/yieldtabell" },
        { source: "Akershus", value: null, status: "not_connected", sourceUrl: "https://akershuseiendom.no/markedsinnsikt/nokkeltall" },
      ],
    },
  },
};

const formatPercent = (value) => `${value.toFixed(2).replace(".", ",")} %`;

function formatOptionalPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return "—";
  return formatPercent(Number(value));
}

function formatOptionalRate(value) {
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

function getYieldSource(segment, sourceName) {
  return segment?.sources?.find((source) => source.source === sourceName) || { value: null, status: "not_connected" };
}

function getSourceStatusLabel(status) {
  if (status === "ok") return "Live";
  if (status === "auto") return "Auto";
  if (status === "stale") return "Forrige auto";
  if (status === "seed") return "Seed";
  if (status === "last_verified") return "Siste verif.";
  if (status === "loading") return "Henter";
  if (status === "not_connected") return "Ikke koblet";
  return "Feil";
}

function YieldOverlay({ onClose, yieldState }) {
  const sourceNames = ["UNION", "Newsec", "Akershus"];

  const rows = sourceNames.map((sourceName) => ({
    source: sourceName,
    office: getYieldSource(yieldState.data.office, sourceName),
    retail: getYieldSource(yieldState.data.retail, sourceName),
    logistics: getYieldSource(yieldState.data.logistics, sourceName),
  }));

  return (
    <Overlay
      title="Prime yield"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>
            Snittet beregnes av automatisk oppdatert yield-data fra UNION, Newsec og Akershus. Jobben kjøres omtrent annenhver uke.
          </span>
          <ExternalLink size={15} />
        </div>
      }
    >
      <div className="mb-3 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500">
        {yieldState.status === "ok"
          ? `Sist oppdatert yield-data: ${formatDateTimeShort(yieldState.fetchedAt)}`
          : yieldState.status === "partial"
            ? `Yield-data delvis oppdatert: ${formatDateTimeShort(yieldState.fetchedAt)}. ${yieldState.message || ""}`
            : yieldState.status === "loading"
              ? "Henter yielder fra UNION M2 og Newsec..."
              : `Kunne ikke hente yielder: ${yieldState.message || "Ukjent feil"}`}
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
            {rows.map((row) => {
              const statuses = [row.office.status, row.retail.status, row.logistics.status];
              const statusLabel = statuses.includes("auto") || statuses.includes("ok")
                ? "Auto"
                : statuses.includes("stale")
                  ? "Forrige auto"
                  : statuses.includes("seed")
                    ? "Seed"
                    : statuses.includes("last_verified")
                      ? "Siste verif."
                      : getSourceStatusLabel(row.office.status);

              return (
                <tr key={row.source} className="border-t border-stone-100">
                  <td className="px-3 py-3">
                    <div className="font-medium text-stone-800">{row.source}</div>
                    <div className="mt-0.5 text-[10px] text-stone-400">{statusLabel}</div>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-stone-600">{formatOptionalPercent(row.office.value)}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-stone-600">{formatOptionalPercent(row.retail.value)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-stone-600">{formatOptionalPercent(row.logistics.value)}</td>
                </tr>
              );
            })}
            <tr className="border-t border-stone-200 bg-stone-50 font-semibold">
              <td className="px-3 py-3 text-stone-950">
                <div>Snitt</div>
                <div className="mt-0.5 text-[10px] font-normal text-stone-400">Koblede kilder</div>
              </td>
              <td className="px-2 py-3 text-right tabular-nums text-stone-950">{formatOptionalPercent(yieldState.data.office.value)}</td>
              <td className="px-2 py-3 text-right tabular-nums text-stone-950">{formatOptionalPercent(yieldState.data.retail.value)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-stone-950">{formatOptionalPercent(yieldState.data.logistics.value)}</td>
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
  const [fxState, setFxState] = useState({
    status: "loading",
    fetchedAt: null,
    sourceName: "Norges Bank",
    sourceUrl: "https://www.norges-bank.no/tema/Statistikk/Valutakurser/",
    pairs: fallbackFxPairs,
    message: null,
  });
  const [stiborState, setStiborState] = useState(fallbackStibor);
  const [swapState, setSwapState] = useState(fallbackSwapState);
  const [yieldState, setYieldState] = useState(fallbackYieldState);

  useEffect(() => {
    let cancelled = false;

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
        const response = await fetch("/api/stibor");
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente 3M STIBOR.");
        }

        if (!cancelled) {
          setStiborState({
            status: payload.status === "fallback" ? "fallback" : "ok",
            sourceName: payload.sourceName || "SFBF",
            sourceUrl: payload.sourceUrl || "https://swfbf.se/stibor/rates/",
            value: payload.value,
            date: payload.date,
            fetchedAt: payload.fetchedAt,
            message: payload.message || null,
            note: payload.note || null,
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

    async function loadSwaps() {
      try {
        const response = await fetch("/api/swaps");
        const payload = await response.json();

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.errors?.join(" | ") || payload.message || "Kunne ikke hente SEB swap-rates.");
        }

        if (!cancelled) {
          setSwapState({
            status: "ok",
            sourceName: payload.sourceName || "SEB",
            sourceUrl: payload.sourceUrl || fallbackSwapState.sourceUrl,
            fetchedAt: payload.fetchedAt,
            message: null,
            data: payload.data || fallbackSwapState.data,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setSwapState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente SEB swap-rates.",
          }));
        }
      }
    }

    async function loadYields() {
      try {
        const response = await fetch("/api/yields");
        const rawText = await response.text();

        let payload;
        try {
          payload = JSON.parse(rawText);
        } catch {
          throw new Error(`Yield-API returnerte ikke JSON: ${rawText.slice(0, 140)}`);
        }

        if (!response.ok || payload.status === "error") {
          throw new Error(payload.message || "Kunne ikke hente yielder.");
        }

        if (!cancelled) {
          setYieldState({
            status: payload.status === "partial" ? "partial" : "ok",
            sourceName: payload.sourceName || "UNION M2 / Newsec",
            fetchedAt: payload.fetchedAt,
            message: payload.errors?.length ? payload.errors.join(" | ") : null,
            data: payload.data || fallbackYieldState.data,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setYieldState((current) => ({
            ...current,
            status: "error",
            message: error instanceof Error ? error.message : "Kunne ikke hente yielder.",
          }));
        }
      }
    }

    loadFx();
    loadStibor();
    loadSwaps();
    loadYields();

    return () => {
      cancelled = true;
    };
  }, []);

  const latestFetchedAt = useMemo(() => {
    const dates = [fxState.fetchedAt, stiborState.fetchedAt, swapState.fetchedAt, yieldState.fetchedAt]
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    return dates[0]?.toISOString() || null;
  }, [fxState.fetchedAt, stiborState.fetchedAt, swapState.fetchedAt, yieldState.fetchedAt]);

  const hasError = fxState.status === "error" || stiborState.status === "error" || swapState.status === "error" || yieldState.status === "error";

  const statusPill = useMemo(() => {
    if (fxState.status === "ok" && stiborState.status === "ok" && swapState.status === "ok" && yieldState.status === "ok") {
      return { tone: "good", label: "Marked live" };
    }
    if (fxState.status === "ok" && stiborState.status === "ok" && yieldState.status === "partial") {
      return { tone: "warn", label: "FX/STIBOR live · yield delvis" };
    }
    if (fxState.status === "ok" && stiborState.status === "fallback" && yieldState.status === "ok") {
      return { tone: "warn", label: "FX + yield live · STIBOR siste kjente" };
    }
    if (hasError) return { tone: "bad", label: "Noen kilder feilet" };
    return { tone: "warn", label: "Henter markedsdata" };
  }, [fxState.status, stiborState.status, yieldState.status, hasError]);

  const warningContent = useMemo(() => {
    if (fxState.status === "error") {
      return {
        title: "Valutakilde feilet",
        message: `${fxState.message} Appen viser midlertidig mock-data for valuta.`,
      };
    }

    if (stiborState.status === "error") {
      return {
        title: "STIBOR-kilde feilet",
        message: `${stiborState.message} Appen viser ikke hardkodet STIBOR-verdi når livekilden feiler.`,
      };
    }

    if (swapState.status === "error") {
      return {
        title: "SEB swap feilet",
        message: `${swapState.message} Langrenter viser tomme verdier til kilden fungerer igjen.`,
      };
    }

    if (yieldState.status === "error") {
      return {
        title: "Yield-kilde feilet",
        message: `${yieldState.message} Prime yield viser tomme verdier for kilder som feiler.`,
      };
    }

    if (stiborState.status === "fallback") {
      return {
        title: "STIBOR bruker sist verifiserte verdi",
        message: `${stiborState.message || "Livehenting fra SFBF feilet."} Viser 3M STIBOR ${formatNumber(stiborState.value, 3)} % fra ${stiborState.date}.`,
      };
    }

    if (yieldState.status === "partial") {
      return {
        title: "Yield-kilder delvis hentet",
        message: yieldState.message || "Minst ett segment mangler fra UNION M2. Appen viser segmentene som ble hentet.",
      };
    }

    return {
      title: "Neste datakilder",
      message: "Akershus Eiendom er ikke koblet på ennå. Den vises derfor som tom i yield-tabellen.",
    };
  }, [
    fxState.status,
    fxState.message,
    stiborState.status,
    stiborState.message,
    stiborState.value,
    stiborState.date,
    swapState.status,
    swapState.message,
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
          {showWarning && (
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
          <Pill>{yieldState.status === "ok" ? "Yield auto" : yieldState.status === "seed" ? "Yield seed" : yieldState.status === "loading" ? "Henter yield" : "Delvis/fallback"}</Pill>
        </section>

        <main className="grid grid-cols-2 gap-3">
          <Tile
            title="Norge"
            source={swapState.status === "ok" ? "SEB live" : swapState.status === "loading" ? "Henter SEB" : "SEB feil"}
            accent="violet"
            icon={<TrendingUp size={17} />}
            size="large"
          >
            <RateStack
              rows={[
                { label: "3Y swap", value: formatOptionalRate(swapState.data.NOK.rates["3Y"]) },
                { label: "5Y swap", value: formatOptionalRate(swapState.data.NOK.rates["5Y"]) },
                { label: "10Y swap", value: formatOptionalRate(swapState.data.NOK.rates["10Y"]) },
              ]}
            />
          </Tile>

          <Tile
            title="Sverige"
            source={swapState.status === "ok" ? "SEB live" : swapState.status === "loading" ? "Henter SEB" : "SEB feil"}
            accent="blue"
            icon={<TrendingUp size={17} />}
            size="large"
          >
            <RateStack
              rows={[
                { label: "3Y swap", value: formatOptionalRate(swapState.data.SEK.rates["3Y"]) },
                { label: "5Y swap", value: formatOptionalRate(swapState.data.SEK.rates["5Y"]) },
                { label: "10Y swap", value: formatOptionalRate(swapState.data.SEK.rates["10Y"]) },
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
            source={stiborState.sourceName}
            value={hasNumericValue(stiborState.value) ? formatNumber(stiborState.value, 3) : "—"}
            unit="%"
            subtitle={
              stiborState.status === "ok"
                ? `Dato: ${stiborState.date || "—"}`
                : stiborState.status === "fallback"
                  ? `Siste verifiserte: ${stiborState.date || "—"}`
                  : stiborState.status === "loading"
                    ? "Henter live-verdi"
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
                { label: "Kontor", value: formatOptionalPercent(yieldState.data.office.value) },
                { label: "Handel", value: formatOptionalPercent(yieldState.data.retail.value) },
                { label: "Logistikk", value: formatOptionalPercent(yieldState.data.logistics.value) },
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
          Valuta, 3M STIBOR og SEB swap hentes via API ved app-lasting. Yield-data leses fra automatisk oppdatert JSON. 3M NIBOR kobles på senere.
        </footer>
      </div>

      {selectedFx && <FxOverlay pair={selectedFx} onClose={() => setSelectedFx(null)} />}
      {showYield && <YieldOverlay yieldState={yieldState} onClose={() => setShowYield(false)} />}
    </div>
  );
}
