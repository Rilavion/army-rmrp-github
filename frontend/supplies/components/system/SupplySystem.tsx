"use client";

import { BarChart3, ClipboardList, History, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  canEdit,
  createSupply,
  isApiConfigured,
  removeSupply,
  subscribeToSupplies,
  updateSupply,
} from "@/lib/api";
import type { Supply, SupplyDraft } from "@/lib/types";
import { DeliveryAnimation, LoadingState, Modal, StatusBanner } from "./controls";
import { HistoryView } from "./HistoryView";
import { SupplyForm } from "./SupplyForm";

const StatsView = lazy(() =>
  import("./StatsView").then((module) => ({ default: module.StatsView })),
);

type Page = "current" | "history" | "stats";
type Notice = { message: string; tone: "info" | "success" | "error" } | null;

export function SupplySystem() {
  const [page, setPage] = useState<Page>(location.pathname.includes("stats") ? "stats" : "current");
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(isApiConfigured);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const requestId = useRef<{ id: string; fingerprint: string } | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  const [duplicate, setDuplicate] = useState<Supply | null>(null);
  const [online, setOnline] = useState(true);
  const [saveAnimation, setSaveAnimation] = useState<"idle" | "driving" | "success">("idle");

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const unsubscribe = subscribeToSupplies(
      (data, connected) => {
        setSupplies(data);
        setLoading(!connected);
        setDatabaseReady(connected);
        setDatabaseError(null);
      },
      (error) => {
        setLoading(false);
        setDatabaseReady(false);
        setDatabaseError(error.message);
      },
    );
    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [notice]);
  const lastSupply = useMemo(() => supplies[0] ?? null, [supplies]);

  const showSaveSuccess = async () => {
    setSaveAnimation("success");

    setSaveAnimation("idle");
  };

  async function handleCreate(draft: SupplyDraft) {
    if (!online || !databaseReady) throw new Error("Дождитесь подключения к базе перед сохранением.");
    setSaving(true);
    setSaveAnimation("driving");
    try {
      const fingerprint = JSON.stringify(draft);
      if (requestId.current?.fingerprint !== fingerprint) requestId.current = { id: crypto.randomUUID(), fingerprint };
      await createSupply(draft, requestId.current.id);
      requestId.current = null;
      await showSaveSuccess();
      setNotice({
        message: "Поставка сохранена и уже учитывается в статистике.",
        tone: "success",
      });
    } catch (error) {
      setSaveAnimation("idle");
      setNotice({
        message: error instanceof Error ? error.message : "Не удалось сохранить поставку.",
        tone: "error",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(draft: SupplyDraft) {
    if (!editing) return;
    setSaving(true);
    setSaveAnimation("driving");
    try {
      await updateSupply(editing.id, draft, editing.revision);
      await showSaveSuccess();
      setEditing(null);
      setNotice({ message: "Изменения сохранены.", tone: "success" });
    } catch (error) {
      setSaveAnimation("idle");
      setNotice({
        message: error instanceof Error ? error.message : "Не удалось обновить поставку.",
        tone: "error",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supply: Supply) {
    setDeleting(true);
    try {
      await removeSupply(supply.id, supply.revision);
      setNotice({ message: "Поставка удалена.", tone: "success" });
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : "Не удалось удалить поставку.",
        tone: "error",
      });
      throw error;
    } finally {
      setDeleting(false);
    }
  }

  const nav = [
    {
      id: "current" as const,
      label: "Текущая поставка",
      short: "Учёт",
      icon: ClipboardList,
    },
    {
      id: "history" as const,
      label: "История",
      short: "История",
      icon: History,
    },
    {
      id: "stats" as const,
      label: "Статистика",
      short: "Статистика",
      icon: BarChart3,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-clip pb-24 text-[var(--foreground)] sm:pb-0">
      <header className="supply-nav"><nav aria-label="Разделы поставок">{nav.map(item => <button key={item.id} onClick={() => setPage(item.id)} aria-current={page === item.id ? 'page' : undefined}>{item.label}</button>)}</nav><span>{online && databaseReady ? 'База подключена' : 'Нет связи с базой'}</span></header>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:py-10">
        <div className="mb-5 grid gap-3">
          {databaseError && <StatusBanner tone="error">{databaseError}</StatusBanner>}

          {!online && (
            <StatusBanner tone="error">
              Интернет-соединение потеряно. Не закрывайте страницу во время сохранения; повторите
              действие после восстановления связи.
            </StatusBanner>
          )}
          {notice && (
            <StatusBanner tone={notice.tone}>
              {notice.tone === "success" ? "✓ " : ""}
              {notice.message}
            </StatusBanner>
          )}
        </div>
        <div key={page} className="page-enter">
          {page === "current" && (
            <SupplyForm lastSupply={lastSupply} saving={saving} unavailable={!online || !databaseReady || !canEdit()} supplies={supplies} loading={loading || !databaseReady} onSave={handleCreate} />
          )}
          {page === "history" && (
            <HistoryView
              supplies={supplies}
              loading={loading}
              deleting={deleting}
              onEdit={(supply) => { if (canEdit()) setEditing(supply); else setNotice({message:"Нет права редактировать поставки",tone:"error"}); }}
              onDelete={handleDelete}
              onDuplicate={(supply) => {
                setDuplicate(supply);
                setPage("current");
              }}
            />
          )}
          {page === "stats" && (
            <Suspense fallback={<LoadingState />}>
              <StatsView
                supplies={supplies}
                onStatus={(message, tone = "success") => setNotice({ message, tone })}
              />
            </Suspense>
          )}
        </div>
      </div>



      {editing && (
        <Modal
          title="Редактирование поставки"
          subtitle="Системная дата создания будет сохранена"
          onClose={() => setEditing(null)}
        >
          <SupplyForm
            supply={editing}
            saving={saving}
            onSave={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      {duplicate && (
        <Modal
          title="Дублировать поставку"
          subtitle="Создаётся новая независимая запись с текущими датой и временем"
          onClose={() => setDuplicate(null)}
        >
          <SupplyForm
            embedded
            template={duplicate}
            saving={saving}
            onSave={async (draft) => {
              await handleCreate(draft);
              setDuplicate(null);
            }}
            onCancel={() => setDuplicate(null)}
          />
        </Modal>
      )}

    </main>
  );
}
