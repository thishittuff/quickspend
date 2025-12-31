'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import { ArrowLeft, Calendar, DollarSign, TrendingUp } from 'lucide-react';

// Dark Mode Colors for Charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

type Expense = {
  id: string;
  amount: number;
  category: string;
  created_at: string;
  note?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Fetch ALL data on load
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: true }); // Keep ascending for charts

    if (error) console.error('Error fetching:', error);
    else setExpenses(data || []);
    setLoading(false);
  };

  // --- DATA PROCESSING LOGIC ---

  // 1. Recent Transactions (Last 3)
  // We create a copy [...expenses] before reversing to avoid mutating the original array
  const recentExpenses = [...expenses].reverse().slice(0, 3);

  // 2. Filter data for the SELECTED Month
  const currentMonthExpenses = expenses.filter(exp => 
    exp.created_at.startsWith(selectedMonth)
  );

  // 3. Calculate Summary Cards
  const totalSpend = currentMonthExpenses.reduce((sum, item) => sum + item.amount, 0);

  // Count unique days where money was actually spent
  const uniqueDaysSpent = new Set(
    currentMonthExpenses.map(item => item.created_at.split('T')[0]) 
  ).size;

  const avgDailySpend = uniqueDaysSpent > 0 
    ? (totalSpend / uniqueDaysSpent) 
    : 0;

  // 4. Prepare Pie Chart Data (Category Wise)
  const categoryStats: Record<string, number> = {};
  currentMonthExpenses.forEach(exp => {
    categoryStats[exp.category] = (categoryStats[exp.category] || 0) + exp.amount;
  });
  
  const pieData = Object.keys(categoryStats)
    .map(cat => ({ name: cat, value: categoryStats[cat] }))
    .sort((a, b) => b.value - a.value); 

  const top3Categories = pieData.slice(0, 3);

  // 5. Prepare Trend Data (Last 6 Months)
  const getTrendData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM');
      
      const monthlyTotal = expenses
        .filter(e => e.created_at.startsWith(monthKey))
        .reduce((sum, e) => sum + e.amount, 0);

      data.push({ name: monthLabel, total: monthlyTotal });
    }
    return data;
  };

  const trendData = getTrendData();

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading data...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-950/80 backdrop-blur-md py-2 z-10">
        <button onClick={() => router.push('/')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft size={20} className="text-slate-300" />
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Insights
        </h1>
        <div className="w-10" />
      </div>

      {/* Month Filter */}
      <div className="mb-8 flex justify-center">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-blue-500 appearance-none"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase mb-2">
            <DollarSign size={14} /> Total Spent
          </div>
          <div className="text-2xl font-bold text-white">₹{totalSpend.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase mb-2">
            <TrendingUp size={14} /> Active Daily Avg
          </div>
          <div className="text-2xl font-bold text-emerald-400">₹{Math.round(avgDailySpend).toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-1">
             (Based on {uniqueDaysSpent} spending days)
          </div>
        </div>
      </div>

      {/* Charts & Lists Grid */}
      <div className="flex flex-col gap-6">
        
        {/* Category Breakdown (Pie) */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Where money went</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Top 3 List */}
          <div className="mt-4 space-y-3">
            {top3Categories.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-medium text-slate-300">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-100">₹{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6 Month Trend (Bar) */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">6 Month Trend</h2>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#334155', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NEW: Recent Transactions Table */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Last 3 Payments</h2>
          <div className="space-y-0">
            {/* Table Header */}
            <div className="grid grid-cols-3 text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2">
              <div className="text-left">Category</div>
              <div className="text-center">Time</div>
              <div className="text-right">Amount</div>
            </div>
            
            {/* Table Rows */}
            {recentExpenses.length > 0 ? (
              recentExpenses.map((exp) => (
                <div key={exp.id} className="grid grid-cols-3 items-center py-3 border-b border-slate-800 last:border-0 px-2 hover:bg-slate-800/50 transition rounded-lg">
                  <div className="text-sm text-slate-200 font-medium truncate pr-2">
                    {exp.category}
                  </div>
                  <div className="text-xs text-slate-400 text-center">
                    {format(parseISO(exp.created_at), 'd MMM, h:mm a')}
                  </div>
                  <div className="text-sm font-bold text-emerald-400 text-right">
                    ₹{exp.amount.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-4 text-sm">No expenses yet</div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}