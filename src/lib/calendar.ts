import Kenat from "kenat";

export function formatSystemDate(date: Date, calendarType: string) {
  if (calendarType === "ETHIOPIAN") {
    try {
      const etDate = new Kenat(date);
      // Use the instance method formatWithWeekday for the desired "Day, Month Date, Year" format
      return etDate.formatWithWeekday("amharic", false);
    } catch (error) {
      console.error("Error formatting Ethiopian date:", error);
      return date.toLocaleDateString();
    }
  }
  
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatEthiopianMonthYear(date: Date) {
  try {
    const etDate = new Kenat(date).getEthiopian();
    const months = getEthiopianMonths();
    const monthName = months.find(m => m.id === etDate.month)?.name.split(" ")[0];
    return `${monthName} ${etDate.year}`;
  } catch (error) {
    return "";
  }
}

export function getSystemToday(calendarType: string) {
  return formatSystemDate(new Date(), calendarType);
}
export function getEthiopianYearRange() {
  const currentYear = new Kenat(new Date()).getEthiopian().year;
  const years = [];
  for (let y = currentYear - 5; y <= currentYear + 10; y++) {
    years.push(y);
  }
  return years;
}

export function getEthiopianMonths() {
  return [
    { id: 1, name: "መስከረም (Meskerem)" },
    { id: 2, name: "ጥቅምት (Tikimt)" },
    { id: 3, name: "ህዳር (Hidar)" },
    { id: 4, name: "ታህሳስ (Tahsas)" },
    { id: 5, name: "ጥር (Tir)" },
    { id: 6, name: "የካቲት (Yekatit)" },
    { id: 7, name: "መጋቢት (Megabit)" },
    { id: 8, name: "ሚያዝያ (Miazia)" },
    { id: 9, name: "ግንቦት (Ginbot)" },
    { id: 10, name: "ሰኔ (Sene)" },
    { id: 11, name: "ሐምሌ (Hamle)" },
    { id: 12, name: "ነሐሴ (Nehase)" },
    { id: 13, name: "ጳጉሜ (Pagume)" },
  ];
}

export function getDaysInEthiopianMonth(year: number, month: number) {
  if (month < 13) return 30;
  // Pagume (Month 13) is 5 or 6 days depending on leap year
  const isLeap = (year + 1) % 4 === 0;
  return isLeap ? 6 : 5;
}

/**
 * Returns a Gregorian Date representing the LAST day (day 30) of the Ethiopian
 * month that contains the given date. This is the tenant's payment due date.
 */
export function getEthiopianMonthEnd(date: Date): Date {
  try {
    const etDate = new Kenat(date).getEthiopian();
    const lastDay = getDaysInEthiopianMonth(etDate.year, etDate.month);
    // Build the last-day Ethiopian date and convert back to Gregorian
    const lastDayEt = new Kenat({ year: etDate.year, month: etDate.month, day: lastDay });
    return lastDayEt.toGregorian();
  } catch {
    // Fallback: last day of Gregorian month
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 0);
    return d;
  }
}

/**
 * Returns the number of days PAST the Ethiopian month-end due date.
 * - Negative  → days remaining before the due date
 * - 0-5       → within 5-day grace period (no penalty)
 * - 6-35      → tier 1 penalty applies
 * - >35       → tier 2 (final warning) penalty applies
 */
export function getDaysFromEthiopianDue(dueDate: Date): number {
  const now = new Date();
  const monthEnd = getEthiopianMonthEnd(dueDate);
  // Strip time component for clean day comparison
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
  const diffMs = nowDay.getTime() - dueDay.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
