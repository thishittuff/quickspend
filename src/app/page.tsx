'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Send, CheckCircle, WifiOff, RefreshCw, 
  BarChart3, LogOut 
} from 'lucide-react';

const CATEGORIES = [
  "Rent", "Internet", "Electricity", "Groceries", "Gym", 
  "Fast Food", "Traveling", "Dining", "Entertainment", 
  "Miscellaneous", "Emergency Fund", "Investment"
];

export default function Home() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[3]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  
  // NEW: State for Currency
  const [currency, setCurrency] = useState('₹'); 

  // --- 1. AUTH & CURRENCY CHECK ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        // Fetch currency from user metadata, default to ₹ if missing
        setCurrency(user.user_metadata?.currency_symbol || '₹');
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- 2. OFFLINE SYNC LOGIC ---
  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem('expenseQueue') || '[]');
    setOfflineCount(queue.length);
    window.addEventListener('online', syncQueue);
    return () => window.removeEventListener('online', syncQueue);
  }, []);

  const syncQueue = async () => {
    if (!navigator.onLine) return;
    const queue = JSON.parse(localStorage.getItem('expenseQueue') || '[]');
    if (queue.length === 0) return;

    setLoading(true);
    const { error } = await supabase.from('expenses').insert(queue);
    
    if (!error) {
      localStorage.removeItem('expenseQueue');
      setOfflineCount(0);
      showToast('Synced offline expenses!', 'success');
    }
    setLoading(false);
  };

  const saveOffline = (data: any) => {
    const currentQueue = JSON.parse(localStorage.getItem('expenseQueue') || '[]');
    const updatedQueue = [...currentQueue, data];
    localStorage.setItem('expenseQueue', JSON.stringify(updatedQueue));
    setOfflineCount(updatedQueue.length);
  };

  // --- 3. UI HANDLERS ---
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const newExpense = {
      amount: parseFloat(amount),
      category,
      note,
      created_at: new Date().toISOString(),
    };

    setLoading(true);
    setAmount('');
    setNote('');
    
    if (navigator.onLine) {
      const { error } = await supabase.from('expenses').insert([newExpense]);
      if (error) {
        saveOffline(newExpense);
        showToast('Saved locally (API Error)', 'success');
      } else {
        showToast('Expense saved!', 'success');
      }
    } else {
      saveOffline(newExpense);
      showToast('Saved offline. Will sync later.', 'success');
    }
    setLoading(false);
  };

  // --- 4. RENDER ---
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 max-w-md mx-auto relative flex flex-col">
      
      <header className="bg-slate-950/80 backdrop-blur-md p-4 border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          QuickSpend
        </h1>
        
        <div className="flex items-center gap-2">
          {offlineCount > 0 && (
            <button 
              onClick={syncQueue}
              className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full animate-pulse"
            >
              <WifiOff size={14} />
              {offlineCount}
            </button>
          )}

          <Link href="/dashboard" className="p-2 bg-blue-500/10 rounded-full text-blue-400 hover:bg-blue-500/20 transition border border-blue-500/20">
            <BarChart3 size={20} />
          </Link>
          
          <button onClick={handleLogout} className="p-2 bg-red-500/10 rounded-full text-red-400 hover:bg-red-500/20 transition border border-red-500/20">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 p-4 flex flex-col gap-6">
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
          <div className="relative">
            {/* DYNAMIC CURRENCY SYMBOL */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-slate-500">{currency}</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 text-4xl font-bold text-white bg-slate-900 border border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xl transition-all placeholder:text-slate-700"
              autoFocus
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-3 text-xs font-medium rounded-xl border transition-all ${
                  category === cat
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20 transform scale-105'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Burger King"
            className="w-full p-4 text-lg text-white bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-700"
          />
        </div>

        <button
          type="submit"
          disabled={!amount || loading}
          className="mt-auto mb-4 w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white py-4 rounded-2xl text-xl font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 border border-white/10"
        >
          {loading ? <RefreshCw className="animate-spin" /> : <Send />}
          Add Expense
        </button>
      </form>

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-white font-medium animate-bounce border ${
          toast.type === 'success' 
            ? 'bg-emerald-500/90 border-emerald-400 backdrop-blur-md' 
            : 'bg-red-500/90 border-red-400 backdrop-blur-md'
        }`}>
          <CheckCircle size={20} />
          {toast.msg}
        </div>
      )}
    </main>
  );
}