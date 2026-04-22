const IST_TIME_ZONE = "Asia/Kolkata";

export const parseBackendDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized =
    /z$/i.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)
      ? raw
      : `${raw}Z`;
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date;
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const formatBookingDateTime = (value?: string | null): string => {
  const date = parseBackendDate(value);
  if (!date) return "-";
  const dateLabel = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: IST_TIME_ZONE,
  });
  const timeLabel = date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: IST_TIME_ZONE,
    })
    .toLowerCase();
  return `${dateLabel} · ${timeLabel}`;
};

export const formatBookingTimeOnly = (value?: string | null): string => {
  const date = parseBackendDate(value);
  if (!date) return "";
  return date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: IST_TIME_ZONE,
    })
    .toLowerCase();
};
