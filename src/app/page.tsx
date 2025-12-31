'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, CheckCircle, WifiOff, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  "Rent", "Internet", "Electricity", "Groceries", "Gym", 
  "Fast Food", "Traveling", "Dining", "Entertainment", 
  "Miscellaneous", "Emergency Fund", "Investment"
];

export default function Home() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[3]); // Default to Groceries
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);

  // Load offline queue count on mount
  useEffect(() => {
    const queue = JSON.parse(localStorage.getItem('expenseQueue') || '[]');
    setOfflineCount(queue.length);
    
    // Attempt sync if back online
    window.addEventListener('online', syncQueue);
    return () => window.removeEventListener('online', syncQueue);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const newExpense = {
      amount: parseFloat(amount),
      category,
      note,
      created_at: new Date().toISOString(), // Client timestamp
    };

    setLoading(true);
    
    // RESET FORM INSTANTLY (Optimistic UI)
    setAmount('');
    setNote('');
    
    // Check connection
    if (navigator.onLine) {
      const { error } = await supabase.from('expenses').insert([newExpense]);
      if (error) {
        // Fallback to offline if API fails
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

  const saveOffline = (data: any) => {
    const currentQueue = JSON.parse(localStorage.getItem('expenseQueue') || '[]');
    const updatedQueue = [...currentQueue, data];
    localStorage.setItem('expenseQueue', JSON.stringify(updatedQueue));
    setOfflineCount(updatedQueue.length);
  };

  return (
    <main className="min-h-screen bg-gray-50 max-w-md mx-auto relative flex flex-col">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">QuickSpend</h1>
        {offlineCount > 0 && (
          <button 
            onClick={syncQueue}
            className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full animate-pulse"
          >
            <WifiOff size={14} />
            {offlineCount} Pending (Tap to Sync)
          </button>
        )}
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 p-4 flex flex-col gap-6">
        
        {/* Amount Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-500 uppercase">Amount</label>
          <div className="relative">
            {/* CHANGED: Dollar ($) to Rupee (₹) */}
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-gray-400">₹</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-4 text-4xl font-bold text-gray-800 bg-white border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none shadow-sm transition-all"
              autoFocus
              required
            />
          </div>
        </div>

        {/* Category Grid */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-500 uppercase">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`p-3 text-sm font-medium rounded-xl border transition-all ${
                  category === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Note Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-500 uppercase">Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Starbucks"
            // CHANGED: Added 'text-gray-900' so the text is visible
            className="w-full p-4 text-lg text-gray-900 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!amount || loading}
          className="mt-auto mb-4 w-full bg-blue-600 active:bg-blue-700 text-white py-4 rounded-2xl text-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
        >
          {loading ? <RefreshCw className="animate-spin" /> : <Send />}
          Add Expense
        </button>
      </form>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 text-white font-medium animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          <CheckCircle size={20} />
          {toast.msg}
        </div>
      )}
    </main>
  );
}