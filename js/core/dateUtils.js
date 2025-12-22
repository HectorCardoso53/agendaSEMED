// js/core/dateUtils.js
const pad = n => String(n).padStart(2, "0");

function parseDDMMYYYY(str) {
  if (!str) return null;
  const parts = str.split("/").map(s => s.trim());
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if ([day, month, year].some(isNaN)) return null;
  return { day, month, year };
}

function parseTimeString(timeStr) {
  if (!timeStr) return { hours: 0, minutes: 0 };
  const s = String(timeStr).toLowerCase().trim();
  const re = /(\d{1,2})(?:\s*[:h]\s*(\d{1,2}))?\s*(am|pm)?/i;
  const m = s.match(re);
  if (!m) return { hours: 0, minutes: 0 };
  let h = parseInt(m[1], 10);
  let min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase() || null;
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  h = Math.min(Math.max(h, 0), 23);
  min = Math.min(Math.max(min, 0), 59);
  return { hours: h, minutes: min };
}

const formatTime = (h, m) => `${pad(h)}:${pad(m)}`;

export { pad, parseDDMMYYYY, parseTimeString, formatTime };
