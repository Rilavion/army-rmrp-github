"use client";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleMinus,
  Clock3,
  Minus,
  PackageCheck,
  PackageX,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Sparkles,
  TimerReset,
  Truck,
  Undo2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ADDITIONAL_RECIPIENTS,
  DELIVERY_STATUSES,
  ESCORT_STATUSES,
  getRecipientEmoji,
  LOCATIONS,
  LOCATION_CODES,
  LOCATION_DESCRIPTIONS,
  MAX_COUNT_PER_ORGANIZATION,
  MAX_TRUCK_COUNT,
  ORGANIZATIONS,
  RECIPIENT_OPTIONS,
} from "@/lib/config";
import { fromMoscowInput, getPeriodRange, toMoscowInput } from "@/lib/date";
import type { DeliveryStatus, EscortStatus, LocationCode, Supply, SupplyDraft } from "@/lib/types";
import { Modal } from "./controls";

const DRAFT_KEY = "vsrf-supply-current-draft-v2:" + (window as any).VSRF_AUTH?.state?.user?.id;

type SupplyFormState = {
  location: LocationCode;
  recipient: string;
  status: DeliveryStatus;
  trucksArrived: number;
  trucksPlanned: number;
  truckCount?: number;
  escortStatus: EscortStatus;
  date: string;
  time: string;
  comment: string;
  organizations: Record<string, number>;
};

function normalizedStatus(supply?: Supply | null): DeliveryStatus {
  return supply?.status === "NOT_DELIVERED" ? "NOT_DELIVERED" : "DELIVERED";
}

function initialForm(supply?: Supply | null, template?: Supply | null): SupplyFormState {
  const input = toMoscowInput(supply?.eventAt);
  return {
    location: supply?.location ?? template?.location ?? "RLS",
    recipient: supply?.recipient ?? template?.recipient ?? "",
    status: supply ? normalizedStatus(supply) : normalizedStatus(template),
    trucksArrived: supply?.trucksArrived ?? template?.trucksArrived ?? 0,
    trucksPlanned: supply?.trucksPlanned ?? template?.trucksPlanned ?? 0,
    escortStatus: supply?.escortStatus ?? template?.escortStatus ?? "UNKNOWN",
    date: input.date,
    time: input.time,
    comment: supply?.comment ?? "",
    organizations: Object.fromEntries(
      ORGANIZATIONS.map((org) => [
        org.id,
        supply?.organizations[org.id] ?? template?.organizations[org.id] ?? 0,
      ]),
    ),
  };
}

function isStoredDraft(value: unknown): value is SupplyFormState {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<SupplyFormState>;
  return (
    (draft.location === "RLS" || draft.location === "VS" || draft.location === "OB7") &&
    (draft.status === "DELIVERED" || draft.status === "NOT_DELIVERED") &&
    typeof draft.recipient === "string" &&
    typeof draft.date === "string" &&
    typeof draft.time === "string" &&
    typeof draft.comment === "string" &&
    Boolean(draft.organizations) &&
    typeof draft.organizations === "object"
  );
}

function hasDraftContent(form: SupplyFormState) {
  return Boolean(
    form.recipient.trim() ||
    form.trucksArrived > 0 ||
    form.trucksPlanned > 0 ||
    form.escortStatus === "YES" ||
    form.escortStatus === "NO" ||
    form.comment.trim() ||
    Object.values(form.organizations).some((value) => value > 0),
  );
}

export function SupplyForm({
  supply,
  template,
  lastSupply,
  saving,
  onSave,
  onCancel,
  embedded = false,
  unavailable = false,
  supplies = [],
  loading = false,
}: {
  supply?: Supply | null;
  template?: Supply | null;
  lastSupply?: Supply | null;
  saving: boolean;
  onSave: (draft: SupplyDraft) => Promise<void>;
  onCancel?: () => void;
  embedded?: boolean;
  unavailable?: boolean;
  supplies?: Supply[];
  loading?: boolean;
}) {
  const [form, setForm] = useState<SupplyFormState>(() => initialForm(supply, template));
  const [confirming, setConfirming] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [undoForm, setUndoForm] = useState<SupplyFormState | null>(null);
  const draftReady = useRef(false);
  const isPrimaryForm = !supply && !template && !embedded;

  useEffect(() => {
    if (!isPrimaryForm) return;
    try {
      const stored = window.localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isStoredDraft(parsed) && hasDraftContent(parsed)) {
          const legacyTruckCount = Math.max(
            0,
            Math.min(MAX_TRUCK_COUNT, Math.round(Number(parsed.truckCount) || 0)),
          );
          const trucksPlanned = Math.max(
            0,
            Math.min(MAX_TRUCK_COUNT, Math.round(Number(parsed.trucksPlanned) || legacyTruckCount)),
          );
          setForm({
            ...parsed,
            trucksArrived: Math.min(
              trucksPlanned,
              Math.max(
                0,
                Math.min(
                  MAX_TRUCK_COUNT,
                  Math.round(Number(parsed.trucksArrived) || legacyTruckCount),
                ),
              ),
            ),
            trucksPlanned,
            truckCount: undefined,
            escortStatus:
              parsed.escortStatus === "YES" || parsed.escortStatus === "NO"
                ? parsed.escortStatus
                : "UNKNOWN",
            organizations: Object.fromEntries(
              ORGANIZATIONS.map((org) => [
                org.id,
                Math.max(
                  0,
                  Math.min(MAX_COUNT_PER_ORGANIZATION, Math.round(Number(parsed.organizations[org.id]) || 0)),
                ),
              ]),
            ),
          });
          setDraftRestored(true);
        }
      }
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    } finally {
      draftReady.current = true;
    }
  }, [isPrimaryForm]);

  useEffect(() => {
    if (!isPrimaryForm || !draftReady.current) return;
    const timer = window.setTimeout(() => {
      if (hasDraftContent(form)) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      else window.localStorage.removeItem(DRAFT_KEY);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form, isPrimaryForm]);

  const total = useMemo(
    () => Object.values(form.organizations).reduce((sum, value) => sum + value, 0),
    [form.organizations],
  );
  const active = ORGANIZATIONS.filter((org) => form.organizations[org.id] > 0);
  const isLegacyRecipient = Boolean(
    form.recipient && !RECIPIENT_OPTIONS.some((option) => option.name === form.recipient),
  );
  const canSubmit = Boolean(form.date && form.time && Number.isFinite(fromMoscowInput(form.date, form.time).getTime()) && form.recipient.trim() && !saving && !unavailable);
  const { start, end } = getPeriodRange("today");
  const today = supplies.filter(item => (!start || item.eventAt >= start) && (!end || item.eventAt < end));

  function setCount(id: string, next: number) {
    setForm((current) => ({
      ...current,
      organizations: {
        ...current.organizations,
        [id]: Math.max(
          0,
          Math.min(MAX_COUNT_PER_ORGANIZATION, Number.isFinite(next) ? Math.round(next) : 0),
        ),
      },
    }));
  }

  function setTrucksArrived(next: number) {
    const arrived = Math.max(0, Math.min(MAX_TRUCK_COUNT, Math.round(next) || 0));
    setForm((current) => ({
      ...current,
      trucksArrived: arrived,
      trucksPlanned: Math.max(current.trucksPlanned, arrived),
    }));
  }

  function setTrucksPlanned(next: number) {
    const planned = Math.max(0, Math.min(MAX_TRUCK_COUNT, Math.round(next) || 0));
    setForm((current) => ({
      ...current,
      trucksArrived: Math.min(current.trucksArrived, planned),
      trucksPlanned: planned,
    }));
  }

  function reset() {
    setUndoForm(form);
    setForm((current) => ({
      ...current,
      organizations: Object.fromEntries(ORGANIZATIONS.map((org) => [org.id, 0])),
      trucksArrived: 0,
      trucksPlanned: 0,
      escortStatus: "UNKNOWN",
      comment: "",
    }));
  }

  function repeatLast() {
    if (!lastSupply) return;
    setUndoForm(form);
    setForm((current) => ({
      ...current,
      location: lastSupply.location,
      recipient: lastSupply.recipient,
      status: normalizedStatus(lastSupply),
      trucksArrived: lastSupply.trucksArrived,
      trucksPlanned: lastSupply.trucksPlanned,
      escortStatus: lastSupply.escortStatus,
      organizations: Object.fromEntries(
        ORGANIZATIONS.map((org) => [org.id, lastSupply.organizations[org.id] ?? 0]),
      ),
      comment: "",
    }));
  }

  function setCurrentMoscowTime() {
    const now = toMoscowInput();
    setForm((current) => ({ ...current, date: now.date, time: now.time }));
  }

  function clearLocalDraft() {
    if (isPrimaryForm) window.localStorage.removeItem(DRAFT_KEY);
    setDraftRestored(false);
  }

  const draft = (): SupplyDraft => ({
    location: form.location,
    recipient: form.recipient.trim(),
    status: form.status,
    trucksArrived: form.trucksArrived,
    trucksPlanned: form.trucksPlanned,
    escortStatus: form.escortStatus,
    eventAt: fromMoscowInput(form.date, form.time),
    comment: form.comment.trim(),
    organizations: form.organizations,
  });

  return (
    <>
      <div className={supply || embedded ? "p-5 sm:p-6" : ""}>
        <div className="mb-6">
          {!supply && !embedded && (
            <div className="page-title-block vsrf-hero">
              <div className="eyebrow">
                <span className="live-dot" /> ВС РФ / Служба снабжения
              </div>
              <h1 className="premium-title mt-3">Поставки под контролем<span className="hero-period">.</span></h1>
              <p className="mt-2 max-w-xl text-sm text-slate-400 sm:text-base">
                РЛС, ВС и ОБ-7. Фиксируйте доставку, считайте состав и отслеживайте результат в одном месте.
              </p>
              <div className="hero-tags"><span>🪖 ВС РФ</span><span>3 направления</span><span>10 организаций</span></div>
              {draftRestored && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/8 px-3 py-1.5 text-xs text-sky-100">
                  <Sparkles size={13} /> Черновик восстановлен с этого устройства
                </div>
              )}
            </div>
          )}
        </div>

        {!supply && !embedded && <div className="daily-overview" aria-label="Сводка за сегодня по московскому времени">
          <div className="daily-label"><span className="live-dot" /><span>Сегодня<small>по московскому времени</small></span></div>
          <div><strong>{loading ? "—" : today.length}</strong><span>поставок</span></div>
          <div><strong>{loading ? "—" : today.filter(item => item.status === "DELIVERED").length}</strong><span>довезли</span></div>
          <div><strong>{loading ? "—" : today.reduce((sum, item) => sum + item.total, 0)}</strong><span>сотрудников</span></div>
          <div><strong>{loading ? "—" : today.reduce((sum, item) => sum + item.trucksArrived, 0)}</strong><span>машин прибыло</span></div>
        </div>}

        <fieldset className="location-priority mb-4">
          <legend>01 / Направление поставки</legend>
          <p className="location-priority-hint">Выберите, куда направляется поставка</p>
          <div className="location-switch location-switch-primary">
            {LOCATION_CODES.map((value) => (
              <button
                key={value}
                type="button"
                data-location={value}
                aria-pressed={form.location === value}
                onClick={() => setForm((current) => ({ ...current, location: value }))}
                className={form.location === value ? "is-active" : ""}
              >
                <Building2 size={22} />
                <span>
                  <strong>{LOCATIONS[value]}</strong>
                  <small>{LOCATION_DESCRIPTIONS[value]}</small>
                </span>
                {form.location === value && <CheckCircle2 size={20} className="location-check" />}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="premium-panel mb-4 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">02 / Маршрут и результат</p>
              <h2 className="mt-1 font-semibold text-white">Параметры поставки</h2>
            </div>
            <button type="button" onClick={setCurrentMoscowTime} className="ghost-action">
              <TimerReset size={15} /> Сейчас
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_.7fr_.7fr]">
            <label className="grid gap-1.5 text-xs text-slate-400">
              <span>Кому везлась поставка *</span>
              <div className="relative">
                <UserRound
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500"
                />
                <select
                  required
                  value={form.recipient}
                  onChange={(event) => setForm({ ...form, recipient: event.target.value })}
                  className="premium-control h-11 w-full appearance-none pl-10 pr-10 text-sm"
                >
                  <option value="">Выберите получателя</option>
                  {isLegacyRecipient && (
                    <option value={form.recipient}>Сохранённое значение: {form.recipient}</option>
                  )}
                  <optgroup label="Организации">
                    {ORGANIZATIONS.map((recipient) => (
                      <option key={recipient.id} value={recipient.name}>
                        {recipient.emoji} {recipient.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Другие получатели">
                    {ADDITIONAL_RECIPIENTS.map((recipient) => (
                      <option key={recipient.id} value={recipient.name}>
                        {recipient.emoji} {recipient.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <span className="pointer-events-none absolute right-3.5 top-3 text-slate-500">
                  ⌄
                </span>
              </div>
            </label>
            <label className="grid gap-1.5 text-xs text-slate-400">
              <span>Дата</span>
              <div className="relative">
                <CalendarDays
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500"
                />
                <input
                  aria-label="Дата поставки"
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                  className="premium-control h-11 w-full pl-10 pr-3 text-sm"
                />
              </div>
            </label>
            <label className="grid gap-1.5 text-xs text-slate-400">
              <span>Время</span>
              <div className="relative">
                <Clock3
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-3.5 text-slate-500"
                />
                <input
                  aria-label="Время поставки"
                  required
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm({ ...form, time: event.target.value })}
                  className="premium-control h-11 w-full pl-10 pr-3 text-sm"
                />
              </div>
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-xs text-slate-400">Статус доставки</legend>
            <div className="status-switch">
              <button
                type="button"
                className={form.status === "DELIVERED" ? "is-success" : ""}
                onClick={() => setForm({ ...form, status: "DELIVERED" })}
              >
                <PackageCheck size={18} /> {DELIVERY_STATUSES.DELIVERED}
              </button>
              <button
                type="button"
                className={form.status === "NOT_DELIVERED" ? "is-danger" : ""}
                onClick={() => setForm({ ...form, status: "NOT_DELIVERED" })}
              >
                <PackageX size={18} /> {DELIVERY_STATUSES.NOT_DELIVERED}
              </button>
            </div>
          </fieldset>

          <div className="mt-4 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
            <fieldset className="operation-option-card">
              <legend className="inline-flex items-center gap-1.5">
                <Truck size={14} /> Матавозки
              </legend>
              <div className="truck-ratio">
                <div className="truck-ratio-side">
                  <span>Прибыло</span>
                  <div className="truck-mini-counter">
                    <button
                      type="button"
                      aria-label="Уменьшить количество прибывших матавозок"
                      onClick={() => setTrucksArrived(form.trucksArrived - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      aria-label="Количество прибывших матавозок"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={form.trucksPlanned || MAX_TRUCK_COUNT}
                      value={form.trucksArrived}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => setTrucksArrived(Number(event.target.value))}
                    />
                    <button
                      type="button"
                      aria-label="Увеличить количество прибывших матавозок"
                      onClick={() => setTrucksArrived(form.trucksArrived + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <span className="truck-ratio-separator">из</span>

                <div className="truck-ratio-side">
                  <span>Запланировано</span>
                  <div className="truck-mini-counter">
                    <button
                      type="button"
                      aria-label="Уменьшить запланированное количество матавозок"
                      onClick={() => setTrucksPlanned(form.trucksPlanned - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      aria-label="Запланированное количество матавозок"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={MAX_TRUCK_COUNT}
                      value={form.trucksPlanned}
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) => setTrucksPlanned(Number(event.target.value))}
                    />
                    <button
                      type="button"
                      aria-label="Увеличить запланированное количество матавозок"
                      onClick={() => setTrucksPlanned(form.trucksPlanned + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="truck-ratio-caption">Прибыло из запланированных</p>
            </fieldset>

            <fieldset className="operation-option-card">
              <legend>
                Дали ли сопровождение? <span>необязательно</span>
              </legend>
              <div className="escort-switch">
                {(
                  [
                    ["YES", "Да", ShieldCheck],
                    ["NO", "Нет", ShieldX],
                    ["UNKNOWN", "Не указано", CircleMinus],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      form.escortStatus === value ? `is-active is-${value.toLowerCase()}` : ""
                    }
                    onClick={() => setForm((current) => ({ ...current, escortStatus: value }))}
                  >
                    <Icon size={18} /> {label}
                  </button>
                ))}
              </div>
              <p className="escort-caption">{ESCORT_STATUSES[form.escortStatus]}</p>
            </fieldset>
          </div>
        </section>

        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="section-kicker">03 / Состав сопровождения</p>
            <h2 className="mt-1 font-semibold text-white">Организации</h2>
          </div>
          <p className="text-xs text-slate-500">
            Активно: <strong className="text-slate-300">{active.length}</strong>
          </p>
        </div>

        <div className="grid gap-3 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ORGANIZATIONS.map((org, index) => {
            const value = form.organizations[org.id];
            return (
              <article
                key={org.id}
                data-organization={org.id}
                className={`counter-card ${value ? "is-active" : ""}`}
                style={
                  {
                    animationDelay: `${index * 45}ms`,
                    "--org-color": org.color,
                  } as CSSProperties
                }
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="org-emoji" aria-hidden="true">
                      {org.emoji}
                    </span>
                    <div>
                      <p className="counter-index">{String(index + 1).padStart(2, "0")}</p>
                      <h3 className="mt-1 min-h-10 font-medium text-slate-100">{org.name}</h3>
                    </div>
                  </div>
                  <span className="counter-indicator" />
                </div>
                <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Уменьшить ${org.name}`}
                    disabled={value === 0 || saving}
                    onClick={() => setCount(org.id, value - 1)}
                    className="counter-button counter-minus"
                  >
                    <Minus size={19} />
                  </button>
                  <input
                    aria-label={`Количество ${org.name}`}
                    disabled={saving}
                    className="counter-input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={MAX_COUNT_PER_ORGANIZATION}
                    value={value}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setCount(org.id, Number(event.target.value))}
                  />
                  <button
                    type="button"
                    aria-label={`Увеличить ${org.name}`}
                    disabled={value === MAX_COUNT_PER_ORGANIZATION || saving}
                    onClick={() => setCount(org.id, value + 1)}
                    className="counter-button counter-plus"
                  >
                    <Plus size={19} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs text-slate-400">Комментарий или примечание</span>
          <textarea
            maxLength={1000}
            rows={3}
            value={form.comment}
            onChange={(event) => setForm({ ...form, comment: event.target.value })}
            placeholder="Необязательно: особенности маршрута, задержка, уточнение…"
            className="premium-control w-full resize-y px-4 py-3 text-sm"
          />
        </label>

        <div className={`${supply || embedded ? "" : "sticky bottom-[88px] sm:bottom-4"} total-dock mt-5`}>
          <div className="flex items-center gap-4">
            <div className="total-orbit">
              <span>{total}</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[.16em] text-slate-500">Всего сотрудников</p>
              <p className="mt-1 text-sm text-slate-300">
                {active.length} организаций · {LOCATIONS[form.location]} · 🚚 {form.trucksArrived}{" "}
                из {form.trucksPlanned}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {undoForm && (
              <button
                type="button"
                onClick={() => {
                  setForm(undoForm);
                  setUndoForm(null);
                }}
                className="ghost-action"
              >
                <Undo2 size={16} /> Вернуть
              </button>
            )}
            <button type="button" onClick={reset} className="ghost-action">
              <RotateCcw size={16} /> Обнулить
            </button>
            {!supply && lastSupply && (
              <button type="button" onClick={repeatLast} className="ghost-action">
                Повторить предыдущую
              </button>
            )}
            {onCancel && (
              <button type="button" onClick={onCancel} className="ghost-action">
                Отмена
              </button>
            )}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => setConfirming(true)}
              className="primary-action"
            >
              <CheckCircle2 size={18} />
              {supply ? "Сохранить изменения" : "Сохранить поставку"}
            </button>
            {!form.recipient.trim() && <span className="save-hint">Выберите получателя, чтобы сохранить</span>}
            {unavailable && <span className="save-hint">Ожидаем подключение к базе</span>}
          </div>
        </div>

        {isPrimaryForm && (
          <p className="mt-2 text-center text-[11px] text-slate-600">
            Черновик сохраняется на этом устройстве. Сохранённые поставки доступны на всех устройствах.
          </p>
        )}
      </div>

      {confirming && (
        <Modal
          title={supply ? "Сохранить изменения?" : "Подтвердите поставку"}
          subtitle={`${LOCATIONS[form.location]} · ${form.date} · ${form.time}`}
          onClose={() => setConfirming(false)}
        >
          <div className="p-5 sm:p-6">
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <div className="summary-chip">
                <span>Получатель</span>
                <strong>
                  {getRecipientEmoji(form.recipient)} {form.recipient.trim()}
                </strong>
              </div>
              <div className="summary-chip">
                <span>Статус</span>
                <strong
                  className={form.status === "DELIVERED" ? "text-emerald-300" : "text-rose-300"}
                >
                  {DELIVERY_STATUSES[form.status]}
                </strong>
              </div>
              <div className="summary-chip">
                <span>Матавозки</span>
                <strong>
                  🚚 {form.trucksArrived} из {form.trucksPlanned}
                </strong>
              </div>
              <div className="summary-chip">
                <span>Сопровождение</span>
                <strong>{ESCORT_STATUSES[form.escortStatus]}</strong>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {active.length ? (
                active.map((org) => (
                  <div key={org.id} className="summary-row">
                    <span>
                      {org.emoji} {org.name}
                    </span>
                    <strong>{form.organizations[org.id]}</strong>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">Все значения равны нулю.</p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
              <div>
                <span className="text-sm text-slate-400">Всего</span>
                <strong className="ml-3 text-2xl tabular-nums text-white">{total}</strong>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)} className="ghost-action">
                  Отмена
                </button>
                <button
                  disabled={saving}
                  onClick={async () => {
                    try {
                      await onSave(draft());
                      clearLocalDraft();
                      if (isPrimaryForm) {
                        setForm(initialForm());
                        setUndoForm(null);
                      }
                      setConfirming(false);
                    } catch {
                      // Человекочитаемое сообщение показывает SupplySystem.
                    }
                  }}
                  className="primary-action"
                >
                  {saving ? "Отправляем…" : "Подтвердить"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
