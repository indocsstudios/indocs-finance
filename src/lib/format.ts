export function formatINR(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined, longMonth = false): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: longMonth ? "long" : "short",
    year: "numeric",
  });
}

export function formatEventDateRange(events: Array<{ event_date: string }>): string {
  const dates = events
    .map((e) => e.event_date)
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return "—";
  if (dates.length === 1) return formatDate(dates[0]);
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[dates.length - 1] + "T00:00:00");
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${String(first.getDate()).padStart(2, "0")} – ${formatDate(dates[dates.length - 1])}`;
  }
  return `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
}

// Converts INR integer into Indian English words (e.g. 30000 -> "Rupees Thirty Thousand Only")
export function amountToIndianWords(numInput: number): string {
  const num = Math.round(Math.abs(Number(numInput || 0)));
  if (num === 0) return "Rupees Zero Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  };

  const threeDigits = (n: number): string => {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
  };

  const parts: string[] = [];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rem = num % 1000;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rem) parts.push(threeDigits(rem));

  return `Rupees ${parts.join(" ")} Only`;
}

export function getProjectFinancials(p: {
  total_amount: number;
  advance_amount: number;
  advance_confirmed: boolean;
  final_payment_amount?: number | null;
}) {
  const total = Number(p.total_amount || 0);
  const advance = Number(p.advance_amount || 0);
  const finalPay = Number(p.final_payment_amount || 0);
  const totalPaid = (p.advance_confirmed ? advance : 0) + finalPay;
  const remaining = Math.max(0, total - totalPaid);
  const isPaidInFull = total > 0 && remaining === 0;
  return { total, advance, finalPay, totalPaid, remaining, isPaidInFull };
}
