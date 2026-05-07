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
