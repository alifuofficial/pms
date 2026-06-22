"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  ShieldAlert, 
  Search, 
  Calendar, 
  DollarSign, 
  Package, 
  MapPin, 
  Home, 
  CheckCircle2, 
  Gavel, 
  Loader2,
  Coins,
  Info,
  PlusCircle,
  Zap,
  BadgeDollarSign,
  Trash2,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { formatSystemDate, toEthiopian, getEthiopianYearRange, getEthiopianMonths, getDaysInEthiopianMonth } from "@/lib/calendar";
import { releaseSeizedProperty, recordAuctionSale, addLockedOutFee, removeLockoutFee, unsealLease, lockoutLease, getLeaseLockoutPreview } from "@/lib/actions/users";
import Kenat from "kenat";
import { toast } from "sonner";

interface LockedOutViewProps {
  lockedOutLeases: any[];
  currency: string;
  isAdmin?: boolean;
  isAccountant?: boolean;
}

export function LockedOutView({ lockedOutLeases, currency, isAdmin = false, isAccountant = false }: LockedOutViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [activePortalTab, setActivePortalTab] = useState<"SEALED" | "LOCKED_OUT">("SEALED");
  const [isPending, startTransition] = useTransition();

  // Dialog States
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [actionType, setActionType] = useState<"RELEASE" | "AUCTION" | "ADD_FEE" | "LOCKOUT" | null>(null);

  // Auction form state
  const [saleAmount, setSaleAmount] = useState("");
  const [buyerName, setBuyerName] = useState("");

  // Add Fee form state
  const [feeLeaseId, setFeeLeaseId] = useState("");
  const [feeTenantName, setFeeTenantName] = useState("");
  const [feeType, setFeeType] = useState<"RENTAL" | "UTILITY">("RENTAL");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeNote, setFeeNote] = useState("");

  // Lockout form state
  const [lockoutLeaseId, setLockoutLeaseId] = useState("");
  const [lockoutTenantName, setLockoutTenantName] = useState("");
  const [lockoutInventory, setLockoutInventory] = useState("");
  const [lockoutStorage, setLockoutStorage] = useState("");
  const [lockoutValue, setLockoutValue] = useState("");
  const [lockoutDateEth, setLockoutDateEth] = useState({ year: 2018, month: 10, day: 1 });
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const canAddFee = isAdmin || isAccountant;

  useEffect(() => {
    if (actionType === "LOCKOUT" && lockoutLeaseId && lockoutDateEth.year && lockoutDateEth.month && lockoutDateEth.day) {
      setPreviewLoading(true);
      try {
        const s = new Kenat(`${lockoutDateEth.year}/${lockoutDateEth.month}/${lockoutDateEth.day}`).getGregorian() as any;
        const lockoutDate = new Date(s.year, s.month - 1, s.day, 12, 0, 0);
        getLeaseLockoutPreview(lockoutLeaseId, lockoutDate)
          .then((res) => {
            if (res.success) {
              setPreviewData(res.data);
            } else {
              toast.error(res.error || "Failed to calculate lockout preview.");
            }
          })
          .catch((err) => {
            console.error("Lockout preview fetch error:", err);
          })
          .finally(() => {
            setPreviewLoading(false);
          });
      } catch (err) {
        setPreviewLoading(false);
        console.error("Failed to parse date for preview:", err);
      }
    } else if (actionType !== "LOCKOUT") {
      setPreviewData(null);
    }
  }, [actionType, lockoutLeaseId, lockoutDateEth]);

  const handleRemoveFee = (feeId: string, amount: number, note: string) => {
    startTransition(async () => {
      const result = await removeLockoutFee(feeId);
      if (result.success) {
        toast.success(`Fee of ${currency} ${amount.toLocaleString()} removed successfully.`);
      } else {
        toast.error(result.error || "Failed to remove fee.");
      }
    });
  };

  // Stats calculation
  const totalLockedOutCount = lockedOutLeases.filter((l: any) => l.status === "LOCKED_OUT").length;
  const totalSealedCount = lockedOutLeases.filter((l: any) => l.status === "SEALED").length;

  const sealedRentDue = lockedOutLeases
    .filter((l: any) => l.status === "SEALED")
    .reduce((sum, l) => sum + l.totalUncollected, 0);

  const lockedOutRentDue = lockedOutLeases
    .filter((l: any) => l.status === "LOCKED_OUT")
    .reduce((sum, lease) => {
      const finalPayment = lease.payments.find((p: any) => p.type === "FINAL_SETTLEMENT");
      if (finalPayment && finalPayment.status !== "APPROVED") {
        return sum + finalPayment.amount;
      }
      return sum;
    }, 0);

  const totalOutstandingDebt = activePortalTab === "SEALED" ? sealedRentDue : lockedOutRentDue;

  const storedItemsCount = lockedOutLeases
    .filter((l: any) => l.status === "LOCKED_OUT")
    .reduce((sum, lease) => {
      const stored = lease.seizedProperties.filter((sp: any) => sp.status === "STORED").length;
      return sum + stored;
    }, 0);

  const totalSurplusRefunded = lockedOutLeases
    .filter((l: any) => l.status === "LOCKED_OUT")
    .reduce((sum, lease) => {
      const refundSum = lease.refunds
        .filter((r: any) => r.status === "APPROVED")
        .reduce((s: number, r: any) => s + r.amount, 0);
      return sum + refundSum;
    }, 0);

  // Filter leases
  const filteredLeases = lockedOutLeases.filter((lease) => {
    if (lease.status !== activePortalTab) return false;

    const tenantName = lease.tenant?.name?.toLowerCase() || "";
    const unitNumber = lease.unit?.unitNumber?.toLowerCase() || "";
    const propertyName = lease.unit?.property?.name?.toLowerCase() || "";
    
    const matchesSearch = 
      tenantName.includes(searchQuery.toLowerCase()) || 
      unitNumber.includes(searchQuery.toLowerCase()) || 
      propertyName.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activePortalTab === "LOCKED_OUT") {
      const finalPayment = lease.payments.find((p: any) => p.type === "FINAL_SETTLEMENT");
      const matchesPaymentStatus = 
        paymentStatusFilter === "ALL" || 
        (paymentStatusFilter === "PENDING" && finalPayment?.status !== "APPROVED") ||
        (paymentStatusFilter === "APPROVED" && finalPayment?.status === "APPROVED");
      if (!matchesPaymentStatus) return false;

      const hasMatchingPropertyStatus = lease.seizedProperties.some((sp: any) => {
        return propertyStatusFilter === "ALL" || sp.status === propertyStatusFilter;
      }) || (propertyStatusFilter === "ALL" && lease.seizedProperties.length === 0);
      if (!hasMatchingPropertyStatus) return false;
    } else {
      const matchesPaymentStatus = 
        paymentStatusFilter === "ALL" || 
        (paymentStatusFilter === "PENDING" && lease.totalUncollected > 0) ||
        (paymentStatusFilter === "APPROVED" && lease.totalUncollected === 0);
      if (!matchesPaymentStatus) return false;
    }

    return true;
  });

  const handleOpenRelease = (lease: any, seizedProperty: any) => {
    setSelectedProperty({ lease, seizedProperty });
    setActionType("RELEASE");
  };

  const handleOpenAuction = (lease: any, seizedProperty: any) => {
    setSelectedProperty({ lease, seizedProperty });
    setActionType("AUCTION");
    setSaleAmount("");
    setBuyerName("");
  };

  const handleCloseDialogs = () => {
    setSelectedProperty(null);
    setActionType(null);
    setFeeLeaseId("");
    setFeeTenantName("");
    setFeeAmount("");
    setFeeNote("");
    setFeeType("RENTAL");
    setLockoutLeaseId("");
    setLockoutTenantName("");
    setLockoutInventory("");
    setLockoutStorage("");
    setLockoutValue("");
  };

  const handleUnseal = async (leaseId: string, tenantName: string) => {
    startTransition(async () => {
      const result = await unsealLease(leaseId);
      if (result.success) {
        toast.success(`Shop unsealed successfully for ${tenantName}. Lease status restored to Active.`);
      } else {
        toast.error(result.error || "Failed to unseal shop.");
      }
    });
  };

  const handleLockoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockoutInventory || !lockoutStorage) {
      toast.error("Inventory list and storage location are required.");
      return;
    }
    const val = lockoutValue ? parseFloat(lockoutValue) : undefined;

    startTransition(async () => {
      try {
        const s = new Kenat({ year: lockoutDateEth.year, month: lockoutDateEth.month, day: lockoutDateEth.day });
        const greg = s.getGregorian() as any;
        const lockoutDate = new Date(Date.UTC(greg.year, greg.month - 1, greg.day, 12, 0, 0));

        const result = await lockoutLease(
          lockoutLeaseId,
          lockoutDate,
          lockoutInventory,
          lockoutStorage,
          val
        );

        if (result.success) {
          toast.success(`Full lockout and eviction executed successfully for ${lockoutTenantName}.`);
          handleCloseDialogs();
        } else {
          toast.error(result.error || "Failed to execute lockout.");
        }
      } catch (err: any) {
        toast.error("Failed to parse Selected Ethiopian Date.");
      }
    });
  };

  const handleOpenAddFee = (lease: any) => {
    setFeeLeaseId(lease.id);
    setFeeTenantName(lease.tenant?.name || "Tenant");
    setFeeAmount("");
    setFeeNote("");
    setFeeType("RENTAL");
    setActionType("ADD_FEE");
  };

  const handleAddFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(feeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive amount.");
      return;
    }
    if (!feeNote.trim()) {
      toast.error("Please enter a note/reason for this fee.");
      return;
    }
    startTransition(async () => {
      const result = await addLockedOutFee(feeLeaseId, feeType, amount, feeNote.trim());
      if (result.success) {
        toast.success(`${feeType === "RENTAL" ? "Rental" : "Utility"} fee of ${currency} ${amount.toLocaleString()} added to ${feeTenantName}'s settlement.`);
        handleCloseDialogs();
      } else {
        toast.error(result.error || "Failed to add fee.");
      }
    });
  };

  const handleReleaseSubmit = async () => {
    if (!selectedProperty?.seizedProperty?.id) return;
    
    startTransition(async () => {
      const result = await releaseSeizedProperty(selectedProperty.seizedProperty.id);
      if (result.success) {
        toast.success("Seized property successfully released back to tenant.");
        handleCloseDialogs();
      } else {
        toast.error(result.error || "Failed to release property.");
      }
    });
  };

  const handleAuctionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty?.seizedProperty?.id) return;
    if (!saleAmount || !buyerName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const amountNum = parseFloat(saleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid positive sale amount.");
      return;
    }

    startTransition(async () => {
      const result = await recordAuctionSale(
        selectedProperty.seizedProperty.id,
        amountNum,
        buyerName
      );
      if (result.success) {
        toast.success("Auction sale recorded successfully.");
        handleCloseDialogs();
      } else {
        toast.error(result.error || "Failed to record auction sale.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="text-red-600 h-6 w-6" /> Sealing & Lockout Portal
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Manage temporarily sealed tenant shops and catalog full evictions, seized warehouse properties, and auction sales.
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-slate-100 gap-6 text-sm font-semibold pt-2">
        <button
          onClick={() => {
            setActivePortalTab("SEALED");
            setPaymentStatusFilter("ALL");
          }}
          className={`pb-3 relative transition-all cursor-pointer ${
            activePortalTab === "SEALED"
              ? "text-slate-905 border-b-2 border-slate-900 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Sealed Shops ({totalSealedCount})
        </button>
        <button
          onClick={() => {
            setActivePortalTab("LOCKED_OUT");
            setPaymentStatusFilter("ALL");
          }}
          className={`pb-3 relative transition-all cursor-pointer ${
            activePortalTab === "LOCKED_OUT"
              ? "text-slate-905 border-b-2 border-slate-900 font-bold"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Locked Out & Evicted ({totalLockedOutCount})
        </button>
      </div>

      {/* High-Fidelity Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activePortalTab === "SEALED" ? "Sealed Shops" : "Locked Out Leases"}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              {activePortalTab === "SEALED" ? totalSealedCount : totalLockedOutCount}
            </h3>
          </div>
        </div>

        {/* Card 2: Total Outstanding Eviction Debt */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Coins size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activePortalTab === "SEALED" ? "Sealed Rent Due" : "Settlement Arrears"}
            </p>
            <h3 className="text-xl font-black text-amber-600 mt-0.5">
              {currency} {totalOutstandingDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Card 3: Items in Storage / Sealed Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activePortalTab === "SEALED" ? "Avg Rent / Month" : "Items In Storage"}
            </p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">
              {activePortalTab === "SEALED" 
                ? `${currency} ${(totalSealedCount > 0 ? Math.round(sealedRentDue / totalSealedCount) : 0).toLocaleString()}` 
                : storedItemsCount
              }
            </h3>
          </div>
        </div>

        {/* Card 4: Surplus Refunded / Sealed Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {activePortalTab === "SEALED" ? "Sealed Shop Pcts" : "Surplus Refunded"}
            </p>
            <h3 className="text-xl font-black text-emerald-600 mt-0.5">
              {activePortalTab === "SEALED" 
                ? "100%" 
                : `${currency} ${totalSurplusRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by resident name, property, or unit..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-200 rounded-xl text-sm" 
          />
        </div>

        {/* Payment Status Filter */}
        <div className="w-full sm:w-48">
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="ALL">Payment Status: All</option>
            <option value="PENDING">{activePortalTab === "SEALED" ? "Rent Overdue" : "Settlement Pending"}</option>
            <option value="APPROVED">{activePortalTab === "SEALED" ? "Paid up" : "Settled (Paid)"}</option>
          </select>
        </div>

        {/* Property Status Filter (only show for LOCKED_OUT tab) */}
        {activePortalTab === "LOCKED_OUT" && (
          <div className="w-full sm:w-48">
            <select
              value={propertyStatusFilter}
              onChange={(e) => setPropertyStatusFilter(e.target.value)}
              className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="ALL">Inventory Status: All</option>
              <option value="STORED">Stored In Warehouse</option>
              <option value="RETRIEVED">Returned to Tenant</option>
              <option value="SOLD">Sold at Auction</option>
              <option value="DISPOSED">Disposed</option>
            </select>
          </div>
        )}
      </div>

      {/* Grid of Cards */}
      {filteredLeases.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLeases.map((lease) => {
            if (activePortalTab === "SEALED") {
              return (
                <div 
                  key={lease.id} 
                  className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Header Section */}
                  <div className="p-6 pb-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                          {lease.tenant?.name?.[0] || "T"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{lease.tenant?.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1 mt-0.5">
                            <Home size={10} className="text-slate-400" /> Unit {lease.unit?.unitNumber} — {lease.unit?.property?.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black tracking-wider uppercase bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-md">
                          SEALED SHOP
                        </span>
                        {lease.updatedAt && (
                          <p className="text-[9.5px] font-semibold text-slate-400 flex items-center gap-1 justify-end mt-1.5">
                            <Calendar size={9} /> Sealed: {formatSystemDate(new Date(lease.updatedAt), "ETHIOPIAN")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-6 space-y-5 flex-1">
                    {/* Arrears Summary */}
                    <div className="bg-slate-50/30 rounded-xl border border-slate-100 p-4 space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Coins size={11} className="text-slate-500" /> Uncollected Balance Breakdown
                      </h5>
                      <div className="space-y-2 text-xs font-semibold text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rent Arrears:</span>
                          <span className="text-slate-850 font-bold">{currency} {lease.rentUncollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Late Fees / Penalties:</span>
                          <span className="text-slate-850 font-bold">{currency} {lease.penaltiesUncollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Utility Bills:</span>
                          <span className="text-slate-850 font-bold">{currency} {lease.utilitiesUncollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-extrabold">
                          <span className="text-slate-900">Total Outstanding:</span>
                          <span className="text-amber-600">{currency} {lease.totalUncollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-2">
                    {isAdmin || isAccountant ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnseal(lease.id, lease.tenant?.name)}
                        disabled={isPending}
                        className="h-8 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={12} /> Unseal Shop
                      </Button>
                    ) : null}

                    {isAdmin ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setLockoutLeaseId(lease.id);
                          setLockoutTenantName(lease.tenant?.name);
                          setLockoutInventory("");
                          setLockoutStorage("");
                          setLockoutValue("");
                          const et = toEthiopian(new Date());
                          setLockoutDateEth({ year: et.year, month: et.month, day: et.day });
                          setActionType("LOCKOUT");
                        }}
                        className="h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ShieldAlert size={12} /> Execute Lockout
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            }

            const finalPayment = lease.payments.find((p: any) => p.type === "FINAL_SETTLEMENT");
            const isSettled = finalPayment?.status === "APPROVED";
            const seizedProp = lease.seizedProperties?.[0];
            const approvedRefund = lease.refunds?.find((r: any) => r.status === "APPROVED");

            return (
              <div 
                key={lease.id} 
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Header Section */}
                <div className="p-6 pb-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {lease.tenant?.name?.[0] || "T"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{lease.tenant?.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1 mt-0.5">
                          <Home size={10} className="text-slate-400" /> Unit {lease.unit?.unitNumber} — {lease.unit?.property?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black tracking-wider uppercase bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-md">
                        LOCKED OUT
                      </span>
                      {lease.terminatedAt && (
                        <p className="text-[9.5px] font-semibold text-slate-400 flex items-center gap-1 justify-end mt-1.5">
                          <Calendar size={9} /> {formatSystemDate(new Date(lease.terminatedAt), "ETHIOPIAN")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-5 flex-1">

                  {/* Manually Added Fees */}
                  {lease.lockoutFees && lease.lockoutFees.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Receipt size={11} className="text-orange-500" /> Manually Added Fees
                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">
                          {lease.lockoutFees.length} fee{lease.lockoutFees.length !== 1 ? "s" : ""}
                        </span>
                      </h5>
                      <div className="space-y-1.5">
                        {lease.lockoutFees.map((fee: any) => (
                          <div
                            key={fee.id}
                            className="flex items-start gap-2 bg-orange-50/60 border border-orange-100 rounded-xl px-3 py-2.5"
                          >
                            <div className="shrink-0 mt-0.5">
                              {fee.feeType === "RENTAL" ? (
                                <BadgeDollarSign size={13} className="text-orange-500" />
                              ) : (
                                <Zap size={13} className="text-orange-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">
                                  {fee.feeType === "RENTAL" ? "Rental" : "Utility"}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {currency} {fee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-600 font-medium mt-0.5 leading-snug">{fee.note}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                Added by {fee.addedByName || "Staff"} · {formatSystemDate(new Date(fee.createdAt), "ETHIOPIAN")}
                              </p>
                            </div>
                            {canAddFee && (
                              <button
                                onClick={() => handleRemoveFee(fee.id, fee.amount, fee.note)}
                                disabled={isPending}
                                title="Remove this fee"
                                className="shrink-0 p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Settlement Box */}
                  <div className="bg-slate-50/30 rounded-xl border border-slate-100 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                        <Coins size={11} className="text-slate-500" /> Final Settlement
                      </h5>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                        isSettled 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {isSettled ? "SETTLED" : "UNPAID DEBT"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase">Frozen Eviction Debt</p>
                        <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                          {currency} {finalPayment?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase">Settled On</p>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">
                          {finalPayment?.paidAt 
                            ? formatSystemDate(new Date(finalPayment.paidAt), "ETHIOPIAN") 
                            : "—"
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seized Property Box */}
                  {seizedProp ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <Package size={11} className="text-slate-500" /> Seized Inventory
                        </h5>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          seizedProp.status === "STORED" ? "bg-red-50 text-red-600 border border-red-100" :
                          seizedProp.status === "RETRIEVED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          seizedProp.status === "SOLD" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          "bg-slate-50 text-slate-600 border border-slate-100"
                        }`}>
                          {seizedProp.status === "STORED" && "IN STORAGE"}
                          {seizedProp.status === "RETRIEVED" && "RELEASED"}
                          {seizedProp.status === "SOLD" && "SOLD AT AUCTION"}
                          {seizedProp.status === "DISPOSED" && "DISPOSED"}
                        </span>
                      </div>

                      <div className="text-xs space-y-2.5">
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[9px] text-slate-400 uppercase mb-1 font-bold">Catalogued Items</p>
                          <p className="font-semibold text-slate-800 text-[11px] leading-relaxed whitespace-pre-line italic">
                            {seizedProp.inventoryList}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 font-semibold text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase">Storage Location</p>
                              <p className="text-slate-800 font-bold">{seizedProp.storageLocation}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <DollarSign size={12} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="text-[8px] text-slate-400 uppercase">Estimated Value</p>
                              <p className="text-slate-800 font-bold">
                                {seizedProp.estimatedValue ? `${currency} ${seizedProp.estimatedValue.toLocaleString()}` : "Not estimated"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Auction Details if Sold */}
                        {seizedProp.status === "SOLD" && (
                          <div className="bg-blue-50/30 rounded-xl border border-blue-100/60 p-3 space-y-2 animate-in fade-in duration-300">
                            <p className="text-[9px] font-black uppercase text-blue-700 tracking-wider flex items-center gap-1">
                              <Gavel size={11} /> Auction Sale Details
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-semibold">
                              <div>
                                <span className="text-slate-400">Sold For:</span>{" "}
                                <span className="text-slate-900 font-bold">
                                  {currency} {seizedProp.saleAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Buyer:</span>{" "}
                                <span className="text-slate-900 font-bold">{seizedProp.buyerName}</span>
                              </div>
                              {seizedProp.soldAt && (
                                <div className="col-span-2 text-[9px] text-slate-400">
                                  Sold on {formatSystemDate(new Date(seizedProp.soldAt), "ETHIOPIAN")}
                                </div>
                              )}
                            </div>

                            {approvedRefund && (
                              <div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between text-[10px] font-bold text-emerald-700">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={10} className="text-emerald-500" /> Surplus Refund Issued
                                </span>
                                <span>{currency} {approvedRefund.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 bg-slate-50/50 rounded-xl border border-slate-100 text-center">
                      <Package size={20} className="text-slate-300 mb-1" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">No property seized</p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-wrap gap-2 justify-between items-center">
                  {/* Add Fee — ADMIN or ACCOUNTANT only */}
                  {canAddFee && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddFee(lease)}
                      className="h-8 rounded-lg border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle size={12} /> Add Fee
                    </Button>
                  )}

                  <div className="flex flex-wrap gap-2 ml-auto">
                    {seizedProp && seizedProp.status === "STORED" && (
                      <>
                        {/* Record Auction Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAuction(lease, seizedProp)}
                          className="h-8 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Gavel size={12} className="text-slate-500" /> Auction Sale
                        </Button>

                        {/* Release Button */}
                        <div className="relative group">
                          <Button
                            size="sm"
                            disabled={!isSettled}
                            onClick={() => handleOpenRelease(lease, seizedProp)}
                            className={`h-8 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                              isSettled
                                ? "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                                : "bg-slate-100 text-slate-400 border border-slate-100 cursor-not-allowed"
                            }`}
                          >
                            <CheckCircle2 size={12} className={isSettled ? "text-emerald-400" : "text-slate-400"} /> Release
                          </Button>
                          {!isSettled && (
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-[9px] font-bold py-1 px-2.5 rounded shadow-lg w-48 text-center leading-normal z-50">
                              Settlement must be paid before releasing inventory.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
          <ShieldAlert size={36} className="text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {activePortalTab === "SEALED" ? "No Sealed Shops Found" : "No Locked-out Tenants Found"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            There are no tenant records matching your search queries or selected filter criteria.
          </p>
        </div>
      )}

      {/* ── ADD FEE DIALOG ─────────────────────────────────────────── */}
      <Dialog open={actionType === "ADD_FEE"} onOpenChange={handleCloseDialogs}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-orange-50 border-b border-orange-100">
            <div className="flex items-center gap-2">
              <PlusCircle size={18} className="text-orange-600" />
              <DialogTitle className="text-base font-bold text-slate-900">Add Fee to Settlement</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
              Adding fee for <span className="font-bold text-slate-800">{feeTenantName}</span>. This will increase the final settlement amount.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddFeeSubmit} className="p-6 space-y-4">
            {/* Fee Type */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Fee Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFeeType("RENTAL")}
                  className={`flex items-center gap-2 h-10 rounded-xl border px-3 text-xs font-semibold transition-all ${
                    feeType === "RENTAL"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <BadgeDollarSign size={13} /> Rental Fee
                </button>
                <button
                  type="button"
                  onClick={() => setFeeType("UTILITY")}
                  className={`flex items-center gap-2 h-10 rounded-xl border px-3 text-xs font-semibold transition-all ${
                    feeType === "UTILITY"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Zap size={13} /> Utility Fee
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Amount ({currency}) *</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 3500.00"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                disabled={isPending}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Note / Reason *</Label>
              <Input
                required
                placeholder={feeType === "RENTAL" ? "e.g. 1 month unpaid rent — Hamle 2016" : "e.g. Electricity bill — Sene 2016"}
                value={feeNote}
                onChange={(e) => setFeeNote(e.target.value)}
                className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                disabled={isPending}
              />
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] font-medium text-amber-800 flex gap-2">
              <Info size={13} className="shrink-0 mt-0.5 text-amber-500" />
              This amount will be added to the tenant's final settlement balance. If already settled, it will be re-opened.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider border-slate-200"
                onClick={handleCloseDialogs}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlusCircle size={13} /> Add Fee</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog forms */}
      
      {/* RELEASE INVENTORY DIALOG */}
      <Dialog open={actionType === "RELEASE"} onOpenChange={handleCloseDialogs}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Release Seized Property</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                You are about to release the seized physical items stored at{" "}
                <span className="font-bold text-slate-950">
                  {selectedProperty?.seizedProperty?.storageLocation}
                </span>{" "}
                back to <span className="font-bold text-slate-950">{selectedProperty?.lease?.tenant?.name}</span>.
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-left text-[11px] font-semibold text-slate-600 mt-3.5">
                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Seized Inventory Details</p>
                <p className="italic">{selectedProperty?.seizedProperty?.inventoryList}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-10 rounded-xl text-xs font-bold uppercase tracking-wider border-slate-200" 
                onClick={handleCloseDialogs}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                disabled={isPending}
                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center"
                onClick={handleReleaseSubmit}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Release"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RECORD AUCTION DIALOG */}
      <Dialog open={actionType === "AUCTION"} onOpenChange={handleCloseDialogs}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900">
              <Gavel size={20} className="text-blue-600" />
              <DialogTitle className="text-base font-bold text-slate-900">Record Auction Sale</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
              Record the liquidation of items seized from Unit {selectedProperty?.lease?.unit?.unitNumber}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAuctionSubmit} className="p-6 space-y-4">
            
            {/* Info Notice Box */}
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4.5 space-y-1.5 text-xs">
              <p className="font-bold text-blue-800 flex items-center gap-1.5 uppercase text-[9px] tracking-wider">
                <Info size={12} /> Debt & Surplus Logic
              </p>
              <p className="text-slate-600 font-medium leading-relaxed text-[11px]">
                If the sale amount covers or exceeds the debt of{" "}
                <span className="font-bold text-slate-900">
                  {currency} {selectedProperty?.lease?.payments?.find((p: any) => p.type === "FINAL_SETTLEMENT")?.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                , the final settlement is automatically marked as **PAID/APPROVED**. Any surplus is automatically generated as an approved surplus **Refund** record for the tenant.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Buyer Name *</Label>
              <Input 
                required
                placeholder="e.g. Abebe Kebede"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Auction Sale Amount ({currency}) *</Label>
              <Input 
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 52000.00"
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
                className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                disabled={isPending}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider border-slate-200"
                onClick={handleCloseDialogs}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EXECUTE LOCKOUT DIALOG */}
      <Dialog open={actionType === "LOCKOUT"} onOpenChange={handleCloseDialogs}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[95vh]">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert size={20} />
              <DialogTitle className="text-lg font-semibold text-slate-900 font-bold">Lockout & Evict Tenant</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Legal eviction and property seizure for <span className="font-bold text-slate-700">{lockoutTenantName}</span>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLockoutSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            
            {/* Calculation Preview Card */}
            <div className="bg-red-50/50 rounded-xl border border-red-100/80 p-4 space-y-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                Eviction Debt Preview
              </h4>
              {previewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-red-500" />
                  <span className="text-xs text-slate-400 font-semibold ml-2">Calculating debt...</span>
                </div>
              ) : previewData ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Rent (Past Full Months):</span>
                    <span className="font-semibold text-slate-900">{currency} {previewData.fullMonthsRentArrears.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {previewData.isLockoutMonthUnpaid && (
                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Pro-rated Rent ({previewData.daysUsed}/{previewData.daysInMonth} days):</span>
                      <span className="font-semibold text-slate-900">{currency} {previewData.proRatedRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Outstanding Penalties:</span>
                    <span className="font-semibold text-slate-900">{currency} {previewData.penaltiesUncollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px bg-red-100 my-1" />
                  <div className="flex justify-between font-bold text-red-700 text-sm">
                    <span>Total Eviction Debt:</span>
                    <span>{currency} {previewData.totalSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic text-center py-2">
                  Enter a lockout date to compute debt.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Lockout Date (Ethiopian) *</Label>
              <div className="flex gap-1">
                <select 
                  value={lockoutDateEth.year} 
                  onChange={e => setLockoutDateEth({...lockoutDateEth, year: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                  disabled={isPending}
                >
                  {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select 
                  value={lockoutDateEth.month} 
                  onChange={e => setLockoutDateEth({...lockoutDateEth, month: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                  disabled={isPending}
                >
                  {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                </select>
                <select 
                  value={lockoutDateEth.day} 
                  onChange={e => setLockoutDateEth({...lockoutDateEth, day: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                  disabled={isPending}
                >
                  {Array.from({length: getDaysInEthiopianMonth(lockoutDateEth.year, lockoutDateEth.month)}).map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                Pro-rated rent for the final active month will be calculated up to this date.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Inventory List (Seized Property) *</Label>
              <textarea
                required
                rows={3}
                placeholder="Catalog all seized physical items (e.g. 1x Acer Laptop, 1x Office Chair...)"
                value={lockoutInventory}
                onChange={(e) => setLockoutInventory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-medium focus:ring-slate-900 outline-none"
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Storage Location *</Label>
                <Input
                  required
                  placeholder="e.g. Warehouse A, Row 3"
                  value={lockoutStorage}
                  onChange={(e) => setLockoutStorage(e.target.value)}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Estimated Value ({currency})</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={lockoutValue}
                  onChange={(e) => setLockoutValue(e.target.value)}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                  disabled={isPending}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg text-xs font-bold uppercase tracking-wider border-slate-200"
                onClick={handleCloseDialogs}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || previewLoading}
                className="h-10 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/15"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Lockout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
