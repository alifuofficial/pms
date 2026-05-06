"use client";

import { useState } from "react";
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
import { UserPlus, Loader2 } from "lucide-react";
import { createUser } from "@/lib/actions/users";
import { toast } from "sonner";

export function AddUserDialog({ 
  defaultRole = "MANAGER",
  trigger,
  title = "Create Account",
  description = "Add a new staff member to the system."
}: { 
  defaultRole?: "ADMIN" | "MANAGER" | "ACCOUNTANT" | "TENANT",
  trigger?: React.ReactNode,
  title?: string,
  description?: string
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    role: defaultRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await createUser(formData);
    setIsLoading(false);
    
    if (result.success) {
      toast.success("User account created successfully.");
      setOpen(false);
      setFormData({ name: "", email: "", phoneNumber: "", role: "MANAGER" });
    } else {
      toast.error(result.error || "Failed to create account.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={
          (trigger as React.ReactElement) || (
            <Button className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 shadow-none">
              <UserPlus className="mr-2 h-4 w-4" /> New Account
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">{description}</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Full Name</Label>
              <Input 
                required
                placeholder="Ex: John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Email Address</Label>
              <Input 
                required
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">Phone Number (Optional)</Label>
              <Input 
                placeholder="Ex: 0911..."
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="rounded-lg border-slate-200 bg-white h-10 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-400">System Role</Label>
              <select 
                className="w-full rounded-lg border border-slate-200 bg-white h-10 px-3 text-sm font-medium outline-none"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              >
                <option value="MANAGER">Manager</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="ADMIN">Administrator</option>
                <option value="TENANT">Tenant</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[10px] text-slate-400 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
              Note: New users will receive a default temporary password: <span className="font-bold text-slate-900">Soreti123!</span>
            </p>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
