"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react";
import { requestOtp, verifyOtpAndResetPassword } from "@/lib/actions/auth";
import { toast } from "sonner";

export function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await requestOtp(email);
    setIsLoading(false);
    if (result.success) {
      toast.success("Verification code sent to your phone.");
      setStep(2);
    } else {
      toast.error(result.error || "Failed to send code.");
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    const result = await verifyOtpAndResetPassword({ email, code, password });
    setIsLoading(false);
    if (result.success) {
      toast.success("Password reset successful. You can now log in.");
      setOpen(false);
      setStep(1);
      resetForm();
    } else {
      toast.error(result.error || "Reset failed.");
    }
  };

  const resetForm = () => {
    setEmail("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) resetForm(); }}>
      <DialogTrigger render={
        <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">Forgot password?</button>
      } />
      <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
             <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                <ShieldCheck size={16} />
             </div>
             <DialogTitle className="text-lg font-bold text-slate-900">Security Verification</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-slate-500">
            {step === 1 && "Recover access by verifying your identity."}
            {step === 2 && `Enter the 6-digit code sent to your phone.`}
            {step === 3 && "Create a strong new password for your account."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Work Email Address</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    required
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
                  />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-100 transition-all">
                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Send OTP Code"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5 text-center py-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">Verification Code</Label>
                <div className="flex justify-center gap-2">
                   <Input 
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-48 h-12 text-center text-xl font-black tracking-[0.5em] rounded-xl border-slate-200 bg-white"
                   />
                </div>
              </div>
              <Button onClick={() => setStep(3)} type="button" className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-100 transition-all">
                Verify Code <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button onClick={() => setStep(1)} type="button" className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest pt-2 transition-colors">Back to Email</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      required
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Confirm New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                      required
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all">
                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Reset & Save Password"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
