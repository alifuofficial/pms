"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  CreditCard, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  User,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getProperties, 
  getUnits, 
  getTenants,
  getLeases,
  getPayments,
  savePayments,
  getSettings, 
  logAction, 
  simulatePaymentApproval,
  Property, 
  Unit,
  Tenant,
  Lease,
  Payment
} from "@/lib/demo-store";

export default function DemoPayments() {
  const [isMounted, setIsMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currency, setCurrency] = useState("ETB");

  // Dialog open state
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Record Payment Form state
  const [newPayment, setNewPayment] = useState({
    leaseId: "",
    amount: "",
    type: "MONTHLY" as "MONTHLY" | "ADVANCE",
    transactionId: "",
    senderName: ""
  });

  useEffect(() => {
    setIsMounted(true);
    refreshData();
  }, []);

  const refreshData = () => {
    setProperties(getProperties());
    setUnits(getUnits());
    setTenants(getTenants());
    setLeases(getLeases());
    setPayments(getPayments());
    setCurrency(getSettings().currency);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.leaseId) {
      toast.error("Please select a tenant/lease.");
      return;
    }

    const lease = leases.find(l => l.id === newPayment.leaseId);
    if (!lease) return;

    const paymentId = "pay-" + Math.random().toString(36).substring(2, 9);
    const created: Payment = {
      id: paymentId,
      tenantId: lease.tenantId,
      leaseId: lease.id,
      amount: parseFloat(newPayment.amount) || 0,
      dueDate: new Date().toISOString(),
      paidAt: null,
      status: "PENDING",
      type: newPayment.type,
      advanceUntil: null,
      penalty: 0,
      senderName: newPayment.senderName || "Demo Tenant",
      transactionId: newPayment.transactionId || "TX-" + Math.random().toString(36).substring(2, 9).toUpperCase()
    };

    const updated = [created, ...payments];
    setPayments(updated);
    savePayments(updated);

    toast.success("Sandbox payment recorded as PENDING!");
    logAction(`Recorded simulated payment of ${created.amount} ${currency} for tenant ${created.tenantId}`);
    setRecordDialogOpen(false);
    
    setNewPayment({
      leaseId: "",
      amount: "",
      type: "MONTHLY",
      transactionId: "",
      senderName: ""
    });

    refreshData();
  };

  const handleApprovePayment = (paymentId: string) => {
    const res = simulatePaymentApproval(paymentId);
    if (res) {
      toast.success("Simulated payment approved and balance updated!");
      setVerifyDialogOpen(false);
      refreshData();
    } else {
      toast.error("Failed to approve simulated payment.");
    }
  };

  const handleRejectPayment = (paymentId: string) => {
    const updated = payments.map(p => {
      if (p.id === paymentId) return { ...p, status: "REJECTED" as const };
      return p;
    });
    setPayments(updated);
    savePayments(updated);
    toast.success("Sandbox payment rejected.");
    logAction(`Rejected simulated payment ${paymentId}`);
    setVerifyDialogOpen(false);
    refreshData();
  };

  const handleDeletePayment = (paymentId: string) => {
    const updated = payments.filter(p => p.id !== paymentId);
    setPayments(updated);
    savePayments(updated);
    toast.success("Sandbox payment deleted.");
    logAction(`Deleted simulated payment ${paymentId}`);
    refreshData();
  };

  if (!isMounted) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Stats
  const approvedPayments = payments.filter(p => p.status === "APPROVED");
  const pendingPayments = payments.filter(p => p.status === "PENDING");
  const rejectedPayments = payments.filter(p => p.status === "REJECTED");
  
  const totalApprovedAmount = approvedPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPenalties = approvedPayments.reduce((acc, curr) => acc + (curr.penalty || 0), 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Banner / Warn */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-start md:items-center">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Demo Sandbox Mode Active</h3>
            <p className="text-xs text-amber-700 font-medium font-sans">Simulating payment entries, approval chains, and automated balance allocations.</p>
          </div>
        </div>
        <Link href="/admin/payments">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-lg font-medium shadow-none self-start md:self-auto">
            Switch to Live Mode <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payments (Demo)</h1>
          <p className="text-sm text-slate-500 font-medium font-sans font-sans">Verify and approve simulated transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Record Payment Dialog */}
          <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
            <DialogTrigger render={<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 font-medium shadow-none" />} >
              <Plus className="mr-2 h-4 w-4" /> Record Payment
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleRecordPayment}>
                <DialogHeader>
                  <DialogTitle>Record Sandbox Payment</DialogTitle>
                  <DialogDescription>Submit a simulated payment receipt for approval.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Select Tenant / Lease</label>
                    <Select value={newPayment.leaseId} onValueChange={val => {
                      const lease = leases.find(l => l.id === val);
                      const unit = units.find(u => u.id === lease?.unitId);
                      setNewPayment({
                        ...newPayment, 
                        leaseId: val || "",
                        amount: unit ? unit.rentAmount.toString() : ""
                      });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose resident" />
                      </SelectTrigger>
                      <SelectContent>
                        {leases.map(lease => {
                          const tenant = tenants.find(t => t.id === lease.tenantId);
                          const unit = units.find(u => u.id === lease.unitId);
                          return (
                            <SelectItem key={lease.id} value={lease.id}>
                              {tenant?.name} (Unit {unit?.unitNumber})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Payment Type</label>
                      <Select value={newPayment.type} onValueChange={val => setNewPayment({...newPayment, type: val as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly Rent</SelectItem>
                          <SelectItem value="ADVANCE">Advance Advance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Amount ({currency})</label>
                      <Input required type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} placeholder="Amount" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Sender Name</label>
                    <Input value={newPayment.senderName} onChange={e => setNewPayment({...newPayment, senderName: e.target.value})} placeholder="e.g. Almaz Abebe" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Transaction ID / Reference</label>
                    <Input value={newPayment.transactionId} onChange={e => setNewPayment({...newPayment, transactionId: e.target.value})} placeholder="e.g. CBE-12345" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Submit Payment</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Revenue</p>
              <p className="text-lg font-bold text-slate-900">{totalApprovedAmount.toLocaleString()} {currency}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign size={16} />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Audit</p>
              <p className="text-lg font-bold text-slate-900">{pendingPayments.length} Payments</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Clock size={16} />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected Fines</p>
              <p className="text-lg font-bold text-slate-900">{totalPenalties.toLocaleString()} {currency}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <AlertTriangle size={16} />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejections</p>
              <p className="text-lg font-bold text-slate-900">{rejectedPayments.length} Declined</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <XCircle size={16} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">Tenant & Ref</TableHead>
                <TableHead>Transaction Ref</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Penalty Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right px-5 font-sans">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(p => {
                const tenant = tenants.find(t => t.id === p.tenantId);
                const lease = leases.find(l => l.id === p.leaseId);
                const unit = lease ? units.find(u => u.id === lease.unitId) : null;

                return (
                  <TableRow key={p.id} className="hover:bg-slate-50/50">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100 shrink-0">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{tenant?.name || "Deleted Tenant"}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-tight">
                            INV-{p.id.slice(0, 8).toUpperCase()} {unit && `(Unit ${unit.unitNumber})`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-slate-700">
                      {p.transactionId || <span className="text-slate-300 italic">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", 
                        p.type === "ADVANCE" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-700"
                      )}>
                        {p.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-xs">
                      {p.amount.toLocaleString()} {currency}
                    </TableCell>
                    <TableCell className="font-bold text-red-600 text-xs">
                      {p.penalty > 0 ? `${p.penalty.toLocaleString()} ${currency}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight border",
                        p.status === "APPROVED" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : p.status === "PENDING"
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-red-50 text-red-600 border-red-100"
                      )}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-5 space-x-1">
                      {p.status === "PENDING" ? (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(p);
                            setVerifyDialogOpen(true);
                          }}
                          className="h-7 text-[10px] font-bold px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-none"
                        >
                          Verify
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePayment(p.id)}
                          className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 font-bold px-2 rounded"
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center p-8 text-slate-400 text-xs">No transactions recorded in sandbox.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Verify Payment Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          {selectedPayment && (() => {
            const tenant = tenants.find(t => t.id === selectedPayment.tenantId);
            const lease = leases.find(l => l.id === selectedPayment.leaseId);
            const unit = lease ? units.find(u => u.id === lease.unitId) : null;
            return (
              <div>
                <DialogHeader>
                  <DialogTitle>Verify simulated payment</DialogTitle>
                  <DialogDescription>
                    Review payment details and apply simulated coverage logic to the tenant's ledger.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Tenant:</span>
                      <span className="font-semibold text-slate-900">{tenant?.name}</span>
                    </div>
                    {unit && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Unit Rent Rate:</span>
                        <span className="font-semibold text-slate-900">{unit.rentAmount.toLocaleString()} {currency}/mo</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Amount Received:</span>
                      <span className="font-bold text-slate-900">{selectedPayment.amount.toLocaleString()} {currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Payment Reference:</span>
                      <span className="font-mono text-slate-700">{selectedPayment.transactionId}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Payment Type:</span>
                      <span className="font-bold text-indigo-600">{selectedPayment.type}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 flex gap-2 items-start text-xs leading-relaxed font-sans">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Sandbox Approval Logic:</span>
                      <p className="mt-0.5 text-[11px] text-amber-700">
                        Approving this payment will run the multi-month ledger simulator: clearing arrears first, deducting any late penalties, and rolling over leftover funds to the tenant's advance balance.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleRejectPayment(selectedPayment.id)}
                    className="h-10 border-slate-200 text-red-600 hover:bg-red-50"
                  >
                    Reject Payment
                  </Button>
                  <Button 
                    onClick={() => handleApprovePayment(selectedPayment.id)}
                    className="h-10 bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Approve & Apply
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}
