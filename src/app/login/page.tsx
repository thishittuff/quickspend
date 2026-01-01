'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, Loader2, Globe } from 'lucide-react';

const COUNTRIES = [
  { code: 'IN', label: 'India', symbol: '₹' },
  { code: 'US', label: 'USA', symbol: '$' },
  { code: 'CN', label: 'China', symbol: '¥' },
  { code: 'DE', label: 'Germany', symbol: '€' },
  { code: 'FR', label: 'France', symbol: '€' },
  { code: 'IT', label: 'Italy', symbol: '€' },
  { code: 'UK', label: 'United Kingdom', symbol: '£' },
];

export default function Login() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [currency, setCurrency] = useState(COUNTRIES[0].symbol); // Default India
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [msg, setMsg] = useState('');

  const getCredentials = () => {
    const cleanName = name.toLowerCase().replace(/\s/g, '');
    const email = `${cleanName}@quickspend.local`;
    const password = `${pin}qsapp`; 
    return { email, password };
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setMsg('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    setMsg('');
    const { email, password } = getCredentials();

    if (isSignUp) {
      // Sign Up: Save Currency in User Metadata
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { 
          data: { 
            display_name: name,
            currency_symbol: currency // <--- SAVING CURRENCY HERE
          } 
        }
      });
      if (error) setMsg(error.message);
      else {
        await supabase.auth.signInWithPassword({ email, password });
        router.push('/');
      }
    } else {
      // Login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg('Wrong Name or PIN.');
      } else {
        router.push('/');
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {isSignUp ? 'Join the Club' : 'Welcome Back'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isSignUp ? 'Set up your currency & PIN' : 'Enter your name to continue'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          
          {/* Country Selection (Only show on Sign Up) */}
          {isSignUp && (
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white appearance-none focus:border-blue-500 focus:outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.symbol}>
                    {c.label} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name Input */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
              placeholder="Your Name"
            />
          </div>

          {/* PIN Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input
              type="tel"
              maxLength={4}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:border-emerald-500 outline-none transition-all tracking-[0.5em] font-bold text-center"
              placeholder="PIN" 
            />
          </div>

          {msg && <div className="text-red-400 text-xs text-center">{msg}</div>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>{isSignUp ? 'Start Tracking' : 'LET ME IN!!!!'} <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setMsg(''); }}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            {isSignUp ? 'Login' : "Create account"}
          </button>
        </div>
      </div>
    </main>
  );
}