"use client";

import { useState, useRef } from "react";
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
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Shield,
  QrCode,
  Download
} from "lucide-react";
import { updateSystemSettings, addBankAccount, deleteBankAccount, testSmtp, testFtp, testSms } from "@/lib/actions/settings";
import { factoryResetSystem, granularResetSystem } from "@/lib/actions/system";
import { backfillMissingQrSlugs, verifyQrIntegrity } from "@/lib/actions/qr";
import { exportUnitsCsv, importUnitsCsv, triggerManualBackup } from "@/lib/actions/import-export";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SettingsForm({ 
  initialData, 
  initialBankAccounts = [], 
  qrStats: initialQrStats = { totalUnits: 0, unitsWithQr: 0, unitsWithoutQr: 0 }
}: { 
  initialData: any, 
  initialBankAccounts?: any[],
  qrStats?: { totalUnits: number, unitsWithQr: number, unitsWithoutQr: number }
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("general");
  const [isUploading, setIsUploading] = useState(false);
  
  // QR Code States
  const [qrStats, setQrStats] = useState(initialQrStats);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<any>(null);
  const [isExportingQr, setIsExportingQr] = useState(false);
  const [isImportingQr, setIsImportingQr] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);

  const handleTriggerManualBackup = async () => {
    setIsTriggeringBackup(true);
    const toastId = toast.loading("Processing automated backup (FTP sync & Emailing)...");
    try {
      const result = await triggerManualBackup();
      if (result.success) {
        toast.success(result.message || "Manual backup processed successfully!", { id: toastId, duration: 8000 });
      } else {
        toast.error(result.error || "Backup failed.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.", { id: toastId });
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleBackfillQr = async () => {
    setIsBackfilling(true);
    const toastId = toast.loading("Backfilling missing QR codes...");
    try {
      const res = await backfillMissingQrSlugs();
      if (res.success) {
        const updated = res.updatedCount || 0;
        toast.success(`Success! Backfilled ${updated} units with secure QR codes.`, { id: toastId });
        setQrStats({
          ...qrStats,
          unitsWithQr: qrStats.unitsWithQr + updated,
          unitsWithoutQr: Math.max(0, qrStats.unitsWithoutQr - updated)
        });
        setVerificationReport(null);
      } else {
        toast.error(res.error || "Failed to backfill QR slugs.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.", { id: toastId });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleVerifyQr = async () => {
    setIsVerifying(true);
    const toastId = toast.loading("Verifying QR code integrity...");
    try {
      const res = await verifyQrIntegrity();
      if (res.success && res.report) {
        setVerificationReport(res.report);
        if (res.report.isHealthy) {
          toast.success("Integrity check passed! All QR codes are healthy and secure.", { id: toastId });
        } else {
          toast.warning("Sanity issues found. Check the report below.", { id: toastId });
        }
      } else {
        toast.error(res.error || "Failed to verify QR integrity.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.", { id: toastId });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportQr = async () => {
    setIsExportingQr(true);
    try {
      const result = await exportUnitsCsv();
      if (result.success && result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `unit_qr_backup_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("QR backup exported successfully.");
      } else {
        toast.error(result.error || "Failed to export QR slugs.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred during export.");
    } finally {
      setIsExportingQr(false);
    }
  };

  const handleImportQrFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast.error("Please upload a valid CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvString = event.target?.result as string;
      if (csvString) {
        setIsImportingQr(true);
        const toastId = toast.loading("Restoring units & QR codes from backup...");
        try {
          const result = await importUnitsCsv(csvString);
          if (result.success) {
            toast.success(result.message || "Restore completed successfully!", { id: toastId });
            const verifyRes = await verifyQrIntegrity();
            if (verifyRes.success && verifyRes.report) {
              setQrStats({
                totalUnits: verifyRes.report.totalUnits,
                unitsWithQr: verifyRes.report.securedCount,
                unitsWithoutQr: verifyRes.report.missingCount
              });
              setVerificationReport(verifyRes.report);
            } else {
              window.location.reload();
            }
          } else {
            toast.error(result.error || "Restore failed.", { id: toastId });
          }
        } catch (error) {
          toast.error("An unexpected error occurred during restore.", { id: toastId });
        } finally {
          setIsImportingQr(false);
          if (qrFileInputRef.current) qrFileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the file.");
      if (qrFileInputRef.current) qrFileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };
  
  // Factory Reset State
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    tenants: false,
    unitsProperties: false,
    financials: false,
    settings: false,
    all: false
  });

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<any[]>(initialBankAccounts);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: "", accountName: "", accountNumber: "" });
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isTestingFtp, setIsTestingFtp] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const handleTestSmtp = async () => {
    if (!formData.smtpHost || !formData.smtpUser || !formData.smtpPass) {
      toast.error("Please fill in SMTP Host, Username, and Password before testing");
      return;
    }
    setIsTestingSmtp(true);
    const result = await testSmtp({
      host: formData.smtpHost,
      port: formData.smtpPort || 587,
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
    if (!formData.ftpHost || !formData.ftpUser || !formData.ftpPass) {
      toast.error("Please fill in FTP Host, Username, and Password before testing");
      return;
    }
    setIsTestingFtp(true);
    const result = await testFtp({
      host: formData.ftpHost,
      port: formData.ftpPort || 21,
      user: formData.ftpUser,
      pass: formData.ftpPass,
      baseUrl: formData.ftpBaseUrl,
    });
    setIsTestingFtp(false);
    if (result.success) {
      toast.success("FTP Connection Successful!", {
        description: "A test text file has been uploaded to your FTP server.",
        action: {
          label: "Open Test File",
          onClick: () => window.open((result as any).testFileUrl, "_blank"),
        },
        duration: 10000,
      });
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

  const getRequiredConfirmation = () => {
    if (resetOptions.all || (resetOptions.tenants && resetOptions.unitsProperties && resetOptions.financials && resetOptions.settings)) {
      return "RESET SYSTEM";
    }
    return "CONFIRM GRANULAR RESET";
  };

  const handleFactoryReset = async () => {
    const requiredConfirmation = getRequiredConfirmation();
    if (resetConfirmation !== requiredConfirmation) {
      toast.error(`Confirmation mismatch. Please type exactly "${requiredConfirmation}"`);
      return;
    }
    
    // Ensure at least one reset option is selected
    const selectedCount = Object.values(resetOptions).filter(Boolean).length;
    if (selectedCount === 0) {
      toast.error("Please select at least one system component to reset.");
      return;
    }
    
    setIsResetting(true);
    const toastId = toast.loading("Executing requested reset operation...");
    try {
      const result = await granularResetSystem(resetOptions);
      if (result.success) {
        toast.success("Successfully completed reset operations!", { id: toastId });
        setResetConfirmation("");
        setResetOptions({
          tenants: false,
          unitsProperties: false,
          financials: false,
          settings: false,
          all: false
        });
        window.location.reload();
      } else {
        toast.error(result.error || "Reset failed.", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.", { id: toastId });
    } finally {
      setIsResetting(false);
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
    { id: "qr-security", label: "QR Security & Recovery", icon: QrCode },
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

                  {/* ── Maintenance Mode ─────────────────────────── */}
                  <div className="space-y-1 pt-6">
                    <h2 className="text-base font-semibold text-slate-900">Public Gateway</h2>
                    <p className="text-xs text-slate-500">Control tenant-facing QR pages and public service availability.</p>
                  </div>
                  <div className={cn(
                    "rounded-xl border p-4 space-y-4 transition-colors",
                    formData.maintenanceMode
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-100"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className={cn(
                          "text-sm font-semibold",
                          formData.maintenanceMode ? "text-red-700" : "text-slate-900"
                        )}>
                          Maintenance Mode
                          {formData.maintenanceMode && (
                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-white bg-red-500 px-2 py-0.5 rounded-full">
                              ACTIVE
                            </span>
                          )}
                        </p>
                        <p className={cn(
                          "text-[10px] font-medium",
                          formData.maintenanceMode ? "text-red-500" : "text-slate-500"
                        )}>
                          When enabled, all QR scanned pages will show the maintenance screen instead of unit info.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, maintenanceMode: !formData.maintenanceMode })}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                          formData.maintenanceMode ? "bg-red-500" : "bg-slate-200"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                          formData.maintenanceMode ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold uppercase text-slate-400">Maintenance Message</Label>
                      <textarea
                        rows={3}
                        placeholder="We are currently performing scheduled maintenance. Please check back shortly."
                        value={formData.maintenanceMessage || ""}
                        onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none resize-none text-slate-800 placeholder:text-slate-300"
                      />
                      <p className="text-[10px] text-slate-400 font-medium">This message is shown to tenants when they scan their QR code during maintenance.</p>
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

              {activeTab === "qr-security" && (
                <div className="p-6 space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">QR Security & Failsafe Recovery</h2>
                    <p className="text-xs text-slate-500">Manage permanent physical QR badges, verify integrity, and perform backups/restores.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-50 space-y-6">
                    {/* Live Telemetry Display */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Units</span>
                        <div className="text-xl font-bold text-slate-800">{qrStats.totalUnits}</div>
                      </div>
                      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 space-y-1 text-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center justify-center gap-1">
                          <ShieldCheck size={10} /> Secured
                        </span>
                        <div className="text-xl font-bold text-emerald-700">{qrStats.unitsWithQr}</div>
                      </div>
                      <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 space-y-1 text-center">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center justify-center gap-1">
                          <AlertTriangle size={10} /> Uninitialized
                        </span>
                        <div className="text-xl font-bold text-amber-700">{qrStats.unitsWithoutQr}</div>
                      </div>
                    </div>

                    {/* How It Works Explainer */}
                    <div className="p-4 bg-indigo-50/30 border border-indigo-100/40 rounded-xl space-y-3">
                      <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                        <Shield size={14} className="text-indigo-600" /> Permanent QR Security Model
                      </h3>
                      <div className="text-[11px] leading-relaxed text-indigo-955 font-medium space-y-2">
                        <p>
                          Each physical unit QR badge maps to a **cryptographically unguessable, high-entropy 10-character slug** (e.g. <code className="bg-indigo-100/60 px-1 py-0.5 rounded font-bold">3JES4MPSL4</code>). 
                          This prevents scan-snooping or invoice guessing.
                        </p>
                        <p>
                          **Physical Sticker Permanence**: Since these QR codes are printed on durable physical stickers and pasted on doors, the database guarantees their slugs will **never change**. 
                          Even if the system crashes, is redeployed, or undergoes database resets, uploading your CSV backup will **recreate the parent properties** and map every printed sticker back to its digital unit instantly.
                        </p>
                      </div>
                    </div>

                    {/* Action Hub */}
                    <div className="space-y-3">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security Operations</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          disabled={isVerifying}
                          onClick={handleVerifyQr}
                          className="h-10 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs bg-white shadow-none justify-center"
                        >
                          {isVerifying ? <Loader2 size={14} className="mr-2 animate-spin text-slate-400" /> : <ShieldCheck size={14} className="mr-2 text-emerald-600" />}
                          Verify QR Integrity
                        </Button>
                        <Button
                          type="button"
                          disabled={isBackfilling || qrStats.unitsWithoutQr === 0}
                          onClick={handleBackfillQr}
                          className={cn(
                            "h-10 text-white font-semibold rounded-lg text-xs shadow-none justify-center transition-all",
                            qrStats.unitsWithoutQr > 0
                              ? "bg-slate-900 hover:bg-slate-800 cursor-pointer"
                              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100"
                          )}
                        >
                          {isBackfilling ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Plus size={14} className="mr-2" />}
                          Backfill Missing Slugs
                        </Button>
                      </div>
                    </div>

                    {/* Sanity Integrity Report Panel */}
                    {verificationReport && (
                      <div className={cn(
                        "p-4 rounded-xl border space-y-3 animate-in slide-in-from-top duration-300",
                        verificationReport.isHealthy 
                          ? "bg-emerald-50/30 border-emerald-100/50" 
                          : "bg-amber-50/30 border-amber-100/50"
                      )}>
                        <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                          {verificationReport.isHealthy ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span className="text-emerald-800">System Integrity Healthy</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} className="text-amber-600" />
                              <span className="text-amber-800">System Sanity Discrepancies</span>
                            </>
                          )}
                        </h3>
                        <div className="text-[11px] font-medium leading-relaxed space-y-1.5">
                          <div className="flex justify-between text-slate-600">
                            <span>Secured QR Codes:</span>
                            <span className="font-bold">{verificationReport.securedCount} / {verificationReport.totalUnits}</span>
                          </div>
                          {verificationReport.missingCount > 0 && (
                            <div className="text-rose-700 font-semibold">
                              ⚠️ {verificationReport.missingCount} units are completely missing QR slugs (Unprotected!). Click "Backfill Missing Slugs" to secure them.
                            </div>
                          )}
                          {verificationReport.duplicateCount > 0 && (
                            <div className="text-rose-700 font-semibold space-y-1">
                              <div>❌ Critical duplication found! Slugs mapped to multiple units:</div>
                              {verificationReport.duplicatesList.map((d: any, idx: number) => (
                                <div key={idx} className="pl-3 text-[10px] text-rose-600 font-normal">
                                  Slug <code className="bg-rose-100 px-1 py-0.5 rounded font-bold font-mono">{d.slug}</code> shared by: {d.units.join(", ")}
                                </div>
                              ))}
                            </div>
                          )}
                          {verificationReport.malformedCount > 0 && (
                            <div className="text-amber-700 font-semibold space-y-1">
                              <div>⚠️ Non-standard (legacy or predictable) QR formats detected:</div>
                              {verificationReport.malformedSlugs.map((m: any, idx: number) => (
                                <div key={idx} className="pl-3 text-[10px] text-amber-600 font-normal">
                                  {m.propertyName} - Unit {m.unitNumber} uses: <code className="bg-amber-100 px-1 py-0.5 rounded font-bold font-mono">{m.slug}</code>
                                </div>
                              ))}
                            </div>
                          )}
                          {verificationReport.isHealthy && (
                            <p className="text-emerald-700 font-semibold">
                              All QR codes are unique, secure, and conform exactly to the physical high-entropy standard.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Automated Backups Config */}
                    <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Mail size={16} className="text-slate-800" /> Automated Daily Backups
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Synchronizes a units CSV backup to your FTP storage server and emails a copy daily. Defaults to <code className="bg-slate-100 px-1 py-0.5 rounded font-semibold text-slate-700 font-mono">alifuhaji@gmail.com</code>.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                          <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Backup Recipient Email</Label>
                            <Input 
                              type="email"
                              placeholder="alifuhaji@gmail.com"
                              value={formData.qrBackupEmail || ""}
                              onChange={(e) => setFormData({ ...formData, qrBackupEmail: e.target.value })}
                              className="h-10 rounded-lg border-slate-200 text-sm bg-white"
                            />
                          </div>
                          <div>
                            <Button
                              type="button"
                              disabled={isTriggeringBackup}
                              onClick={handleTriggerManualBackup}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 rounded-lg text-xs font-semibold shadow-none flex justify-center cursor-pointer"
                            >
                              {isTriggeringBackup ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                              Trigger Backup Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Failsafe Backup & Restore Section */}
                    <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <QrCode size={16} className="text-slate-800" /> Manual Backup & Restoration Hub
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Export your units database with their precise printed QR mappings, and restore them instantly onto new/empty server redeployments with single-click zero configuration.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        {/* Export Action */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Save Slugs</p>
                          <Button
                            type="button"
                            disabled={isExportingQr}
                            onClick={handleExportQr}
                            className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 h-10 px-4 rounded-lg text-xs font-semibold shadow-none flex justify-center cursor-pointer"
                          >
                            {isExportingQr ? <Loader2 size={14} className="mr-2 animate-spin text-slate-400" /> : <Download size={14} className="mr-2 text-slate-500" />}
                            Export QR Backup (CSV)
                          </Button>
                        </div>

                        {/* Import Action */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Restore Slugs</p>
                          <input 
                            type="file" 
                            accept=".csv" 
                            ref={qrFileInputRef} 
                            onChange={handleImportQrFile} 
                            className="hidden" 
                          />
                          <Button
                            type="button"
                            disabled={isImportingQr}
                            onClick={() => qrFileInputRef.current?.click()}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 px-4 rounded-lg text-xs font-semibold shadow-none flex justify-center cursor-pointer"
                          >
                            {isImportingQr ? <Loader2 size={14} className="mr-2 animate-spin text-slate-200" /> : <Upload size={14} className="mr-2 text-slate-300" />}
                            Upload & Restore (CSV)
                          </Button>
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
                    <p className="text-xs text-slate-500">Perform selective database wipes or full factory resets. Select only what you wish to clear.</p>
                  </div>
                  <div className="pt-4 border-t border-slate-50 space-y-4">
                    <div className="p-5 border border-red-200 bg-red-50/50 rounded-xl space-y-5">
                      
                      {/* Checkbox Options Grid */}
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Select Database Components to Reset</Label>
                        <div className="grid grid-cols-1 gap-2.5">
                          {/* Tenants */}
                          <label className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-lg cursor-pointer hover:bg-red-50/30 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={resetOptions.all || resetOptions.tenants}
                              disabled={resetOptions.all}
                              onChange={(e) => setResetOptions({ ...resetOptions, tenants: e.target.checked })}
                              className="mt-0.5 rounded border-red-200 text-red-600 focus:ring-red-500 h-4 w-4"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-red-950">Reset Tenant Directory</span>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Deletes all tenants and their active leases, payments, penalties, and history. Retains properties and vacant units.
                              </p>
                            </div>
                          </label>

                          {/* Units & Properties */}
                          <label className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-lg cursor-pointer hover:bg-red-50/30 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={resetOptions.all || resetOptions.unitsProperties}
                              disabled={resetOptions.all}
                              onChange={(e) => setResetOptions({ ...resetOptions, unitsProperties: e.target.checked })}
                              className="mt-0.5 rounded border-red-200 text-red-600 focus:ring-red-500 h-4 w-4"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-red-950">Reset Units & Properties</span>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Wipes all properties, units, leases, and related bills/receipts. Preserves tenant accounts.
                              </p>
                            </div>
                          </label>

                          {/* Financials */}
                          <label className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-lg cursor-pointer hover:bg-red-50/30 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={resetOptions.all || resetOptions.financials}
                              disabled={resetOptions.all}
                              onChange={(e) => setResetOptions({ ...resetOptions, financials: e.target.checked })}
                              className="mt-0.5 rounded border-red-200 text-red-600 focus:ring-red-500 h-4 w-4"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-red-950">Reset Financial Records & Statements</span>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Clears all payments, warning fees, historical penalties, and refunds. Preserves properties, units, tenants, and active leases.
                              </p>
                            </div>
                          </label>

                          {/* Settings */}
                          <label className="flex items-start gap-3 p-3 bg-white border border-red-100 rounded-lg cursor-pointer hover:bg-red-50/30 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={resetOptions.all || resetOptions.settings}
                              disabled={resetOptions.all}
                              onChange={(e) => setResetOptions({ ...resetOptions, settings: e.target.checked })}
                              className="mt-0.5 rounded border-red-200 text-red-600 focus:ring-red-500 h-4 w-4"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-red-950">Reset System Configurations & Bank Channels</span>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Resets organization profile, system settings, late-fee schedule, and deletes all linked bank accounts.
                              </p>
                            </div>
                          </label>

                          {/* Full System Reset */}
                          <label className="flex items-start gap-3 p-3 bg-red-100/50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100/70 transition-all select-none">
                            <input
                              type="checkbox"
                              checked={resetOptions.all}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setResetOptions({
                                  tenants: val,
                                  unitsProperties: val,
                                  financials: val,
                                  settings: val,
                                  all: val
                                });
                              }}
                              className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-600 h-4 w-4"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-red-950">Reset Everything (Whole System Factory Reset)</span>
                              <p className="text-[10px] text-red-800 leading-normal font-medium">
                                Wipes the entire database to factory defaults, preserving only Admin, Accountant, and Manager profiles.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Confirmation input wrapper */}
                      {Object.values(resetOptions).some(Boolean) && (
                        <div className="space-y-2 pt-3 border-t border-red-200/50 animate-in fade-in duration-300">
                          <Label className="text-[10px] font-bold text-red-800 uppercase tracking-wider flex justify-between">
                            <span>To confirm, type exactly:</span>
                            <span className="font-extrabold font-mono text-red-600 bg-red-100/80 px-1.5 py-0.5 rounded">
                              {getRequiredConfirmation()}
                            </span>
                          </Label>
                          <Input 
                            placeholder={getRequiredConfirmation()}
                            value={resetConfirmation}
                            onChange={(e) => setResetConfirmation(e.target.value)}
                            className="h-10 bg-white border-red-200 focus-visible:ring-red-500 text-sm font-bold placeholder:font-normal placeholder:text-slate-300"
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          disabled={
                            isResetting || 
                            !Object.values(resetOptions).some(Boolean) || 
                            resetConfirmation !== getRequiredConfirmation()
                          }
                          onClick={handleFactoryReset}
                          className={cn(
                            "text-white font-bold h-10 px-6 rounded-lg text-xs shadow-none cursor-pointer transition-all flex justify-center",
                            Object.values(resetOptions).some(Boolean) && resetConfirmation === getRequiredConfirmation()
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-100"
                          )}
                        >
                          {isResetting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Trash2 size={14} className="mr-2" />}
                          Execute Reset Operations
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            {activeTab !== "qr-security" && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-9 rounded-lg px-6 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-none cursor-pointer"
                >
                  {isLoading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                  Save Changes
                </Button>
              </div>
            )}
          </Card>
        </form>
      </div>
    </div>
  );
}
