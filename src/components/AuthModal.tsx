import React, { useState } from 'react';
import { UserProfile } from '../types/game';
import { Sparkles, User, Mail, KeyRound, ShieldCheck, ArrowRight, UserPlus, LogIn } from 'lucide-react';

interface AuthModalProps {
  onSuccess: (profile: UserProfile) => void;
}

const COLOR_OPTIONS = [
  { name: 'Neon Ko\'k', hex: '#3b82f6', border: 'border-blue-500' },
  { name: 'Zumrad Yashil', hex: '#10b981', border: 'border-emerald-500' },
  { name: 'Olov Qizil', hex: '#ef4444', border: 'border-red-500' },
  { name: 'Oltin Sariq', hex: '#f59e0b', border: 'border-amber-500' },
  { name: 'Kiber Binafsha', hex: '#8b5cf6', border: 'border-purple-500' },
  { name: 'Neon Pushti', hex: '#ec4899', border: 'border-pink-500' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].hex);
  const [skin, setSkin] = useState('runner');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits up to 4
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError("To'g'ri Gmail / elektron pochta manzilini kiriting!");
      return;
    }

    if (code.length !== 4) {
      setError("Kod aniq 4 xonali raqam bo'lishi shart!");
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError("Iltimos, ismingiz yoki taxallusingizni yozing!");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        mode === 'register'
          ? { name: name.trim(), email: email.trim(), code, color: selectedColor, skin }
          : { email: email.trim(), code };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.notFound || res.status === 404) {
          // If Gmail was not registered yet, auto-prepare registration
          setMode('register');
          if (!name.trim()) {
            setName(email.split('@')[0]);
          }
          setError("Ushbu Gmail hali ro'yxatdan o'tmagan ekan! Ismingizni tasdiqlang va 'Profil yaratish'ni bosing.");
          return;
        }
        throw new Error(data.error || 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
      }

      const profile: UserProfile = data.user;
      // Save permanently to device localStorage
      localStorage.setItem('turburchak_player_profile', JSON.stringify(profile));
      onSuccess(profile);
    } catch (err: any) {
      setError(err.message || 'Tarmoq xatosi yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl shadow-blue-500/10 p-6 md:p-8 overflow-hidden relative">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 text-white mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">
            3D Turburchak Sakrovchi
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'login'
              ? 'Akkauntingizga kiring va do\'stlar bilan rekord qo\'ying!'
              : 'Yangi profil yarating va qurilmada saqlansin!'}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'login'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Kirish
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'register'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Ro'yxatdan o'tish
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs font-medium flex items-start gap-2 animate-shake">
            <div className="w-2 h-2 rounded-full bg-red-400 mt-1 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Ismingiz / O'yindagi nik
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Azizbek"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Gmail / Elektron pochta
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="foydalanuvchi@gmail.com"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                4 xonali maxfiy kod (PIN)
              </label>
              <span className="text-[11px] text-slate-400">4 ta raqam</span>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                value={code}
                onChange={handleCodeChange}
                placeholder="••••"
                className="w-full tracking-widest text-center text-lg font-bold bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Qahramon rangi
              </label>
              <div className="flex items-center justify-between gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-9 h-9 rounded-xl transition-all transform ${
                      selectedColor === c.hex
                        ? 'scale-110 ring-4 ring-white/50 shadow-lg'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'register' ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                Tasdiqlash va Profil yaratish
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                O'yinga kirish
              </>
            )}
          </button>
        </form>

        {/* Footer switch */}
        <div className="mt-5 text-center">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Akkauntingiz yo'qmi? <span className="font-bold underline">Ro'yxatdan o'tish</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Akkauntingiz bormi? <span className="font-bold underline">Kirish</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
