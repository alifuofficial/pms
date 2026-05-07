"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSmsTemplate, deleteSmsTemplate, updateSmsTemplate } from "@/lib/actions/templates";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, Save, X, Smartphone, Variable, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

const SYSTEM_VARIABLES = [
  { key: "{{tenant_name}}", label: "Tenant Name" },
  { key: "{{property_name}}", label: "Property Name" },
  { key: "{{unit_number}}", label: "Unit Number" },
  { key: "{{amount}}", label: "Amount" },
  { key: "{{due_date}}", label: "Due Date" },
  { key: "{{lease_end_date}}", label: "Lease End Date" },
  { key: "{{company_name}}", label: "Company Name" },
  { key: "{{code}}", label: "Verification Code" },
];

export function TemplateManager({ initialTemplates }: { initialTemplates: any[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setContent("");
    setIsCreating(false);
    setEditingId(null);
  };

  const startEdit = (template: any) => {
    setName(template.name);
    setDescription(template.description || "");
    setContent(template.content);
    setEditingId(template.id);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!name || !content) {
      toast.error("Name and Content are required.");
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        const res = await updateSmsTemplate(editingId, { name, description, content });
        if (res.success) {
          toast.success("Template updated successfully");
          setTemplates(templates.map(t => t.id === editingId ? res.data : t));
          resetForm();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await createSmsTemplate({ name, description, content });
        if (res.success) {
          toast.success("Template created successfully");
          setTemplates([res.data, ...templates]);
          resetForm();
        } else {
          toast.error(res.error);
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    setIsLoading(true);
    const res = await deleteSmsTemplate(id);
    if (res.success) {
      toast.success("Template deleted");
      setTemplates(templates.filter(t => t.id !== id));
    } else {
      toast.error(res.error);
    }
    setIsLoading(false);
  };

  const insertVariable = (variableKey: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    const newContent = content.substring(0, start) + variableKey + content.substring(end);
    setContent(newContent);
    
    // Focus and restore cursor position after React re-render
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = start + variableKey.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // 1 SMS part = 160 characters standard. SMS Ethiopia handles multi-part.
  const charCount = content.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Message Templates</h2>
          <p className="text-xs text-slate-500">Configure standard communications for automated or manual dispatch.</p>
        </div>
        {!isCreating && (
          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-base font-semibold text-slate-900">
              {editingId ? "Edit Template" : "Create New Template"}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm} className="h-8 w-8 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Template Name</Label>
                  <Input 
                    placeholder="Ex: Monthly Rent Reminder"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Description (Optional)</Label>
                  <Input 
                    placeholder="Internal reference note"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700">Message Content</Label>
                  <span className={cn(
                    "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full",
                    charCount > 160 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
                  )}>
                    {charCount} chars • {smsSegments} segment(s)
                  </span>
                </div>
                <Textarea 
                  ref={textareaRef}
                  placeholder="Dear {{tenant_name}}, your rent of {{amount}} is due on..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="bg-white min-h-[160px] font-mono text-sm leading-relaxed resize-y"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200/60 mt-6">
                <Button variant="outline" onClick={resetForm} disabled={isLoading}>Cancel</Button>
                <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Template
                </Button>
              </div>
            </div>

            {/* Variables Sidebar */}
            <div className="space-y-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Variable className="w-4 h-4" />
                  <h4 className="text-sm font-semibold">System Variables</h4>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Click a variable to insert it at your cursor position. These will be automatically replaced when sending.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {SYSTEM_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="flex items-center justify-between text-left px-3 py-2 text-xs border border-slate-100 rounded-md hover:bg-indigo-50 hover:border-indigo-100 hover:text-indigo-700 transition-colors group"
                  >
                    <span className="font-medium">{v.label}</span>
                    <code className="text-[10px] text-slate-400 group-hover:text-indigo-500 font-mono bg-slate-50 group-hover:bg-indigo-100/50 px-1.5 py-0.5 rounded">
                      {v.key}
                    </code>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md transition-all duration-200 flex flex-col h-full">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                   <h3 className="font-semibold text-slate-900 text-sm leading-tight">{template.name}</h3>
                   {template.slug && <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">System</span>}
                </div>
                {template.description && (
                   <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{template.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={async () => {
                    const res = await updateSmsTemplate(template.id, { enabled: !template.enabled });
                    if (res.success) setTemplates(templates.map(t => t.id === template.id ? res.data : t));
                  }}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    template.enabled ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-50"
                  )}
                  title={template.enabled ? "Disable" : "Enable"}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => startEdit(template)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                {!template.slug && (
                  <button onClick={() => handleDelete(template.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className={cn(
              "rounded-lg p-3 mt-auto relative overflow-hidden transition-opacity duration-300",
              template.enabled ? "bg-slate-50" : "bg-slate-50 opacity-40 grayscale"
            )}>
              <div className="absolute top-2 right-2 text-slate-200">
                <Smartphone className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-xs text-slate-700 font-mono leading-relaxed line-clamp-4 relative z-10 whitespace-pre-wrap">
                {template.content}
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", template.enabled ? "bg-emerald-500" : "bg-slate-300")} />
                <span>{template.enabled ? "Active" : "Disabled"}</span>
              </div>
              <span>{Math.ceil(template.content.length / 160)} segment(s)</span>
            </div>
          </div>
        ))}

        {templates.length === 0 && !isCreating && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <MessageSquareText className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">No templates found</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">Create your first SMS template to start automating your communications with tenants.</p>
            <Button onClick={() => setIsCreating(true)} variant="outline" className="h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-2" />
              Create Template
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
