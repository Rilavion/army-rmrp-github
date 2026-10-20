import { LOCATIONS, ORGANIZATIONS } from "./config";
import { formatDate, formatTime } from "./date";
import type { Supply } from "./types";

function download(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const escapeCsv = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

export function exportCsv(supplies: Supply[]) {
  const headers = [
    "date",
    "time",
    "location",
    "recipient",
    "status",
    "trucks_arrived",
    "trucks_planned",
    "escort_status",
    ...ORGANIZATIONS.map((org) => org.id),
    "total",
    "comment",
  ];
  const rows = supplies.map((supply) => [
    formatDate(supply.eventAt),
    formatTime(supply.eventAt),
    LOCATIONS[supply.location],
    supply.recipient,
    supply.status,
    supply.trucksArrived,
    supply.trucksPlanned,
    supply.escortStatus,
    ...ORGANIZATIONS.map((org) => supply.organizations[org.id] ?? 0),
    supply.total,
    supply.comment,
  ]);
  download(
    `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\r\n")}`,
    `supplies-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8",
  );
}

export function exportJson(supplies: Supply[]) {
  const payload = supplies.map((supply) => ({
    ...supply,
    eventAt: supply.eventAt.toISOString(),
    createdAt: supply.createdAt?.toISOString() ?? null,
    updatedAt: supply.updatedAt?.toISOString() ?? null,
  }));
  download(
    JSON.stringify({ exportedAt: new Date().toISOString(), supplies: payload }, null, 2),
    `supplies-backup-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  download(blob, filename, blob.type);
}
