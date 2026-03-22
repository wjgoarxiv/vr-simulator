/**
 * Market status utility for VR Simulator
 * Mirrors app.py get_market_status() logic exactly using Intl.DateTimeFormat and Date APIs.
 */

const HOLIDAY_DISCLAIMER =
  "* 미국 공휴일은 반영되지 않습니다. 실제 거래 가능 여부는 증권사에서 확인하세요.";

/**
 * Format a Date object as "YYYY-MM-DD HH:MM:SS" in the given IANA timezone.
 */
function formatInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const p = {};
  for (const { type, value } of parts) {
    p[type] = value;
  }
  // en-CA gives YYYY-MM-DD natively; hour can be "24" for midnight in some engines
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}`;
}

/**
 * Extract calendar/time fields for a Date in a given IANA timezone.
 * Returns { year, month (1-12), day, weekday (0=Sun…6=Sat), hour, minute, second }
 */
function getFieldsInTimezone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short", // Mon, Tue, …
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = {};
  for (const { type, value } of fmt.formatToParts(date)) {
    parts[type] = value;
  }

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = parts.hour === "24" ? 0 : parseInt(parts.hour, 10);

  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    weekday: weekdayMap[parts.weekday], // 0=Sun, 1=Mon, …, 6=Sat
    hour,
    minute: parseInt(parts.minute, 10),
    second: parseInt(parts.second, 10),
  };
}

/**
 * Detect DST for US/Eastern by comparing the UTC offset.
 * EST = UTC-5 (no DST), EDT = UTC-4 (DST active).
 */
function getEasternDstStatus(date) {
  // Get the UTC offset in minutes for US/Eastern at this date
  // We derive it by comparing the local time values to UTC.
  const utcFields = getFieldsInTimezone(date, "UTC");
  const etFields = getFieldsInTimezone(date, "America/New_York");

  const utcMinutes = utcFields.hour * 60 + utcFields.minute;
  const etMinutes = etFields.hour * 60 + etFields.minute;

  // Offset = ET - UTC (may wrap across midnight; handle the wrap)
  let offsetMinutes = etMinutes - utcMinutes;
  if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
  if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;

  // offsetMinutes === -240 means UTC-4 (DST), -300 means UTC-5 (no DST)
  return offsetMinutes === -240;
}

/**
 * Build a UTC timestamp (ms) for 9:30 AM on a given calendar date in America/New_York.
 * We find the UTC ms by binary-searching or by leveraging the known offset.
 *
 * Simple approach: construct a candidate UTC time based on the observed ET offset,
 * then verify and nudge if a DST transition lands exactly on that day.
 */
function get930ETasUTC(year, month, day) {
  // Try UTC-5 first (EST)
  function candidate(offsetHours) {
    return Date.UTC(year, month - 1, day, 9, 30, 0) - offsetHours * 3600 * 1000;
  }

  // Try both possible offsets and pick the one where ET actually reads 09:30 on that date
  for (const off of [4, 5]) {
    const ms = candidate(off);
    const f = getFieldsInTimezone(new Date(ms), "America/New_York");
    if (f.year === year && f.month === month && f.day === day && f.hour === 9 && f.minute === 30) {
      return ms;
    }
  }

  // Fallback: standard EST offset
  return candidate(5);
}

/**
 * Convert a UTC ms timestamp to KST (UTC+9) and return hour + minute as numbers.
 */
function getKSTHourMinute(utcMs) {
  const f = getFieldsInTimezone(new Date(utcMs), "Asia/Seoul");
  return { hour: f.hour, minute: f.minute };
}

/**
 * Python's weekday(): Mon=0 … Sun=6
 * JS weekday from Intl: Sun=0, Mon=1, … Sat=6
 */
function jsToPythonWeekday(jsWeekday) {
  // JS: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // Python: 0=Mon,1=Tue,2=Wed,3=Thu,4=Fri,5=Sat,6=Sun
  return jsWeekday === 0 ? 6 : jsWeekday - 1;
}

/**
 * Get current VR Simulator market status.
 *
 * @returns {{
 *   currentTimeStr: string,
 *   marketStatusStr: string,
 *   dstStatusStr: string,
 *   isTradingNow: boolean,
 *   isReservationNow: boolean,
 *   holidayDisclaimer: string
 * }}
 */
export function getMarketStatus() {
  const now = new Date();

  // --- KST formatted string ---
  const currentTimeStr = formatInTimezone(now, "Asia/Seoul");

  // --- US/Eastern fields ---
  const etFields = getFieldsInTimezone(now, "America/New_York");
  const usWeekdayJS = etFields.weekday; // 0=Sun … 6=Sat
  const usWeekdayPy = jsToPythonWeekday(usWeekdayJS); // 0=Mon … 6=Sun

  // --- Market open check (app.py: weekday < 5 means Mon-Fri) ---
  const etTotalMinutes = etFields.hour * 60 + etFields.minute;
  const openMinutes = 9 * 60 + 30; // 9:30
  const closeMinutes = 16 * 60; // 16:00

  const isWeekday = usWeekdayPy < 5; // Mon-Fri
  const isInTradingHours = etTotalMinutes >= openMinutes && etTotalMinutes < closeMinutes;
  const isTradingNow = isWeekday && isInTradingHours;

  // --- Market status string ---
  let marketStatusStr;
  if (usWeekdayPy >= 5) {
    marketStatusStr = "주말 휴장";
  } else if (isTradingNow) {
    marketStatusStr = "정규장 운영 중";
  } else {
    marketStatusStr = "정규장 종료";
  }

  // --- DST status ---
  const isDST = getEasternDstStatus(now);
  const dstStatusStr = isDST ? "적용 중" : "미적용";

  // --- Reservation window (mirrors app.py logic exactly) ---
  let isReservationNow = false;
  try {
    // Determine next market open date in ET (year/month/day)
    let nextOpenYear = etFields.year;
    let nextOpenMonth = etFields.month;
    let nextOpenDay = etFields.day;

    const pastOrAtOpen = etTotalMinutes >= openMinutes;

    // Helper: add N days to ET calendar date using pure date arithmetic (no TZ round-trip)
    function addDaysToETDate(n) {
      const norm = new Date(Date.UTC(etFields.year, etFields.month - 1, etFields.day + n));
      nextOpenYear = norm.getUTCFullYear();
      nextOpenMonth = norm.getUTCMonth() + 1;
      nextOpenDay = norm.getUTCDate();
    }

    if (pastOrAtOpen) {
      if (usWeekdayPy === 4) addDaysToETDate(3);       // Friday -> Monday
      else if (usWeekdayPy < 4) addDaysToETDate(1);     // Mon-Thu -> next day
      else if (usWeekdayPy === 5) addDaysToETDate(2);    // Saturday -> Monday
      else if (usWeekdayPy === 6) addDaysToETDate(1);    // Sunday -> Monday
    } else {
      if (usWeekdayPy === 5) addDaysToETDate(2);         // Saturday -> Monday
      else if (usWeekdayPy === 6) addDaysToETDate(1);    // Sunday -> Monday
      // else: weekday before 9:30 -> today is next open (no change)
    }

    // Convert next market open (9:30 ET) to UTC ms
    const nextOpenUTCms = get930ETasUTC(nextOpenYear, nextOpenMonth, nextOpenDay);

    // reservation_end_kst = market_open_time_kst - 30 minutes
    const reservationEndUTCms = nextOpenUTCms - 30 * 60 * 1000;

    // reservation_start_kst = today 9:00 AM KST
    // Build today 09:00:00 KST in UTC
    const kstFields = getFieldsInTimezone(now, "Asia/Seoul");
    // KST is always UTC+9, so today 09:00 KST = UTC date at (09:00 - 09:00) = 00:00 UTC on same calendar day
    const reservationStartUTCms = Date.UTC(kstFields.year, kstFields.month - 1, kstFields.day, 0, 0, 0); // 00:00 UTC = 09:00 KST

    // Convert both ends to KST dates for date-comparison logic
    const rStartKSTFields = getFieldsInTimezone(new Date(reservationStartUTCms), "Asia/Seoul");
    const rEndKSTFields = getFieldsInTimezone(new Date(reservationEndUTCms), "Asia/Seoul");
    const nowKSTFields = getFieldsInTimezone(now, "Asia/Seoul");

    const rStartDate = `${rStartKSTFields.year}-${rStartKSTFields.month}-${rStartKSTFields.day}`;
    const rEndDate = `${rEndKSTFields.year}-${rEndKSTFields.month}-${rEndKSTFields.day}`;
    const nowDate = `${nowKSTFields.year}-${nowKSTFields.month}-${nowKSTFields.day}`;

    if (rStartDate === rEndDate) {
      // Same KST day: simple time range check
      isReservationNow =
        now.getTime() >= reservationStartUTCms && now.getTime() < reservationEndUTCms;
    } else {
      // Spans midnight KST
      isReservationNow =
        (now.getTime() >= reservationStartUTCms && nowDate === rStartDate) ||
        (now.getTime() < reservationEndUTCms && nowDate === rEndDate);
    }
  } catch (_) {
    isReservationNow = false;
  }

  return {
    currentTimeStr,
    marketStatusStr,
    dstStatusStr,
    isTradingNow,
    isReservationNow,
    holidayDisclaimer: HOLIDAY_DISCLAIMER,
  };
}
