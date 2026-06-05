"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, 
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Globe,
  CreditCard,
  Trash2,
  CheckCircle2,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getSettings,
  saveSettings,
  resetDemoData,
  logAction,
  Settings
} from "@/lib/demo-store";

export default function DemoSettings() {
  const [isMounted, setIsMounted] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    currency: "ETB",
    lateFeeEnabled: true,
    lateFeePercentage: 5,
    warningFeePercentage: 10
  });

  // Bank Accounts Simulator State
  const [bankAccounts, setBankAccounts] = useState<Array<{id: string, bankName: string, accountName: string, accountNumber: string}>>([]);
  const [newBank, setNewBank] = useState({ bankName: "", accountName: "", accountNumber: "" });

  useEffect(() => {
    setIsMounted(true);
    setSettings(getSettings());
    
    // Seed some mock sandbox bank accounts
    const savedBanks = localStorage.getItem("demo_banks");
    if (savedBanks) {
      setBankAccounts(JSON.parse(savedBanks));
    } else {
      const defaultBanks = [
        { id: "bank-1", bankName: "Commercial Bank of Ethiopia (CBE)", accountName: "Soreti International Trading", accountNumber: "1000123456789" },
        { id: "bank-2", bankName: "Awash International Bank", accountName: "Soreti International Trading", accountNumber: "0132044859600" }
      ];
      setBankAccounts(defaultBanks);
      localStorage.setItem("demo_banks", JSON.stringify(defaultBanks));
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    toast.success("Sandbox configurations saved!");
    logAction(`Updated simulated system settings: Currency=${settings.currency}, LateFees=${settings.lateFeeEnabled}`);
  };

  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBank.bankName || !newBank.accountName || !newBank.accountNumber) {
      toast.error("Please fill in all bank details.");
      return;
    }
    const created = {
      id: "bank-" + Math.random().toString(36).substring(2, 9),
      ...newBank
    };
    const updated = [...bankAccounts, created];
    setBankAccounts(updated);
    localStorage.setItem("demo_banks", JSON.stringify(updated));
    setNewBank({ bankName: "", accountName: "", accountNumber: "" });
    toast.success("Sandbox bank account added!");
    logAction(`Added simulated bank account: ${created.bankName}`);
  };

  const handleDeleteBank = (id: string) => {
    const updated = bankAccounts.filter(b => b.id !== id);
    setBankAccounts(updated);
    localStorage.setItem("demo_banks", JSON.stringify(updated));
    toast.success("Sandbox bank account deleted.");
    logAction(`Deleted simulated bank account: ${id}`);
  };

  const handleResetSandbox = () => {
    if (confirm("Are you sure you want to reset all sandbox data? This will clear all changes and restore original mock data.")) {
      resetDemoData();
      setSettings(getSettings());
      
      const defaultBanks = [
        { id: "bank-1", bankName: "Commercial Bank of Ethiopia (CBE)", accountName: "Soreti International Trading", accountNumber: "1000123456789" },
        { id: "bank-2", bankName: "Awash International Bank", accountName: "Soreti International Trading", accountNumber: "0132044859600" }
      ];
      setBankAccounts(defaultBanks);
      localStorage.setItem("demo_banks", JSON.stringify(defaultBanks));
      
      toast.success("Sandbox data reset to defaults!");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Banner / Warn */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-start md:items-center">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Demo Sandbox Mode Active</h3>
            <p className="text-xs text-amber-700 font-medium font-sans font-sans">Simulating global billing rules and re-seeding the data engine.</p>
          </div>
        </div>
        <Link href="/admin/settings">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-lg font-medium shadow-none self-start md:self-auto">
            Switch to Live Mode <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">System Configuration (Demo)</h1>
        <p className="text-sm text-slate-500 font-medium font-sans">Manage global branding policies, penalty rules, and mock bank references.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Billing Settings */}
        <div className="md:col-span-2 space-y-6">
          
          <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
            <CardContent className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">Simulated Ledger Rules</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Control currency formatting and automatic late penalty parameters.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Primary Currency</label>
                    <select 
                      value={settings.currency}
                      onChange={e => setSettings({...settings, currency: e.target.value})}
                      className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none bg-white"
                    >
                      <option value="ETB">ETB - Ethiopian Birr (Br)</option>
                      <option value="USD">USD - US Dollar ($)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Late Penalty Rate (%)</label>
                    <Input 
                      type="number"
                      required
                      value={settings.lateFeePercentage}
                      onChange={e => setSettings({...settings, lateFeePercentage: parseFloat(e.target.value) || 0})}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-900 block">Enable Late Fee Penalty</span>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed font-sans">
                      Automatically calculate a one-time late fee percentage on rent amount when a tenant is in arrears.
                    </p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.lateFeeEnabled}
                    onChange={e => setSettings({...settings, lateFeeEnabled: e.target.checked})}
                    className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-5 font-semibold text-xs h-9">
                    Save Ledger Rules
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Bank Accounts Simulator */}
          <Card className="border border-slate-200 bg-white rounded-xl shadow-none">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Mock Bank Accounts</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Add payment collection accounts visible in the simulated checkout flow.</p>
                </div>
              </div>

              {/* Bank Accounts List */}
              <div className="space-y-3 pt-4 border-t border-slate-50">
                {bankAccounts.map(b => (
                  <div key={b.id} className="flex justify-between items-center p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{b.bankName}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">A/C Name: {b.accountName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold font-mono tracking-tight">No: {b.accountNumber}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteBank(b.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}

                {bankAccounts.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">No bank accounts registered in sandbox.</p>
                )}
              </div>

              {/* Add Bank Account Form */}
              <form onSubmit={handleAddBankAccount} className="bg-slate-50/20 p-4 rounded-xl border border-dashed border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Register Sandbox Account</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Bank Name</label>
                    <Input required value={newBank.bankName} onChange={e => setNewBank({...newBank, bankName: e.target.value})} placeholder="e.g. CBE" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Account Name</label>
                    <Input required value={newBank.accountName} onChange={e => setNewBank({...newBank, accountName: e.target.value})} placeholder="e.g. Soreti" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Account Number</label>
                    <Input required value={newBank.accountNumber} onChange={e => setNewBank({...newBank, accountNumber: e.target.value})} placeholder="e.g. 1000..." className="h-8 text-xs" />
                  </div>
                </div>
                <Button type="submit" size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded font-semibold text-xs h-8">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Account
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Danger Zone / System Tools */}
        <div className="space-y-6">
          
          <Card className="border border-red-200 bg-red-50/30 rounded-xl shadow-none">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-950">Sandbox Controls</h3>
                  <p className="text-[10px] text-red-700 font-medium">Revert testing modifications.</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-red-200/50">
                <p className="text-xs text-red-700 font-medium leading-relaxed font-sans">
                  Resetting sandbox will immediately discard all custom tenant leases, payments, and property assets. It will restore the default mock seeds.
                </p>
                <Button 
                  onClick={handleResetSandbox}
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs h-10 shadow-sm"
                >
                  Reset Sandbox Data
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}
