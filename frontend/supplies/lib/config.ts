import type { Organization } from "./types";

export const ORGANIZATIONS: Organization[] = [
  {
    "id": "vs_rf",
    "name": "ВС РФ",
    "shortName": "ВС РФ",
    "emoji": "🪖",
    "color": "#36b76c"
  },
  {
    "id": "cgb3",
    "name": "ЦГБ №3",
    "shortName": "ЦГБ №3",
    "emoji": "🏥",
    "color": "#357afa"
  },
  {
    "id": "cgb7",
    "name": "ЦГБ №7",
    "shortName": "ЦГБ №7",
    "emoji": "🏥",
    "color": "#f18ab8"
  },
  {
    "id": "fso",
    "name": "ФСО",
    "shortName": "ФСО",
    "emoji": "🛡️",
    "color": "#78d9fc"
  },
  {
    "id": "fsb",
    "name": "ФСБ",
    "shortName": "ФСБ",
    "emoji": "🕵️",
    "color": "#a52d48"
  },
  {
    "id": "uvd_cao",
    "name": "УВД по ЦАО",
    "shortName": "УВД",
    "emoji": "👮",
    "color": "#3155ad"
  },
  {
    "id": "gibdd",
    "name": "ГИБДД",
    "shortName": "ГИБДД",
    "emoji": "🚔",
    "color": "#309aca"
  },
  {
    "id": "codd",
    "name": "ЦОДД",
    "shortName": "ЦОДД",
    "emoji": "🚦",
    "color": "#b3e552"
  },
  {
    "id": "fsvng",
    "name": "ФСВНГ (Росгвардия)",
    "shortName": "ФСВНГ",
    "emoji": "⚔️",
    "color": "#fa5353"
  },
  {
    "id": "fsin",
    "name": "ФСИН",
    "shortName": "ФСИН",
    "emoji": "🔒",
    "color": "#30cbbb"
  }
];

export const ADDITIONAL_RECIPIENTS = [
  { id: "government", name: "Правительство", emoji: "🏛️" },
  { id: "court", name: "Суд", emoji: "⚖️" },
  { id: "prosecutor", name: "Прокуратура", emoji: "📜" },
  { id: "investigative_committee", name: "СК", emoji: "🔎" },
] as const;

export const RECIPIENT_OPTIONS = [
  ...ORGANIZATIONS.map(({ id, name, emoji }) => ({ id, name, emoji })),
  ...ADDITIONAL_RECIPIENTS,
] as const;

export function getRecipientEmoji(name: string) {
  return RECIPIENT_OPTIONS.find((recipient) => recipient.name === name)?.emoji ?? "📦";
}

export const LOCATIONS = { RLS: "РЛС", VS: "ВС", OB7: "ОБ-7" } as const;
export const LOCATION_CODES = ["RLS", "VS", "OB7"] as const;
export const LOCATION_COLORS = { RLS: "#b3e552", VS: "#36b76c", OB7: "#edc46b" } as const;
export const LOCATION_DESCRIPTIONS = { RLS: "Поставка РЛС", VS: "Поставка ВС", OB7: "Поставка ОБ-7" } as const;
export const DELIVERY_STATUSES = {
  DELIVERED: "Довезли",
  NOT_DELIVERED: "Не довезли",
  UNKNOWN: "Не указан",
} as const;
export const ESCORT_STATUSES = {
  YES: "Сопровождение дали",
  NO: "Сопровождение не дали",
  UNKNOWN: "Не указано",
} as const;
export const MAX_COUNT_PER_ORGANIZATION = 999;
export const MAX_TRUCK_COUNT = 99;
export const MAX_RECIPIENT_LENGTH = 120;
export const MOSCOW_TIME_ZONE = "Europe/Moscow";

export const PERIOD_OPTIONS = [
  ["today", "Сегодня"],
  ["7days", "Последние 7 дней"],
  ["month", "Текущий месяц"],
  ["lastMonth", "Прошлый месяц"],
  ["3months", "Последние 3 месяца"],
  ["year", "Год"],
  ["all", "Всё время"],
  ["custom", "Свой период"],
] as const;
