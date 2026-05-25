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
                const item = payload[0].payload as ChartData;
                return (
                  <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-lg space-y-1.5 text-xs text-slate-600 font-medium">
                    <p className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-1 uppercase tracking-tight">{item.name}</p>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-slate-400 font-semibold"><span className="w-2 h-2 rounded-full bg-slate-400" /> Expected:</span>
                      <span className="font-bold text-slate-700">{item.expected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                      <span className="flex items-center gap-1.5 text-blue-500 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-500" /> Collected:</span>
                      <span className="font-bold text-blue-600">{item.collected?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6 border-t border-slate-50 pt-1.5 font-bold">
                      <span className="text-emerald-600">Collection Rate:</span>
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
            name="Expected Revenue" 
            stroke="#64748b" 
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1} 
            fill="url(#colorExpected)" 
            animationDuration={1000}
          />
          <Area 
            type="monotone" 
            dataKey="collected" 
            name="Collected Revenue" 
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
