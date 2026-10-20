"use client";

import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Copy,
  PackageX,
  Pencil,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
import { sendSupply } from "@/lib/api";
import { useMemo, useState } from "react";
import { filterSupplies } from "@/lib/analytics";
import {
  DELIVERY_STATUSES,
  ESCORT_STATUSES,
  getRecipientEmoji,
  LOCATIONS,
  LOCATION_COLORS,
  ORGANIZATIONS,
  RECIPIENT_OPTIONS,
} from "@/lib/config";
import { formatDateTime } from "@/lib/date";
import type { FilterState, Supply } from "@/lib/types";
import { EmptyState, LoadingState, Modal } from "./controls";
import { DEFAULT_FILTERS, Filters } from "./Filters";

export function HistoryView({
  supplies,
  loading,
  deleting,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  supplies: Supply[];
  loading: boolean;
  deleting: boolean;
  onEdit: (supply: Supply) => void;
  onDelete: (supply: Supply) => Promise<void>;
  onDuplicate: (supply: Supply) => void;
}) {
  const [sendMessage,setSendMessage]=useState("");
  const [sending,setSending]=useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    period: "all",
  });
  const [selected, setSelected] = useState<Supply | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supply | null>(null);
  const visible = useMemo(() => filterSupplies(supplies, filters, true), [supplies, filters]);
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

  const StatusIcon = ({ status }: { status: Supply["status"] }) =>
    status === "DELIVERED" ? (
      <CheckCircle2 size={14} />
    ) : status === "NOT_DELIVERED" ? (
      <PackageX size={14} />
    ) : (
      <CircleHelp size={14} />
    );

  return (
    <section>
      <div className="mb-6">
        <div className="eyebrow">Архив операций</div>
        <h1 className="premium-title mt-2">История поставок</h1>
        <p className="mt-2 text-sm text-slate-400">
          {visible.length} записей по выбранным условиям
        </p>
      </div>
      <Filters value={filters} onChange={setFilters} withSearch recipients={recipients} />
      <div className="mt-5">
        {loading ? (
          <LoadingState />
        ) : !visible.length ? (
          <EmptyState
            title="Записей не найдено"
            description="Измените фильтры или создайте первую поставку на главной странице."
          />
        ) : (
          <div className="grid gap-3">
            {visible.map((supply) => {
              const active = ORGANIZATIONS.filter((org) => (supply.organizations[org.id] ?? 0) > 0);
              return (
                <button
                  key={supply.id}
                  onClick={() => setSelected(supply)}
                  className="history-card group grid w-full gap-4 p-4 text-left sm:grid-cols-[170px_1fr_auto] sm:items-center sm:p-5"
                >
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="location-badge" style={{ color: LOCATION_COLORS[supply.location], borderColor: `${LOCATION_COLORS[supply.location]}55`, background: `${LOCATION_COLORS[supply.location]}18` }}>{LOCATIONS[supply.location]}</span>
                      <span className={`status-badge status-${supply.status.toLowerCase()}`}>
                        <StatusIcon status={supply.status} />
                        {DELIVERY_STATUSES[supply.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{formatDateTime(supply.eventAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      <p className="text-lg font-semibold text-white">
                        {supply.total}{" "}
                        <span className="text-sm font-normal text-slate-500">сотрудников</span>
                      </p>
                      <p className="text-sm text-slate-500">Организаций: {active.length}</p>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-sky-100/80">
                      <UserRound size={14} />
                      {supply.recipient
                        ? `${getRecipientEmoji(supply.recipient)} ${supply.recipient}`
                        : "Получатель не указан"}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Truck size={13} /> Матавозки: {supply.trucksArrived} из{" "}
                        {supply.trucksPlanned}
                      </span>
                      <span>{ESCORT_STATUSES[supply.escortStatus]}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">{active.map(org => <span key={org.id} className="organization-chip" style={{ color: org.color, borderColor: org.color + "66", backgroundColor: org.color + "18" }}>{org.shortName}<b>{supply.organizations[org.id]}</b></span>)}</div>
                    {supply.comment && (
                      <p className="mt-1 truncate text-xs text-slate-500">{supply.comment}</p>
                    )}
                  </div>
                  <ChevronRight
                    size={20}
                    className="hidden text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300 sm:block"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {sendMessage && <p role="status">{sendMessage}</p>}
      {selected && (
        <Modal
          title={`${LOCATIONS[selected.location]} · ${formatDateTime(selected.eventAt)}`}
          subtitle={`Версия записи: ${selected.revision}`}
          onClose={() => setSelected(null)}
        >
          <div className="p-5 sm:p-6">
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <div className="summary-chip">
                <span>Получатель</span>
                <strong>
                  {selected.recipient
                    ? `${getRecipientEmoji(selected.recipient)} ${selected.recipient}`
                    : "Не указан"}
                </strong>
              </div>
              <div className="summary-chip">
                <span>Статус</span>
                <strong
                  className={`inline-flex items-center gap-1.5 status-text-${selected.status.toLowerCase()}`}
                >
                  <StatusIcon status={selected.status} />
                  {DELIVERY_STATUSES[selected.status]}
                </strong>
              </div>
              <div className="summary-chip">
                <span>Матавозки</span>
                <strong>
                  🚚 {selected.trucksArrived} из {selected.trucksPlanned}
                </strong>
              </div>
              <div className="summary-chip">
                <span>Сопровождение</span>
                <strong>{ESCORT_STATUSES[selected.escortStatus]}</strong>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ORGANIZATIONS.map((org) => (
                <div
                  key={org.id}
                  style={{ borderLeftColor: org.color }}
                  className={`flex justify-between rounded-xl border-l-2 px-4 py-3 text-sm ${(selected.organizations[org.id] ?? 0) ? "bg-white/[.045]" : "bg-white/[.02] opacity-55"}`}
                >
                  <span className="text-slate-300">
                    {org.emoji} {org.name}
                  </span>
                  <strong className="tabular-nums text-white">
                    {selected.organizations[org.id] ?? 0}
                  </strong>
                </div>
              ))}
            </div>
            {selected.comment && (
              <div className="mt-4 rounded-xl border border-white/8 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">Комментарий</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                  {selected.comment}
                </p>
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm text-slate-400">Всего</span>
                <strong className="ml-3 text-2xl tabular-nums text-white">{selected.total}</strong>
              </div>
              <div className="flex flex-wrap gap-2"><button disabled={sending} className="rounded-xl border px-4 py-2.5 text-sm" onClick={async()=>{setSending(true);try{await sendSupply(selected);setSendMessage('Поставлено в очередь вебхука. Статус — в уведомлениях Discord.');setSelected(null);}catch(e){setSendMessage(e instanceof Error?e.message:'Ошибка отправки');}finally{setSending(false);}}}>В Discord</button>
                <button
                  onClick={() => {
                    onDuplicate(selected);
                    setSelected(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300"
                >
                  <Copy size={15} />
                  Дублировать
                </button>
                <button
                  onClick={() => {
                    onEdit(selected);
                    setSelected(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300"
                >
                  <Pencil size={15} />
                  Изменить
                </button>
                <button
                  onClick={() => {
                    setDeleteTarget(selected);
                    setSelected(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-2.5 text-sm text-rose-200"
                >
                  <Trash2 size={15} />
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          danger
          title={`Удалить поставку от ${formatDateTime(deleteTarget.eventAt)}?`}
          subtitle="Поставка исчезнет из истории и статистики. Администратор сможет восстановить её из базы."
          onClose={() => setDeleteTarget(null)}
        >
          <div className="flex justify-end gap-2 p-5 sm:p-6">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300"
            >
              Отмена
            </button>
            <button
              disabled={deleting}
              onClick={async () => {
                try {
                  await onDelete(deleteTarget);
                  setDeleteTarget(null);
                } catch {
                  // Сообщение уже показано на уровне приложения.
                }
              }}
              className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleting ? "Удаляем…" : "Удалить"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
