/**
 * Market status utilities for US stock market
 * Handles timezone conversion and market hours calculation
 */

import { format, isWeekend } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime, formatInTimeZone } from 'date-fns-tz';

const KOREA_TZ = 'Asia/Seoul';
const US_EASTERN_TZ = 'America/New_York';

/**
 * Get current market status information
 * @returns {Object} Market status information
 */
export function getMarketStatus() {
  const now = new Date();
  const koreaTime = utcToZonedTime(now, KOREA_TZ);
  const usTime = utcToZonedTime(now, US_EASTERN_TZ);
  
  // Format current Korea time
  const currentTimeStr = formatInTimeZone(now, KOREA_TZ, 'yyyy-MM-dd HH:mm:ss');
  
  // Check if it's weekend in US
  const usWeekday = usTime.getDay(); // 0 = Sunday, 6 = Saturday
  const isUSWeekend = usWeekday === 0 || usWeekday === 6;
  
  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpenHour = 9;
  const marketOpenMinute = 30;
  const marketCloseHour = 16;
  const marketCloseMinute = 0;
  
  const currentHour = usTime.getHours();
  const currentMinute = usTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const marketOpenTimeInMinutes = marketOpenHour * 60 + marketOpenMinute;
  const marketCloseTimeInMinutes = marketCloseHour * 60 + marketCloseMinute;
  
  const isMarketOpen = !isUSWeekend && 
    currentTimeInMinutes >= marketOpenTimeInMinutes && 
    currentTimeInMinutes < marketCloseTimeInMinutes;
  
  let status;
  if (isUSWeekend) {
    status = 'Weekend Closed';
  } else if (isMarketOpen) {
    status = 'Regular Market Open';
  } else {
    status = 'Regular Market Closed';
  }
  
  // Check if DST is in effect (simplified check)
  const isDST = isDateInDST(usTime);
  const dstText = isDST ? 'Active' : 'Inactive';
  
  // Calculate reservation trading window (simplified)
  // Reservation trading typically starts at 9:00 AM KST and ends 30 minutes before market open
  const reservationStartKST = new Date(koreaTime);
  reservationStartKST.setHours(9, 0, 0, 0);
  
  // Calculate next market open time in Korea time zone
  let nextMarketOpen = new Date(usTime);
  nextMarketOpen.setHours(marketOpenHour, marketOpenMinute, 0, 0);
  
  // If market already opened today, move to next business day
  if (isMarketOpen || (!isUSWeekend && currentTimeInMinutes >= marketOpenTimeInMinutes)) {
    nextMarketOpen.setDate(nextMarketOpen.getDate() + 1);
    // Skip weekends
    while (nextMarketOpen.getDay() === 0 || nextMarketOpen.getDay() === 6) {
      nextMarketOpen.setDate(nextMarketOpen.getDate() + 1);
    }
  } else if (isUSWeekend) {
    // Move to next Monday
    const daysToAdd = usWeekday === 0 ? 1 : 2; // Sunday: +1, Saturday: +2
    nextMarketOpen.setDate(nextMarketOpen.getDate() + daysToAdd);
  }
  
  const nextMarketOpenKST = utcToZonedTime(
    zonedTimeToUtc(nextMarketOpen, US_EASTERN_TZ), 
    KOREA_TZ
  );
  
  const reservationEndKST = new Date(nextMarketOpenKST.getTime() - 30 * 60 * 1000); // 30 minutes before
  
  const isReservationPossible = koreaTime >= reservationStartKST && koreaTime < reservationEndKST;
  
  return {
    currentTimeKST: currentTimeStr,
    marketStatus: status,
    dstStatus: dstText,
    isMarketOpen,
    isReservationPossible,
    koreaTime,
    usTime
  };
}

/**
 * Simple DST detection for US Eastern timezone
 * @param {Date} date - Date to check
 * @returns {boolean} Whether DST is in effect
 */
function isDateInDST(date) {
  // DST in US typically starts on second Sunday in March and ends on first Sunday in November
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based
  
  // Rough approximation - DST is generally from March to November
  if (month < 2 || month > 10) return false;
  if (month > 2 && month < 10) return true;
  
  // For March and November, we need more precise calculation
  // This is a simplified version
  if (month === 2) { // March
    return date.getDate() > 14;
  }
  if (month === 10) { // November
    return date.getDate() < 7;
  }
  
  return false;
}

/**
 * Get formatted time string for display
 * @param {Date} date - Date to format
 * @param {string} timeZone - Target timezone
 * @returns {string} Formatted time string
 */
export function formatTimeForDisplay(date, timeZone = KOREA_TZ) {
  return formatInTimeZone(date, timeZone, 'HH:mm:ss');
}
