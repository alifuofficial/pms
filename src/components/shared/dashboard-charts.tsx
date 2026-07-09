"use client";

import { useState, useEffect } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ChartData {
  name: string;
  revenue?: number;
  expected?: number;
  collected?: number;
  rate?: number;
  occupancy?: number;
  value?: number;
  color?: string;
}

export function PaymentTypeChart({ data = [] }: { data?: ChartData[] }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
        <p className="text-xs font-medium text-slate-400 italic">No payment breakdown data available</p>
      </div>
    );
  }

  if (!isMounted) return <div className="h-[300px] w-full" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #f1f5f9', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
              fontWeight: '600'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({ data = [] }: { data?: ChartData[] }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
        <p className="text-xs font-medium text-slate-400 italic">No revenue data available for this period</p>
      </div>
    );
  }

  if (!isMounted) return <div className="h-[300px] w-full" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#64748b" stopOpacity={0.08}/>
              <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpectedRented" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.08}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
            tickFormatter={(value) => `${value.toLocaleString()}`}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as any;
                return (
                  <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-lg space-y-1.5 text-xs text-slate-600 font-medium">
                    <p className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-1 uppercase tracking-tight">{item.name}</p>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-slate-400 font-semibold"><span className="w-2 h-2 rounded-full bg-slate-400" /> Expected (All Units):</span>
                      <span className="font-bold text-slate-700">{item.expected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-purple-400 font-semibold"><span className="w-2 h-2 rounded-full bg-purple-400" /> Expected (Rented):</span>
                      <span className="font-bold text-purple-600">{item.expectedRented?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-blue-500 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-500" /> Collected:</span>
                      <span className="font-bold text-blue-600">{item.collected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6 border-t border-slate-50 pt-1.5 font-bold">
                      <span className="text-emerald-600">Collection Rate (Rented):</span>
                      <span className="text-emerald-600">{item.rate || 0}%</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{value}</span>}
          />
          <Area 
            type="monotone" 
            dataKey="expected" 
            name="Expected (All Units)" 
            stroke="#64748b" 
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fillOpacity={1} 
            fill="url(#colorExpected)" 
            animationDuration={1000}
          />
          <Area 
            type="monotone" 
            dataKey="expectedRented" 
            name="Expected (Rented)" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            strokeDasharray="3 3"
            fillOpacity={1} 
            fill="url(#colorExpectedRented)" 
            animationDuration={1000}
          />
          <Area 
            type="monotone" 
            dataKey="collected" 
            name="Collected" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorCollected)" 
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OccupancyChart({ data = [] }: { data?: ChartData[] }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
        <p className="text-xs font-medium text-slate-400 italic">No occupancy data available</p>
      </div>
    );
  }

  if (!isMounted) return <div className="h-[300px] w-full" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #f1f5f9', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
              fontWeight: '600'
            }}
          />
          <Bar 
            dataKey="occupancy" 
            fill="#8b5cf6" 
            radius={[4, 4, 0, 0]} 
            barSize={30}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EthiopianRevenueChart({ data = [] }: { data?: ChartData[] }) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
        <p className="text-xs font-medium text-slate-400 italic">No Ethiopian revenue data available</p>
      </div>
    );
  }

  if (!isMounted) return <div className="h-[300px] w-full" />;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
            tickFormatter={(value) => `${value.toLocaleString()}`}
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as any;
                return (
                  <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-lg space-y-1.5 text-xs text-slate-600 font-medium">
                    <p className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-1 uppercase tracking-tight">{item.name}</p>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-slate-400 font-semibold"><span className="w-2 h-2 rounded-full bg-slate-400" /> Expected (All Units):</span>
                      <span className="font-bold text-slate-700">{item.expected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-purple-400 font-semibold"><span className="w-2 h-2 rounded-full bg-purple-400" /> Expected (Rented):</span>
                      <span className="font-bold text-purple-600">{item.expectedRented?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-blue-500 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-500" /> Collected:</span>
                      <span className="font-bold text-blue-600">{item.collected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-red-500 font-semibold"><span className="w-2 h-2 rounded-full bg-red-500" /> Uncollected (Rented):</span>
                      <span className="font-bold text-red-600">{item.uncollected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6 border-t border-slate-50 pt-1.5 font-bold">
                      <span className="text-emerald-600">Collection Rate (Rented):</span>
                      <span className="text-emerald-600">{item.rate || 0}%</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{value}</span>}
          />
          <Bar 
            dataKey="expected" 
            name="Expected (All Units)"
            fill="#64748b" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
            animationDuration={1000}
          />
          <Bar 
            dataKey="expectedRented" 
            name="Expected (Rented)"
            fill="#8b5cf6" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
            animationDuration={1000}
          />
          <Bar 
            dataKey="collected" 
            name="Collected"
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
            animationDuration={1000}
          />
          <Bar 
            dataKey="uncollected" 
            name="Uncollected"
            fill="#ef4444" 
            radius={[4, 4, 0, 0]} 
            barSize={12}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueAnalyticsTabs({
  gregorianData = [],
  ethiopianData = [],
  currency = "USD",
  bestMonth,
}: {
  gregorianData?: ChartData[];
  ethiopianData?: ChartData[];
  currency?: string;
  bestMonth?: { name: string; collected: number; expected: number; rate: number };
}) {
  const [activeTab, setActiveTab] = useState<"gregorian" | "ethiopian">("gregorian");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-slate-900">Revenue Analysis</h3>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {activeTab === "gregorian"
              ? "Monthly Gregorian Collections (Expected vs Collected)"
              : "Ethiopian Calendar Revenue Trend (Expected vs Collected vs Uncollected)"}
          </p>
        </div>
        <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
          <button
            onClick={() => setActiveTab("gregorian")}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
              activeTab === "gregorian"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Gregorian
          </button>
          <button
            onClick={() => setActiveTab("ethiopian")}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-200 ${
              activeTab === "ethiopian"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Ethiopian
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          className={`transition-all duration-300 transform ${
            activeTab === "gregorian"
              ? "opacity-100 translate-y-0 relative visible"
              : "opacity-0 -translate-y-2 absolute invisible pointer-events-none w-full"
          }`}
        >
          <RevenueChart data={gregorianData} />
          {bestMonth && (
            <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-semibold text-slate-700">
                  Collection Peak Month Comparison: <strong className="text-blue-700 font-bold">{bestMonth.name}</strong> is the highest collecting month, yielding <strong className="text-blue-700 font-bold">{bestMonth.collected?.toLocaleString()} {currency}</strong> out of {bestMonth.expected?.toLocaleString()} {currency} expected (<strong className="text-emerald-700 font-bold">{bestMonth.rate}% collected</strong>).
                </span>
              </div>
              <span className="text-[9px] font-bold text-blue-600 border border-blue-200 bg-blue-50 uppercase whitespace-nowrap px-2 py-0.5 rounded shadow-none self-start sm:self-auto">
                Peak Month
              </span>
            </div>
          )}
        </div>

        <div
          className={`transition-all duration-300 transform ${
            activeTab === "ethiopian"
              ? "opacity-100 translate-y-0 relative visible"
              : "opacity-0 -translate-y-2 absolute invisible pointer-events-none w-full"
          }`}
        >
          <EthiopianRevenueChart data={ethiopianData} />
        </div>
      </div>
    </div>
  );
}

