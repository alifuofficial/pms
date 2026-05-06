"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreVertical, Edit, Trash2, Building2, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { updateProperty, deleteProperty, getManagers, getAccountants } from "@/lib/actions/properties";
import { toast } from "sonner";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export function PropertyActions({ property }: { property: any }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [accountants, setAccountants] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: property.name,
    address: property.address,
    type: property.type,
    managerId: property.managerId,
    accountantId: property.accountantId || "",
  });

  useEffect(() => {
    if (isEditDialogOpen) {
      getManagers().then(setManagers);
      getAccountants().then(setAccountants);
    }
  }, [isEditDialogOpen]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateProperty(property.id, formData);
    setIsLoading(false);
    
    if (result.success) {
      toast.success("Property updated.");
      setIsEditDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to update.");
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteProperty(property.id);
    setIsLoading(false);
    
    if (result.success) {
      toast.success("Property deleted.");
      setIsDeleteDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to delete.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger 
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
              <MoreVertical size={16} />
            </Button>
          } 
        />
        <DropdownMenuContent align="end" className="w-40 p-1 bg-white rounded-lg shadow-lg border-slate-200">
          <DropdownMenuItem 
            onClick={() => setIsEditDialogOpen(true)}
            className="flex items-center gap-2 p-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <Edit size={14} /> Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-2 p-2 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
          >
            <Trash2 size={14} /> Delete Property
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-lg font-semibold text-slate-900">Edit Property</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">Update the core details of this asset.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Property Name</Label>
                <Input 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Address</Label>
                <Input 
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="rounded-lg border-slate-200 h-10 text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase text-slate-400">Type</Label>
                  <select 
                    className="w-full rounded-lg border border-slate-200 h-10 px-3 text-sm font-medium outline-none bg-white"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="RESIDENTIAL">Residential</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold uppercase text-slate-400">Manager</Label>
                  <select 
                    className="w-full rounded-lg border border-slate-200 h-10 px-3 text-sm font-medium outline-none bg-white"
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  >
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Accountant</Label>
                <select 
                  className="w-full rounded-lg border border-slate-200 h-10 px-3 text-sm font-medium outline-none bg-white"
                  value={formData.accountantId}
                  onChange={(e) => setFormData({ ...formData, accountantId: e.target.value })}
                >
                  <option value="">No Accountant Assigned</option>
                  {accountants.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isLoading} className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[360px] bg-white rounded-2xl p-6 border-none shadow-2xl text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Delete Property</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Confirm deletion of <span className="text-slate-900 font-semibold">{property.name}</span>. This action is irreversible.
              </p>
            </div>
            <div className="flex flex-col w-full gap-2">
              <Button 
                onClick={handleDelete}
                disabled={isLoading}
                className="h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Delete Permanently"}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setIsDeleteDialogOpen(false)}
                className="h-9 text-slate-500 font-semibold text-xs hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
