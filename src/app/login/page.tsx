"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Building2, Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ForgotPasswordDialog } from "@/components/shared/forgot-password-dialog";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid work email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Authentication failed. Please check your credentials.");
      } else {
        toast.success("Authentication successful. Redirecting to your workspace...");
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex font-sans antialiased bg-background">
      {/* Left Panel: Branding & Context */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:24px_24px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -top-12 -left-12 w-72 h-72 bg-blue-400 rounded-full blur-3xl opacity-20" />
        
        <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="flex items-center space-x-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <Building2 size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Soreti PMS</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Centralized<br />Property Operations
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            Institutional property management for Soreti International Trading. Secure portal for assets, tenants, and financial operations.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
            <div className="flex items-center space-x-2 mb-2 text-blue-200">
              <ShieldCheck size={18} />
              <span className="font-semibold text-sm">Enterprise Auth</span>
            </div>
            <p className="text-xs text-blue-300/80">JWT sessions & HTTP-only cookies</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
            <div className="flex items-center space-x-2 mb-2 text-blue-200">
              <Users size={18} />
              <span className="font-semibold text-sm">Role Detection</span>
            </div>
            <p className="text-xs text-blue-300/80">Auto-routed by server assignment</p>
          </div>
        </div>

        <div className="relative z-10 text-[10px] text-blue-300/60 mt-8 flex flex-col gap-1 uppercase tracking-widest font-medium">
          <div>[Soreti International Trading] • v0.1</div>
          <div className="text-[9px] lowercase opacity-50">Developed by <a href="https://t.me/dmalifu" target="_blank" className="hover:text-white underline">@dmalifu</a> [AlifXperience]</div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="lg:text-left text-center space-y-2">
            <div className="lg:hidden flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
                <Building2 size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">Soreti PMS</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 font-medium">Enter your credentials to access your dashboard.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-slate-700 font-semibold">Work Email</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          placeholder="name@company.com"
                          className="pl-10 h-11 bg-white border-slate-200 rounded-lg transition-all focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-slate-700 font-semibold">Password</FormLabel>
                      <ForgotPasswordDialog />
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10 h-11 bg-white border-slate-200 rounded-lg transition-all focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2 py-1">
                <Checkbox id="rememberMe" className="border-slate-300 text-blue-600 data-[state=checked]:bg-blue-600 rounded-sm" />
                <label htmlFor="rememberMe" className="text-sm text-slate-600 font-medium cursor-pointer select-none">
                  Keep me signed in on this device
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/30 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </Form>


          <div className="text-center pt-4">
            <p className="text-xs text-slate-500 font-medium">
              Access restricted to authorized personnel. <br className="sm:hidden" />
              Need credentials? <button className="text-blue-600 hover:underline font-bold">Contact IT Support</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
