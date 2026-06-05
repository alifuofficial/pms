import Kenat from "kenat";
import { 
  toEthiopian, 
  addEthiopianMonths, 
  getEthiopianMonthEnd, 
  getDaysUntilEthiopianExpiry, 
  formatSystemDate 
} from "@/lib/calendar";
import { getArrearMonths } from "@/lib/arrears";

// Interfaces
export interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  manager: { name: string };
  accountant?: { name: string } | null;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  type: string;
  rentAmount: number;
  status: "VACANT" | "OCCUPIED";
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  status: "ACTIVE" | "PENDING";
  advanceBalance: number;
}

export interface Payment {
  id: string;
  tenantId: string;
  leaseId: string;
  amount: number;
  dueDate: string; // ISO String
  paidAt: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "MONTHLY" | "ADVANCE";
  advanceUntil: string | null; // ISO String
  penalty: number;
  senderName?: string | null;
  transactionId?: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
}

export interface Settings {
  currency: string;
  lateFeeEnabled: boolean;
  lateFeePercentage: number;
  warningFeePercentage: number;
}

// Initial Mock Data Seeds
const defaultProperties: Property[] = [
  { id: "prop-1", name: "Summit Building", address: "Bole, Addis Ababa", type: "COMMERCIAL", manager: { name: "Abebe Kebede" }, accountant: { name: "Sara Demeke" } },
  { id: "prop-2", name: "Lideta Mall", address: "Lideta, Addis Ababa", type: "COMMERCIAL", manager: { name: "Sara Demeke" }, accountant: null }
];

const defaultUnits: Unit[] = [
  { id: "unit-1", propertyId: "prop-1", unitNumber: "113", type: "Retail", rentAmount: 8316, status: "OCCUPIED" },
  { id: "unit-2", propertyId: "prop-1", unitNumber: "009", type: "Retail", rentAmount: 22100, status: "OCCUPIED" },
  { id: "unit-3", propertyId: "prop-2", unitNumber: "201", type: "Office", rentAmount: 15000, status: "VACANT" }
];

const defaultTenants: Tenant[] = [
  { id: "tenant-1", name: "Robel Seyoum", email: "robel@soreti.com", phoneNumber: "+251911223344" },
  { id: "tenant-2", name: "Almaz Abebe", email: "almaz@soreti.com", phoneNumber: "+251922334455" }
];

const defaultLeases: Lease[] = [
  {
    id: "lease-1",
    unitId: "unit-1",
    tenantId: "tenant-1",
    startDate: "2026-04-08T18:00:00.000Z", // local: April 9 / Miyazia 1
    endDate: "2027-04-07T18:00:00.000Z",
    status: "ACTIVE",
    advanceBalance: 0
  },
  {
    id: "lease-2",
    unitId: "unit-2",
    tenantId: "tenant-2",
    startDate: "2026-03-09T18:00:00.000Z", // local: March 10 / Megabit 1
    endDate: "2027-03-08T18:00:00.000Z",
    status: "ACTIVE",
    advanceBalance: 0
  }
];

const defaultPayments: Payment[] = [
  {
    id: "pay-1",
    tenantId: "tenant-1",
    leaseId: "lease-1",
    amount: 8316,
    dueDate: "2026-04-08T21:00:00.000Z",
    paidAt: "2026-04-08T21:00:00.000Z",
    status: "APPROVED",
    type: "MONTHLY",
    advanceUntil: "2026-04-07T21:00:00.000Z", // Megabit 30
    penalty: 0
  },
  {
    id: "pay-2",
    tenantId: "tenant-2",
    leaseId: "lease-2",
    amount: 22100,
    dueDate: "2026-03-09T18:00:00.000Z",
    paidAt: "2026-03-09T18:00:00.000Z",
    status: "APPROVED",
    type: "MONTHLY",
    advanceUntil: "2026-04-07T21:00:00.000Z", // Megabit 30
    penalty: 0
  },
  {
    id: "pay-3",
    tenantId: "tenant-2",
    leaseId: "lease-2",
    amount: 68510,
    dueDate: "2026-04-07T21:00:00.000Z",
    paidAt: "2026-06-05T10:11:41.000Z",
    status: "APPROVED",
    type: "ADVANCE",
    advanceUntil: "2026-07-06T21:00:00.000Z", // Sene 30 (July 7)
    penalty: 0
  }
];

const defaultAuditLogs: AuditLog[] = [
  { id: "log-1", action: "Seeded initial properties and units", createdAt: new Date().toISOString() },
  { id: "log-2", action: "Registered default tenant Robel Seyoum", createdAt: new Date().toISOString() },
  { id: "log-3", action: "Registered default tenant Almaz Abebe", createdAt: new Date().toISOString() }
];

const defaultSettings: Settings = {
  currency: "ETB",
  lateFeeEnabled: true,
  lateFeePercentage: 5,
  warningFeePercentage: 10
};

// Safe LocalStorage API wrappers
const getLocal = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(data);
};

const saveLocal = (key: string, data: any) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
};

export const getProperties = (): Property[] => getLocal("demo_properties", defaultProperties);
export const saveProperties = (data: Property[]) => saveLocal("demo_properties", data);

export const getUnits = (): Unit[] => getLocal("demo_units", defaultUnits);
export const saveUnits = (data: Unit[]) => saveLocal("demo_units", data);

export const getTenants = (): Tenant[] => getLocal("demo_tenants", defaultTenants);
export const saveTenants = (data: Tenant[]) => saveLocal("demo_tenants", data);

export const getLeases = (): Lease[] => getLocal("demo_leases", defaultLeases);
export const saveLeases = (data: Lease[]) => saveLocal("demo_leases", data);

export const getPayments = (): Payment[] => getLocal("demo_payments", defaultPayments);
export const savePayments = (data: Payment[]) => saveLocal("demo_payments", data);

export const getAuditLogs = (): AuditLog[] => getLocal("demo_auditLogs", defaultAuditLogs);
export const saveAuditLogs = (data: AuditLog[]) => saveLocal("demo_auditLogs", data);

export const getSettings = (): Settings => getLocal("demo_settings", defaultSettings);
export const saveSettings = (data: Settings) => saveLocal("demo_settings", data);

export const logAction = (actionText: string) => {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: "log-" + Math.random().toString(36).substring(2, 9),
    action: actionText,
    createdAt: new Date().toISOString()
  };
  saveAuditLogs([newLog, ...logs]);
};

export const resetDemoData = () => {
  saveProperties(defaultProperties);
  saveUnits(defaultUnits);
  saveTenants(defaultTenants);
  saveLeases(defaultLeases);
  savePayments(defaultPayments);
  saveAuditLogs(defaultAuditLogs);
  saveSettings(defaultSettings);
  logAction("Reset sandbox to default mock data");
};

// Arrears Calculation
export const calculateArrearsForLease = (lease: Lease, allPayments: Payment[]): Date[] => {
  const leasePayments = allPayments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");
  return getArrearMonths(new Date(lease.startDate), leasePayments);
};

// Countdown Calculation
export const calculateDaysLeftForLease = (lease: Lease, allPayments: Payment[], allUnits: Unit[], currentSettings: Settings) => {
  const leasePayments = allPayments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");
  const latestPayment = [...leasePayments].reverse().find(p => p.status === "APPROVED");

  const coverageUntil = latestPayment?.advanceUntil || latestPayment?.dueDate || null;
  if (!coverageUntil) return { days: 0, text: "No payment", expired: true };

  const daysVal = getDaysUntilEthiopianExpiry(new Date(coverageUntil));
  
  const unit = allUnits.find(u => u.id === lease.unitId);
  const rentAmount = unit?.rentAmount || 0;
  const partialDays = rentAmount > 0 ? Math.floor((lease.advanceBalance / rentAmount) * 30) : 0;
  const totalDays = daysVal + partialDays;

  return {
    days: totalDays,
    text: totalDays < 0 ? `${Math.abs(totalDays)} Days Past` : `${totalDays} Days Left`,
    expired: totalDays < 0
  };
};

// Next Payment Due calculations
export const getNextMonthForLease = (lease: Lease, allPayments: Payment[]) => {
  const leasePayments = allPayments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");
  const latestPayment = [...leasePayments].reverse().find(p => p.status === "APPROVED");

  let currentEnd: Date;
  if (latestPayment) {
    currentEnd = getEthiopianMonthEnd(new Date(latestPayment.advanceUntil || latestPayment.dueDate));
  } else {
    const startEt = toEthiopian(new Date(lease.startDate));
    if (startEt.day === 30) {
      currentEnd = new Date(lease.startDate);
    } else {
      currentEnd = addEthiopianMonths(new Date(lease.startDate), -1);
    }
  }

  const nextEnd = addEthiopianMonths(new Date(currentEnd), 1);
  const endEt = toEthiopian(nextEnd);
  const monthsList = [
    "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", 
    "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"
  ];
  const monthName = monthsList[endEt.month - 1];

  return {
    date: nextEnd,
    ethiopianStr: `${monthName} ${endEt.year}`,
    dueDateStr: formatSystemDate(nextEnd, "ETHIOPIAN")
  };
};

// Simulates approving a payment
export const simulatePaymentApproval = (paymentId: string) => {
  const allPayments = getPayments();
  const allLeases = getLeases();
  const allUnits = getUnits();
  const currentSettings = getSettings();

  const payment = allPayments.find(p => p.id === paymentId);
  if (!payment) return false;

  const lease = allLeases.find(l => l.id === payment.leaseId);
  const unit = allUnits.find(u => u.id === lease?.unitId);
  if (!lease || !unit) return false;

  const monthlyRent = unit.rentAmount;
  const approvedPayments = allPayments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");

  const gapMonths = getArrearMonths(new Date(lease.startDate), approvedPayments);
  gapMonths.sort((a, b) => a.getTime() - b.getTime());

  let fundsRemaining = payment.amount + lease.advanceBalance;
  let actualPenaltyPaid = 0;
  let monthsCovered = 0;

  let clearedAllArrears = true;
  for (const gd of gapMonths) {
    if (fundsRemaining <= 0) {
      clearedAllArrears = false;
      break;
    }

    const startEt = toEthiopian(new Date(lease.startDate));
    const gdEt = toEthiopian(gd);
    const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;

    const hasPenalty = currentSettings.lateFeeEnabled && !(isStartMonth && approvedPayments.length === 0);
    const penaltyAmount = hasPenalty ? (monthlyRent * (currentSettings.lateFeePercentage / 100)) : 0;

    if (penaltyAmount > 0) {
      const toPay = Math.min(penaltyAmount, fundsRemaining);
      actualPenaltyPaid += toPay;
      fundsRemaining -= toPay;
    }

    if (fundsRemaining >= monthlyRent) {
      fundsRemaining -= monthlyRent;
      monthsCovered++;
    } else {
      clearedAllArrears = false;
      break;
    }
  }

  if (clearedAllArrears && fundsRemaining >= monthlyRent) {
    const extraMonths = Math.floor(fundsRemaining / monthlyRent);
    monthsCovered += extraMonths;
    fundsRemaining = fundsRemaining % monthlyRent;
  }

  const newAdvanceBalance = fundsRemaining;

  let currentCoverageEnd: Date;
  if (approvedPayments.length > 0) {
    const sortedApproved = approvedPayments.map(p => ({
      coverageEnd: getEthiopianMonthEnd(new Date(p.advanceUntil || p.dueDate))
    })).sort((a, b) => b.coverageEnd.getTime() - a.coverageEnd.getTime());
    
    currentCoverageEnd = sortedApproved[0].coverageEnd;
  } else {
    const startEt = toEthiopian(new Date(lease.startDate));
    if (startEt.day === 30) {
      currentCoverageEnd = new Date(lease.startDate);
    } else {
      currentCoverageEnd = addEthiopianMonths(new Date(lease.startDate), -1);
    }
  }

  let finalAdvanceUntil = currentCoverageEnd;
  if (monthsCovered > 0) {
    finalAdvanceUntil = addEthiopianMonths(new Date(currentCoverageEnd), monthsCovered);
  }

  const updatedPayments = allPayments.map(p => {
    if (p.id === paymentId) {
      return {
        ...p,
        status: "APPROVED" as const,
        penalty: actualPenaltyPaid,
        advanceUntil: finalAdvanceUntil.toISOString(),
        paidAt: new Date().toISOString()
      };
    }
    return p;
  });

  const updatedLeases = allLeases.map(l => {
    if (l.id === lease.id) {
      return {
        ...l,
        advanceBalance: newAdvanceBalance
      };
    }
    return l;
  });

  savePayments(updatedPayments);
  saveLeases(updatedLeases);

  logAction(`Approved payment of ${payment.amount} for lease ${lease.id}. Covered ${monthsCovered} months. Penalty: ${actualPenaltyPaid}. New balance: ${newAdvanceBalance}`);
  return { success: true, monthsCovered };
};
