export type LocationCode = "RLS" | "VS" | "OB7";
export type DeliveryStatus = "DELIVERED" | "NOT_DELIVERED";
export type StoredDeliveryStatus = DeliveryStatus | "UNKNOWN";
export type EscortStatus = "YES" | "NO" | "UNKNOWN";

export type Organization = {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  color: string;
};

export type Supply = {
  id: string;
  location: LocationCode;
  recipient: string;
  status: StoredDeliveryStatus;
  trucksArrived: number;
  trucksPlanned: number;
  escortStatus: EscortStatus;
  eventAt: Date;
  comment: string;
  organizations: Record<string, number>;
  total: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  revision: number;
};

export type SupplyDraft = {
  location: LocationCode;
  recipient: string;
  status: DeliveryStatus;
  trucksArrived: number;
  trucksPlanned: number;
  escortStatus: EscortStatus;
  eventAt: Date;
  comment: string;
  organizations: Record<string, number>;
};

export type PeriodKey =
  | "today"
  | "7days"
  | "month"
  | "lastMonth"
  | "3months"
  | "year"
  | "all"
  | "custom";

export type FilterState = {
  period: PeriodKey;
  location: "ALL" | LocationCode;
  organization: string;
  recipient: string;
  status: "ALL" | StoredDeliveryStatus;
  from: string;
  to: string;
  search: string;
};
