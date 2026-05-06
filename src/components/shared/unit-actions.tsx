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
import { updateUnit, deleteUnit } from "@/lib/actions/properties";
import { toast } from "sonner";

export function UnitActions({ unit }: { unit: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [editData, setEditData] = useState({
    unitNumber: unit.unitNumber,
    floor: unit.floor || 0,
    size: unit.size || 0,
    type: unit.type,
    rentAmount: unit.rentAmount,
    status: unit.status,
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
                <Input 
                  type="number"
                  value={editData.floor}
                  onChange={(e) => setEditData({ ...editData, floor: parseInt(e.target.value) || 0 })}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
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
    </>
  );
}
