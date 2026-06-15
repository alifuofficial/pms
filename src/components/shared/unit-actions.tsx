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
import { updateUnit, deleteUnit, vacateUnit, getUnitsByProperty } from "@/lib/actions/properties";
import { generateUnitQrSlug } from "@/lib/actions/qr";
import { toast } from "sonner";
import { QrCode, ExternalLink, Download, Copy, Check, LogOut } from "lucide-react";
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

  // Sync with prop updates from server revalidation
  useEffect(() => {
    if (unit.qrSlug) setQrSlug(unit.qrSlug);
  }, [unit.qrSlug]);

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
          {unit.status === "OCCUPIED" && (
            <DropdownMenuItem 
              onClick={() => setIsVacating(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 rounded-lg cursor-pointer hover:bg-amber-50"
            >
              <LogOut size={12} /> Vacate / Leave
            </DropdownMenuItem>
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
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
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
                  onChange={(e) => setEditData({ ...editData, companyOwned: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <Label htmlFor={`edit-companyOwned-${unit.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Company-Owned Unit (No rent paid, exclude from reports)
                </Label>
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
    </>
  );
}
