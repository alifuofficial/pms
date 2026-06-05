"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Building2, 
  Users, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Activity, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle,
  HelpCircle,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  toEthiopian, 
  addEthiopianMonths, 
  getEthiopianMonthEnd, 
  getDaysUntilEthiopianExpiry, 
  getDaysPastEthiopianExpiry, 
  formatSystemDate 
} from "@/lib/calendar";
import { getArrearMonths, calcMonthPenalty } from "@/lib/arrears";

// Define TypeScript interfaces for Demo Sandbox
interface Property {
  id: string;
  name: string;
  address: string;
}

interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  type: string;
  rentAmount: number;
  status: "VACANT" | "OCCUPIED";
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  status: "ACTIVE" | "PENDING";
  advanceBalance: number;
}

interface Payment {
  id: string;
  tenantId: string;
  leaseId: string;
  amount: number;
  dueDate: string; // ISO string
  paidAt: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  type: "MONTHLY" | "ADVANCE";
  advanceUntil: string | null; // ISO string
  penalty: number;
  receiptUrl?: string | null;
  senderName?: string | null;
  transactionId?: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
}

interface Settings {
  currency: string;
  lateFeeEnabled: boolean;
  lateFeePercentage: number;
  warningFeePercentage: number;
}

// Initial Mock Data Seeds
const defaultProperties: Property[] = [
  { id: "prop-1", name: "Summit Building", address: "Bole, Addis Ababa" },
  { id: "prop-2", name: "Lideta Mall", address: "Lideta, Addis Ababa" }
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
    advanceUntil: "2026-04-07T21:00:00.000Z", // Megabit 30 (March 9 is Yekatit 30, April 8 is Megabit 30)
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

export default function DemoSandboxPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Modal Dialog states
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);

  // Form states
  const [newTenant, setNewTenant] = useState({ name: "", email: "", phoneNumber: "", unitId: "", startDate: "2026-06-05", durationMonths: 12 });
  const [newPayment, setNewPayment] = useState({ leaseId: "", amount: "", type: "MONTHLY" as const, senderName: "", transactionId: "" });
  const [newProperty, setNewProperty] = useState({ name: "", address: "" });
  const [newUnit, setNewUnit] = useState({ propertyId: "", unitNumber: "", type: "Retail", rentAmount: "" });

  // Inline editing state
  const [editingLeaseId, setEditingLeaseId] = useState<string | null>(null);
  const [editingLeaseData, setEditingLeaseData] = useState({ startDate: "", advanceBalance: 0 });

  // Load and save state
  useEffect(() => {
    setIsMounted(true);
    const getLocal = <T,>(key: string, fallback: T): T => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    };

    setProperties(getLocal("demo_properties", defaultProperties));
    setUnits(getLocal("demo_units", defaultUnits));
    setTenants(getLocal("demo_tenants", defaultTenants));
    setLeases(getLocal("demo_leases", defaultLeases));
    setPayments(getLocal("demo_payments", defaultPayments));
    setAuditLogs(getLocal("demo_auditLogs", defaultAuditLogs));
    setSettings(getLocal("demo_settings", defaultSettings));
  }, []);

  const saveToLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const logAction = (action: string) => {
    const newLog: AuditLog = {
      id: "log-" + Math.random().toString(36).substring(2, 9),
      action,
      createdAt: new Date().toISOString()
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    saveToLocal("demo_auditLogs", updated);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all sandbox data? This will clear your local changes.")) {
      setProperties(defaultProperties);
      setUnits(defaultUnits);
      setTenants(defaultTenants);
      setLeases(defaultLeases);
      setPayments(defaultPayments);
      setAuditLogs(defaultAuditLogs);
      setSettings(defaultSettings);

      saveToLocal("demo_properties", defaultProperties);
      saveToLocal("demo_units", defaultUnits);
      saveToLocal("demo_tenants", defaultTenants);
      saveToLocal("demo_leases", defaultLeases);
      saveToLocal("demo_payments", defaultPayments);
      saveToLocal("demo_auditLogs", defaultAuditLogs);
      saveToLocal("demo_settings", defaultSettings);

      toast.success("Sandbox data reset to defaults.");
      logAction("Reset sandbox to default mock data");
    }
  };

  // State update helpers
  const updateProperties = (updated: Property[]) => { setProperties(updated); saveToLocal("demo_properties", updated); };
  const updateUnits = (updated: Unit[]) => { setUnits(updated); saveToLocal("demo_units", updated); };
  const updateTenants = (updated: Tenant[]) => { setTenants(updated); saveToLocal("demo_tenants", updated); };
  const updateLeases = (updated: Lease[]) => { setLeases(updated); saveToLocal("demo_leases", updated); };
  const updatePayments = (updated: Payment[]) => { setPayments(updated); saveToLocal("demo_payments", updated); };

  // ── CORE SIMULATION MATH ──────────────────────────────────────────────────

  // Simulates getLeaseArrearMonths client-side
  const calculateArrearsForLease = (lease: Lease): Date[] => {
    const leasePayments = payments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");
    const arrearDates = getArrearMonths(new Date(lease.startDate), leasePayments);
    return arrearDates;
  };

  // Simulates getDaysUntilEthiopianExpiry & getDaysPastEthiopianExpiry
  const calculateDaysLeftForLease = (lease: Lease) => {
    const leasePayments = payments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");
    const latestPayment = [...leasePayments].reverse().find(p => p.status === "APPROVED");

    const coverageUntil = latestPayment?.advanceUntil || latestPayment?.dueDate || null;
    if (!coverageUntil) return { days: 0, text: "No payment recorded" };

    const daysVal = getDaysUntilEthiopianExpiry(new Date(coverageUntil));
    
    // Adjust countdown based on the lease's advanceBalance
    const unit = units.find(u => u.id === lease.unitId);
    const rentAmount = unit?.rentAmount || 0;
    const partialDays = rentAmount > 0 ? Math.floor((lease.advanceBalance / rentAmount) * 30) : 0;
    const totalDays = daysVal + partialDays;

    return {
      days: totalDays,
      text: totalDays < 0 ? `${Math.abs(totalDays)} Days Past` : `${totalDays} Days Left`,
      expired: totalDays < 0
    };
  };

  const getNextMonthForLease = (lease: Lease) => {
    const leasePayments = payments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");
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

  // Simulates Server-Side Payment Approval logic (apportioning rent/penalties)
  const simulatePaymentApproval = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    const lease = leases.find(l => l.id === payment.leaseId);
    const unit = units.find(u => u.id === lease?.unitId);
    if (!lease || !unit) return;

    const monthlyRent = unit.rentAmount;

    // Fetch approved payments prior to this approval
    const approvedPayments = payments.filter(p => p.leaseId === lease.id && p.status === "APPROVED");

    // Calculate gap months (arrears)
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

      // Check penalty for this gap month
      const startEt = toEthiopian(new Date(lease.startDate));
      const gdEt = toEthiopian(gd);
      const isStartMonth = gdEt.year === startEt.year && gdEt.month === startEt.month;

      // Late Penalty check
      const hasPenalty = settings.lateFeeEnabled && !(isStartMonth && approvedPayments.length === 0);
      const penaltyAmount = hasPenalty ? (monthlyRent * (settings.lateFeePercentage / 100)) : 0;

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

    // Compute final coverage end date
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

    // Apply updates to state
    const updatedPayments = payments.map(p => {
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

    const updatedLeases = leases.map(l => {
      if (l.id === lease.id) {
        return {
          ...l,
          advanceBalance: newAdvanceBalance
        };
      }
      return l;
    });

    updatePayments(updatedPayments);
    updateLeases(updatedLeases);

    logAction(`Approved payment of ${payment.amount} for lease ${lease.id}. Covered ${monthsCovered} months. Penalty: ${actualPenaltyPaid}. New balance: ${newAdvanceBalance}`);
    toast.success(`Payment approved successfully! Calculated months covered: ${monthsCovered}`);
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    const unit = units.find(u => u.id === newTenant.unitId);
    if (!unit) {
      toast.error("Please select a valid unit.");
      return;
    }

    const tenantId = "tenant-" + Math.random().toString(36).substring(2, 9);
    const leaseId = "lease-" + Math.random().toString(36).substring(2, 9);
    const paymentId = "pay-" + Math.random().toString(36).substring(2, 9);

    const createdTenant: Tenant = {
      id: tenantId,
      name: newTenant.name,
      email: newTenant.email || `${newTenant.phoneNumber}@pms.local`,
      phoneNumber: newTenant.phoneNumber
    };

    const createdLease: Lease = {
      id: leaseId,
      unitId: newTenant.unitId,
      tenantId: tenantId,
      startDate: new Date(newTenant.startDate).toISOString(),
      endDate: new Date(new Date(newTenant.startDate).setMonth(new Date(newTenant.startDate).getMonth() + newTenant.durationMonths)).toISOString(),
      status: "ACTIVE",
      advanceBalance: 0
    };

    const createdPayment: Payment = {
      id: paymentId,
      tenantId,
      leaseId,
      amount: unit.rentAmount,
      dueDate: new Date(newTenant.startDate).toISOString(),
      paidAt: null,
      status: "PENDING",
      type: "MONTHLY",
      advanceUntil: null,
      penalty: 0
    };

    const updatedUnits = units.map(u => {
      if (u.id === unit.id) return { ...u, status: "OCCUPIED" as const };
      return u;
    });

    updateTenants([...tenants, createdTenant]);
    updateLeases([...leases, createdLease]);
    updatePayments([...payments, createdPayment]);
    updateUnits(updatedUnits);

    setTenantDialogOpen(false);
    toast.success("Mock tenant registered with pending initial payment!");
    logAction(`Registered tenant ${newTenant.name} and lease for Unit ${unit.unitNumber}`);
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const lease = leases.find(l => l.id === newPayment.leaseId);
    if (!lease) {
      toast.error("Please select a valid lease.");
      return;
    }

    const paymentId = "pay-" + Math.random().toString(36).substring(2, 9);
    const arrears = calculateArrearsForLease(lease);

    let nextDueDate = new Date(lease.startDate);
    if (arrears.length > 0) {
      nextDueDate = arrears[0];
    } else {
      const nextMonth = getNextMonthForLease(lease);
      nextDueDate = nextMonth.date;
    }

    const createdPayment: Payment = {
      id: paymentId,
      tenantId: lease.tenantId,
      leaseId: lease.id,
      amount: parseFloat(newPayment.amount) || 0,
      dueDate: nextDueDate.toISOString(),
      paidAt: null,
      status: "PENDING",
      type: newPayment.type,
      advanceUntil: null,
      penalty: 0,
      senderName: newPayment.senderName || "Mock Sender",
      transactionId: newPayment.transactionId || "TX-" + Math.random().toString(36).substring(2, 9).toUpperCase()
    };

    updatePayments([...payments, createdPayment]);
    setPaymentDialogOpen(false);
    toast.success("Mock payment receipt submitted!");
    logAction(`Submitted payment receipt of ${newPayment.amount} for lease ${lease.id}`);
  };

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const propertyId = "prop-" + Math.random().toString(36).substring(2, 9);
    const createdProperty: Property = {
      id: propertyId,
      name: newProperty.name,
      address: newProperty.address
    };

    updateProperties([...properties, createdProperty]);
    setPropertyDialogOpen(false);
    toast.success("Property added to sandbox.");
    logAction(`Added Property ${newProperty.name}`);
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const unitId = "unit-" + Math.random().toString(36).substring(2, 9);
    const createdUnit: Unit = {
      id: unitId,
      propertyId: newUnit.propertyId,
      unitNumber: newUnit.unitNumber,
      type: newUnit.type,
      rentAmount: parseFloat(newUnit.rentAmount) || 0,
      status: "VACANT"
    };

    updateUnits([...units, createdUnit]);
    setUnitDialogOpen(false);
    toast.success("Unit added to property.");
    logAction(`Added Unit ${newUnit.unitNumber}`);
  };

  const handleInlineEditLease = (lease: Lease) => {
    setEditingLeaseId(lease.id);
    const sDate = new Date(lease.startDate).toISOString().substring(0, 10);
    setEditingLeaseData({
      startDate: sDate,
      advanceBalance: lease.advanceBalance
    });
  };

  const handleSaveLeaseEdit = (leaseId: string) => {
    const updatedLeases = leases.map(l => {
      if (l.id === leaseId) {
        return {
          ...l,
          startDate: new Date(editingLeaseData.startDate).toISOString(),
          advanceBalance: Number(editingLeaseData.advanceBalance)
        };
      }
      return l;
    });

    updateLeases(updatedLeases);
    setEditingLeaseId(null);
    toast.success("Lease parameters updated! Arrears and countdown recalculated.");
    logAction(`Modified lease ${leaseId} parameters directly`);
  };

  const handleRejectPayment = (paymentId: string) => {
    const updatedPayments = payments.map(p => {
      if (p.id === paymentId) return { ...p, status: "REJECTED" as const };
      return p;
    });
    updatePayments(updatedPayments);
    toast.warning("Payment rejected.");
    logAction(`Rejected payment ${paymentId}`);
  };

  const handleSaveSettings = (key: keyof Settings, value: any) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    saveToLocal("demo_settings", updatedSettings);
    toast.success("Sandbox settings updated!");
  };

  if (!isMounted) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Calculate sandbox stats
  const totalRevenue = payments
    .filter(p => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  const activeTenantsCount = tenants.length;
  const pendingApprovalsCount = payments.filter(p => p.status === "PENDING").length;

  return (
    <div className="max-w-[1300px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Banner / Warn */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-start md:items-center">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Demo Sandbox Mode Active</h3>
            <p className="text-xs text-amber-700">
              You are simulating features locally. This reads & writes to your browser's <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">localStorage</code>. Real data on the server is untouched.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 h-9 rounded-lg font-medium self-start md:self-auto shadow-none" onClick={handleReset}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reset Sandbox
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Features Sandbox</h1>
          <p className="text-xs text-slate-500">Test dates, calendar, payments & penalty logic instantly.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-200 font-bold uppercase tracking-tight text-[10px] px-2 py-1 rounded shadow-none">
            {formatSystemDate(new Date(), "GREGORIAN")}
          </Badge>
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 font-bold uppercase tracking-tight text-[10px] px-2 py-1 rounded shadow-none">
            {formatSystemDate(new Date(), "ETHIOPIAN")}
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Simulated Revenue", value: `${settings.currency} ${totalRevenue.toLocaleString()}`, icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50/50" },
          { label: "Mock Tenants", value: activeTenantsCount, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50/50" },
          { label: "Pending Approvals", value: pendingApprovalsCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50/50" },
          { label: "Total Units", value: units.length, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50/50" },
        ].map((item, idx) => (
          <Card key={idx} className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-xl font-bold text-slate-900">{item.value}</p>
              </div>
              <div className={cn("p-2 rounded-lg", item.bg)}>
                <item.icon className={cn("h-5 w-5", item.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-10 w-full justify-start overflow-x-auto gap-1 border border-slate-200/50">
          <TabsTrigger value="dashboard" className="rounded-lg text-xs font-semibold px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-slate-900 shadow-none">Dashboard</TabsTrigger>
          <TabsTrigger value="tenants" className="rounded-lg text-xs font-semibold px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-slate-900 shadow-none">Tenants & Leases</TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg text-xs font-semibold px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-slate-900 shadow-none">Payments & Approvals</TabsTrigger>
          <TabsTrigger value="properties" className="rounded-lg text-xs font-semibold px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-slate-900 shadow-none">Properties & Units</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg text-xs font-semibold px-4 h-8 data-[state=active]:bg-white data-[state=active]:text-slate-900 shadow-none">Sandbox Settings</TabsTrigger>
        </TabsList>

        {/* 1. DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Visual Simulated Charts */}
            <Card className="lg:col-span-2 border border-slate-200 shadow-none bg-white rounded-xl">
              <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Simulated Revenue Trend</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Monthly breakdown</CardDescription>
                </div>
                <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-100 uppercase font-bold rounded">Simulated</Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                
                {/* SVG Graph Simulation */}
                <div className="h-48 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-around px-6 pointer-events-none">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-full w-px border-l border-dashed border-slate-200" />)}
                  </div>
                  <div className="w-full h-32 flex items-end justify-between px-4 z-10">
                    {[
                      { m: "Yekatit", val: 22100 },
                      { m: "Megabit", val: 30416 },
                      { m: "Miyazia", val: 8316 },
                      { m: "Ginbot", val: 68510 },
                      { m: "Sene", val: totalRevenue > 120000 ? 55000 : 0 }
                    ].map((item, idx) => {
                      const maxVal = 100000;
                      const heightPercent = Math.max(10, Math.min(100, (item.val / maxVal) * 100));
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2 w-16 group">
                          <div className="text-[8px] font-bold text-slate-600 bg-white border px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-8">
                            {item.val.toLocaleString()}
                          </div>
                          <div 
                            style={{ height: `${heightPercent}%` }} 
                            className="w-10 rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 transition-all cursor-pointer shadow-sm"
                          />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" />
                  <p className="text-xs text-slate-700">
                    This chart renders your local mock payments. Add and approve payments under the **Payments** tab to watch the chart update live!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Simulated Audit Logs */}
            <Card className="lg:col-span-1 border border-slate-200 shadow-none bg-white rounded-xl">
              <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Sandbox Activity Log</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Audit trail</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex gap-3 text-xs">
                      <Activity className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-800 font-medium">{log.action}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-1">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. TENANTS & LEASES TAB */}
        <TabsContent value="tenants" className="outline-none">
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-semibold">Tenants & Leases Configuration</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Directly modify lease properties to test edge cases</CardDescription>
              </div>
              <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
                <DialogTrigger render={<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 font-medium shadow-none" />}>
                  <Plus className="mr-2 h-4 w-4" /> Add Mock Tenant
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleCreateTenant}>
                    <DialogHeader>
                      <DialogTitle>Register Mock Tenant</DialogTitle>
                      <DialogDescription>
                        Creates a simulated tenant, active lease, and a pending initial payment record.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Full Name</label>
                        <Input required value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} placeholder="e.g. John Doe" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Email (Optional)</label>
                          <Input type="email" value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} placeholder="john@doe.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                          <Input required value={newTenant.phoneNumber} onChange={e => setNewTenant({...newTenant, phoneNumber: e.target.value})} placeholder="+2519..." />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Select Unit</label>
                          <Select value={newTenant.unitId} onValueChange={val => setNewTenant({...newTenant, unitId: val || ""})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.filter(u => u.status === "VACANT").map(u => (
                                <SelectItem key={u.id} value={u.id}>Unit {u.unitNumber} ({u.type} - {u.rentAmount} {settings.currency})</SelectItem>
                              ))}
                              {units.filter(u => u.status === "VACANT").length === 0 && (
                                <SelectItem disabled value="none">No vacant units available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Lease Duration</label>
                          <Select value={String(newTenant.durationMonths)} onValueChange={val => setNewTenant({...newTenant, durationMonths: parseInt(val || "0")})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6">6 Months</SelectItem>
                              <SelectItem value="12">12 Months</SelectItem>
                              <SelectItem value="24">24 Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Lease Start Date (Gregorian)</label>
                        <Input type="date" required value={newTenant.startDate} onChange={e => setNewTenant({...newTenant, startDate: e.target.value})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Register Tenant</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-5">Tenant / Unit</TableHead>
                    <TableHead>Ethiopian Lease Start</TableHead>
                    <TableHead>Calculated Arrears</TableHead>
                    <TableHead>Countdown Info</TableHead>
                    <TableHead>Lease parameters</TableHead>
                    <TableHead className="text-right px-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.map(lease => {
                    const tenant = tenants.find(t => t.id === lease.tenantId);
                    const unit = units.find(u => u.id === lease.unitId);
                    const property = properties.find(p => p.id === unit?.propertyId);
                    
                    const etStart = toEthiopian(new Date(lease.startDate));
                    const arrears = calculateArrearsForLease(lease);
                    const countdown = calculateDaysLeftForLease(lease);
                    const nextMonth = getNextMonthForLease(lease);

                    const isEditing = editingLeaseId === lease.id;

                    return (
                      <TableRow key={lease.id} className="hover:bg-slate-50/50">
                        {/* Tenant/Unit */}
                        <TableCell className="px-5 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{tenant?.name || "Unknown Tenant"}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Unit {unit?.unitNumber} • {property?.name}
                            </p>
                          </div>
                        </TableCell>

                        {/* Ethiopian Lease Start */}
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            {formatSystemDate(new Date(lease.startDate), "ETHIOPIAN")} ({etStart.day}/{etStart.month}/{etStart.year})
                          </span>
                        </TableCell>

                        {/* Calculated Arrears */}
                        <TableCell>
                          {arrears.length === 0 ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 shadow-none font-bold uppercase text-[9px]">All Rent Settled</Badge>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 shadow-none font-bold uppercase text-[9px] self-start">
                                {arrears.length} Month{arrears.length > 1 ? 's' : ''} Overdue
                              </Badge>
                              <p className="text-[10px] text-red-600 font-semibold">
                                {arrears.map(d => formatSystemDate(d, "ETHIOPIAN").split(", ")[1]).join(", ")}
                              </p>
                            </div>
                          )}
                        </TableCell>

                        {/* Countdown Info */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={cn("shadow-none font-bold uppercase text-[9px]", 
                              countdown.expired 
                                ? "bg-red-50 text-red-700 border border-red-200" 
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            )}>
                              {countdown.text}
                            </Badge>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                              Next Due: {nextMonth.dueDateStr}
                            </p>
                          </div>
                        </TableCell>

                        {/* Lease parameters (inline editor) */}
                        <TableCell>
                          {isEditing ? (
                            <div className="space-y-2 max-w-[150px]">
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Start Date</label>
                                <Input 
                                  type="date" 
                                  className="h-8 text-xs px-2"
                                  value={editingLeaseData.startDate} 
                                  onChange={e => setEditingLeaseData({...editingLeaseData, startDate: e.target.value})} 
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-400 uppercase">Advance Balance</label>
                                <Input 
                                  type="number" 
                                  className="h-8 text-xs px-2"
                                  value={editingLeaseData.advanceBalance} 
                                  onChange={e => setEditingLeaseData({...editingLeaseData, advanceBalance: parseFloat(e.target.value) || 0})} 
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] space-y-0.5">
                              <p className="text-slate-600 font-medium">Rent: <strong className="text-slate-900 font-bold">{unit?.rentAmount.toLocaleString()} {settings.currency}</strong></p>
                              <p className="text-slate-600 font-medium">Advance Bal: <strong className="text-slate-900 font-bold">{lease.advanceBalance.toLocaleString()} {settings.currency}</strong></p>
                            </div>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right px-5 py-4">
                          {isEditing ? (
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" onClick={() => handleSaveLeaseEdit(lease.id)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-8 rounded-lg" onClick={() => setEditingLeaseId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none font-semibold" onClick={() => handleInlineEditLease(lease)}>
                              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Adjust
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {leases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center p-8 text-slate-400 text-xs">No active leases in sandbox.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. PAYMENTS TAB */}
        <TabsContent value="payments" className="outline-none">
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl">
            <CardHeader className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-semibold">Simulated Payments Hub</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Submit payments and click approve to execute allocation calculations</CardDescription>
              </div>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger render={<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 font-medium shadow-none" />}>
                  <Plus className="mr-2 h-4 w-4" /> Record Mock Payment
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleCreatePayment}>
                    <DialogHeader>
                      <DialogTitle>Record Payment Receipt</DialogTitle>
                      <DialogDescription>
                        Submits a mock tenant bank transfer or cash deposit receipt for approval.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Select Lease / Tenant</label>
                        <Select value={newPayment.leaseId} onValueChange={val => {
                          const lease = leases.find(l => l.id === (val || ""));
                          const unit = units.find(u => u.id === lease?.unitId);
                          setNewPayment({
                            ...newPayment,
                            leaseId: val || "",
                            // Default to 1 month rent
                            amount: unit ? String(unit.rentAmount) : ""
                          });
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose lease" />
                          </SelectTrigger>
                          <SelectContent>
                            {leases.map(l => {
                              const t = tenants.find(ten => ten.id === l.tenantId);
                              const u = units.find(uni => uni.id === l.unitId);
                              return (
                                <SelectItem key={l.id} value={l.id}>{t?.name} (Unit {u?.unitNumber})</SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Amount Received</label>
                          <Input required type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Payment Type</label>
                          <Select value={newPayment.type} onValueChange={val => setNewPayment({...newPayment, type: (val || "MONTHLY") as any})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MONTHLY">Monthly (Arrears / Single)</SelectItem>
                              <SelectItem value="ADVANCE">Advance (Multi-Month)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Sender Name</label>
                          <Input value={newPayment.senderName} onChange={e => setNewPayment({...newPayment, senderName: e.target.value})} placeholder="e.g. Robel Seyoum" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Reference / TX ID</label>
                          <Input value={newPayment.transactionId} onChange={e => setNewPayment({...newPayment, transactionId: e.target.value})} placeholder="FT26..." />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Submit Receipt</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-5">Payment Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date (ET)</TableHead>
                    <TableHead>Paid Status / Date</TableHead>
                    <TableHead>Advanced Coverage</TableHead>
                    <TableHead className="text-right px-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(payment => {
                    const tenant = tenants.find(t => t.id === payment.tenantId);
                    const lease = leases.find(l => l.id === payment.leaseId);
                    const unit = units.find(u => u.id === lease?.unitId);

                    return (
                      <TableRow key={payment.id} className="hover:bg-slate-50/50">
                        {/* Details */}
                        <TableCell className="px-5 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{tenant?.name || "Unknown Tenant"}</p>
                            <p className="text-xs text-slate-600 font-medium">
                              {payment.amount.toLocaleString()} {settings.currency} {payment.penalty > 0 ? `(includes ${payment.penalty.toLocaleString()} penalty)` : ""}
                            </p>
                            {payment.transactionId && (
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">Ref: {payment.transactionId}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[9px] font-bold uppercase shadow-none px-2 py-0.5 rounded", 
                            payment.type === "ADVANCE" 
                              ? "text-indigo-700 bg-indigo-50 border-indigo-200" 
                              : "text-slate-700 bg-slate-50 border-slate-200"
                          )}>
                            {payment.type}
                          </Badge>
                        </TableCell>

                        {/* Due Date */}
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-600">
                            {formatSystemDate(new Date(payment.dueDate), "ETHIOPIAN")}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={cn("shadow-none font-bold uppercase text-[9px]", 
                              payment.status === "APPROVED" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : payment.status === "REJECTED"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                            )}>
                              {payment.status}
                            </Badge>
                            {payment.paidAt && (
                              <p className="text-[9px] text-slate-400 font-medium block">
                                Approved: {new Date(payment.paidAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Advanced Coverage */}
                        <TableCell>
                          {payment.advanceUntil ? (
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                              Covers until {formatSystemDate(new Date(payment.advanceUntil), "ETHIOPIAN")}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right px-5 py-4">
                          {payment.status === "PENDING" ? (
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold" onClick={() => simulatePaymentApproval(payment.id)}>
                                <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50 shadow-none font-semibold" onClick={() => handleRejectPayment(payment.id)}>
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-semibold">Finalized</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center p-8 text-slate-400 text-xs">No payments recorded in sandbox.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. PROPERTIES & UNITS TAB */}
        <TabsContent value="properties" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Properties */}
            <Card className="lg:col-span-1 border border-slate-200 shadow-none bg-white rounded-xl h-fit">
              <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Properties</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Sandbox Property Sites</CardDescription>
                </div>
                <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
                  <DialogTrigger render={<Button size="sm" variant="outline" className="h-8 rounded-lg border-slate-200 shadow-none font-semibold" />}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Property
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleCreateProperty}>
                      <DialogHeader>
                        <DialogTitle>Add Sandbox Property</DialogTitle>
                        <DialogDescription>Create a mock physical site/property.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Property Name</label>
                          <Input required value={newProperty.name} onChange={e => setNewProperty({...newProperty, name: e.target.value})} placeholder="e.g. Lideta Mall" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Address</label>
                          <Input required value={newProperty.address} onChange={e => setNewProperty({...newProperty, address: e.target.value})} placeholder="e.g. Lideta, Addis Ababa" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Add Property</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">Name</TableHead>
                      <TableHead className="px-5">Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="px-5 font-semibold text-slate-800 text-xs">{p.name}</TableCell>
                        <TableCell className="px-5 text-slate-500 text-xs">{p.address}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Right Column: Units */}
            <Card className="lg:col-span-2 border border-slate-200 shadow-none bg-white rounded-xl">
              <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Units List</CardTitle>
                  <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Manage rates and availability</CardDescription>
                </div>
                <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
                  <DialogTrigger render={<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 font-medium shadow-none" />}>
                    <Plus className="mr-2 h-4 w-4" /> Add Unit
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleCreateUnit}>
                      <DialogHeader>
                        <DialogTitle>Add Sandbox Unit</DialogTitle>
                        <DialogDescription>Creates a simulated rental unit under a property.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Select Property</label>
                          <Select value={newUnit.propertyId} onValueChange={val => setNewUnit({...newUnit, propertyId: val || ""})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Unit Number</label>
                            <Input required value={newUnit.unitNumber} onChange={e => setNewUnit({...newUnit, unitNumber: e.target.value})} placeholder="e.g. 101A" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Unit Type</label>
                            <Select value={newUnit.type} onValueChange={val => setNewUnit({...newUnit, type: val || ""})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Office">Office</SelectItem>
                                <SelectItem value="Apartment">Apartment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Monthly Rent Amount</label>
                          <Input required type="number" value={newUnit.rentAmount} onChange={e => setNewUnit({...newUnit, rentAmount: e.target.value})} placeholder="e.g. 15000" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Create Unit</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-5">Property / Unit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rent Rate</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead className="text-right px-5">Change Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map(unit => {
                      const prop = properties.find(p => p.id === unit.propertyId);
                      return (
                        <TableRow key={unit.id} className="hover:bg-slate-50/50">
                          <TableCell className="px-5 py-3">
                            <span className="font-semibold text-slate-900 text-xs">Unit {unit.unitNumber}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">{prop?.name}</span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{unit.type}</TableCell>
                          <TableCell className="font-bold text-slate-800 text-xs">
                            {unit.rentAmount.toLocaleString()} {settings.currency}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("shadow-none font-bold uppercase text-[9px] px-2 py-0.5 rounded", 
                              unit.status === "VACANT" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-slate-50 text-slate-700 border border-slate-200"
                            )}>
                              {unit.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-5">
                            <Input 
                              type="number"
                              className="h-8 text-xs w-28 ml-auto text-right"
                              defaultValue={unit.rentAmount}
                              onBlur={e => {
                                const newAmount = parseFloat(e.target.value) || 0;
                                if (newAmount !== unit.rentAmount) {
                                  const updated = units.map(u => u.id === unit.id ? { ...u, rentAmount: newAmount } : u);
                                  updateUnits(updated);
                                  toast.success(`Unit ${unit.unitNumber} rent updated to ${newAmount.toLocaleString()}`);
                                  logAction(`Updated Unit ${unit.unitNumber} rent to ${newAmount}`);
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. SETTINGS TAB */}
        <TabsContent value="settings" className="outline-none">
          <Card className="border border-slate-200 shadow-none bg-white rounded-xl max-w-xl">
            <CardHeader className="p-5 border-b border-slate-50">
              <CardTitle className="text-sm font-semibold">Simulated Business Settings</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Configure global parameters for calculations</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Currency Symbol</label>
                  <Input 
                    value={settings.currency} 
                    onChange={e => handleSaveSettings("currency", e.target.value)} 
                    placeholder="ETB"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Late Fee Percentage</label>
                  <Input 
                    type="number" 
                    value={settings.lateFeePercentage} 
                    onChange={e => handleSaveSettings("lateFeePercentage", parseFloat(e.target.value) || 0)} 
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Simulate Late Fee Penalties</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Apply a 5% fee when a payment is 6+ days late.</p>
                </div>
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded text-blue-600 border-slate-300"
                  checked={settings.lateFeeEnabled}
                  onChange={e => handleSaveSettings("lateFeeEnabled", e.target.checked)}
                />
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-3 text-xs text-amber-800">
                <HelpCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold mb-0.5">How late fees are calculated:</h5>
                  <p className="text-[11px] text-amber-700 leading-normal">
                    Under the Ethiopian calendar rule, if a payment is paid after Day 5 of the Ethiopian Month (e.g. Ginbot 6 onwards), a flat, non-compounding 5% penalty of the monthly rent is charged. You can test this by adjusting a tenant's lease start date in the **Tenants** tab to make their next payment past due!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
