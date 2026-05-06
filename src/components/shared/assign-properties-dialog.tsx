"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, Search } from "lucide-react";
import { getProperties, assignUserToProperties } from "@/lib/actions/properties";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface AssignPropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string;
  initialPropertyIds: string[];
}

export function AssignPropertiesDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  userRole,
  initialPropertyIds 
}: AssignPropertiesDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialPropertyIds);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getProperties().then(data => {
        setProperties(data);
        setIsLoading(false);
      });
      setSelectedIds(initialPropertyIds);
    }
  }, [open, initialPropertyIds]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await assignUserToProperties(userId, userRole, selectedIds);
    setIsSaving(false);
    if (result.success) {
      toast.success(`Properties assigned to ${userName}`);
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to assign properties");
    }
  };

  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-900">Assign Properties</DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">
            Select properties for <span className="text-slate-900 font-bold">{userName}</span> to manage.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search properties..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-lg border-slate-200 text-sm"
            />
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-10">
                <Building2 className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No properties found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProperties.map((p) => (
                  <div 
                    key={p.id} 
                    className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                    onClick={() => handleToggle(p.id)}
                  >
                    <Checkbox 
                      id={p.id} 
                      checked={selectedIds.includes(p.id)}
                      onCheckedChange={() => handleToggle(p.id)}
                      className="rounded border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={p.id}
                        className="text-sm font-semibold text-slate-900 cursor-pointer block truncate"
                      >
                        {p.name}
                      </Label>
                      <p className="text-[10px] text-slate-400 font-medium">ID: {p.id.slice(-6).toUpperCase()}</p>
                    </div>
                    <Building2 className="h-4 w-4 text-slate-300" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 pt-2 bg-slate-50/50 border-t border-slate-100">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 h-10 rounded-lg"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-8 rounded-lg text-xs font-semibold shadow-none"
          >
            {isSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : "Save Assignments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
