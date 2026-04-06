function pad(value) {
  return String(value).padStart(2, '0');
}

function toIsoDate(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function nowTime() {
  const date = new Date();
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatMonth(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function startOfDay(dateString) {
  return `${dateString} 00:00:00`;
}

function endOfDay(dateString) {
  return `${dateString} 23:59:59`;
}

function isoWeekKey(dateString) {
  const date = new Date(dateString);
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
  return `${temp.getUTCFullYear()}-W${pad(week)}`;
}

module.exports = { toIsoDate, nowTime, formatMonth, startOfDay, endOfDay, isoWeekKey };