'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Send, CheckCircle, WifiOff, RefreshCw, 
  BarChart3, LogOut, Plus, Wallet, X 
} from 'lucide-react';

const CATEGORIES = [
  "Rent", "Internet", "Electricity", "Groceries", "Gym", 
  "Fast Food", "Traveling", "Dining", "Entertainment", 
  "Miscellaneous", "Emergency Fund", "Investment"
];

export default function Home() {
  const router = useRouter();
  
  // Expense Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[3]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  
  // App State
  const [currency, setCurrency] = useState('₹'); 
  const [balance, setBalance] = useState(0); // <--- NEW: Balance State
  const [showDepositModal, setShowDepositModal] = useState(false); // <--- NEW: Modal State
  const [depositAmount, setDepositAmount] = useState(''); // <--- NEW: Deposit Input

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);

  // --- 1. AUTH & DATA FETCH ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrency(user.user_metadata?.currency_symbol || '₹');
      fetchBalance(); // <--- Fetch initial balance
    };
    init();
  }, [router]);

  // NEW: Calculate Balance (Total Deposits - Total Expenses)
  const fetchBalance = async () => {
    // 1. Get Expenses Sum
    const { data: expenses } = await supabase.from('expenses').select('amount');
    const totalExpenses = expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;

    // 2. Get Deposits Sum
    const { data: deposits } = await supabase.from('deposits').select('amount');
    const totalDeposits = deposits?.reduce((sum, item) => sum + item.amount, 0) || 0;

    setBalance(totalDeposits - totalExpenses);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- 2. OFFLINE SYNC ---
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
      fetchBalance(); // Update balance after sync
    }
    setLoading(false);
  };

  // --- 3. HANDLERS ---
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount) return;
    
    setLoading(true);
    const { error } = await supabase.from('deposits').insert([{
      amount: parseFloat(depositAmount),
      created_at: new Date().toISOString()
    }]);

    if (!error) {
      setBalance(prev => prev + parseFloat(depositAmount)); // Real-time update
      setDepositAmount('');
      setShowDepositModal(false);
      showToast('Funds added!', 'success');
    } else {
      showToast('Error adding funds', 'error');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const val = parseFloat(amount);
    const newExpense = {
      amount: val,
      category,
      note,
      created_at: new Date().toISOString(),
    };

    setLoading(true);
    setAmount('');
    setNote('');
    
    // Optimistic Update: Deduct from balance immediately
    setBalance(prev => prev - val);

    if (navigator.onLine) {
      const { error } = await supabase.from('expenses').insert([newExpense]);
      if (error) {
        // Rollback balance if error (optional, but safer)
        // setBalance(prev => prev + val); 
        showToast('API Error. Saved locally.', 'success');
        saveOffline(newExpense);
      } else {
        showToast('Expense saved!', 'success');
      }
    } else {
      saveOffline(newExpense);
      showToast('Saved offline.', 'success');
    }
    setLoading(false);
  };

  const saveOffline = (data: any) => {
    const currentQueue = JSON.parse(localStorage.getItem('expenseQueue') || '[]');
    const updatedQueue = [...currentQueue, data];
    localStorage.setItem('expenseQueue', JSON.stringify(updatedQueue));
    setOfflineCount(updatedQueue.length);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 max-w-md mx-auto relative flex flex-col">
      
      {/* HEADER */}
      <header className="bg-slate-950/80 backdrop-blur-md p-4 border-b border-slate-800 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          QuickSpend
        </h1>
        
        <div className="flex items-center gap-2">
          {offlineCount > 0 && (
            <button onClick={syncQueue} className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full animate-pulse">
              <WifiOff size={14} /> {offlineCount}
            </button>
          )}
          <Link href="/dashboard" className="p-2 bg-blue-500/10 rounded-full text-blue-400 border border-blue-500/20"><BarChart3 size={20} /></Link>
          <button onClick={handleLogout} className="p-2 bg-red-500/10 rounded-full text-red-400 border border-red-500/20"><LogOut size={20} /></button>
        </div>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto pb-24">
        
        {/* NEW: WALLET BALANCE CARD */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} />
          </div>
          
          <div className="relative z-10">
            <div className="text-indigo-200 text-xs font-bold tracking-widest uppercase mb-1">Total Balance</div>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-black text-white tracking-tight">
                {currency} {balance.toLocaleString()}
              </div>
              <button 
                onClick={() => setShowDepositModal(true)}
                className="bg-indigo-500 hover:bg-indigo-400 text-white p-3 rounded-2xl shadow-lg transition-transform active:scale-95 border border-indigo-400/50"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* EXPENSE FORM */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-slate-500">{currency}</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 text-4xl font-bold text-white bg-slate-900 border border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xl transition-all placeholder:text-slate-700"
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
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg scale-105'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Dinner @Rahul #Trip"
              className="w-full p-4 text-lg text-white bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-700"
            />
          </div>

          <button
            type="submit"
            disabled={!amount || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white py-4 rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
          >
            {loading ? <RefreshCw className="animate-spin" /> : <Send />}
            Add Expense
          </button>
        </form>
      </div>

      {/* DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Add Funds</h2>
              <button onClick={() => setShowDepositModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleDeposit} className="flex flex-col gap-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-500">{currency}</span>
                <input
                  type="number"
                  autoFocus
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 text-3xl font-bold text-white bg-slate-950 border border-slate-700 rounded-2xl focus:border-indigo-500 outline-none"
                  placeholder="0.00"
                />
              </div>
              <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold text-lg">
                {loading ? 'Processing...' : 'Add Money'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 text-white font-medium animate-bounce border ${
          toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400' : 'bg-red-500/90 border-red-400'
        }`}>
          <CheckCircle size={20} /> {toast.msg}
        </div>
      )}
    </main>
  );
}