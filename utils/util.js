function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

// 兼容 iOS：用 '/' 替换 '-' 后再解析
function parseDate(str) {
  if (!str) return null;
  if (str instanceof Date) return str;
  const normalized = String(str).replace(/-/g, '/');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date) {
  const d = date instanceof Date ? date : parseDate(date);
  if (!d) return '';
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function formatDateTime(date) {
  const d = date instanceof Date ? date : parseDate(date);
  if (!d) return '';
  return formatDate(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function daysSince(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function isExpired(dateStr, validDays) {
  return daysSince(dateStr) > validDays;
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

module.exports = {
  parseDate,
  formatDate,
  formatDateTime,
  daysSince,
  isExpired,
  daysUntil
};
