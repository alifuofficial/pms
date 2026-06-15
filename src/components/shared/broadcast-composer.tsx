"use client";

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Loader2, 
  Search, 
  Filter, 
  Smartphone, 
  Variable, 
  Send, 
  AlertTriangle, 
  Check, 
  Megaphone, 
  Users, 
  UserCheck, 
  X,
  CreditCard,
  MessageSquareText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sendBroadcastSMS } from "@/lib/actions/broadcast";

interface TenantRecipient {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  hasActiveLease: boolean;
  arrearsCount: number;
  arrearsBalance: number;
  unpaidPenaltyTotal: number;
  totalBalance: number;
  overdue: boolean;
  penaltyExempt: boolean;
}

interface PropertyOption {
  id: string;
  name: string;
}

const BROADCAST_VARIABLES = [
  { key: "{{tenantName}}", label: "Tenant Name", desc: "Full name of tenant" },
  { key: "{{unitNumber}}", label: "Unit Number", desc: "Assigned unit number" },
  { key: "{{propertyName}}", label: "Property Name", desc: "Building or property name" },
  { key: "{{arrearsCount}}", label: "Overdue Months", desc: "Count of unpaid months" },
  { key: "{{arrearsBalance}}", label: "Arrears Rent", desc: "Total unpaid rent amount" },
  { key: "{{unpaidPenaltyTotal}}", label: "Unpaid Penalty", desc: "Total unpaid penalty amount" },
  { key: "{{totalBalance}}", label: "Total Balance Due", desc: "Rent arrears + penalty" },
];

export function BroadcastComposer({
  tenants,
  properties,
}: {
  tenants: TenantRecipient[];
  properties: PropertyOption[];
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deliveryReport, setDeliveryReport] = useState<{
    sent: number;
    failed: number;
    skipped: number;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Filtered Recipients
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.phoneNumber.includes(searchQuery) ||
        tenant.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProperty =
        selectedProperty === "all" || tenant.propertyId === selectedProperty;

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "overdue" && tenant.overdue) ||
        (selectedStatus === "overdue-rent" && tenant.arrearsCount > 0) ||
        (selectedStatus === "unpaid-penalty-only" && tenant.arrearsCount === 0 && tenant.unpaidPenaltyTotal > 0) ||
        (selectedStatus === "paid" && !tenant.overdue) ||
        (selectedStatus === "penalty-exempt" && tenant.penaltyExempt);

      return matchesSearch && matchesProperty && matchesStatus;
    });
  }, [tenants, searchQuery, selectedProperty, selectedStatus]);

  // 2. Select All Checkbox Handler for filtered list
  const isAllFilteredSelected = useMemo(() => {
    if (filteredTenants.length === 0) return false;
    return filteredTenants.every((t) => selectedUsers.includes(t.id));
  }, [filteredTenants, selectedUsers]);

  const handleSelectAllToggle = () => {
    if (isAllFilteredSelected) {
      // Remove all currently filtered tenants from selection
      const filteredIds = filteredTenants.map((t) => t.id);
      setSelectedUsers(selectedUsers.filter((id) => !filteredIds.includes(id)));
    } else {
      // Add all currently filtered tenants to selection (avoiding duplicates)
      const newIds = filteredTenants.map((t) => t.id);
      const uniqueIds = Array.from(new Set([...selectedUsers, ...newIds]));
      setSelectedUsers(uniqueIds);
    }
  };

  const handleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter((uid) => uid !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  // Quick action filters
  const handleQuickFilter = (propertyId: string, status: string) => {
    setSelectedProperty(propertyId);
    setSelectedStatus(status);
    // Auto select all matching
    setTimeout(() => {
      const matchIds = tenants
        .filter((t) => {
          const matchProp = propertyId === "all" || t.propertyId === propertyId;
          let matchStat = false;
          if (status === "all") matchStat = true;
          else if (status === "overdue") matchStat = t.overdue;
          else if (status === "overdue-rent") matchStat = t.arrearsCount > 0;
          else if (status === "unpaid-penalty-only") matchStat = t.arrearsCount === 0 && t.unpaidPenaltyTotal > 0;
          else if (status === "paid") matchStat = !t.overdue;
          else if (status === "penalty-exempt") matchStat = t.penaltyExempt;
          return matchProp && matchStat;
        })
        .map((t) => t.id);
      setSelectedUsers(matchIds);
      toast.success(`Selected all ${matchIds.length} tenants matching quick filter.`);
    }, 100);
  };

  // 3. cursor-aware insert placeholder tag
  const insertVariable = (variableKey: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    const newContent =
      messageTemplate.substring(0, start) +
      variableKey +
      messageTemplate.substring(end);
    
    setMessageTemplate(newContent);

    // Focus and restore cursor position after React re-render
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = start + variableKey.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // 4. Character / credit tracking metrics
  const charCount = messageTemplate.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;
  const totalSMSCost = selectedUsers.length * smsSegments;

  // 5. Live mockup preview resolver
  const sampleTenant = useMemo(() => {
    // Try to get first selected user
    if (selectedUsers.length > 0) {
      return tenants.find((t) => t.id === selectedUsers[0]);
    }
    // Fallback to first filtered tenant
    if (filteredTenants.length > 0) {
      return filteredTenants[0];
    }
    // Final mock fallback
    return {
      name: "Solomon Abebe",
      unitNumber: "B-03",
      propertyName: "Soreti Tower A",
      arrearsCount: 2,
      arrearsBalance: 8400,
      unpaidPenaltyTotal: 420,
      totalBalance: 8820,
    } as any;
  }, [selectedUsers, filteredTenants, tenants]);

  const resolvedPreviewMessage = useMemo(() => {
    if (!messageTemplate) return "Compose your message using the text area below. Placeholders will automatically resolve here.";
    
    const count = sampleTenant?.arrearsCount || 0;
    const rentVal = sampleTenant?.arrearsBalance || 0;
    const penaltyVal = sampleTenant?.unpaidPenaltyTotal || 0;
    const totalVal = sampleTenant?.totalBalance || 0;

    return messageTemplate
      .replace(/{{tenantName}}/g, sampleTenant?.name || "Tenant")
      .replace(/{{unitNumber}}/g, sampleTenant?.unitNumber || "N/A")
      .replace(/{{propertyName}}/g, sampleTenant?.propertyName || "No Active Lease")
      .replace(/{{arrearsCount}}/g, count.toString())
      .replace(/{{arrearsBalance}}/g, rentVal.toLocaleString())
      .replace(/{{unpaidPenaltyTotal}}/g, penaltyVal.toLocaleString())
      .replace(/{{totalBalance}}/g, totalVal.toLocaleString());
  }, [messageTemplate, sampleTenant]);

  // 6. Execute broadcast dispatch
  const handleExecuteBroadcast = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one tenant to receive the broadcast.");
      return;
    }
    if (!messageTemplate || messageTemplate.trim() === "") {
      toast.error("Please write a message content.");
      return;
    }

    setIsSending(true);
    setShowConfirmModal(false);

    try {
      const res = await sendBroadcastSMS(selectedUsers, messageTemplate);
      if (res.success) {
        setDeliveryReport({
          sent: res.sent || 0,
          failed: res.failed || 0,
          skipped: res.skipped || 0,
        });
        toast.success(`Broadcast completed successfully!`);
      } else {
        toast.error(res.error || "An error occurred during broadcasting.");
      }
    } catch (error) {
      toast.error("Broadcast failed due to an unexpected connection error.");
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setDeliveryReport(null);
    setSelectedUsers([]);
    setMessageTemplate("");
  };

  return (
    <div className="space-y-8">
      {/* Overview/Header Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Custom Notification Broadcast</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Select dynamic filters, check specific recipient tenants, and draft bespoke notifications with real-time tag rendering.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter("all", "overdue")}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 hover:bg-red-100/50 rounded-lg transition-colors"
          >
            All Overdue Tenants
          </button>
          {properties.slice(0, 2).map(p => (
            <button
              key={p.id}
              onClick={() => handleQuickFilter(p.id, "all")}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors"
            >
              All in {p.name.split(" ")[0]}
            </button>
          ))}
          {selectedUsers.length > 0 && (
            <button
              onClick={() => setSelectedUsers([])}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
            >
              Clear Selection ({selectedUsers.length})
            </button>
          )}
        </div>
      </div>

      {deliveryReport ? (
        /* ── Delivery Report View ──────────────────────── */
        <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-3xl animate-in zoom-in-95 duration-300 max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Check size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Broadcast Dispatched</h3>
            <p className="text-xs text-slate-500 font-medium">The system has successfully completed processing the broadcast queue.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivered</p>
              <p className="text-2xl font-black text-emerald-600">{deliveryReport.sent}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Failed</p>
              <p className="text-2xl font-black text-red-500">{deliveryReport.failed}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skipped</p>
              <p className="text-2xl font-black text-amber-500">{deliveryReport.skipped}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-4 rounded-2xl text-[10px] text-slate-500 leading-relaxed font-medium space-y-2">
            <p className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={12} className="text-indigo-500" /> Delivery Status Log Summary
            </p>
            <p>
              Successfully sent messages have been queued in SMS Ethiopia and logged inside the <span className="font-black underline text-slate-800">SMS Logs</span> tab for active gateway confirmation. Failed deliveries reflect network failures or server disruptions. Skipped numbers represent tenants without numbers or with globally disabled triggers.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={handleReset} className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold px-6">
              New Broadcast Campaign
            </Button>
          </div>
        </div>
      ) : (
        /* ── Composer Dashboard Grid ────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ──── LEFT PANEL: Recipients Grid (7 cols) ──── */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Filter controls */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Search size={10} /> Search Tenant
                </Label>
                <Input
                  placeholder="Name, unit, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Filter size={10} /> Property Filter
                </Label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg text-xs h-9 px-3 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Filter size={10} /> Payment Arrears
                </Label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg text-xs h-9 px-3 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                >
                  <option value="all">All Tenants</option>
                  <option value="overdue">Overdue (Owes Rent or Penalty)</option>
                  <option value="overdue-rent">Rent Overdue (Owes Rent)</option>
                  <option value="unpaid-penalty-only">Paid Rent Fully but Owes Penalties</option>
                  <option value="paid">Up-to-Date (No Arrears or Penalties)</option>
                  <option value="penalty-exempt">Late Penalty Exempt Only</option>
                </select>
              </div>
            </div>

            {/* Recipients Checklist Grid */}
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-none">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 z-10">
                    <tr>
                      <th className="py-3 px-5 text-center w-12">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={handleSelectAllToggle}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3">Resident Info</th>
                      <th className="py-3 px-3">Unit & Property</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-4 text-right">Account Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <Users size={32} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-sm text-slate-400 font-medium">No tenants match the current filters.</p>
                          <p className="text-[10px] text-slate-300 mt-1">Try expanding search query or selecting other properties.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((tenant) => {
                        const isSelected = selectedUsers.includes(tenant.id);
                        return (
                          <tr
                            key={tenant.id}
                            onClick={() => handleSelectUser(tenant.id)}
                            className={cn(
                              "hover:bg-slate-50/50 transition-colors cursor-pointer select-none",
                              isSelected ? "bg-indigo-50/20" : ""
                            )}
                          >
                            <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectUser(tenant.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <p className="text-xs font-bold text-slate-900">{tenant.name}</p>
                              <p className="text-[9px] text-slate-400 font-medium">{tenant.email || "No email"}</p>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-slate-700">Unit {tenant.unitNumber}</p>
                                {tenant.penaltyExempt && (
                                  <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-200/50 px-1.5 py-0.5 rounded uppercase tracking-tighter">Exempt</span>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium truncate max-w-[130px]" title={tenant.propertyName}>
                                {tenant.propertyName}
                              </p>
                            </td>
                            <td className="py-3 px-3">
                              <p className="text-xs font-semibold text-slate-800 font-mono">
                                {tenant.phoneNumber ? tenant.phoneNumber : <span className="text-[9px] text-red-400 font-semibold bg-red-50 border border-red-100 rounded px-1">MISSING PHONE</span>}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {tenant.overdue ? (
                                <span className="inline-flex flex-col text-right">
                                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                    Overdue: Birr {tenant.totalBalance.toLocaleString()}
                                  </span>
                                  {tenant.arrearsCount > 0 && (
                                    <span className="text-[8px] text-red-400 font-medium pt-0.5">
                                      {tenant.arrearsCount} overdue month(s)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                  Up to Date
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Selection Summary strip */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <UserCheck size={14} className="text-indigo-500" />
                  Selected <span className="font-black text-slate-900">{selectedUsers.length}</span> of{" "}
                  <span className="font-black text-slate-900">{filteredTenants.length}</span> matching tenants.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      const allFilteredIds = filteredTenants.map((t) => t.id);
                      const combined = Array.from(new Set([...selectedUsers, ...allFilteredIds]));
                      setSelectedUsers(combined);
                    }}
                    className="h-7 text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:bg-indigo-50 px-3 rounded-lg"
                  >
                    Select All Matching
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedUsers([])}
                    className="h-7 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 px-3 rounded-lg"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

            </div>
          </div>

          {/* ──── RIGHT PANEL: Compose & Send (5 cols) ──── */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* dynamic resolved tag chips */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-600">
                  <Variable size={16} />
                  <h4 className="text-xs font-black uppercase tracking-wider">SMS Placeholders</h4>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  Click a placeholder to insert it into your message at the cursor position. The system will substitute actual values during dispatch.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {BROADCAST_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="inline-flex items-center px-2 py-1 text-[10px] font-mono font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 border border-indigo-100 rounded-lg transition-colors group cursor-pointer"
                    title={v.desc}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer Input Area */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-slate-800">Message Content</Label>
                  <span
                    className={cn(
                      "text-[9px] font-black font-mono px-2 py-0.5 rounded-full border transition-all",
                      charCount > 160
                        ? "bg-amber-50 text-amber-600 border-amber-100"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    )}
                  >
                    {charCount} Chars • {smsSegments} Segment(s)
                  </span>
                </div>
                <Textarea
                  ref={textareaRef}
                  placeholder="Ex: Dear {{tenantName}}, this is to remind you that unit {{unitNumber}} at {{propertyName}} has an outstanding arrears balance of Birr {{arrearsBalance}}. Please settle at your earliest convenience."
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="bg-white min-h-[140px] font-mono text-xs leading-relaxed border-slate-200 rounded-xl resize-y focus-visible:ring-slate-900"
                />
              </div>

              {/* Character Metrics Summary */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 text-center">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                    <Users size={10} /> Recipients
                  </p>
                  <p className="text-lg font-black text-slate-800">{selectedUsers.length}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                    <CreditCard size={10} /> Total SMS Costs
                  </p>
                  <p className="text-lg font-black text-indigo-600">{totalSMSCost} <span className="text-[9px] text-slate-400 font-bold uppercase">Credits</span></p>
                </div>
              </div>
            </div>

            {/* Premium Resolved Live Preview */}
            <div className="bg-slate-900 border border-slate-900 rounded-[2rem] p-6 text-white relative shadow-xl overflow-hidden space-y-4">
              
              {/* iOS-like mock header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs border border-white/5 uppercase">
                    {sampleTenant?.name?.[0] || "T"}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none">{sampleTenant?.name || "Mock Tenant"}</p>
                    <p className="text-[8px] text-slate-400 font-medium pt-0.5">SMS Preview • Unit {sampleTenant?.unitNumber || "N/A"}</p>
                  </div>
                </div>
                <span className="text-[8px] uppercase font-black bg-indigo-600 text-white border border-indigo-500 px-2 py-0.5 rounded-full tracking-wider">
                  Live Preview
                </span>
              </div>

              {/* Chat speech bubble mockup */}
              <div className="space-y-1 max-w-[85%] ml-auto">
                <div className="bg-indigo-600 text-white p-3.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed font-sans shadow-md break-words whitespace-pre-wrap">
                  {resolvedPreviewMessage}
                </div>
                <p className="text-[8px] text-right text-slate-400 font-medium pr-1">Delivered • SMS Ethiopia</p>
              </div>

              {/* Action submission trigger */}
              <div className="pt-2 border-t border-white/10 flex justify-end">
                <Button
                  disabled={selectedUsers.length === 0 || !messageTemplate || isSending}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full bg-white hover:bg-slate-100 text-slate-950 hover:text-slate-900 h-10 font-bold text-xs rounded-xl shadow transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-950" />
                      Dispatching Broadcast Queue...
                    </>
                  ) : (
                    <>
                      <Send className="w-4.5 h-4.5 mr-2 text-indigo-600" />
                      Send Broadcast to {selectedUsers.length} Tenant(s)
                    </>
                  )}
                </Button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Confirmation warning modal dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-500 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Confirm SMS Broadcast</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  You are about to send a custom SMS broadcast. This action will deliver SMS messages directly to real active phone numbers.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold text-slate-600 space-y-2">
              <div className="flex justify-between items-center">
                <span>Selected Recipients:</span>
                <span className="font-black text-slate-900">{selectedUsers.length} tenants</span>
              </div>
              <div className="flex justify-between items-center">
                <span>SMS Segments per Tenant:</span>
                <span className="font-black text-slate-900">{smsSegments} segment(s)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Delivery Cost:</span>
                <span className="font-black text-indigo-600">{totalSMSCost} credits</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border-slate-200 text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteBroadcast}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-4"
              >
                Confirm & Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
