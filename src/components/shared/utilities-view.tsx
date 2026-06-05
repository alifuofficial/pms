"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Zap, 
  Droplet, 
  Plus, 
  Search, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  DollarSign, 
  AlertCircle,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getEthiopianMonths, getEthiopianYearRange, formatSystemDate } from "@/lib/calendar";
import { 
  getUtilityBills, 
  createUtilityBillsBatch, 
  verifyUtilityPayment, 
  getUnitsWithLatestReadings 
} from "@/lib/actions/utilities";

interface UtilitiesViewProps {
  properties: any[];
  bankAccounts: any[];
  currency: string;
  calendarType: string;
  role: "ADMIN" | "MANAGER" | "ACCOUNTANT";
}

export function UtilitiesView({ 
  properties, 
  bankAccounts, 
  currency = "ETB", 
  calendarType = "ETHIOPIAN",
  role 
}: UtilitiesViewProps) {
  const [activeTab, setActiveTab] = useState<"billing" | "history">("billing");
  
  // Shared filter states
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || "");
  const [utilityType, setUtilityType] = useState<"ELECTRICITY" | "WATER">("ELECTRICITY");
  
  // Billing tab states
  const [billingMonth, setBillingMonth] = useState("Sene 2018");
  const [dueDate, setDueDate] = useState("");
  const [defaultRate, setDefaultRate] = useState(utilityType === "ELECTRICITY" ? "5" : "15");
  const [unitsData, setUnitsData] = useState<any[]>([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  
  // History tab states
  const [historyBills, setHistoryBills] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  
  // Verification dialog states
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Load occupied units and pre-populate previous readings when property or utility type changes
  useEffect(() => {
    if (activeTab === "billing" && selectedPropertyId) {
      loadUnitsForBilling();
    }
  }, [selectedPropertyId, utilityType, activeTab]);

  // Load history when tab or filter changes
  useEffect(() => {
    if (activeTab === "history" && selectedPropertyId) {
      loadHistoryBills();
    }
  }, [selectedPropertyId, utilityType, historyStatusFilter, activeTab]);

  // Update default rate when utility type changes
  useEffect(() => {
    setDefaultRate(utilityType === "ELECTRICITY" ? "5" : "15");
  }, [utilityType]);

  const loadUnitsForBilling = async () => {
    setIsLoadingUnits(true);
    try {
      const data = await getUnitsWithLatestReadings(selectedPropertyId, utilityType);
      // Map to form input states
      setUnitsData(
        data.map(u => ({
          unitId: u.unitId,
          unitNumber: u.unitNumber,
          leaseId: u.leaseId,
          tenantId: u.tenantId,
          tenantName: u.tenantName,
          previousReading: u.latestReading,
          currentReading: "",
          rate: defaultRate,
          included: true
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load units for billing.");
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const loadHistoryBills = async () => {
    setIsLoadingHistory(true);
    try {
      const filters: any = {
        propertyId: selectedPropertyId,
        type: utilityType
      };
      if (historyStatusFilter !== "ALL") {
        filters.status = historyStatusFilter;
      }
      const data = await getUtilityBills(filters);
      setHistoryBills(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load billing history.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRateChangeForAll = (newRate: string) => {
    setDefaultRate(newRate);
    setUnitsData(prev => prev.map(u => ({ ...u, rate: newRate })));
  };

  const handleUnitDataChange = (index: number, field: string, value: any) => {
    setUnitsData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) {
      toast.error("Please select a payment due date.");
      return;
    }

    const selectedBills = unitsData.filter(u => u.included);
    if (selectedBills.length === 0) {
      toast.error("No units selected for billing.");
      return;
    }

    // Validate readings
    for (const b of selectedBills) {
      const prev = parseFloat(b.previousReading) || 0;
      const curr = parseFloat(b.currentReading) || 0;
      if (curr <= prev) {
        toast.error(`Unit ${b.unitNumber}: Current reading must be greater than previous reading (${prev}).`);
        return;
      }
    }

    setIsSubmittingBatch(true);
    try {
      const payload = {
        billingMonth,
        type: utilityType,
        dueDate: new Date(dueDate),
        bills: selectedBills.map(b => {
          const prev = parseFloat(b.previousReading) || 0;
          const curr = parseFloat(b.currentReading) || 0;
          const r = parseFloat(b.rate) || 0;
          const usage = curr - prev;
          const amount = usage * r;

          return {
            leaseId: b.leaseId,
            tenantId: b.tenantId,
            previousReading: prev,
            currentReading: curr,
            usage,
            rate: r,
            amount
          };
        })
      };

      const res = await createUtilityBillsBatch(payload);
      if (res.success) {
        toast.success(`Batch utilities generated! Created bills for ${res.count} units.`);
        // Reload billing inputs
        loadUnitsForBilling();
      } else {
        toast.error(res.error || "Failed to submit bills.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to record utility bills.");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleVerifyPayment = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedBill) return;

    setIsVerifying(true);
    try {
      const res = await verifyUtilityPayment(selectedBill.id, status);
      if (res.success) {
        toast.success(`Payment receipt ${status.toLowerCase()} successfully.`);
        setVerifyDialogOpen(false);
        setSelectedBill(null);
        loadHistoryBills();
      } else {
        toast.error(res.error || "Failed to update payment status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Property & Utility Type Filters Header */}
      <Card className="border border-slate-200 bg-white rounded-xl shadow-none overflow-hidden">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="space-y-1 sm:w-64">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Select Property</label>
              <Select value={selectedPropertyId} onValueChange={(val) => val && setSelectedPropertyId(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Utility Category</label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setUtilityType("ELECTRICITY")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all",
                    utilityType === "ELECTRICITY" 
                      ? "bg-white text-yellow-600 shadow-sm border-slate-200" 
                      : "text-slate-400 hover:text-slate-650"
                  )}
                >
                  <Zap size={13} className="shrink-0" /> Electricity
                </button>
                <button
                  type="button"
                  onClick={() => setUtilityType("WATER")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all",
                    utilityType === "WATER" 
                      ? "bg-white text-blue-600 shadow-sm border-slate-200" 
                      : "text-slate-400 hover:text-slate-650"
                  )}
                >
                  <Droplet size={13} className="shrink-0" /> Water
                </button>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("billing")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === "billing" ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Record Readings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === "history" ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Billing Ledger
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tab 1: Record Meter Readings */}
      {activeTab === "billing" && (
        <form onSubmit={handleBatchSubmit} className="space-y-6">
          <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
            <CardHeader className="p-5 border-b border-slate-50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {utilityType === "ELECTRICITY" ? <Zap size={16} className="text-yellow-500 animate-pulse" /> : <Droplet size={16} className="text-blue-500 animate-pulse" />}
                Batch Monthly Billing Manager
              </CardTitle>
              <CardDescription className="text-xs">
                Enter current meter readings for occupied units. Bills are auto-calculated from baseline readings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              
              {/* Configuration Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Billing Month (Ethiopian)</label>
                  <Input 
                    required 
                    value={billingMonth} 
                    onChange={e => setBillingMonth(e.target.value)} 
                    placeholder="e.g. Sene 2018" 
                    className="bg-white h-9 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment Due Date</label>
                  <Input 
                    required 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    className="bg-white h-9 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Default Rate ({currency} / Unit)</label>
                  <Input 
                    required 
                    type="number"
                    step="0.01" 
                    value={defaultRate} 
                    onChange={e => handleRateChangeForAll(e.target.value)} 
                    placeholder="e.g. 5.0"
                    className="bg-white h-9 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Batch Entries Table */}
              <div className="border border-slate-150 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="w-12 text-center">Active</TableHead>
                      <TableHead className="px-5">Unit Number</TableHead>
                      <TableHead>Resident Name</TableHead>
                      <TableHead className="w-32">Previous Reading</TableHead>
                      <TableHead className="w-36">Current Reading</TableHead>
                      <TableHead className="w-24">Unit Rate</TableHead>
                      <TableHead>Consumption</TableHead>
                      <TableHead className="text-right px-5">Owed Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUnits ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center p-8">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
                          <span className="text-xs text-slate-400 mt-2 block">Loading unit baseline readings...</span>
                        </TableCell>
                      </TableRow>
                    ) : unitsData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center p-8 text-xs text-slate-400 italic font-medium">
                          No occupied units found for this property.
                        </TableCell>
                      </TableRow>
                    ) : (
                      unitsData.map((unit, index) => {
                        const prev = parseFloat(unit.previousReading) || 0;
                        const curr = parseFloat(unit.currentReading) || 0;
                        const rate = parseFloat(unit.rate) || 0;
                        const consumption = curr > prev ? curr - prev : 0;
                        const cost = consumption * rate;

                        return (
                          <TableRow key={unit.unitId} className={cn("hover:bg-slate-50/30", !unit.included && "opacity-50")}>
                            <TableCell className="text-center">
                              <input 
                                type="checkbox" 
                                checked={unit.included}
                                onChange={e => handleUnitDataChange(index, "included", e.target.checked)}
                                className="h-4 w-4 rounded border-slate-350 cursor-pointer text-slate-900"
                              />
                            </TableCell>
                            <TableCell className="px-5 py-3 font-bold text-slate-800 text-xs">
                              Unit {unit.unitNumber}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 font-semibold">{unit.tenantName}</TableCell>
                            <TableCell className="font-mono text-xs text-slate-700">{unit.previousReading.toLocaleString()} {utilityType === "ELECTRICITY" ? "kWh" : "m³"}</TableCell>
                            <TableCell>
                              <Input 
                                type="number"
                                required={unit.included}
                                disabled={!unit.included}
                                value={unit.currentReading}
                                onChange={e => handleUnitDataChange(index, "currentReading", e.target.value)}
                                className="h-8 text-xs font-mono w-28 bg-white border-slate-250 focus:border-indigo-400"
                                placeholder="Meter value..."
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number"
                                step="0.01"
                                required={unit.included}
                                disabled={!unit.included}
                                value={unit.rate}
                                onChange={e => handleUnitDataChange(index, "rate", e.target.value)}
                                className="h-8 text-xs font-mono w-20 bg-white border-slate-250"
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-indigo-600">
                              {consumption > 0 ? `${consumption.toLocaleString()} ${utilityType === "ELECTRICITY" ? "kWh" : "m³"}` : "—"}
                            </TableCell>
                            <TableCell className="text-right px-5 font-mono text-xs font-black text-slate-800">
                              {cost > 0 ? `${cost.toLocaleString()} ${currency}` : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Submit Buttons */}
              {unitsData.length > 0 && (
                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSubmittingBatch}
                    className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-lg text-xs uppercase tracking-wider shadow-md shadow-slate-900/10"
                  >
                    {isSubmittingBatch ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Generate Utility Bills
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 2: Billing Ledger History */}
      {activeTab === "history" && (
        <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
          <CardHeader className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold">Utility Transactions Ledger</CardTitle>
              <CardDescription className="text-xs">Audit recorded billing records and verify uploaded payments.</CardDescription>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Filter Status:</label>
              <Select value={historyStatusFilter} onValueChange={(val) => val && setHistoryStatusFilter(val)}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Bills</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PENDING">Pending Review</SelectItem>
                  <SelectItem value="PAID">Approved (Paid)</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-5">Month / Date</TableHead>
                  <TableHead>Tenant / Unit</TableHead>
                  <TableHead>Usage & Readings</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right px-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
                      <span className="text-xs text-slate-400 mt-2 block">Loading ledger records...</span>
                    </TableCell>
                  </TableRow>
                ) : historyBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8 text-xs text-slate-400 italic font-medium">
                      No billing records found matching the criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyBills.map(bill => {
                    const prev = bill.previousReading || 0;
                    const curr = bill.currentReading || 0;
                    return (
                      <TableRow key={bill.id} className="hover:bg-slate-50/50">
                        <TableCell className="px-5 py-3.5">
                          <span className="font-bold text-slate-800 text-xs block">{bill.billingMonth}</span>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">{new Date(bill.readingDate).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-slate-800 text-xs block">Unit {bill.lease?.unit?.unitNumber}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{bill.tenant?.name}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-slate-700 block">
                            {bill.usage.toLocaleString()} {bill.type === "ELECTRICITY" ? "kWh" : "m³"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            {prev} → {curr} (@ {bill.rate} {currency})
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-semibold">
                          {formatSystemDate(new Date(bill.dueDate), calendarType)}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-black text-slate-800">
                          {bill.amount.toLocaleString()} {currency}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("shadow-none font-bold uppercase text-[9px] px-2 py-0.5 rounded border",
                            bill.status === "PAID" ? "bg-emerald-50 text-emerald-700 border-emerald-150" :
                            bill.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-150 animate-pulse" :
                            bill.status === "REJECTED" ? "bg-red-50 text-red-700 border-red-150" :
                            "bg-slate-50 text-slate-600 border-slate-150"
                          )}>
                            {bill.status === "PAID" ? "Approved" : bill.status === "PENDING" ? "Reviewing" : bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-5">
                          {bill.status === "PENDING" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBill(bill);
                                setVerifyDialogOpen(true);
                              }}
                              className="h-7 text-[10px] font-black uppercase tracking-wider bg-indigo-650 hover:bg-indigo-750 text-white rounded shadow-none"
                            >
                              Verify
                            </Button>
                          ) : bill.receiptUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBill(bill);
                                setVerifyDialogOpen(true);
                              }}
                              className="h-7 text-[10px] font-semibold border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded"
                            >
                              <Eye size={12} className="mr-1" /> Receipt
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-300 italic">No payment</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-white rounded-2xl p-0 border-none shadow-2xl">
          {selectedBill && (() => {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(selectedBill.receiptUrl || "");
            const isPDF = selectedBill.receiptUrl?.toLowerCase().endsWith(".pdf");
            const bankAccount = bankAccounts.find(b => b.id === selectedBill.bankAccountId);

            return (
              <div>
                <DialogHeader className="p-5 pb-3 bg-slate-50 border-b border-slate-100">
                  <DialogTitle className="text-base font-bold text-slate-900">Utility Receipt Audit</DialogTitle>
                  <DialogDescription className="text-xs">Verify payment reference and bank receipt accuracy.</DialogDescription>
                </DialogHeader>

                <div className="p-5 space-y-4">
                  
                  {/* Bill Summary */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Resident / Unit:</span>
                      <span className="font-bold text-slate-800">{selectedBill.tenant?.name} (Unit {selectedBill.lease?.unit?.unitNumber})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bill Type:</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedBill.type} ({selectedBill.billingMonth})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Consumption:</span>
                      <span className="font-bold text-slate-800">{selectedBill.usage.toLocaleString()} {selectedBill.type === "ELECTRICITY" ? "kWh" : "m³"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Billing Amount:</span>
                      <span className="font-black text-slate-900 text-sm">{selectedBill.amount.toLocaleString()} {currency}</span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Transaction ID</span>
                      <span className="font-mono font-bold text-slate-800 truncate block">{selectedBill.transactionId || "N/A"}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Sender Name</span>
                      <span className="font-bold text-slate-800 truncate block">{selectedBill.senderName || "N/A"}</span>
                    </div>
                    <div className="space-y-0.5 mt-2 col-span-2 border-t border-slate-100 pt-2">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Deposited Bank Account</span>
                      <span className="font-semibold text-slate-700 block">
                        {bankAccount ? `${bankAccount.bankName} - ${bankAccount.accountNumber}` : "Direct Bank Transfer"}
                      </span>
                    </div>
                  </div>

                  {/* Receipt Preview */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Transfer Receipt Screenshot</span>
                    {selectedBill.receiptUrl ? (
                      <div className="w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center min-h-[200px]">
                        {isPDF ? (
                          <iframe 
                            src={`${selectedBill.receiptUrl}#toolbar=0`} 
                            className="w-full h-[250px] border-none"
                            title="Receipt PDF"
                          />
                        ) : isImage ? (
                          <img 
                            src={selectedBill.receiptUrl} 
                            alt="Receipt Screenshot" 
                            className="max-w-full h-auto object-contain max-h-[300px] p-2" 
                          />
                        ) : (
                          <div className="p-8 text-center space-y-2 text-slate-400">
                            <FileText size={32} className="mx-auto" />
                            <p className="text-xs">File preview not supported. Click link to download.</p>
                            <a href={selectedBill.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline font-bold mt-1 block">
                              Open in new tab
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <AlertCircle size={20} className="mb-1 text-slate-350" />
                        No receipt screenshot has been uploaded.
                      </div>
                    )}
                  </div>

                </div>

                <DialogFooter className="p-5 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isVerifying}
                    onClick={() => handleVerifyPayment("REJECTED")}
                    className="h-11 rounded-xl border-slate-200 text-red-600 font-bold hover:bg-red-50 hover:border-red-100"
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    disabled={isVerifying || selectedBill.status === "PAID"}
                    onClick={() => handleVerifyPayment("APPROVED")}
                    className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" /> : "Approve & Settle"}
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
