"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createLeaveRequest } from "@/lib/actions/leave-requests";
import { toast } from "sonner";
import { 
  Calendar, 
  Building, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

interface TenantLeasesViewProps {
  leases: any[];
  leaveRequests: any[];
  currency: string;
}

export function TenantLeasesView({ leases, leaveRequests, currency }: TenantLeasesViewProps) {
  const [activeLease, setActiveLease] = useState<any>(
    leases.find(l => ["ACTIVE", "LOCKED_OUT", "SEALED"].includes(l.status))
  );
  
  // Leave request form states
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [moveOutDate, setMoveOutDate] = useState("");
  const [reason, setReason] = useState("");
  const [shortNoticePenalty, setShortNoticePenalty] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Find active leave request if any
  const currentRequest = activeLease 
    ? leaveRequests.find(r => r.leaseId === activeLease.id && r.status !== "REJECTED")
    : null;

  const handleDateChange = (dateStr: string) => {
    setMoveOutDate(dateStr);
    if (!dateStr || !activeLease) {
      setShortNoticePenalty(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      setShortNoticePenalty(activeLease.unit.rentAmount);
    } else {
      setShortNoticePenalty(0);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLease || !moveOutDate) return;

    setIsLoading(true);
    const result = await createLeaveRequest({
      leaseId: activeLease.id,
      requestedMoveOutDate: new Date(moveOutDate),
      reason,
      isOfficeRequest: false
    });
    setIsLoading(false);

    if (result.success) {
      toast.success("Leave request submitted successfully. Waiting for management review.");
      setIsRequestOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to submit leave request.");
    }
  };

  const getOutstandingSummary = (lease: any) => {
    const unpaidPayments = lease.payments.filter((p: any) => p.status === "PENDING");
    const unpaidPenalties = lease.penalties.filter((p: any) => p.status !== "PAID" && p.status !== "WAIVED");
    const unpaidUtilities = lease.utilityBills.filter((u: any) => u.status !== "PAID");

    const totalUnpaid = 
      unpaidPayments.reduce((acc: number, p: any) => acc + p.amount, 0) +
      unpaidPenalties.reduce((acc: number, p: any) => acc + (p.amount - p.paidAmount), 0) +
      unpaidUtilities.reduce((acc: number, u: any) => acc + u.amount, 0);

    return {
      unpaidPayments,
      unpaidPenalties,
      unpaidUtilities,
      totalUnpaid,
      hasBalances: totalUnpaid > 0
    };
  };

  const activeBalances = activeLease ? getOutstandingSummary(activeLease) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Leases</h1>
        <p className="text-sm text-slate-500">View lease contracts, check details, and request leave clearance.</p>
      </div>

      {activeLease ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Lease Info */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Active Tenancy</span>
                    <CardTitle className="text-xl font-bold mt-1 text-white">Unit {activeLease.unit.unitNumber}</CardTitle>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                      <Building size={12} />
                      <span>{activeLease.unit.property.name} · {activeLease.unit.property.address}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Monthly Rent</p>
                    <p className="text-xl font-bold text-white mt-0.5">{currency} {activeLease.unit.rentAmount.toLocaleString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Start Date</p>
                    <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{new Date(activeLease.startDate).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider">End Date</p>
                    <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span>{new Date(activeLease.endDate).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800">Clearance Status & Actions</h4>
                  
                  {currentRequest ? (
                    <div className="space-y-4">
                      {/* Notice Info */}
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500">Leave Request Status</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            currentRequest.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            currentRequest.status === "APPROVED" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {currentRequest.status === "CLEARANCE_ISSUED" ? "CLEARED" : currentRequest.status}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p><span className="font-semibold text-slate-700">Move-out Date:</span> {new Date(currentRequest.requestedMoveOutDate).toLocaleDateString()}</p>
                          {currentRequest.shortNoticeFee > 0 && (
                            <p className="text-amber-700 font-semibold flex items-center gap-1 mt-1">
                              <AlertTriangle size={13} />
                              <span>Short notice fee charged: {currency} {currentRequest.shortNoticeFee.toLocaleString()}</span>
                            </p>
                          )}
                        </div>

                        {currentRequest.status === "PENDING" && (
                          <div className="text-xs bg-amber-50 text-amber-800 p-3 rounded-lg flex gap-2 border border-amber-100">
                            <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <p>Your request is currently pending manager approval. You will receive a notification once approved.</p>
                          </div>
                        )}

                        {currentRequest.status === "APPROVED" && (
                          <div className="text-xs bg-blue-50 text-blue-800 p-3 rounded-lg flex gap-2 border border-blue-100">
                            <CheckCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Leave Approved</p>
                              <p className="mt-0.5">Please pay all outstanding balances shown on the sidebar to get your clearance certificate.</p>
                            </div>
                          </div>
                        )}

                        {currentRequest.status === "CLEARANCE_ISSUED" && (
                          <div className="text-xs bg-emerald-50 text-emerald-800 p-3 rounded-lg flex gap-2 border border-emerald-100">
                            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Clearance Completed</p>
                              <p className="mt-0.5">You have been officially cleared. Thank you for your tenancy!</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                      <p className="text-xs text-slate-400 max-w-xs">Planning to move out? Submit your leave request at least 30 days in advance to avoid a 1-month rent short-notice penalty.</p>
                      <Button onClick={() => setIsRequestOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 px-4">
                        Request to Leave
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Outstanding Balances */}
          <div className="space-y-6">
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-bold text-slate-900">Outstanding Balances</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {activeBalances && activeBalances.hasBalances ? (
                  <div className="space-y-3">
                    <div className="text-xs space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {activeBalances.unpaidPayments.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="font-semibold text-slate-700">Monthly Rent</p>
                            <p className="text-[10px] text-slate-400">Due: {new Date(p.dueDate).toLocaleDateString()}</p>
                          </div>
                          <span className="font-bold text-slate-900">{currency} {p.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {activeBalances.unpaidPenalties.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 text-red-600">
                          <div>
                            <p className="font-semibold">Late Fee Penalty</p>
                            <p className="text-[10px] text-red-400">Unpaid amount</p>
                          </div>
                          <span className="font-bold">{currency} {(p.amount - p.paidAmount).toLocaleString()}</span>
                        </div>
                      ))}
                      {activeBalances.unpaidUtilities.map((u: any) => (
                        <div key={u.id} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="font-semibold text-slate-700">{u.type} Utility</p>
                            <p className="text-[10px] text-slate-400">Month: {u.billingMonth}</p>
                          </div>
                          <span className="font-bold text-slate-900">{currency} {u.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-800">Total Outstanding</span>
                      <span className="font-black text-rose-600 text-base">{currency} {activeBalances.totalUnpaid.toLocaleString()}</span>
                    </div>

                    <Button 
                      onClick={() => window.location.href = "/tenant/payments"} 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 flex items-center justify-center gap-1.5 mt-2"
                    >
                      <span>Pay Balances</span>
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <CheckCircle className="text-emerald-500 mb-2" size={28} />
                    <p className="text-xs font-bold text-slate-800">No Outstanding Balance</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">All rents, penalties, and utilities are fully paid.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border-slate-100 shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">No Active Lease Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">You currently do not have any active lease agreements registered in the portal.</p>
          </div>
        </Card>
      )}

      {/* Leave Request Dialog */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Request to Vacate Unit</DialogTitle>
            <DialogDescription>Submit your formal notice of move-out. A 30-day notice is required to avoid penalty fees.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="tenantMoveOutDate" className="text-xs font-semibold text-slate-600">Requested Move-out Date</Label>
              <Input
                id="tenantMoveOutDate"
                type="date"
                value={moveOutDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Warning logic */}
            {shortNoticePenalty !== null && shortNoticePenalty > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex gap-2.5 items-start">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Short Notice Period Penalty</p>
                  <p>Because your requested move-out date is less than 30 days from today, a penalty fee of one month's rent (<span className="font-semibold">{currency} {shortNoticePenalty.toLocaleString()}</span>) will be billed to your account.</p>
                </div>
              </div>
            )}

            {shortNoticePenalty !== null && shortNoticePenalty === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex gap-2.5 items-start">
                <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                <div className="text-xs">
                  <p className="font-bold">Standard Notice Period</p>
                  <p>Notice period is 30 days or more. No penalty fees apply.</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="tenantReason" className="text-xs font-semibold text-slate-600">Reason for leaving (Optional)</Label>
              <Textarea
                id="tenantReason"
                rows={3}
                placeholder="Please describe why you are leaving..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRequestOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Leave Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
