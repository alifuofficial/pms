"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Kenat from "kenat";
import { 
  Users, 
  Plus, 
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Mail,
  Phone,
  Home,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  getProperties, 
  getUnits, 
  saveUnits, 
  getTenants,
  saveTenants,
  getLeases,
  saveLeases,
  getPayments,
  savePayments,
  getSettings, 
  logAction, 
  calculateArrearsForLease,
  calculateDaysLeftForLease,
  Property, 
  Unit,
  Tenant,
  Lease,
  Payment
} from "@/lib/demo-store";
import { 
  formatSystemDate, 
  getEthiopianMonths, 
  getEthiopianYearRange, 
  getDaysInEthiopianMonth, 
  toEthiopian 
} from "@/lib/calendar";

export default function DemoTenants() {
  const [isMounted, setIsMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currency, setCurrency] = useState("ETB");

  // Dialog states
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Selected tenant/lease for editing
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  // New Tenant Form state
  const [newTenant, setNewTenant] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    propertyId: "",
    unitId: "",
    advanceBalance: "0",
    startYear: 2018,
    startMonth: 1,
    startDay: 1,
    endYear: 2019,
    endMonth: 1,
    endDay: 1
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    advanceBalance: "0",
    startYear: 2018,
    startMonth: 1,
    startDay: 1,
    endYear: 2019,
    endMonth: 1,
    endDay: 1
  });

  useEffect(() => {
    setIsMounted(true);
    refreshData();
  }, []);

  const refreshData = () => {
    setProperties(getProperties());
    setUnits(getUnits());
    setTenants(getTenants());
    setLeases(getLeases());
    setPayments(getPayments());
    setCurrency(getSettings().currency);
  };

  const handleRegisterTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.unitId) {
      toast.error("Please select a unit.");
      return;
    }

    // Convert Ethiopian dates to Gregorian Date objects
    const startKenat = new Kenat({ year: newTenant.startYear, month: newTenant.startMonth, day: newTenant.startDay });
    const endKenat = new Kenat({ year: newTenant.endYear, month: newTenant.endMonth, day: newTenant.endDay });
    
    const s = startKenat.getGregorian();
    const eGreg = endKenat.getGregorian();
    const startDate = new Date(Date.UTC(s.year, s.month - 1, s.day, 12, 0, 0));
    const endDate = new Date(Date.UTC(eGreg.year, eGreg.month - 1, eGreg.day, 12, 0, 0));

    const tenantId = "tenant-" + Math.random().toString(36).substring(2, 9);
    const leaseId = "lease-" + Math.random().toString(36).substring(2, 9);

    const createdTenant: Tenant = {
      id: tenantId,
      name: newTenant.name,
      email: newTenant.email || `${newTenant.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phoneNumber: newTenant.phoneNumber || "+251900000000"
    };

    const createdLease: Lease = {
      id: leaseId,
      unitId: newTenant.unitId,
      tenantId: tenantId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "ACTIVE",
      advanceBalance: parseFloat(newTenant.advanceBalance) || 0
    };

    // Update unit status to OCCUPIED
    const updatedUnits = getUnits().map(u => {
      if (u.id === newTenant.unitId) return { ...u, status: "OCCUPIED" as const };
      return u;
    });

    const updatedTenants = [...getTenants(), createdTenant];
    const updatedLeases = [...getLeases(), createdLease];

    saveTenants(updatedTenants);
    saveLeases(updatedLeases);
    saveUnits(updatedUnits);

    logAction(`Registered simulated tenant ${createdTenant.name} and occupied Unit ${newTenant.unitId}`);
    toast.success("Sandbox tenant registered!");
    setRegisterDialogOpen(false);
    
    // Reset form
    const todayEt = new Kenat(new Date()).getEthiopian();
    setNewTenant({
      name: "",
      email: "",
      phoneNumber: "",
      propertyId: "",
      unitId: "",
      advanceBalance: "0",
      startYear: todayEt.year,
      startMonth: todayEt.month,
      startDay: todayEt.day,
      endYear: todayEt.year + 1,
      endMonth: todayEt.month,
      endDay: todayEt.day
    });

    refreshData();
  };

  const handleOpenEdit = (tenant: Tenant, lease: Lease) => {
    setSelectedTenant(tenant);
    setSelectedLease(lease);

    const startEt = toEthiopian(new Date(lease.startDate));
    const endEt = toEthiopian(new Date(lease.endDate));

    setEditForm({
      name: tenant.name,
      email: tenant.email,
      phoneNumber: tenant.phoneNumber,
      advanceBalance: lease.advanceBalance.toString(),
      startYear: startEt.year,
      startMonth: startEt.month,
      startDay: startEt.day,
      endYear: endEt.year,
      endMonth: endEt.month,
      endDay: endEt.day
    });
    setEditDialogOpen(true);
  };

  const handleUpdateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !selectedLease) return;

    const startKenat = new Kenat({ year: editForm.startYear, month: editForm.startMonth, day: editForm.startDay });
    const endKenat = new Kenat({ year: editForm.endYear, month: editForm.endMonth, day: editForm.endDay });
    
    const s = startKenat.getGregorian();
    const eGreg = endKenat.getGregorian();
    const startDate = new Date(Date.UTC(s.year, s.month - 1, s.day, 12, 0, 0));
    const endDate = new Date(Date.UTC(eGreg.year, eGreg.month - 1, eGreg.day, 12, 0, 0));

    const updatedTenants = tenants.map(t => {
      if (t.id === selectedTenant.id) {
        return {
          ...t,
          name: editForm.name,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber
        };
      }
      return t;
    });

    const updatedLeases = leases.map(l => {
      if (l.id === selectedLease.id) {
        return {
          ...l,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          advanceBalance: parseFloat(editForm.advanceBalance) || 0
        };
      }
      return l;
    });

    saveTenants(updatedTenants);
    saveLeases(updatedLeases);

    logAction(`Updated simulated tenant ${editForm.name} lease and balance details`);
    toast.success("Sandbox tenant updated!");
    setEditDialogOpen(false);
    refreshData();
  };

  const handleTerminateLease = (leaseId: string, unitId: string) => {
    const updatedLeases = leases.filter(l => l.id !== leaseId);
    const updatedUnits = units.map(u => {
      if (u.id === unitId) return { ...u, status: "VACANT" as const };
      return u;
    });

    saveLeases(updatedLeases);
    saveUnits(updatedUnits);

    logAction(`Terminated simulated lease ${leaseId} for Unit ${unitId}`);
    toast.success("Sandbox lease terminated!");
    refreshData();
  };

  const handleDeleteTenant = (tenantId: string) => {
    // Find active leases for this tenant
    const tenantLeases = leases.filter(l => l.tenantId === tenantId);
    
    // Set all units occupied by this tenant back to vacant
    const unitIdsToVacate = tenantLeases.map(l => l.unitId);
    const updatedUnits = units.map(u => {
      if (unitIdsToVacate.includes(u.id)) {
        return { ...u, status: "VACANT" as const };
      }
      return u;
    });

    const updatedTenants = tenants.filter(t => t.id !== tenantId);
    const updatedLeases = leases.filter(l => l.tenantId !== tenantId);

    saveTenants(updatedTenants);
    saveLeases(updatedLeases);
    saveUnits(updatedUnits);

    logAction(`Deleted simulated tenant ${tenantId}`);
    toast.success("Sandbox tenant deleted!");
    refreshData();
  };

  if (!isMounted) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Filter vacant units
  const vacantUnits = units.filter(u => u.status === "VACANT");

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Banner / Warn */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-3 items-start md:items-center">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 md:mt-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Demo Sandbox Mode Active</h3>
            <p className="text-xs text-amber-700 font-medium font-sans">Simulating custom tenant lists, advance balances, and lease configurations.</p>
          </div>
        </div>
        <Link href="/admin/tenants">
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-9 rounded-lg font-medium shadow-none self-start md:self-auto">
            Switch to Live Mode <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tenant Directory (Demo)</h1>
          <p className="text-sm text-slate-500 font-medium font-sans">Manage simulated active residents and modify lease terms.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Register Tenant Dialog */}
          <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
            <DialogTrigger render={<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 font-medium shadow-none" />} >
              <Plus className="mr-2 h-4 w-4" /> Register Tenant
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleRegisterTenant}>
                <DialogHeader>
                  <DialogTitle>Register Sandbox Tenant</DialogTitle>
                  <DialogDescription>Creates a simulated tenant and assigns them to a vacant unit.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Full Name</label>
                      <Input required value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} placeholder="Abebe Balcha" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                      <Input required value={newTenant.phoneNumber} onChange={e => setNewTenant({...newTenant, phoneNumber: e.target.value})} placeholder="+251911..." />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Email (Optional)</label>
                    <Input type="email" value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} placeholder="abebe@example.com" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Property</label>
                      <Select value={newTenant.propertyId} onValueChange={val => setNewTenant({...newTenant, propertyId: val || "", unitId: ""})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Unit Assignment</label>
                      <Select 
                        disabled={!newTenant.propertyId} 
                        value={newTenant.unitId} 
                        onValueChange={val => setNewTenant({...newTenant, unitId: val || ""})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={newTenant.propertyId ? "Select unit" : "Choose property first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {vacantUnits.filter(u => u.propertyId === newTenant.propertyId).map(u => (
                            <SelectItem key={u.id} value={u.id}>Unit {u.unitNumber} ({u.rentAmount.toLocaleString()} {currency})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Initial Advance Balance ({currency})</label>
                    <Input type="number" value={newTenant.advanceBalance} onChange={e => setNewTenant({...newTenant, advanceBalance: e.target.value})} placeholder="0" />
                  </div>

                  {/* Lease Period (Ethiopian) */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lease Duration (Ethiopian Calendar)</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Start Date</label>
                        <div className="flex gap-2">
                          <Select value={newTenant.startYear.toString()} onValueChange={val => setNewTenant({...newTenant, startYear: parseInt(val || "2018")})}>
                            <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                            <SelectContent>{getEthiopianYearRange().map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={newTenant.startMonth.toString()} onValueChange={val => setNewTenant({...newTenant, startMonth: parseInt(val || "1")})}>
                            <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                            <SelectContent>{getEthiopianMonths().map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name.split(" ")[0]}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={newTenant.startDay.toString()} onValueChange={val => setNewTenant({...newTenant, startDay: parseInt(val || "1")})}>
                            <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                            <SelectContent>{Array.from({length: getDaysInEthiopianMonth(newTenant.startYear, newTenant.startMonth)}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">End Date</label>
                        <div className="flex gap-2">
                          <Select value={newTenant.endYear.toString()} onValueChange={val => setNewTenant({...newTenant, endYear: parseInt(val || "2019")})}>
                            <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                            <SelectContent>{getEthiopianYearRange().map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={newTenant.endMonth.toString()} onValueChange={val => setNewTenant({...newTenant, endMonth: parseInt(val || "1")})}>
                            <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                            <SelectContent>{getEthiopianMonths().map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name.split(" ")[0]}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={newTenant.endDay.toString()} onValueChange={val => setNewTenant({...newTenant, endDay: parseInt(val || "1")})}>
                            <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                            <SelectContent>{Array.from({length: getDaysInEthiopianMonth(newTenant.endYear, newTenant.endMonth)}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Register Tenant</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tenants Table */}
      <Card className="border border-slate-200 shadow-none bg-white rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-5">Resident Info</TableHead>
                <TableHead>Assigned Unit</TableHead>
                <TableHead>Lease Period</TableHead>
                <TableHead>Billing State</TableHead>
                <TableHead>Status / Days Left</TableHead>
                <TableHead className="text-right px-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(tenant => {
                const lease = leases.find(l => l.tenantId === tenant.id);
                const unit = lease ? units.find(u => u.id === lease.unitId) : null;
                const prop = unit ? properties.find(p => p.id === unit.propertyId) : null;

                let arrearsCount = 0;
                let daysLeft = { days: 0, text: "No lease", expired: true };

                if (lease) {
                  const arrears = calculateArrearsForLease(lease, payments);
                  arrearsCount = arrears.length;
                  daysLeft = calculateDaysLeftForLease(lease, payments, units, getSettings());
                }

                return (
                  <TableRow key={tenant.id} className="hover:bg-slate-50/50">
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-100 uppercase">
                          {tenant.name?.[0] || "T"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{tenant.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Mail size={10} /> {tenant.email}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Phone size={10} /> {tenant.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {unit ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Home size={12} className="text-blue-500 shrink-0" />
                            <p className="text-xs font-semibold text-slate-700">Unit {unit.unitNumber}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">{prop?.name}</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase">No Active Lease</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lease ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400 shrink-0" />
                            <p className="text-xs font-semibold text-slate-700">
                              {formatSystemDate(new Date(lease.startDate), "ETHIOPIAN")}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Ends {formatSystemDate(new Date(lease.endDate), "ETHIOPIAN")}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lease ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                            <DollarSign size={11} className="text-slate-400" />
                            <span>{lease.advanceBalance.toLocaleString()} {currency}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">Advance Balance</p>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lease ? (
                        <div className="space-y-1">
                          <Badge className={cn("shadow-none font-bold uppercase text-[9px] px-2 py-0.5 rounded", 
                            daysLeft.expired 
                              ? "bg-red-50 text-red-700 border border-red-200" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          )}>
                            {daysLeft.text}
                          </Badge>
                          {arrearsCount > 0 && (
                            <p className="text-[9px] text-red-600 font-bold uppercase block mt-0.5">
                              {arrearsCount} Months Arrears
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-300 uppercase">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-900">
                            <MoreHorizontal size={14} />
                          </Button>
                        } />
                        <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-100 rounded-xl shadow-lg p-1">
                          {lease && (
                            <DropdownMenuItem 
                              onClick={() => handleOpenEdit(tenant, lease)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg cursor-pointer hover:bg-slate-50"
                            >
                              <Edit size={12} /> Edit Lease & Balance
                            </DropdownMenuItem>
                          )}
                          {lease && (
                            <DropdownMenuItem 
                              onClick={() => handleTerminateLease(lease.id, lease.unitId)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-600 rounded-lg cursor-pointer hover:bg-amber-50"
                            >
                              <AlertTriangle size={12} /> Terminate Lease
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTenant(tenant.id)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 rounded-lg cursor-pointer hover:bg-red-50"
                          >
                            <Trash2 size={12} /> Delete Tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-8 text-slate-400 text-xs">No tenants created in sandbox.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Lease & Balance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          {selectedTenant && selectedLease && (
            <form onSubmit={handleUpdateTenant}>
              <DialogHeader>
                <DialogTitle>Edit Lease & Balance</DialogTitle>
                <DialogDescription>
                  Directly adjust lease parameters to test different payment and expiry simulations.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Name</label>
                  <Input required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Phone</label>
                    <Input required value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Email</label>
                    <Input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Advance Balance ({currency})</label>
                  <Input type="number" value={editForm.advanceBalance} onChange={e => setEditForm({...editForm, advanceBalance: e.target.value})} />
                </div>

                {/* Edit Dates (Ethiopian Calendar) */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lease Duration (Ethiopian Calendar)</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Start Date</label>
                      <div className="flex gap-2">
                        <Select value={editForm.startYear.toString()} onValueChange={val => setEditForm({...editForm, startYear: parseInt(val || "2018")})}>
                          <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                          <SelectContent>{getEthiopianYearRange().map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={editForm.startMonth.toString()} onValueChange={val => setEditForm({...editForm, startMonth: parseInt(val || "1")})}>
                          <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                          <SelectContent>{getEthiopianMonths().map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name.split(" ")[0]}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={editForm.startDay.toString()} onValueChange={val => setEditForm({...editForm, startDay: parseInt(val || "1")})}>
                          <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({length: getDaysInEthiopianMonth(editForm.startYear, editForm.startMonth)}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">End Date</label>
                      <div className="flex gap-2">
                        <Select value={editForm.endYear.toString()} onValueChange={val => setEditForm({...editForm, endYear: parseInt(val || "2019")})}>
                          <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                          <SelectContent>{getEthiopianYearRange().map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={editForm.endMonth.toString()} onValueChange={val => setEditForm({...editForm, endMonth: parseInt(val || "1")})}>
                          <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                          <SelectContent>{getEthiopianMonths().map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name.split(" ")[0]}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={editForm.endDay.toString()} onValueChange={val => setEditForm({...editForm, endDay: parseInt(val || "1")})}>
                          <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({length: getDaysInEthiopianMonth(editForm.endYear, editForm.endMonth)}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              <DialogFooter>
                <Button type="submit" className="bg-slate-900 text-white rounded-lg hover:bg-slate-800">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
