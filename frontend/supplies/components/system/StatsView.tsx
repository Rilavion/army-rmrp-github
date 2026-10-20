"use client";

import {
  CheckCircle2,
  Clipboard,
  Download,
  FileJson,
  PackageX,
  Sheet,
  Truck,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { filterSupplies, getAnalytics } from "@/lib/analytics";
import { getRecipientEmoji, LOCATIONS, LOCATION_COLORS, PERIOD_OPTIONS, RECIPIENT_OPTIONS } from "@/lib/config";
import { formatDate, formatTime } from "@/lib/date";
import { downloadBlob, exportCsv, exportJson } from "@/lib/export";
import type { FilterState, Supply } from "@/lib/types";
import { EmptyState } from "./controls";
import { DEFAULT_FILTERS, Filters } from "./Filters";

const tooltipStyle = {
  background: "#071423",
  border: "1px solid rgba(125,211,252,.18)",
  borderRadius: 14,
  color: "#e8f4ff",
  boxShadow: "0 18px 48px rgba(0,0,0,.35)",
};
const number = new Intl.NumberFormat("ru-RU");
type Analytics = ReturnType<typeof getAnalytics>;

function Metric({
  value,
  label,
  accent = "blue",
}: {
  value: string | number;
  label: string;
  accent?: "blue" | "green" | "violet";
}) {
  return (
    <div className={`metric-card metric-${accent}`}>
      <span className="metric-glint" />
      <p className="relative text-3xl font-semibold tabular-nums text-white">{value}</p>
      <p className="relative mt-2 text-sm text-slate-400">{label}</p>
    </div>
  );
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length && context.measureText(`${result}…`).width > maxWidth)
    result = result.slice(0, -1);
  return `${result}…`;
}

function createStatsCardBlob(analytics: Analytics, period: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не поддерживает создание PNG.");

  const background = context.createLinearGradient(0, 0, 1600, 900);
  background.addColorStop(0, "#06101d");
  background.addColorStop(0.55, "#0a1a2d");
  background.addColorStop(1, "#071221");
  context.fillStyle = background;
  context.fillRect(0, 0, 1600, 900);

  const glow = context.createRadialGradient(1370, 50, 10, 1370, 50, 560);
  glow.addColorStop(0, "rgba(56,189,248,.22)");
  glow.addColorStop(1, "rgba(56,189,248,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 1600, 900);

  context.strokeStyle = "rgba(148,213,255,.045)";
  context.lineWidth = 1;
  for (let x = 0; x <= 1600; x += 80) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 900);
    context.stroke();
  }
  for (let y = 0; y <= 900; y += 80) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(1600, y);
    context.stroke();
  }

  context.fillStyle = "#79e3ff";
  context.font = '600 21px "Segoe UI Emoji", Arial, sans-serif';
  context.fillText("ВС РФ · РЛС / ВС / ОБ-7", 72, 70);
  context.fillStyle = "#f4f9ff";
  context.font = '700 54px "Segoe UI Emoji", Arial, sans-serif';
  context.fillText("Статистика поставок", 72, 132);
  context.fillStyle = "#91a9bd";
  context.font = "400 23px Arial, sans-serif";
  context.fillText(period, 74, 172);

  context.textAlign = "right";
  context.fillStyle = "#6e879c";
  context.font = "400 17px Arial, sans-serif";
  context.fillText("Сформировано по московскому времени", 1528, 78);
  context.fillStyle = "#ddecf7";
  context.font = "600 21px Arial, sans-serif";
  context.fillText(
    new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Moscow",
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date()),
    1528,
    112,
  );
  context.textAlign = "left";

  const metrics = [
    ["Поставок", number.format(analytics.supplyCount)],
    ["Сотрудников", number.format(analytics.totalPeople)],
    ["Матавозки · прибыло / план", `${analytics.trucks.arrived} из ${analytics.trucks.planned}`],
    ["Успешно", `${analytics.delivery.successRate.toFixed(0)}%`],
  ];
  metrics.forEach(([label, value], index) => {
    const x = 72 + index * 370;
    roundRect(context, x, 215, 340, 132, 22);
    context.fillStyle = "rgba(13,35,57,.9)";
    context.fill();
    context.strokeStyle = "rgba(125,211,252,.13)";
    context.stroke();
    context.fillStyle = index === 3 ? "#6ee7b7" : "#f4f9ff";
    context.font = "700 40px Arial, sans-serif";
    context.fillText(value, x + 26, 272);
    context.fillStyle = "#7890a4";
    context.font = "400 18px Arial, sans-serif";
    context.fillText(label, x + 26, 312);
  });

  context.fillStyle = "#f4f9ff";
  context.font = "600 25px Arial, sans-serif";
  context.fillText("Топ организаций", 72, 405);
  const topOrganizations = analytics.organizations.slice(0, 6);
  const maxOrganization = topOrganizations[0]?.total || 1;
  topOrganizations.forEach((organization, index) => {
    const y = 452 + index * 64;
    context.fillStyle = "#b9cad8";
    context.font = '500 19px "Segoe UI Emoji", Arial, sans-serif';
    context.fillText(`${index + 1}. ${organization.emoji} ${organization.name}`, 72, y);
    context.textAlign = "right";
    context.fillStyle = "#f4f9ff";
    context.font = "700 20px Arial, sans-serif";
    context.fillText(number.format(organization.total), 875, y);
    context.textAlign = "left";
    roundRect(context, 72, y + 15, 803, 9, 5);
    context.fillStyle = "rgba(255,255,255,.07)";
    context.fill();
    roundRect(context, 72, y + 15, Math.max(4, (organization.total / maxOrganization) * 803), 9, 5);
    context.fillStyle = organization.color;
    context.fill();
  });

  roundRect(context, 940, 388, 588, 180, 24);
  context.fillStyle = "rgba(13,35,57,.82)";
  context.fill();
  context.strokeStyle = "rgba(125,211,252,.12)";
  context.stroke();
  context.fillStyle = "#f4f9ff";
  context.font = "600 24px Arial, sans-serif";
  context.fillText("Результат доставки", 970, 430);
  context.fillStyle = "#6ee7b7";
  context.font = "700 42px Arial, sans-serif";
  context.fillText(number.format(analytics.delivery.delivered), 970, 492);
  context.fillStyle = "#7890a4";
  context.font = "400 17px Arial, sans-serif";
  context.fillText("довезли", 970, 525);
  context.fillStyle = "#fda4af";
  context.font = "700 42px Arial, sans-serif";
  context.fillText(number.format(analytics.delivery.notDelivered), 1245, 492);
  context.fillStyle = "#7890a4";
  context.font = "400 17px Arial, sans-serif";
  context.fillText("не довезли", 1245, 525);
  context.fillStyle = "#91a9bd";
  context.font = "400 16px Arial, sans-serif";
  context.fillText(
    `Сопровождение: дали ${analytics.escort.yes} · не дали ${analytics.escort.no}`,
    970,
    551,
  );

  context.fillStyle = "#f4f9ff";
  context.font = "600 24px Arial, sans-serif";
  context.fillText("РЛС / ВС / ОБ-7", 940, 624);
  analytics.byLocation.forEach((item, index) => {
    const x = 940 + index * 200;
    roundRect(context, x, 652, 188, 168, 22);
    context.fillStyle = "rgba(13,35,57,.82)";
    context.fill();
    context.strokeStyle = "rgba(125,211,252,.12)";
    context.stroke();
    context.fillStyle = "#79e3ff";
    context.font = "700 26px Arial, sans-serif";
    context.fillText(LOCATIONS[item.location], x + 24, 694);
    context.fillStyle = "#f4f9ff";
    context.font = "700 36px Arial, sans-serif";
    context.fillText(number.format(item.people), x + 24, 748);
    context.fillStyle = "#7890a4";
    context.font = "400 16px Arial, sans-serif";
    context.fillText(`${item.supplies} пост. · ${item.share.toFixed(0)}%`, x + 24, 786);
  });

  const recipient = analytics.byRecipient[0];
  context.fillStyle = "#6e879c";
  context.font = "400 16px Arial, sans-serif";
  context.fillText("Самый частый получатель", 72, 852);
  context.fillStyle = "#ddecf7";
  context.font = "600 20px Arial, sans-serif";
  context.fillText(
    recipient
      ? `${fitText(context, recipient.recipient, 600)} · ${recipient.supplies} поставок`
      : "Нет данных",
    282,
    852,
  );

  const dataUrl = canvas.toDataURL("image/png");
  const [header, encoded] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/png";
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

export function StatsView({
  supplies,
  onStatus,
}: {
  supplies: Supply[];
  onStatus: (message: string, tone?: "success" | "error") => void;
}) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [creatingPng, setCreatingPng] = useState(false);
  const visible = useMemo(() => filterSupplies(supplies, filters), [supplies, filters]);
  const recipients = useMemo(
    () =>
      [
        ...new Set([
          ...RECIPIENT_OPTIONS.map((recipient) => recipient.name),
          ...supplies.map((supply) => supply.recipient).filter(Boolean),
        ]),
      ].sort((a, b) => a.localeCompare(b, "ru")),
    [supplies],
  );
  const analytics = useMemo(
    () => getAnalytics(visible, filters.organization),
    [visible, filters.organization],
  );
  const chartData = useMemo(
    () =>
      [...visible].reverse().map((supply) => ({
        date: formatDate(supply.eventAt),
        time: formatTime(supply.eventAt),
        value:
          filters.organization === "ALL"
            ? supply.total
            : (supply.organizations[filters.organization] ?? 0),
        place: LOCATIONS[supply.location],
      })),
    [visible, filters.organization],
  );
  const periodLabel =
    filters.period === "custom" && (filters.from || filters.to)
      ? `${filters.from || "начало"} — ${filters.to || "сегодня"}`
      : (PERIOD_OPTIONS.find(([key]) => key === filters.period)?.[1] ?? "Период");

  async function makePng(copy: boolean) {
    setCreatingPng(true);
    let blob: Blob | null = null;
    try {
      blob = createStatsCardBlob(analytics, periodLabel);
      if (copy && "ClipboardItem" in window && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        onStatus("PNG-карточка скопирована в буфер обмена.", "success");
      } else {
        downloadBlob(blob, `supply-statistics-${new Date().toISOString().slice(0, 10)}.png`);
        onStatus(
          copy
            ? "Буфер изображений недоступен — PNG автоматически скачан."
            : "PNG-карточка скачана.",
          "success",
        );
      }
    } catch (error) {
      if (copy && blob) {
        downloadBlob(blob, `supply-statistics-${new Date().toISOString().slice(0, 10)}.png`);
        onStatus("Браузер запретил копирование — PNG автоматически скачан.");
      } else {
        onStatus(error instanceof Error ? error.message : "Не удалось создать PNG.", "error");
      }
    } finally {
      setCreatingPng(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow">Аналитический контур</div>
          <h1 className="premium-title mt-2">Статистика поставок</h1>
          <p className="mt-2 text-sm text-slate-400">
            Живая картина по сотрудникам, маршрутам, получателям и результатам.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportCsv(visible)} className="ghost-action">
            <Sheet size={16} /> CSV
          </button>
          <button onClick={() => exportJson(visible)} className="ghost-action">
            <FileJson size={16} /> JSON
          </button>
        </div>
      </div>
      <Filters value={filters} onChange={setFilters} recipients={recipients} />

      {!visible.length ? (
        <div className="mt-5">
          <EmptyState
            title="Нет данных за выбранный период"
            description="Измените фильтры или добавьте поставку."
          />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Metric value={analytics.supplyCount} label="поставок" />
            <Metric value={number.format(analytics.totalPeople)} label="сотрудников учтено" />
            <Metric
              value={`${number.format(analytics.trucks.arrived)} из ${number.format(analytics.trucks.planned)}`}
              label={`матавозки · выполнение ${analytics.trucks.completionRate.toFixed(0)}%`}
              accent="green"
            />
            <Metric
              value={analytics.average.toFixed(1)}
              label="в среднем на поставку"
              accent="violet"
            />
            <Metric value={analytics.activeOrganizations} label="активных организаций" />
            <Metric
              value={`${analytics.delivery.successRate.toFixed(0)}%`}
              label="успешных доставок"
              accent="green"
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <article className="premium-panel p-4 sm:p-5">
              <h2 className="font-semibold text-white">Количество сотрудников по поставкам</h2>
              <p className="mt-1 text-xs text-slate-500">Хронология выбранного периода</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -18, right: 8 }}>
                    <defs>
                      <linearGradient id="activity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a3e5b1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#a3e5b1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71869a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#71869a", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${String(value)} сотрудников`, "Учтено"]}
                      labelFormatter={(label, payload) =>
                        `${String(label)} · ${String(payload?.[0]?.payload?.time ?? "")} · ${String(payload?.[0]?.payload?.place ?? "")}`
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#a3e5b1"
                      strokeWidth={2.7}
                      fill="url(#activity)"
                      activeDot={{
                        r: 5,
                        fill: "#a3e5b1",
                        stroke: "#07111e",
                        strokeWidth: 3,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="premium-panel p-4 sm:p-5">
              <h2 className="font-semibold text-white">Распределение по организациям</h2>
              <p className="mt-1 text-xs text-slate-500">Доля от общего числа</p>
              <div className="grid items-center sm:grid-cols-[210px_1fr] xl:grid-cols-1 2xl:grid-cols-[210px_1fr]">
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.organizations
                          .filter((org) => org.total > 0)
                          .map((org) => ({ ...org, fill: org.color }))}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={88}
                        paddingAngle={3}
                        stroke="none"
                        animationDuration={900}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-2xl font-semibold text-white">
                        {number.format(analytics.totalPeople)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">всего</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  {analytics.organizations
                    .filter((org) => org.total > 0)
                    .map((org) => (
                      <div
                        key={org.id}
                        className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-xs"
                      >
                        <span className="size-2 rounded-full" style={{ background: org.color }} />
                        <span className="truncate text-slate-400">
                          {org.emoji} {org.name}
                        </span>
                        <strong className="tabular-nums text-slate-200">
                          {org.share.toFixed(1)}%
                        </strong>
                      </div>
                    ))}
                </div>
              </div>
            </article>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <article className="premium-panel p-5">
              <h2 className="font-semibold text-white">Топ организаций</h2>
              <div className="mt-5 grid gap-4">
                {analytics.organizations.map((org, index) => (
                  <div key={org.id}>
                    <div className="mb-1.5 flex justify-between gap-4 text-sm">
                      <span className="text-slate-300">
                        <span className="mr-2 text-slate-600">{index + 1}.</span>
                        {org.emoji} {org.name}
                      </span>
                      <strong className="tabular-nums text-white">
                        {number.format(org.total)}
                      </strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-value"
                        style={{
                          width: `${analytics.organizations[0]?.total ? (org.total / analytics.organizations[0].total) * 100 : 0}%`,
                          background: org.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <div className="grid gap-5">
              <article className="premium-panel p-5">
                <h2 className="font-semibold text-white">Результат доставки</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="result-card result-success">
                    <CheckCircle2 size={20} />
                    <strong>{analytics.delivery.delivered}</strong>
                    <span>довезли</span>
                  </div>
                  <div className="result-card result-danger">
                    <PackageX size={20} />
                    <strong>{analytics.delivery.notDelivered}</strong>
                    <span>не довезли</span>
                  </div>
                </div>
                {analytics.delivery.unknown > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    Без статуса (старые записи): {analytics.delivery.unknown}
                  </p>
                )}
                <div className="mt-4 border-t border-white/8 pt-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Truck size={16} className="text-sky-300" /> Сопровождение
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-emerald-400/8 px-2 py-2 text-emerald-200">
                      <strong className="block text-lg">{analytics.escort.yes}</strong> дали
                    </div>
                    <div className="rounded-xl bg-rose-400/8 px-2 py-2 text-rose-200">
                      <strong className="block text-lg">{analytics.escort.no}</strong> не дали
                    </div>
                    <div className="rounded-xl bg-white/[.035] px-2 py-2 text-slate-400">
                      <strong className="block text-lg">{analytics.escort.unknown}</strong> не
                      указано
                    </div>
                  </div>
                </div>
              </article>
              <article className="premium-panel p-5">
                <h2 className="font-semibold text-white">РЛС / ВС / ОБ-7</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {analytics.byLocation.map((item) => (
                    <div key={item.location} className="location-stat" style={{ borderTop: `3px solid ${LOCATION_COLORS[item.location]}` }}>
                      <div className="flex items-center justify-between">
                        <strong>{LOCATIONS[item.location]}</strong>
                        <span>{item.share.toFixed(0)}%</span>
                      </div>
                      <p>{number.format(item.people)}</p>
                      <small>
                        {item.supplies} поставок · среднее {item.average.toFixed(1)}
                      </small>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>

          <article className="premium-panel mt-5 overflow-hidden">
            <div className="border-b border-white/8 p-5">
              <h2 className="flex items-center gap-2 font-semibold text-white">
                <UsersRound size={18} className="text-sky-300" /> Получатели
              </h2>
            </div>
            <div className="grid gap-px bg-white/[.055] sm:grid-cols-2 xl:grid-cols-3">
              {analytics.byRecipient.slice(0, 9).map((item, index) => (
                <div key={item.recipient} className="bg-[#0a192a]/95 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-600">#{index + 1}</p>
                      <p className="mt-1 font-medium text-slate-200">
                        {getRecipientEmoji(item.recipient)} {item.recipient}
                      </p>
                    </div>
                    <strong className="text-xl tabular-nums text-white">{item.supplies}</strong>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {number.format(item.people)} сотрудников · доставлено{" "}
                    {item.successRate.toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="premium-panel mt-5 overflow-hidden">
            <div className="border-b border-white/8 p-5">
              <h2 className="font-semibold text-white">Статистика по организациям</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    {["Организация", "Всего", "Поставок", "Среднее", "Мин.", "Макс.", "Доля"].map(
                      (name) => (
                        <th key={name} className="px-5 py-3 font-medium">
                          {name}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {analytics.organizations.map((org) => (
                    <tr
                      key={org.id}
                      className="border-t border-white/6 transition hover:bg-white/[.025]"
                    >
                      <td className="px-5 py-4 font-medium text-slate-200">
                        {org.emoji} {org.name}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-white">
                        {number.format(org.total)}
                      </td>
                      <td className="px-5 py-4 text-slate-400">{org.participations}</td>
                      <td className="px-5 py-4 text-slate-400">{org.average.toFixed(1)}</td>
                      <td className="px-5 py-4 text-slate-400">{org.min}</td>
                      <td className="px-5 py-4 text-slate-400">{org.max}</td>
                      <td className="px-5 py-4 text-slate-400">{org.share.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <div className="export-dock mt-5">
            <div>
              <p className="font-medium text-slate-200">Карточка для отправки</p>
              <p className="mt-1 text-sm text-slate-500">
                Отдельный PNG 1600 × 900 — не снимок страницы.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={creatingPng}
                onClick={() => makePng(true)}
                className="ghost-action accent-action"
              >
                <Clipboard size={16} />
                {creatingPng ? "Создаём PNG…" : "Скопировать статистику"}
              </button>
              <button
                disabled={creatingPng}
                onClick={() => makePng(false)}
                className="primary-action"
              >
                <Download size={16} /> Скачать PNG
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
