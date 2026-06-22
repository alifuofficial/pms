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
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  createLeaveRequest, 
  approveLeaveRequest, 
  rejectLeaveRequest, 
  issueClearanceAndVacate 
} from "@/lib/actions/leave-requests";
import { toast } from "sonner";
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Printer, 
  Search, 
  User, 
  Calendar, 
  Building, 
  Plus, 
  X, 
  AlertCircle 
} from "lucide-react";

interface LeaveClearanceViewProps {
  leaveRequests: any[];
  activeLeases: any[];
  currency: string;
  role: string;
}

export function LeaveClearanceView({ 
  leaveRequests: initialLeaveRequests, 
  activeLeases, 
  currency,
  role 
}: LeaveClearanceViewProps) {
  const [requests, setRequests] = useState(initialLeaveRequests);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Leave Request Dialog State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [requestedMoveOutDate, setRequestedMoveOutDate] = useState("");
  const [reason, setReason] = useState("");
  const [shortNoticeWarning, setShortNoticeWarning] = useState<number | null>(null);

  // Approval/Rejection states
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  // Clearance confirmation state
  const [isClearanceOpen, setIsClearanceOpen] = useState(false);

  // Filter & Search
  const filteredRequests = requests.filter(req => {
    const matchesStatus = filterStatus === "ALL" || req.status === filterStatus;
    const name = req.tenant.name?.toLowerCase() || "";
    const email = req.tenant.email?.toLowerCase() || "";
    const unit = req.lease.unit.unitNumber?.toLowerCase() || "";
    const prop = req.lease.unit.property.name?.toLowerCase() || "";
    const matchesSearch = 
      name.includes(searchQuery.toLowerCase()) || 
      email.includes(searchQuery.toLowerCase()) ||
      unit.includes(searchQuery.toLowerCase()) ||
      prop.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const stats = {
    pending: requests.filter(r => r.status === "PENDING").length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    cleared: requests.filter(r => r.status === "CLEARANCE_ISSUED").length,
  };

  const handleLeaseChange = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    if (!leaseId) {
      setShortNoticeWarning(null);
      return;
    }
    const lease = activeLeases.find(l => l.id === leaseId);
    if (lease && requestedMoveOutDate) {
      calculateShortNotice(new Date(requestedMoveOutDate), lease.unit.rentAmount);
    }
  };

  const handleDateChange = (dateStr: string) => {
    setRequestedMoveOutDate(dateStr);
    if (!selectedLeaseId || !dateStr) {
      setShortNoticeWarning(null);
      return;
    }
    const lease = activeLeases.find(l => l.id === selectedLeaseId);
    if (lease) {
      calculateShortNotice(new Date(dateStr), lease.unit.rentAmount);
    }
  };

  const calculateShortNotice = (moveOutDate: Date, rentAmount: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(moveOutDate);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      setShortNoticeWarning(rentAmount);
    } else {
      setShortNoticeWarning(0);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId || !requestedMoveOutDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    const result = await createLeaveRequest({
      leaseId: selectedLeaseId,
      requestedMoveOutDate: new Date(requestedMoveOutDate),
      reason,
      isOfficeRequest: true
    });
    setIsLoading(false);

    if (result.success) {
      toast.success("Leave request created successfully.");
      setIsRequestOpen(false);
      // Refresh local list state
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to create leave request.");
    }
  };

  const handleApprove = async () => {
    if (!activeRequest) return;
    setIsLoading(true);
    const result = await approveLeaveRequest(activeRequest.id, adminNote);
    setIsLoading(false);
    if (result.success) {
      toast.success("Leave request approved.");
      setIsApproveOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to approve request.");
    }
  };

  const handleReject = async () => {
    if (!activeRequest) return;
    if (!adminNote) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setIsLoading(true);
    const result = await rejectLeaveRequest(activeRequest.id, adminNote);
    setIsLoading(false);
    if (result.success) {
      toast.success("Leave request rejected.");
      setIsRejectOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to reject request.");
    }
  };

  const handleIssueClearance = async () => {
    if (!activeRequest) return;
    setIsLoading(true);
    const result = await issueClearanceAndVacate(activeRequest.id);
    setIsLoading(false);
    if (result.success) {
      toast.success("Clearance issued successfully. Unit is now vacant and available.");
      setIsClearanceOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to issue clearance.");
    }
  };

  // Utility to count outstanding items
  const getOutstandingDetails = (lease: any) => {
    const unpaidPayments = lease.payments.filter((p: any) => p.status === "PENDING");
    const unpaidPenalties = lease.penalties.filter((p: any) => p.status !== "PAID");
    const unpaidUtilities = lease.utilityBills.filter((u: any) => u.status !== "PAID");

    const totalUnpaidAmount = 
      unpaidPayments.reduce((acc: number, p: any) => acc + p.amount, 0) +
      unpaidPenalties.reduce((acc: number, p: any) => acc + (p.amount - p.paidAmount), 0) +
      unpaidUtilities.reduce((acc: number, u: any) => acc + u.amount, 0);

    return {
      unpaidPaymentsCount: unpaidPayments.length,
      unpaidPenaltiesCount: unpaidPenalties.length,
      unpaidUtilitiesCount: unpaidUtilities.length,
      totalUnpaidAmount,
      hasOutstanding: unpaidPayments.length > 0 || unpaidPenalties.length > 0 || unpaidUtilities.length > 0
    };
  };

  const rolePath = role.toLowerCase() === "manager" ? "manager" : "admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave & Clearance</h1>
          <p className="text-sm text-slate-500">Manage tenant move-out requests, notice penalty checks, and issue clearance certificates.</p>
        </div>
        <Button onClick={() => setIsRequestOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus size={16} />
          <span>New Leave Request</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Review</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.pending}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Leases</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.approved}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cleared & Vacated</p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.cleared}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "PENDING", "APPROVED", "CLEARANCE_ISSUED", "REJECTED"].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className="text-xs h-8 px-3"
            >
              {status.replace("_", " ")}
            </Button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tenant, property or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-600 text-xs">Tenant / Unit</TableHead>
              <TableHead className="font-semibold text-slate-600 text-xs">Dates</TableHead>
              <TableHead className="font-semibold text-slate-600 text-xs">Notice & Penalty</TableHead>
              <TableHead className="font-semibold text-slate-600 text-xs">Outstanding Balance</TableHead>
              <TableHead className="font-semibold text-slate-600 text-xs text-center">Status</TableHead>
              <TableHead className="font-semibold text-slate-600 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                  No leave requests found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => {
                const outstanding = getOutstandingDetails(req.lease);
                const reqDate = new Date(req.createdAt);
                const moveOutDate = new Date(req.requestedMoveOutDate);
                const diffTime = moveOutDate.getTime() - reqDate.getTime();
                const noticeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return (
                  <TableRow key={req.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold uppercase text-xs">
                          {req.tenant.name?.substring(0, 2) || "T"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{req.tenant.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building size={12} className="text-slate-400" />
                            <span>{req.lease.unit.property.name} · Unit {req.lease.unit.unitNumber}</span>
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <p className="text-slate-500"><span className="font-medium text-slate-700">Requested:</span> {reqDate.toLocaleDateString()}</p>
                        <p className="text-slate-500"><span className="font-medium text-slate-700">Move-out:</span> {moveOutDate.toLocaleDateString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {noticeDays >= 30 ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-semibold px-2 py-0.5">
                            Standard ({noticeDays} days notice)
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 text-[10px] font-semibold px-2 py-0.5">
                              Short Notice ({noticeDays} days notice)
                            </Badge>
                            <p className="text-[11px] font-semibold text-slate-700">
                              Penalty: {currency} {req.shortNoticeFee.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {outstanding.hasOutstanding ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={12} />
                            <span>Pending Payments</span>
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium pl-1">
                            {outstanding.unpaidPaymentsCount > 0 && `${outstanding.unpaidPaymentsCount} rent month(s) `}
                            {outstanding.unpaidPenaltiesCount > 0 && `· ${outstanding.unpaidPenaltiesCount} penalty `}
                            {outstanding.unpaidUtilitiesCount > 0 && `· ${outstanding.unpaidUtilitiesCount} utility bill `}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} />
                          <span>Clear Balance</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        req.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        req.status === "APPROVED" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        req.status === "CLEARANCE_ISSUED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        "bg-red-50 text-red-700 border border-red-200"
                      }`}>
                        {req.status === "CLEARANCE_ISSUED" ? "CLEARED" : req.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {req.status === "PENDING" && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setActiveRequest(req);
                                setAdminNote("");
                                setIsApproveOpen(true);
                              }}
                              className="text-xs h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setActiveRequest(req);
                                setAdminNote("");
                                setIsRejectOpen(true);
                              }}
                              className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {req.status === "APPROVED" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setActiveRequest(req);
                                setIsClearanceOpen(true);
                              }}
                              className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Issue Clearance
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/${rolePath}/leave-clearance/print/${req.id}`, "_blank")}
                              className="text-xs h-7 flex items-center gap-1 text-slate-600 hover:text-slate-800"
                            >
                              <Printer size={12} />
                              <span>Print Clearance</span>
                            </Button>
                          </>
                        )}

                        {req.status === "CLEARANCE_ISSUED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/${rolePath}/leave-clearance/print/${req.id}`, "_blank")}
                            className="text-xs h-7 flex items-center gap-1 text-slate-600 hover:text-slate-800"
                          >
                            <Printer size={12} />
                            <span>Print Certificate</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Leave Request Dialog (Office Request) */}
      <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Office Leave Request</DialogTitle>
            <DialogDescription>Submit a move-out request on behalf of a tenant who visited the office in person.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="lease" className="text-xs font-semibold text-slate-600">Select Tenant & Unit</Label>
              <select
                id="lease"
                value={selectedLeaseId}
                onChange={(e) => handleLeaseChange(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Choose Tenant --</option>
                {activeLeases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.tenant.name} - Unit {l.unit.unitNumber} ({l.unit.property.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="moveOutDate" className="text-xs font-semibold text-slate-600">Requested Move-out Date</Label>
              <Input
                id="moveOutDate"
                type="date"
                value={requestedMoveOutDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Short Notice Warning Alert */}
            {shortNoticeWarning !== null && shortNoticeWarning > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex gap-2.5 items-start">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Short Notice Period Penalty</p>
                  <p>Move-out date is less than 30 days from today. A penalty payment record for 1-month's rent (<span className="font-semibold">{currency} {shortNoticeWarning.toLocaleString()}</span>) will be automatically billed to the tenant.</p>
                </div>
              </div>
            )}

            {shortNoticeWarning !== null && shortNoticeWarning === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex gap-2.5 items-start">
                <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                <div className="text-xs">
                  <p className="font-bold">Standard Notice Period</p>
                  <p>Notice period is 30 days or more. No notice penalties apply.</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="reason" className="text-xs font-semibold text-slate-600">Reason for leaving (Optional)</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="Why is the tenant moving out?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRequestOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve the leave request for <span className="font-bold text-slate-900">{activeRequest?.tenant.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-blue-50 border border-blue-100 text-blue-900 p-3 rounded-lg text-xs space-y-1.5">
              <p className="font-semibold flex items-center gap-1"><AlertCircle size={14} /> Next Steps</p>
              <p>Approving registers the formal leave timeline. The tenant must settle all outstanding payments, penalties, or utilities before clearance can be printed and issued.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="approveNote" className="text-xs font-semibold text-slate-600">Admin Notes / Comments (Optional)</Label>
              <Textarea
                id="approveNote"
                rows={3}
                placeholder="Add approval notes or details..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? "Approving..." : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Provide the reason for rejecting the leave request submitted by <span className="font-bold text-slate-900">{activeRequest?.tenant.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="rejectNote" className="text-xs font-semibold text-slate-600">Rejection Reason</Label>
              <Textarea
                id="rejectNote"
                rows={3}
                placeholder="Reason for rejection (Required)..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white" disabled={isLoading || !adminNote}>
              {isLoading ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clearance Dialog */}
      <Dialog open={isClearanceOpen} onOpenChange={setIsClearanceOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Issue Clearance & Vacate Unit</DialogTitle>
            <DialogDescription>
              Confirming clearance will terminate the lease and change the unit status to vacant.
            </DialogDescription>
          </DialogHeader>
          {activeRequest && (
            <div className="space-y-4 py-2">
              {/* Outstanding check */}
              {(() => {
                const outstanding = getOutstandingDetails(activeRequest.lease);
                if (outstanding.hasOutstanding) {
                  return (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg space-y-2">
                      <p className="font-bold text-xs flex items-center gap-1 text-rose-700">
                        <AlertTriangle size={15} /> Cannot Vacate: Outstanding Balances Exist
                      </p>
                      <div className="text-[11px] space-y-1 pl-1">
                        <p>The tenant still has unpaid invoices or penalties. All payments must be cleared and confirmed by accountant before vacating.</p>
                        <ul className="list-disc pl-4 mt-1 font-semibold space-y-0.5">
                          {outstanding.unpaidPaymentsCount > 0 && <li>{outstanding.unpaidPaymentsCount} unpaid monthly rent(s)</li>}
                          {outstanding.unpaidPenaltiesCount > 0 && <li>{outstanding.unpaidPenaltiesCount} unpaid penalty fee(s)</li>}
                          {outstanding.unpaidUtilitiesCount > 0 && <li>{outstanding.unpaidUtilitiesCount} unpaid utility bill(s)</li>}
                        </ul>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1 text-emerald-700">
                        <CheckCircle size={15} /> Ready for Clearance
                      </p>
                      <p>All rental payments, penalties, and utilities are fully settled. Clearance certificate will be logged and the unit will be marked vacant.</p>
                    </div>
                  );
                }
              })()}

              <div className="border border-slate-100 rounded-lg p-3 space-y-1 bg-slate-50 text-xs">
                <p className="font-semibold text-slate-700">Summary Details:</p>
                <p><span className="text-slate-500">Tenant:</span> {activeRequest.tenant.name}</p>
                <p><span className="text-slate-500">Unit:</span> {activeRequest.lease.unit.unitNumber} ({activeRequest.lease.unit.property.name})</p>
                <p><span className="text-slate-500">Move-out Date:</span> {new Date(activeRequest.requestedMoveOutDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearanceOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleIssueClearance} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white" 
              disabled={isLoading || (activeRequest && getOutstandingDetails(activeRequest.lease).hasOutstanding)}
            >
              {isLoading ? "Vacating..." : "Confirm & Vacate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
