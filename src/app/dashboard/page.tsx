'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, parseISO, addMonths } from 'date-fns';
import { ArrowLeft, Calendar, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Download } from 'lucide-react';

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
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [currency, setCurrency] = useState('₹');
  const [totalIncome, setTotalIncome] = useState(0);
  const [balance, setBalance] = useState(0);

  const selectedMonth = format(currentDate, 'yyyy-MM');

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrency(user.user_metadata?.currency_symbol || '₹');

      const { data: expData } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: true });
      
      const { data: depData } = await supabase.from('deposits').select('amount');
      
      const totalExp = expData?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const totalDep = depData?.reduce((sum, item) => sum + item.amount, 0) || 0;

      setExpenses(expData || []);
      setTotalIncome(totalDep);
      setBalance(totalDep - totalExp);
      setLoading(false);
    };
    initData();
  }, [router]);

  // --- HANDLERS ---
  const changeMonth = (offset: number) => {
    setCurrentDate(prev => addMonths(prev, offset));
  };

  const handleExport = () => {
    const headers = ['Date,Category,Note,Amount'];
    const rows = currentMonthExpenses.map(exp => {
      const date = format(parseISO(exp.created_at), 'yyyy-MM-dd');
      const cleanNote = exp.note ? `"${exp.note.replace(/"/g, '""')}"` : ''; 
      return `${date},${exp.category},${cleanNote},${exp.amount}`;
    });
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Expenses_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DATA PROCESSING ---
  const recentExpenses = [...expenses].reverse().slice(0, 3);
  
  // Filter for selected month
  const currentMonthExpenses = expenses.filter(exp => 
    format(parseISO(exp.created_at), 'yyyy-MM') === selectedMonth
  );

  const totalSpendMonth = currentMonthExpenses.reduce((sum, item) => sum + item.amount, 0);

  // FIXED: Calculate Unique Active Days
  const uniqueDaysSpent = new Set(
    currentMonthExpenses.map(item => item.created_at.split('T')[0]) 
  ).size;

  // FIXED: Divide by Unique Days (avoid division by zero)
  const avgDailySpend = uniqueDaysSpent > 0 
    ? (totalSpendMonth / uniqueDaysSpent) 
    : 0;

  const totalLifetimeSpend = expenses.reduce((sum, item) => sum + item.amount, 0);
  const spendingPercentage = totalIncome > 0 ? (totalLifetimeSpend / totalIncome) * 100 : 0;

  const categoryStats: Record<string, number> = {};
  currentMonthExpenses.forEach(exp => {
    categoryStats[exp.category] = (categoryStats[exp.category] || 0) + exp.amount;
  });
  
  const pieData = Object.keys(categoryStats)
    .map(cat => ({ name: cat, value: categoryStats[cat] }))
    .sort((a, b) => b.value - a.value); 

  const top3Categories = pieData.slice(0, 3);

  const getTrendData = () => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMM');
      const monthlyTotal = expenses
        .filter(e => format(parseISO(e.created_at), 'yyyy-MM') === monthKey)
        .reduce((sum, e) => sum + e.amount, 0);
      data.push({ name: monthLabel, total: monthlyTotal });
    }
    return data;
  };
  const trendData = getTrendData();

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading data...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-950/80 backdrop-blur-md py-2 z-10">
        <button onClick={() => router.push('/')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft size={20} className="text-slate-300" />
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Insights</h1>
        <div className="w-10" />
      </div>

      <div className="flex flex-col gap-6">

        {/* BUDGET OVERVIEW */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-slate-400 text-xs font-bold uppercase">Wallet Balance</div>
              <div className="text-3xl font-bold text-white mt-1">{currency}{balance.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 text-xs font-bold uppercase">Total Added</div>
              <div className="text-sm font-bold text-emerald-400">+{currency}{totalIncome.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Spent: {currency}{totalLifetimeSpend.toLocaleString()}</span>
              <span>{Math.min(spendingPercentage, 100).toFixed(0)}% Used</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  spendingPercentage > 90 ? 'bg-red-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* MONTH NAVIGATION & EXPORT */}
        <div className="flex justify-center items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-300">
            <ChevronLeft size={20} />
          </button>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setCurrentDate(new Date(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-blue-500 appearance-none font-bold text-center w-36"
            />
          </div>

          <button onClick={() => changeMonth(1)} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-300">
            <ChevronRight size={20} />
          </button>
          
          <button onClick={handleExport} className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/20 ml-2">
            <Download size={20} />
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase mb-2">
              <DollarSign size={14} /> Month Spend
            </div>
            <div className="text-2xl font-bold text-white">{currency}{totalSpendMonth.toLocaleString()}</div>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase mb-2">
              <TrendingUp size={14} /> Avg Daily
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {currency}{Math.round(avgDailySpend).toLocaleString()}
            </div>
            {/* Added detail back so you know it's working */}
            <div className="text-[10px] text-slate-500 mt-1">
             (Based on {uniqueDaysSpent} spending days)
            </div>
          </div>
        </div>
        
        {/* CHARTS */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Where money went</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => `${currency}${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {top3Categories.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-medium text-slate-300">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-100">{currency}{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT TRANSACTIONS */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Last 3 Payments</h2>
          <div className="space-y-0">
            {recentExpenses.length > 0 ? (
              recentExpenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center py-3 border-b border-slate-800 last:border-0 px-2 hover:bg-slate-800/50 transition rounded-lg">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-sm text-slate-200 font-medium truncate">{exp.category}</span>
                    {exp.note && (
                      <div className="text-xs text-slate-500 truncate flex flex-wrap gap-1">
                        {exp.note.split(" ").map((word, i) => {
                          if (word.startsWith("#")) return <span key={i} className="text-blue-400 bg-blue-400/10 px-1 rounded">{word}</span>;
                          if (word.startsWith("@")) return <span key={i} className="text-amber-400 bg-amber-400/10 px-1 rounded">{word}</span>;
                          return <span key={i}>{word}</span>;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-emerald-400">{currency}{exp.amount.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">{format(parseISO(exp.created_at), 'd MMM, h:mm a')}</span>
                  </div>
                </div>
              ))
            ) : <div className="text-center text-slate-500 py-4 text-sm">No expenses yet</div>}
          </div>
        </div>

      </div>
    </main>
  );
}