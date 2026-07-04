"use client";

import { useState, useEffect } from "react";
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
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Loader2, 
  ShieldAlert
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { updateUnit, deleteUnit, vacateUnit, getUnitsByProperty, bulkUpdateUnits } from "@/lib/actions/properties";
import { generateUnitQrSlug } from "@/lib/actions/qr";
import { lockoutLease, getLeaseLockoutPreview, sealLease, unsealLease } from "@/lib/actions/users";
import { getSystemSettings } from "@/lib/actions/settings";
import { getEthiopianYearRange, getEthiopianMonths, getDaysInEthiopianMonth, toEthiopian } from "@/lib/calendar";
import Kenat from "kenat";
import { toast } from "sonner";
import { QrCode, ExternalLink, Download, Copy, Check, LogOut, Link2Off } from "lucide-react";
import QRCode from "react-qr-code";

export function UnitActions({ unit }: { unit: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVacating, setIsVacating] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qrSlug, setQrSlug] = useState(unit.qrSlug || "");
  const [isCopied, setIsCopied] = useState(false);
  const [siblingUnits, setSiblingUnits] = useState<any[]>([]);
  const [isLockingOut, setIsLockingOut] = useState(false);
  const [ethLockout, setEthLockout] = useState(() => {
    const et = toEthiopian(new Date());
    return { year: et.year, month: et.month, day: et.day };
  });
  const [inventoryList, setInventoryList] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [estimatedValue, setEstimatedValue] = useState<number | undefined>(undefined);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [strictLeaseRules, setStrictLeaseRules] = useState(false);
  const [isSealing, setIsSealing] = useState(false);
  const [sealDateEth, setSealDateEth] = useState(() => {
    const et = toEthiopian(new Date());
    return { year: et.year, month: et.month, day: et.day };
  });
  const [sealNote, setSealNote] = useState("");
  const [sealPreviewData, setSealPreviewData] = useState<any>(null);
  const [sealPreviewLoading, setSealPreviewLoading] = useState(false);

  // Sync with prop updates from server revalidation
  useEffect(() => {
    if (unit.qrSlug) setQrSlug(unit.qrSlug);
  }, [unit.qrSlug]);

  useEffect(() => {
    getSystemSettings().then((settings) => {
      setStrictLeaseRules(!!settings?.strictLeaseRules);
    });
  }, []);

  useEffect(() => {
    if (isEditing && unit.propertyId) {
      getUnitsByProperty(unit.propertyId).then((res) => {
        setSiblingUnits(res.filter((u: any) => u.id !== unit.id));
      });
    }
  }, [isEditing, unit.propertyId, unit.id]);

  const copyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/u/${qrSlug}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Link copied to clipboard.");
    }
  };
  
  const [editData, setEditData] = useState({
    unitNumber: unit.unitNumber,
    floor: unit.floor || 0,
    size: unit.size || 0,
    type: unit.type,
    rentAmount: unit.rentAmount,
    status: unit.status,
    penaltyExempt: unit.penaltyExempt || false,
    companyOwned: unit.companyOwned || false,
    hasElectricityMeter: unit.hasElectricityMeter !== false,
    hasWaterMeter: unit.hasWaterMeter !== false,
    mergedIntoId: unit.mergedIntoId || "",
  });

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateUnit(unit.id, {
      ...editData,
      floor: parseInt(editData.floor.toString()),
      size: parseFloat(editData.size.toString()),
      rentAmount: parseFloat(editData.rentAmount.toString()),
    });
    setIsLoading(false);
    if (result.success) {
      toast.success("Unit updated successfully.");
      setIsEditing(false);
    } else {
      toast.error(result.error || "Failed to update unit.");
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteUnit(unit.id);
    setIsLoading(false);
    if (result.success) {
      toast.success("Unit deleted successfully.");
      setIsDeleting(false);
    } else {
      toast.error(result.error || "Failed to delete unit.");
    }
  };
  
  const handleVacate = async () => {
    setIsLoading(true);
    const result = await vacateUnit(unit.id);
    setIsLoading(false);
    if (result.success) {
      toast.success("Unit vacated successfully. It is now available for rent.");
      setIsVacating(false);
    } else {
      toast.error(result.error || "Failed to vacate unit.");
    }
  };

  useEffect(() => {
    const activeLease = unit.leases?.[0];
    if (isLockingOut && activeLease?.id && ethLockout.year && ethLockout.month && ethLockout.day) {
      setPreviewLoading(true);
      try {
        const s = new Kenat(`${ethLockout.year}/${ethLockout.month}/${ethLockout.day}`).getGregorian() as any;
        const lockoutDate = new Date(s.year, s.month - 1, s.day, 12, 0, 0);
        getLeaseLockoutPreview(activeLease.id, lockoutDate)
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
    } else if (!isLockingOut) {
      setInventoryList("");
      setStorageLocation("");
      setEstimatedValue(undefined);
      setPreviewData(null);
      const et = toEthiopian(new Date());
      setEthLockout({ year: et.year, month: et.month, day: et.day });
    }
  }, [isLockingOut, ethLockout, unit.leases]);

  useEffect(() => {
    const activeLease = unit.leases?.[0];
    if (isSealing && activeLease?.id && sealDateEth.year && sealDateEth.month && sealDateEth.day) {
      setSealPreviewLoading(true);
      try {
        const s = new Kenat(`${sealDateEth.year}/${sealDateEth.month}/${sealDateEth.day}`).getGregorian() as any;
        const sealDate = new Date(s.year, s.month - 1, s.day, 12, 0, 0);
        getLeaseLockoutPreview(activeLease.id, sealDate, true)
          .then((res) => {
            if (res.success) {
              setSealPreviewData(res.data);
            } else {
              toast.error(res.error || "Failed to calculate seal preview.");
            }
          })
          .catch((err) => {
            console.error("Seal preview fetch error:", err);
          })
          .finally(() => {
            setSealPreviewLoading(false);
          });
      } catch (err) {
        setSealPreviewLoading(false);
        console.error("Failed to parse date for seal preview:", err);
      }
    } else if (!isSealing) {
      setSealPreviewData(null);
      setSealNote("");
      const et = toEthiopian(new Date());
      setSealDateEth({ year: et.year, month: et.month, day: et.day });
    }
  }, [isSealing, sealDateEth, unit.leases]);

  const handleSealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeLease = unit.leases?.[0];
    if (!activeLease?.id) return;

    setIsLoading(true);
    try {
      const s = new Kenat(`${sealDateEth.year}/${sealDateEth.month}/${sealDateEth.day}`).getGregorian() as any;
      const sealDate = new Date(s.year, s.month - 1, s.day, 12, 0, 0);

      const result = await sealLease(activeLease.id, sealDate, sealNote);
      setIsLoading(false);

      if (result.success) {
        toast.success("Shop sealed successfully.");
        setIsSealing(false);
      } else {
        toast.error(result.error || "Failed to seal shop.");
      }
    } catch (err) {
      setIsLoading(false);
      toast.error("Failed to parse selected seal date.");
      console.error(err);
    }
  };

  const handleLockout = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeLease = unit.leases?.[0];
    if (!activeLease?.id) return;
    if (!inventoryList || !storageLocation) {
      toast.error("Inventory list and storage location are required.");
      return;
    }

    setIsLoading(true);
    try {
      const s = new Kenat(`${ethLockout.year}/${ethLockout.month}/${ethLockout.day}`).getGregorian() as any;
      const lockoutDate = new Date(s.year, s.month - 1, s.day, 12, 0, 0);

      const result = await lockoutLease(
        activeLease.id,
        lockoutDate,
        inventoryList,
        storageLocation,
        estimatedValue
      );
      setIsLoading(false);

      if (result.success) {
        toast.success("Unit lockout completed. Tenant evicted and unit is now available.");
        setIsLockingOut(false);
      } else {
        toast.error(result.error || "Failed to execute unit lockout.");
      }
    } catch (err) {
      setIsLoading(false);
      toast.error("Failed to parse selected lockout date.");
      console.error(err);
    }
  };

  const handleUnmerge = async () => {
    setIsLoading(true);
    const result = await bulkUpdateUnits([unit.id], { mergedIntoId: null });
    setIsLoading(false);
    if (result.success) {
      toast.success("Unit unmerged successfully.");
    } else {
      toast.error(result.error || "Failed to unmerge unit.");
    }
  };

  const handleUnmergeChildren = async () => {
    if (!unit.mergedUnits || unit.mergedUnits.length === 0) return;
    setIsLoading(true);
    const childIds = unit.mergedUnits.map((u: any) => u.id);
    const result = await bulkUpdateUnits(childIds, { mergedIntoId: null });
    setIsLoading(false);
    if (result.success) {
      toast.success("All child units unmerged successfully.");
    } else {
      toast.error(result.error || "Failed to unmerge child units.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50">
            <MoreHorizontal size={14} />
          </Button>
        } />
        <DropdownMenuContent align="end" className="w-40 bg-white border-slate-100 rounded-xl shadow-xl p-1">
          <DropdownMenuItem 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer hover:bg-slate-50"
          >
            <Edit size={12} /> Edit Unit
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsQrOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 rounded-lg cursor-pointer hover:bg-blue-50"
          >
            <QrCode size={12} /> Unit Gateway
          </DropdownMenuItem>
          {unit.mergedIntoId && (
            <DropdownMenuItem 
              onClick={handleUnmerge}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 rounded-lg cursor-pointer hover:bg-amber-50"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Link2Off size={12} />} Unmerge Unit
            </DropdownMenuItem>
          )}
          {unit.mergedUnits && unit.mergedUnits.length > 0 && (
            <DropdownMenuItem 
              onClick={handleUnmergeChildren}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 rounded-lg cursor-pointer hover:bg-amber-50"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Link2Off size={12} />} Unmerge Children
            </DropdownMenuItem>
          )}
          {unit.status === "OCCUPIED" && (
            <>
              <DropdownMenuItem 
                onClick={() => setIsVacating(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 rounded-lg cursor-pointer hover:bg-amber-50"
              >
                <LogOut size={12} /> Vacate / Leave
              </DropdownMenuItem>
              
              {unit.leases?.[0]?.status === "SEALED" ? (
                <DropdownMenuItem 
                  onClick={async () => {
                    setIsLoading(true);
                    const res = await unsealLease(unit.leases[0].id);
                    setIsLoading(false);
                    if (res.success) {
                      toast.success("Shop unsealed successfully.");
                    } else {
                      toast.error(res.error || "Failed to unseal shop.");
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-600 rounded-lg cursor-pointer hover:bg-emerald-50 border-t border-slate-50 mt-0.5"
                >
                  <Check size={12} /> Unseal Shop
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => setIsSealing(true)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-orange-600 rounded-lg cursor-pointer hover:bg-orange-50 border-t border-slate-50 mt-0.5"
                >
                  <ShieldAlert size={12} /> Seal Shop
                </DropdownMenuItem>
              )}

              <DropdownMenuItem 
                onClick={() => setIsLockingOut(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer hover:bg-red-50 border-t border-slate-50 mt-0.5"
              >
                <ShieldAlert size={12} /> Lockout / Evict
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem 
            onClick={() => setIsDeleting(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer hover:bg-red-50"
          >
            <Trash2 size={12} /> Delete Unit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-lg font-semibold text-slate-900">Edit Unit</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">Update details for Unit {unit.unitNumber}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Unit Number</Label>
                <Input 
                  required
                  value={editData.unitNumber}
                  onChange={(e) => setEditData({ ...editData, unitNumber: e.target.value })}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Floor</Label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={editData.floor}
                  onChange={(e) => setEditData({ ...editData, floor: parseInt(e.target.value) })}
                >
                  <option value="-1">Basement</option>
                  <option value="0">Ground</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>
                      {n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`} Floor
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Size (m²)</Label>
                <Input 
                  type="number"
                  value={editData.size}
                  onChange={(e) => setEditData({ ...editData, size: parseFloat(e.target.value) || 0 })}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Type</Label>
                <select 
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={editData.type}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                >
                  <option value="Studio">Studio</option>
                  <option value="1BR">1 Bedroom</option>
                  <option value="2BR">2 Bedrooms</option>
                  <option value="Office">Office</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Monthly Rent</Label>
                <Input 
                  required
                  type="number"
                  value={editData.rentAmount}
                  onChange={(e) => setEditData({ ...editData, rentAmount: parseFloat(e.target.value) || 0 })}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Status</Label>
                <select 
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none disabled:bg-slate-50 disabled:opacity-70"
                  value={editData.companyOwned ? "COMPANY_OWNED" : editData.status}
                  disabled={editData.companyOwned}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                >
                  {editData.companyOwned ? (
                    <option value="COMPANY_OWNED">Company Owned</option>
                  ) : (
                    <>
                      <option value="AVAILABLE">Available</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id={`edit-penaltyExempt-${unit.id}`}
                  checked={editData.penaltyExempt}
                  onChange={(e) => setEditData({ ...editData, penaltyExempt: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <Label htmlFor={`edit-penaltyExempt-${unit.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Exempt from Late Penalty Fees
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id={`edit-companyOwned-${unit.id}`}
                  checked={editData.companyOwned}
                  onChange={(e) => {
                    const isCompanyOwned = e.target.checked;
                    setEditData({ 
                      ...editData, 
                      companyOwned: isCompanyOwned,
                      status: isCompanyOwned ? "COMPANY_OWNED" : (editData.status === "COMPANY_OWNED" ? "AVAILABLE" : editData.status)
                    });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <Label htmlFor={`edit-companyOwned-${unit.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Company-Owned Unit (No rent paid, exclude from reports)
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id={`edit-hasElectricityMeter-${unit.id}`}
                    checked={editData.hasElectricityMeter}
                    onChange={(e) => setEditData({ ...editData, hasElectricityMeter: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <Label htmlFor={`edit-hasElectricityMeter-${unit.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Has Electric Meter
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id={`edit-hasWaterMeter-${unit.id}`}
                    checked={editData.hasWaterMeter}
                    onChange={(e) => setEditData({ ...editData, hasWaterMeter: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <Label htmlFor={`edit-hasWaterMeter-${unit.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Has Water Meter
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Merge into Unit</Label>
              <select 
                className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                value={editData.mergedIntoId || ""}
                onChange={(e) => setEditData({ ...editData, mergedIntoId: e.target.value || null })}
              >
                <option value="">None (Independent Unit)</option>
                {siblingUnits.map(u => (
                  <option key={u.id} value={u.id}>Unit {u.unitNumber} ({u.type})</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                Merging links this unit to a parent. Scan requests will show the parent unit's lease, financials, and details.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Gateway Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl max-h-[95vh] flex flex-col">
           <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <QrCode size={20} />
                 </div>
                 <div>
                    <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">Unit Gateway</DialogTitle>
                    <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest">Digital Status Node for Unit {unit.unitNumber}</DialogDescription>
                 </div>
              </div>
           </DialogHeader>

           <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {!qrSlug ? (
                <div className="text-center py-8 space-y-4">
                   <div className="w-16 h-16 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto text-slate-300">
                      <QrCode size={32} />
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 uppercase">Not Generated</h3>
                      <p className="text-[10px] text-slate-500 font-medium px-6">This unit does not have a public gateway slug yet. Generate one to enable QR access.</p>
                   </div>
                   <Button 
                    disabled={isLoading}
                    onClick={async () => {
                      setIsLoading(true);
                      const res = await generateUnitQrSlug(unit.id);
                      setIsLoading(false);
                      if (res.success && res.slug) {
                        setQrSlug(res.slug);
                        toast.success("Gateway slug generated.");
                      } else {
                        toast.error(res.error || "Failed to generate gateway slug.");
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 h-12 font-black text-xs uppercase tracking-widest transition-all"
                   >
                    {isLoading ? <Loader2 className="animate-spin" /> : "Initialize Gateway"}
                   </Button>
                </div>
              ) : (
                 <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                   <div className="bg-slate-50 p-4 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-slate-200 shadow-inner">
                      {typeof window !== 'undefined' && (
                        <QRCode value={`${window.location.origin}/u/${qrSlug}`} 
                           size={160}
                          level="H"
                          className="rounded-xl overflow-hidden"
                        />
                      )}
                   </div>

                   <div className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Public Access Node</p>
                         <div className="h-px bg-slate-100 flex-1 ml-2" />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gateway Link</p>
                          <p className="text-xs font-bold text-slate-900 break-all bg-white p-3 rounded-xl border border-slate-200">
                             {typeof window !== 'undefined' ? `${window.location.origin}/u/${qrSlug}` : `.../u/${qrSlug}`}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm transition-all"
                              onClick={copyLink}
                            >
                              {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </Button>
                            <a 
                              href={typeof window !== 'undefined' ? `${window.location.origin}/u/${qrSlug}` : '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm transition-all text-blue-500">
                                <ExternalLink size={14} />
                              </Button>
                            </a>
                          </div>
                      </div>
                   </div>

                   <Button 
                    onClick={() => {
                      const url = `/admin/units/print-badge?unitNumber=${unit.unitNumber}&property=${unit.property.name}&slug=${qrSlug}`;
                      window.open(url, '_blank');
                    }}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/10 transition-all flex-shrink-0"
                   >
                      <Download size={16} className="mr-2" /> Print Gateway Badge
                   </Button>
                </div>
              )}
           </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-600">
              <ShieldAlert size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">Confirm Deletion</h3>
              <p className="text-sm text-slate-500">Are you sure you want to delete <span className="font-bold text-slate-900">Unit {unit.unitNumber}</span>? This action is permanent.</p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-10 rounded-lg text-sm font-semibold" 
                onClick={() => setIsDeleting(false)}
              >
                Cancel
              </Button>
              <Button 
                disabled={isLoading}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg"
                onClick={handleDelete}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Unit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vacate Confirmation */}
      <Dialog open={isVacating} onOpenChange={setIsVacating}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-amber-600">
              <LogOut size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Vacate Unit</h3>
              <p className="text-sm text-slate-500 font-medium">Are you sure the tenant is leaving <span className="font-bold text-slate-900">Unit {unit.unitNumber}</span>? This will terminate the active lease and make the unit available.</p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-widest border-slate-200" 
                onClick={() => setIsVacating(false)}
              >
                Cancel
              </Button>
              <Button 
                disabled={isLoading}
                className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-amber-600/20"
                onClick={handleVacate}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Vacate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lockout & Evict Dialog */}
      <Dialog open={isLockingOut} onOpenChange={setIsLockingOut}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[95vh]">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert size={20} />
              <DialogTitle className="text-lg font-semibold text-slate-900">Lockout & Evict Unit</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Legal eviction and property seizure for Unit {unit.unitNumber}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLockout} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            
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
                    <span className="font-semibold text-slate-900">ETB {previewData.fullMonthsRentArrears.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {previewData.isLockoutMonthUnpaid && (
                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Pro-rated Rent ({previewData.daysUsed}/{previewData.daysInMonth} days):</span>
                      <span className="font-semibold text-slate-900">ETB {previewData.proRatedRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Outstanding Penalties:</span>
                    <span className="font-semibold text-slate-900">ETB {previewData.penaltiesUncollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px bg-red-100 my-1" />
                  <div className="flex justify-between font-bold text-red-700 text-sm">
                    <span>Total Eviction Debt:</span>
                    <span>ETB {previewData.totalSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic text-center py-2">
                  Enter a lockout date to compute debt.
                </p>
              )}
            </div>

            {/* Strict rules check */}
            {(() => {
              if (previewData && strictLeaseRules) {
                const totalDebtRent = previewData.fullMonthsRentArrears + previewData.proRatedRent;
                const unpaidMonths = unit.rentAmount > 0 ? totalDebtRent / unit.rentAmount : 0;
                
                if (unpaidMonths < 2) {
                  return (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[11px] font-medium text-amber-800 flex gap-2">
                      <ShieldAlert size={14} className="shrink-0 mt-0.5 text-amber-500" />
                      <div>
                        <p className="font-bold">Strict Lease Rule Warning</p>
                        <p className="mt-0.5">
                          Under strict lease rules, a lockout should only be executed if the tenant has been unpaid for at least 2 months (Current unpaid: {unpaidMonths.toFixed(1)} months). Proceeding will override this recommendation.
                        </p>
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Lockout Date (Ethiopian)</Label>
              <div className="flex gap-1">
                <select 
                  value={ethLockout.year} 
                  onChange={e => setEthLockout({...ethLockout, year: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                >
                  {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select 
                  value={ethLockout.month} 
                  onChange={e => setEthLockout({...ethLockout, month: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                >
                  {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                </select>
                <select 
                  value={ethLockout.day} 
                  onChange={e => setEthLockout({...ethLockout, day: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                >
                  {Array.from({length: getDaysInEthiopianMonth(ethLockout.year, ethLockout.month)}).map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                Pro-rated rent for the final active month will be calculated up to this date.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Inventory List (Seized Property)</Label>
              <textarea
                required
                rows={3}
                placeholder="Catalog all seized physical items (e.g. 1x Acer Laptop, 1x Office Chair...)"
                value={inventoryList}
                onChange={(e) => setInventoryList(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-medium focus:ring-slate-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Storage Location</Label>
                <Input
                  required
                  placeholder="e.g. Warehouse A, Row 3"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Estimated Value (ETB)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={estimatedValue === undefined ? "" : estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg text-xs font-bold uppercase tracking-wider border-slate-200"
                onClick={() => setIsLockingOut(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || previewLoading}
                className="h-10 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-red-600/15"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Lockout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Seal Shop Dialog */}
      <Dialog open={isSealing} onOpenChange={setIsSealing}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[95vh]">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-orange-600">
              <ShieldAlert size={20} />
              <DialogTitle className="text-lg font-semibold text-slate-900 font-bold">Seal Shop</DialogTitle>
            </div>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Temporarily seal Unit {unit.unitNumber} due to unpaid rent.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSealSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            
            {/* Calculation Preview Card */}
            <div className="bg-orange-50/50 rounded-xl border border-orange-100/85 p-4 space-y-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                Outstanding Balance Preview
              </h4>
              {sealPreviewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-orange-500" />
                  <span className="text-xs text-slate-400 font-semibold ml-2">Calculating balance...</span>
                </div>
              ) : sealPreviewData ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Rent Arrears:</span>
                    <span className="font-semibold text-slate-900">ETB {sealPreviewData.fullMonthsRentArrears.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {sealPreviewData.isLockoutMonthUnpaid && (
                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Current Month Rent:</span>
                      <span className="font-semibold text-slate-900">ETB {sealPreviewData.proRatedRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Late Fees / Penalties:</span>
                    <span className="font-semibold text-slate-900">ETB {sealPreviewData.penaltiesUncollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-px border-t border-dashed border-orange-200 my-1" />
                  <div className="flex justify-between font-bold text-orange-800 text-sm">
                    <span>Total Outstanding:</span>
                    <span>ETB {sealPreviewData.totalSettlementAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic text-center py-2">
                  Enter a seal date to compute outstanding balance.
                </p>
              )}
            </div>

            {/* Strict rules check */}
            {(() => {
              const todayEt = toEthiopian(new Date());
              const isDay10OrLater = todayEt.day >= 10;
              
              if (strictLeaseRules && !isDay10OrLater) {
                return (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[11px] font-medium text-red-800 flex gap-2">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <p className="font-bold">Strict Lease Rule Violation</p>
                      <p className="mt-0.5">Shops can only be sealed on or after Day 10 of the Ethiopian month. Today is Day {todayEt.day}.</p>
                    </div>
                  </div>
                );
              }
              
              if (sealPreviewData && sealPreviewData.totalSettlementAmount === 0) {
                return (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] font-medium text-blue-800 flex gap-2">
                    <LogOut size={14} className="shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      <p className="font-bold">Tenant Has Paid</p>
                      <p className="mt-0.5">This tenant has no outstanding balance. Sealing is not recommended.</p>
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Seal Date (Ethiopian)</Label>
              <div className="flex gap-1">
                <select 
                  value={sealDateEth.year} 
                  onChange={e => setSealDateEth({...sealDateEth, year: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                  disabled={isLoading}
                >
                  {getEthiopianYearRange().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select 
                  value={sealDateEth.month} 
                  onChange={e => setSealDateEth({...sealDateEth, month: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                  disabled={isLoading}
                >
                  {getEthiopianMonths().map(m => <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>)}
                </select>
                <select 
                  value={sealDateEth.day} 
                  onChange={e => setSealDateEth({...sealDateEth, day: parseInt(e.target.value)})}
                  className="w-1/3 rounded-lg border border-slate-200 bg-white h-10 px-1 text-xs outline-none"
                  disabled={isLoading}
                >
                  {Array.from({length: getDaysInEthiopianMonth(sealDateEth.year, sealDateEth.month)}).map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Seal Note / Reason</Label>
              <textarea
                rows={2}
                placeholder="e.g. Unpaid Sene rent and utility bills..."
                value={sealNote}
                onChange={(e) => setSealNote(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm font-medium focus:ring-slate-900 outline-none"
                disabled={isLoading}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg text-xs font-bold uppercase tracking-wider border-slate-200"
                onClick={() => setIsSealing(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || sealPreviewLoading || (strictLeaseRules && toEthiopian(new Date()).day < 10) || (sealPreviewData && sealPreviewData.totalSettlementAmount === 0)}
                className="h-10 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-orange-600/15"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Seal Shop"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
