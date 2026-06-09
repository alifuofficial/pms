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
  Menu,
  ShieldAlert,
  Plus,
  Calendar
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { updateUser, deleteUser } from "@/lib/actions/users";
import { toast } from "sonner";
import { AssignUnitDialog } from "./assign-unit-dialog";
import { AssignPropertiesDialog } from "./assign-properties-dialog";
import { ManageLeasesDialog } from "./manage-leases-dialog";
import { UserPlus, Building } from "lucide-react";


export function UserActions({ user, currency = "ETB" }: { user: any, currency?: string }) {

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssigningProperties, setIsAssigningProperties] = useState(false);
  const [isManagingLeases, setIsManagingLeases] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  
  const [editData, setEditData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber || "",
    password: "",
  });


  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateUser(user.id, editData);
    setIsLoading(false);
    if (result.success) {
      toast.success("User profile updated.");
      setEditData(prev => ({ ...prev, password: "" })); // Clear password field
      setIsEditing(false);
    } else {
      toast.error(result.error || "Failed to update.");
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    const result = await deleteUser(user.id);
    setIsLoading(false);
    if (result.success) {
      toast.success("Account deleted.");
      setIsDeleting(false);
    } else {
      toast.error(result.error || "Failed to delete.");
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
        <DropdownMenuContent align="end" className="w-48 bg-white border-slate-100 rounded-xl shadow-xl p-1">
          <DropdownMenuItem 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer hover:bg-slate-50"
          >
            <Edit size={12} /> Edit Account
          </DropdownMenuItem>

           {user.role === "TENANT" && (
            <>
              <DropdownMenuItem 
                onClick={() => setIsAssigning(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 rounded-lg cursor-pointer hover:bg-blue-50"
              >
                <UserPlus size={12} /> Assign New Unit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setIsManagingLeases(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal-600 rounded-lg cursor-pointer hover:bg-teal-50"
              >
                <Calendar size={12} /> Manage Leases
              </DropdownMenuItem>
            </>
          )}

          {(user.role === "MANAGER" || user.role === "ACCOUNTANT") && (
            <DropdownMenuItem 
              onClick={() => setIsAssigningProperties(true)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-50"
            >
              <Building size={12} /> Assign Properties
            </DropdownMenuItem>
          )}

          <DropdownMenuItem 
            onClick={() => setIsDeleting(true)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer hover:bg-red-50"
          >
            <Trash2 size={12} /> Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-lg font-semibold text-slate-900">Edit Account</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">Modify user permissions and details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Full Name</Label>
                <Input 
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Email Address</Label>
                <Input 
                  required
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">Phone Number</Label>
                <Input 
                  value={editData.phoneNumber}
                  onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                  className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">New Password (Leave blank to keep current)</Label>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  value={editData.password}
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase text-slate-400">System Role</Label>
                <select 
                  className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
                >
                  <option value="MANAGER">Manager</option>
                  <option value="ACCOUNTANT">Accountant</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="TENANT">Tenant</option>
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
              <p className="text-sm text-slate-500">Are you sure you want to delete <span className="font-bold text-slate-900">{user.name}</span>? This action is permanent and cannot be undone.</p>
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
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AssignUnitDialog 
        open={isAssigning} 
        onOpenChange={setIsAssigning}
        tenantId={user.id} 
        tenantName={user.name}
        currency={currency}
      />

      <AssignPropertiesDialog
        open={isAssigningProperties}
        onOpenChange={setIsAssigningProperties}
        userId={user.id}
        userName={user.name}
        userRole={user.role}
        initialPropertyIds={[
          ...(user.managedProperties?.map((p: any) => p.id) || []),
          ...(user.accountantProperties?.map((p: any) => p.id) || [])
        ]}
      />

      <ManageLeasesDialog
        open={isManagingLeases}
        onOpenChange={setIsManagingLeases}
        tenantId={user.id}
        tenantName={user.name}
        leases={user.leases || []}
      />
    </>
  );
}

