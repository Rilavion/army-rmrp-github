import { LOCATIONS, LOCATION_CODES, ORGANIZATIONS } from "./config";
import { formatDate, formatTime, getPeriodRange } from "./date";
import type { FilterState, Supply } from "./types";

export function filterSupplies(supplies: Supply[], filters: FilterState, includeSearch = false) {
  const { start, end } = getPeriodRange(filters.period, filters.from, filters.to);
  const needle = filters.search.trim().toLocaleLowerCase("ru");
  return supplies.filter((supply) => {
    if (start && supply.eventAt < start) return false;
    if (end && supply.eventAt >= end) return false;
    if (filters.location !== "ALL" && supply.location !== filters.location) return false;
    if (filters.status !== "ALL" && supply.status !== filters.status) return false;
    if (filters.recipient !== "ALL" && supply.recipient !== filters.recipient) return false;
    if (filters.organization !== "ALL" && (supply.organizations[filters.organization] ?? 0) <= 0)
      return false;
    if (includeSearch && needle) {
      const text =
        `${supply.comment} ${supply.recipient} ${supply.status === "DELIVERED" ? "довезли" : supply.status === "NOT_DELIVERED" ? "не довезли" : "не указан"} ${LOCATIONS[supply.location]} ${formatDate(supply.eventAt)} ${formatTime(supply.eventAt)} ${ORGANIZATIONS.filter(org => supply.organizations[org.id] > 0).map(org => org.name).join(" ")}`.toLocaleLowerCase(
          "ru",
        );
      if (!text.includes(needle)) return false;
    }
    return true;
  });
}

export function getAnalytics(supplies: Supply[], organizationFilter: string = "ALL") {
  const countFor = (supply: Supply, id: string) => supply.organizations[id] ?? 0;
  const effectiveTotal = (supply: Supply) =>
    organizationFilter === "ALL" ? supply.total : countFor(supply, organizationFilter);
  const totalPeople = supplies.reduce((sum, supply) => sum + effectiveTotal(supply), 0);
  const organizations = ORGANIZATIONS.map((org) => {
    const values = supplies.map((supply) => countFor(supply, org.id));
    const positive = values.filter((value) => value > 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      ...org,
      total,
      participations: positive.length,
      average: positive.length ? total / positive.length : 0,
      max: positive.length ? Math.max(...positive) : 0,
      min: positive.length ? Math.min(...positive) : 0,
      share: totalPeople ? (total / totalPeople) * 100 : 0,
    };
  })
    .filter((org) => organizationFilter === "ALL" || org.id === organizationFilter)
    .sort((a, b) => b.total - a.total);
  const byLocation = LOCATION_CODES.map((location) => {
    const rows = supplies.filter((supply) => supply.location === location);
    const people = rows.reduce((sum, supply) => sum + effectiveTotal(supply), 0);
    return {
      location,
      supplies: rows.length,
      people,
      average: rows.length ? people / rows.length : 0,
      share: totalPeople ? (people / totalPeople) * 100 : 0,
    };
  });
  const delivered = supplies.filter((supply) => supply.status === "DELIVERED");
  const notDelivered = supplies.filter((supply) => supply.status === "NOT_DELIVERED");
  const unknownStatus = supplies.filter((supply) => supply.status === "UNKNOWN");
  const trucksArrived = supplies.reduce((sum, supply) => sum + supply.trucksArrived, 0);
  const trucksPlanned = supplies.reduce((sum, supply) => sum + supply.trucksPlanned, 0);
  const escortYes = supplies.filter((supply) => supply.escortStatus === "YES").length;
  const escortNo = supplies.filter((supply) => supply.escortStatus === "NO").length;
  const escortUnknown = supplies.filter((supply) => supply.escortStatus === "UNKNOWN").length;
  const completedWithStatus = delivered.length + notDelivered.length;
  const recipientMap = new Map<
    string,
    { recipient: string; supplies: number; people: number; delivered: number }
  >();
  supplies.forEach((supply) => {
    const recipient = supply.recipient || "Не указан";
    const current = recipientMap.get(recipient) ?? {
      recipient,
      supplies: 0,
      people: 0,
      delivered: 0,
    };
    current.supplies += 1;
    current.people += effectiveTotal(supply);
    if (supply.status === "DELIVERED") current.delivered += 1;
    recipientMap.set(recipient, current);
  });
  const byRecipient = [...recipientMap.values()]
    .map((item) => ({
      ...item,
      successRate: item.supplies ? (item.delivered / item.supplies) * 100 : 0,
    }))
    .sort((a, b) => b.supplies - a.supplies || b.people - a.people);
  return {
    supplyCount: supplies.length,
    totalPeople,
    average: supplies.length ? totalPeople / supplies.length : 0,
    trucks: {
      arrived: trucksArrived,
      planned: trucksPlanned,
      completionRate: trucksPlanned ? (trucksArrived / trucksPlanned) * 100 : 0,
    },
    activeOrganizations: organizations.filter((org) => org.total > 0).length,
    organizations,
    byLocation,
    delivery: {
      delivered: delivered.length,
      notDelivered: notDelivered.length,
      unknown: unknownStatus.length,
      successRate: completedWithStatus ? (delivered.length / completedWithStatus) * 100 : 0,
    },
    escort: {
      yes: escortYes,
      no: escortNo,
      unknown: escortUnknown,
    },
    byRecipient,
  };
}
