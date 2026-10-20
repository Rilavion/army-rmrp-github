"use client";

import { CalendarRange, Search, SlidersHorizontal } from "lucide-react";
import { LOCATIONS, LOCATION_CODES, DELIVERY_STATUSES, ORGANIZATIONS, PERIOD_OPTIONS } from "@/lib/config";
import type { FilterState } from "@/lib/types";

export const DEFAULT_FILTERS: FilterState = {
  period: "month",
  location: "ALL",
  organization: "ALL",
  recipient: "ALL",
  status: "ALL",
  from: "",
  to: "",
  search: "",
};

export function Filters({
  value,
  onChange,
  withSearch = false,
  recipients = [],
}: {
  value: FilterState;
  onChange: (value: FilterState) => void;
  withSearch?: boolean;
  recipients?: string[];
}) {
  const set = <K extends keyof FilterState>(key: K, next: FilterState[K]) =>
    onChange({ ...value, [key]: next });
  const control = "premium-control h-11 px-3 text-sm";
  return (
    <div className="premium-panel relative overflow-hidden p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">
        <SlidersHorizontal size={14} />
        Фильтры
        <button type="button" className="ml-auto normal-case tracking-normal text-slate-300 hover:text-white" onClick={() => onChange({ ...DEFAULT_FILTERS, period: "all" })}>Сбросить</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1.5 text-xs text-slate-500">
          <span>Период</span>
          <select
            className={control}
            value={value.period}
            onChange={(event) => set("period", event.target.value as FilterState["period"])}
          >
            {PERIOD_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-slate-500">
          <span>Направление</span>
          <select
            className={control}
            value={value.location}
            onChange={(event) => set("location", event.target.value as FilterState["location"])}
          >
            <option value="ALL">Все направления</option>
            {LOCATION_CODES.map(code => <option key={code} value={code}>{LOCATIONS[code]}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-slate-500">
          <span>Организация</span>
          <select
            className={control}
            value={value.organization}
            onChange={(event) => set("organization", event.target.value)}
          >
            <option value="ALL">Все организации</option>
            {ORGANIZATIONS.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-slate-500">
          <span>Получатель</span>
          <select
            className={control}
            value={value.recipient}
            onChange={(event) => set("recipient", event.target.value)}
          >
            <option value="ALL">Все получатели</option>
            {recipients.map((recipient) => (
              <option key={recipient} value={recipient}>
                {recipient}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-slate-500">
          <span>Статус</span>
          <select
            className={control}
            value={value.status}
            onChange={(event) => set("status", event.target.value as FilterState["status"])}
          >
            <option value="ALL">Все статусы</option>
            <option value="DELIVERED">{DELIVERY_STATUSES.DELIVERED}</option>
            <option value="NOT_DELIVERED">{DELIVERY_STATUSES.NOT_DELIVERED}</option>
            <option value="UNKNOWN">{DELIVERY_STATUSES.UNKNOWN}</option>
          </select>
        </label>
      </div>
      {value.period === "custom" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs text-slate-500">
            <span>Дата от</span>
            <div className="relative">
              <CalendarRange size={16} className="pointer-events-none absolute left-3 top-3.5" />
              <input
                type="date"
                value={value.from}
                max={value.to || undefined}
                onChange={(event) => set("from", event.target.value)}
                className={`${control} w-full pl-9`}
              />
            </div>
          </label>
          <label className="grid gap-1.5 text-xs text-slate-500">
            <span>Дата до</span>
            <input
              type="date"
              value={value.to}
              min={value.from || undefined}
              onChange={(event) => set("to", event.target.value)}
              className={`${control} w-full`}
            />
          </label>
        </div>
      )}
      {withSearch && (
        <label className="relative mt-3 block">
          <Search size={17} className="pointer-events-none absolute left-3 top-3 text-slate-500" />
          <input
            type="search"
            value={value.search}
            onChange={(event) => set("search", event.target.value)}
            placeholder="Поиск по дате, направлению, получателю или комментарию"
            className={`${control} w-full pl-10`}
          />
        </label>
      )}
    </div>
  );
}
