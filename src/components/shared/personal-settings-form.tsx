"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ShieldCheck, 
  Calendar, 
  Save, 
  Loader2, 
  KeyRound,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { updateUserProfile } from "@/lib/actions/users";

interface PersonalSettingsFormProps {
  initialData: {
    name: string | null;
    email: string | null;
    calendarType: string;
  };
}

export function PersonalSettingsForm({ initialData }: PersonalSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    calendarType: initialData.calendarType || "GREGORIAN",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    setIsLoading(true);
    const result = await updateUserProfile({
      password: formData.password || undefined,
      calendarType: formData.calendarType,
    });
    setIsLoading(false);

    if (result.success) {
      toast.success("Profile updated successfully.");
      setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
      // Force reload to clear Next.js client router cache and reflect calendar globally
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to update profile.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-slate-200 shadow-none rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/10">
              <ShieldCheck size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Security</CardTitle>
              <CardDescription className="text-xs font-medium">Update your access credentials.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters" 
                  className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-xl"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Confirm Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat new password" 
                  className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-xl"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-none rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/10">
              <Calendar size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Preferences</CardTitle>
              <CardDescription className="text-xs font-medium">Customize how data is displayed for you.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">Default Calendar System</Label>
            <Select 
              value={formData.calendarType} 
              onValueChange={(value) => setFormData({ ...formData, calendarType: value || "GREGORIAN" })}
            >
              <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="GREGORIAN" className="text-sm font-medium">Gregorian (International)</SelectItem>
                <SelectItem value="ETHIOPIAN" className="text-sm font-medium">Ethiopian (Local)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400 font-medium">Changing this will affect how dates are formatted across your dashboard and reports.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button 
          disabled={isLoading}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl h-11 px-8 shadow-lg shadow-slate-900/10"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : (
            <>
              <Save size={18} className="mr-2" /> Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
