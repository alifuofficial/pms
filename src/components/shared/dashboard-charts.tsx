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
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #f1f5f9', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
              fontWeight: '600'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#2563eb" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
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
