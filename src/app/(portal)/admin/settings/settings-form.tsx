"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Save, 
  Globe, 
  Mail, 
  Database, 
  Server, 
  Upload, 
  Loader2,
  Lock,
  Hash,
  Smartphone,
  CreditCard,
  Trash2,
  Plus
} from "lucide-react";
import { updateSystemSettings, addBankAccount, deleteBankAccount, testSmtp, testFtp, testSms } from "@/lib/actions/settings";
import { factoryResetSystem } from "@/lib/actions/system";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SettingsForm({ initialData, initialBankAccounts = [] }: { initialData: any, initialBankAccounts?: any[] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("general");
  const [isUploading, setIsUploading] = useState(false);
  
  // Factory Reset State
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<any[]>(initialBankAccounts);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isTestingFtp, setIsTestingFtp] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const handleTestSmtp = async () => {
    if (!formData.smtpHost || !formData.smtpPort || !formData.smtpUser || !formData.smtpPass) {
      toast.error("Please fill in all SMTP settings before testing");
      return;
    }
    setIsTestingSmtp(true);
    const result = await testSmtp({
      host: formData.smtpHost,
      port: formData.smtpPort,
      user: formData.smtpUser,
      pass: formData.smtpPass,
    });
    setIsTestingSmtp(false);
    if (result.success) {
      toast.success("SMTP connection successful!");
    } else {
      toast.error(`SMTP Error: ${result.error}`);
    }
  };

  const handleTestFtp = async () => {
    if (!formData.ftpHost || !formData.ftpPort || !formData.ftpUser || !formData.ftpPass) {
      toast.error("Please fill in all FTP settings before testing");
      return;
    }
    setIsTestingFtp(true);
    const result = await testFtp({
      host: formData.ftpHost,
      port: formData.ftpPort,
      user: formData.ftpUser,
      pass: formData.ftpPass,
    });
    setIsTestingFtp(false);
    if (result.success) {
      toast.success("FTP connection successful!");
    } else {
      toast.error(`FTP Error: ${result.error}`);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) { toast.error("Enter a phone number to test."); return; }
    if (!formData.smsEthiopiaKey) { toast.error("Enter your API key first."); return; }
    setIsTestingSms(true);
    const result = await testSms(testPhone);
    setIsTestingSms(false);
    if (result.success) {
      toast.success(`Test SMS sent to ${testPhone}!`);
    } else {
      toast.error(`SMS Error: ${(result as any).error}`);
    }
  };

  const handleAddBank = async () => {
    if (!newBank.bankName || !newBank.accountName || !newBank.accountNumber) {
      toast.error("Please fill in all bank details");
      return;
    }
    setIsAddingBank(true);
    const result = await addBankAccount(newBank);
    if (result.success) {
      toast.success("Bank account added");
      setBankAccounts([{ id: Math.random().toString(), ...newBank, createdAt: new Date() }, ...bankAccounts]);
      setNewBank({ bankName: "", accountName: "", accountNumber: "" });
    } else {
      toast.error(result.error);
    }
    setIsAddingBank(false);
  };

  const handleDeleteBank = async (id: string) => {
    const result = await deleteBankAccount(id);
    if (result.success) {
      toast.success("Bank account removed");
      setBankAccounts(bankAccounts.filter(b => b.id !== id));
    } else {
      toast.error(result.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await updateSystemSettings(formData);
    setIsLoading(false);
    
    if (result.success) {
      toast.success("Settings updated.");
    } else {
      toast.error("Failed to save.");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/settings/logo", { method: "POST", body });
      const data = await res.json();
      if (data.url) {
        setFormData({ ...formData, logoUrl: data.url });
        toast.success("Logo updated.");
      }
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFactoryReset = async () => {
    if (resetConfirmation !== "RESET SYSTEM") return;
    
    setIsResetting(true);
    const result = await factoryResetSystem();
    setIsResetting(false);
    
    if (result.success) {
      toast.success("System has been factory reset.");
      setResetConfirmation("");
      // Optionally reload the page to get fresh data
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const navItems = [
    { id: "general", label: "General Settings", icon: Globe },
    { id: "branding", label: "Branding", icon: Building2 },
    { id: "smtp", label: "Email (SMTP)", icon: Mail },
    { id: "ftp", label: "Storage (FTP)", icon: Server },
    { id: "payment", label: "Payment Methods", icon: CreditCard },
    { id: "sms", label: "SMS Ethiopia", icon: Smartphone },
    { id: "late-fee", label: "Late Fees", icon: CreditCard },
    { id: "regional", label: "Regional", icon: Database },
    { id: "danger", label: "Danger Zone", icon: Trash2 },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500 min-h-[600px]">
      {/* Settings Navigation Sidebar */}
      <div className="w-full md:w-64 space-y-1">
        <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Settings Groups</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all",
              activeTab === item.id 
                ? "bg-slate-100 text-slate-900 font-semibold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon size={16} className={cn(activeTab === item.id ? "text-slate-900" : "text-slate-400")} />
            {item.label}
          </button>
        ))}
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-slate-200 bg-white rounded-xl shadow-none overflow-hidden">
            <CardContent className="p-0">
              {activeTab === "general" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">System Information</h2>
                    <p className="text-xs text-slate-500">Global system identity and primary configuration.</p>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">System Name</Label>
                        <Input 
                          value={formData.systemName}
                          onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Organization</Label>
                        <Input 
                          value={formData.organizationName || ""}
                          onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Support Email</Label>
                        <Input 
                          value={formData.supportEmail || ""}
                          onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Primary Currency</Label>
                        <select 
                          value={formData.currency}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none bg-white"
                        >
                          <option value="USD">USD - US Dollar ($)</option>
                          <option value="EUR">EUR - Euro (€)</option>
                          <option value="GBP">GBP - British Pound (£)</option>
                          <option value="ETB">ETB - Ethiopian Birr (Br)</option>
                          <option value="AED">AED - UAE Dirham</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-6">
                    <h2 className="text-base font-semibold text-slate-900">Organization Details</h2>
                    <p className="text-xs text-slate-500">Corporate identity and official contact information.</p>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">TIN Number</Label>
                        <Input 
                          placeholder="Ex: 0012345678"
                          value={formData.tinNumber || ""}
                          onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Official Website</Label>
                        <Input 
                          placeholder="https://example.com"
                          value={formData.website || ""}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Phone Number</Label>
                        <Input 
                          placeholder="+251..."
                          value={formData.phone || ""}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Physical Address</Label>
                        <Input 
                          placeholder="Bole, Addis Ababa"
                          value={formData.address || ""}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {activeTab === "branding" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">Visual Identity</h2>
                    <p className="text-xs text-slate-500">Manage logos and visual assets for the portal.</p>
                  </div>
                  <div className="flex items-center gap-8 pt-4 border-t border-slate-50">
                    <div className="w-24 h-24 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("style");
                          }}
                        />
                      ) : null}
                      {(!formData.logoUrl) && (
                        <Building2 size={32} className="text-slate-200" />
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 h-9 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-semibold">
                          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          Upload New Logo
                        </div>
                        <input id="logo-upload" type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                      </Label>
                      <p className="text-[10px] text-slate-400 font-medium">Recommended: SVG or Transparent PNG (max 2MB).</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "smtp" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">Mail Configuration</h2>
                    <p className="text-xs text-slate-500">SMTP settings for system notifications and alerts.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">SMTP Host</Label>
                        <Input 
                          placeholder="smtp.mailtrap.io"
                          value={formData.smtpHost || ""}
                          onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Port</Label>
                        <Input 
                          type="number"
                          placeholder="587"
                          value={formData.smtpPort || ""}
                          onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Username</Label>
                        <Input 
                          value={formData.smtpUser || ""}
                          onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Password</Label>
                        <Input 
                          type="password"
                          value={formData.smtpPass || ""}
                          onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-start">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestSmtp}
                        disabled={isTestingSmtp}
                        className="h-8 text-[10px] font-bold uppercase tracking-wider border-slate-200"
                      >
                        {isTestingSmtp ? <Loader2 size={12} className="mr-2 animate-spin" /> : <Mail size={12} className="mr-2" />}
                        Test SMTP Connection
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ftp" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">Remote Storage</h2>
                    <p className="text-xs text-slate-500">Configure FTP access for document and receipt storage.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-50">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">FTP Host</Label>
                        <Input 
                          placeholder="ftp.storage.com"
                          value={formData.ftpHost || ""}
                          onChange={(e) => setFormData({ ...formData, ftpHost: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">Port</Label>
                        <Input 
                          type="number"
                          placeholder="21"
                          value={formData.ftpPort || ""}
                          onChange={(e) => setFormData({ ...formData, ftpPort: parseInt(e.target.value) })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">FTP Username</Label>
                        <Input 
                          value={formData.ftpUser || ""}
                          onChange={(e) => setFormData({ ...formData, ftpUser: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase text-slate-400">FTP Password</Label>
                        <Input 
                          type="password"
                          value={formData.ftpPass || ""}
                          onChange={(e) => setFormData({ ...formData, ftpPass: e.target.value })}
                          className="h-10 rounded-lg border-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase text-slate-400">Public Base URL</Label>
                      <Input 
                        placeholder="https://storage.yourdomain.com/uploads/"
                        value={formData.ftpBaseUrl || ""}
                        onChange={(e) => setFormData({ ...formData, ftpBaseUrl: e.target.value })}
                        className="h-10 rounded-lg border-slate-200 text-sm"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">The HTTP(S) URL prefix to access uploaded files publicly.</p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-slate-900">Enable FTP Storage</Label>
                        <p className="text-[10px] text-slate-500 font-medium">When enabled, all receipts and leases will be stored on this server.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={formData.ftpEnabled || false}
                        onChange={(e) => setFormData({ ...formData, ftpEnabled: e.target.checked })}
                        className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </div>

                    <div className="pt-2 flex justify-start">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestFtp}
                        disabled={isTestingFtp}
                        className="h-8 text-[10px] font-bold uppercase tracking-wider border-slate-200"
                      >
                        {isTestingFtp ? <Loader2 size={12} className="mr-2 animate-spin" /> : <Server size={12} className="mr-2" />}
                        Test FTP Connection
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "payment" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">Institutional Bank Accounts</h2>
                    <p className="text-xs text-slate-500">Manage authorized accounts for receiving lease payments.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-50 space-y-6">
                    {/* Add New Bank Form */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                      <h3 className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Register New Account</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold text-slate-500">Bank Name</Label>
                          <Input 
                            placeholder="Ex: Commercial Bank"
                            value={newBank.bankName}
                            onChange={e => setNewBank({...newBank, bankName: e.target.value})}
                            className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold text-slate-500">Account Name</Label>
                          <Input 
                            placeholder="Ex: Nexus PMS LLC"
                            value={newBank.accountName}
                            onChange={e => setNewBank({...newBank, accountName: e.target.value})}
                            className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold text-slate-500">Account Number</Label>
                          <Input 
                            placeholder="1000..."
                            value={newBank.accountNumber}
                            onChange={e => setNewBank({...newBank, accountNumber: e.target.value})}
                            className="h-9 text-xs rounded-lg border-slate-200 bg-white"
                          />
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleAddBank}
                        disabled={isAddingBank}
                        className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                      >
                        {isAddingBank ? <Loader2 size={12} className="mr-1.5 animate-spin" /> : <Plus size={12} className="mr-1.5" />}
                        Add Account
                      </Button>
                    </div>

                    {/* List of Accounts */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Active Accounts ({bankAccounts.length})</h3>
                      {bankAccounts.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
                          <CreditCard className="mx-auto h-6 w-6 text-slate-300 mb-2" />
                          <p className="text-xs font-medium text-slate-500">No bank accounts registered.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {bankAccounts.map((bank) => (
                            <div key={bank.id} className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col justify-between group">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{bank.bankName}</p>
                                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter mt-0.5">{bank.accountName}</p>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteBank(bank.id)}
                                  className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="mt-4 pt-3 border-t border-slate-50">
                                <p className="text-sm font-mono font-semibold text-slate-700 tracking-wider">
                                  {bank.accountNumber}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sms" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">SMS Configuration</h2>
                    <p className="text-xs text-slate-500">Configure SMS Ethiopia for system alerts and tenant notifications.</p>
                  </div>

                  {/* Global Enable/Disable Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-900">Enable SMS Notifications</p>
                      <p className="text-[10px] text-slate-500 font-medium">When disabled, no SMS will be dispatched system-wide.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, smsEnabled: !formData.smsEnabled })}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                        formData.smsEnabled ? "bg-emerald-500" : "bg-slate-200"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        formData.smsEnabled ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>

                  {/* API Key */}
                  <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-50">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase text-slate-400">API Key</Label>
                      <Input 
                        type="password"
                        placeholder="Enter your SMS Ethiopia API Key"
                        value={formData.smsEthiopiaKey || ""}
                        onChange={(e) => setFormData({ ...formData, smsEthiopiaKey: e.target.value })}
                        className="h-10 rounded-lg border-slate-200 text-sm"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">Keep your API key secret. Get your key from the SMS Ethiopia Console.</p>
                    </div>
                  </div>

                  {/* Test SMS */}
                  <div className="pt-2 border-t border-slate-50 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">Send Test SMS</p>
                      <p className="text-xs text-slate-500">Send a test message to verify your API key is working correctly.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="tel"
                          placeholder="09xxxxxxxx or 2519xxxxxxxx"
                          value={testPhone}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            if (raw.startsWith("09")) setTestPhone("251" + raw.slice(1));
                            else if (raw.startsWith("9") && raw.length <= 9) setTestPhone("251" + raw);
                            else setTestPhone(raw);
                          }}
                          className="h-10 rounded-lg border-slate-200 text-sm w-full"
                        />
                        {testPhone.startsWith("251") && (
                          <span className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-500">✓ International</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={handleTestSms}
                        disabled={isTestingSms || !formData.smsEthiopiaKey}
                        className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-none"
                      >
                        {isTestingSms ? <Loader2 size={14} className="animate-spin" /> : "Send Test"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Numbers starting with <span className="font-bold text-slate-600">09</span> are auto-converted to <span className="font-bold text-slate-600">2519</span> format. Results appear in SMS Logs.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "regional" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">Regional Localization</h2>
                    <p className="text-xs text-slate-500">Configure system-wide calendar and localization preferences.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-50 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase text-slate-400">Primary Calendar System</Label>
                      <select 
                        value={formData.calendarType}
                        onChange={(e) => setFormData({ ...formData, calendarType: e.target.value })}
                        className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium outline-none bg-white"
                      >
                        <option value="GREGORIAN">Gregorian (Western)</option>
                        <option value="ETHIOPIAN">Ethiopian (Native)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 font-medium">This will affect how dates are displayed across dashboards and reports.</p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight mb-1">Dual Calendar Preview</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-white rounded border border-slate-100">
                          <p className="text-[9px] font-bold text-blue-600 uppercase mb-0.5">Gregorian</p>
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex-1 p-2 bg-white rounded border border-slate-100">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Ethiopian</p>
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            ሰኞ፣ ሚያዝያ 26፣ 2018
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "late-fee" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">Late Fee Penalties</h2>
                    <p className="text-xs text-slate-500">Configure automated financial penalties for overdue payments.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-50 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-slate-900">Enable Late Fees</Label>
                        <p className="text-[10px] text-slate-500 font-medium">When enabled, penalties will be calculated on public QR pages.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={formData.lateFeeEnabled || false}
                        onChange={(e) => setFormData({ ...formData, lateFeeEnabled: e.target.checked })}
                        className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-4">
                      {/* Tier 1 & Tier 2 side by side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold uppercase text-slate-400">
                            Tier 1 — Late Fee (%)
                          </Label>
                          <div className="relative">
                            <Input 
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={formData.lateFeePercentage || 5}
                              onChange={(e) => setFormData({ ...formData, lateFeePercentage: parseFloat(e.target.value) })}
                              className="h-10 rounded-lg border-slate-200 text-sm pl-8"
                            />
                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Applied on Day 6 – 35 (after grace period)
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-semibold uppercase text-amber-500">
                            Tier 2 — Warning Penalty (%)
                          </Label>
                          <div className="relative">
                            <Input 
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={formData.warningFeePercentage || 10}
                              onChange={(e) => setFormData({ ...formData, warningFeePercentage: parseFloat(e.target.value) })}
                              className="h-10 rounded-lg border-amber-200 bg-amber-50/30 text-sm pl-8 focus:ring-amber-400"
                            />
                            <span className="absolute left-3 top-2.5 text-amber-400 text-sm font-bold">%</span>
                          </div>
                          <p className="text-[10px] text-amber-500 font-medium">
                            Final warning applied from Day 36 onwards
                          </p>
                        </div>
                      </div>

                      {/* Summary card */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Penalty Schedule Preview</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Day 1 – 5 &nbsp;(Grace period)</span>
                            <span className="font-bold text-emerald-600">No penalty</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Day 6 – 35 &nbsp;(Tier 1)</span>
                            <span className="font-bold text-amber-600">{formData.lateFeePercentage || 5}% of rent</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Day 36+ &nbsp;&nbsp;&nbsp;&nbsp;(Tier 2 Warning)</span>
                            <span className="font-bold text-rose-600">{formData.warningFeePercentage || 10}% of rent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "danger" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
                    <p className="text-xs text-slate-500">Irreversible, destructive system operations.</p>
                  </div>
                  <div className="pt-4 border-t border-slate-50 space-y-4">
                    <div className="p-5 border border-red-200 bg-red-50 rounded-xl space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-red-900">Factory Reset System</h3>
                        <p className="text-xs font-medium text-red-700 leading-relaxed">
                          This will completely wipe all tenants, properties, units, leases, payments, audit logs, and system configurations. 
                          Only Admin, Accountant, and Manager accounts will be preserved. This action CANNOT be undone.
                        </p>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-red-200/50">
                        <Label className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Type "RESET SYSTEM" to confirm</Label>
                        <Input 
                          placeholder="RESET SYSTEM"
                          value={resetConfirmation}
                          onChange={(e) => setResetConfirmation(e.target.value)}
                          className="h-10 bg-white border-red-200 focus-visible:ring-red-500 text-sm font-bold placeholder:font-normal placeholder:text-slate-300"
                        />
                      </div>
                      
                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          disabled={isResetting || resetConfirmation !== "RESET SYSTEM"}
                          onClick={handleFactoryReset}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-6 rounded-lg text-xs shadow-none"
                        >
                          {isResetting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Trash2 size={14} className="mr-2" />}
                          Permanently Erase Data
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-9 rounded-lg px-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-none"
              >
                {isLoading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                Save Changes
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
