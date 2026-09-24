import React from 'react';
import { UserProfile, FriendRequestNotification } from '../types/game';
import {
  Globe,
  Users,
  Trophy,
  Mic,
  MicOff,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Bell,
  HeartHandshake,
} from 'lucide-react';

interface MainMenuModalProps {
  user: UserProfile;
  onlineCount: number;
  micEnabled: boolean;
  pendingRequests: FriendRequestNotification[];
  friendsCount: number;
  onToggleMic: () => void;
  onSelectWorldGame: () => void;
  onOpenLobbyHub: () => void;
  onOpenFriendsList: () => void;
  onOpenFriendRequests: () => void;
  onOpenLeaderboard: () => void;
  onLogout: () => void;
}

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  user,
  onlineCount,
  micEnabled,
  pendingRequests,
  friendsCount,
  onToggleMic,
  onSelectWorldGame,
  onOpenLobbyHub,
  onOpenFriendsList,
  onOpenFriendRequests,
  onOpenLeaderboard,
  onLogout,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl p-5 md:p-7 flex flex-col gap-5 text-slate-100 my-auto">
        {/* User Header with Profile and Notification Bell */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white/20 shrink-0"
              style={{ backgroundColor: user.color }}
            >
              {user.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black text-white truncate">{user.name}</h1>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>

                {/* QO'NG'IROQCHA (NOTIFICATION BELL) NEXT TO PROFILE */}
                <button
                  onClick={onOpenFriendRequests}
                  className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/50 transition-all shadow active:scale-95 ml-1"
                  title="Do'stlik so'rovlari (Qo'ng'iroqcha)"
                >
                  <Bell className="w-4 h-4" />
                  {pendingRequests.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] ring-2 ring-slate-900 animate-bounce">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {user.email} • Rekord: <span className="text-amber-400 font-bold">{user.bestScore || 0}-yercha</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mic toggle */}
            <button
              onClick={onToggleMic}
              className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold ${
                micEnabled
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={micEnabled ? "Mikrofon yoqilgan" : "Mikrofonni yoqish"}
            >
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{micEnabled ? "Mic: Yoqilgan" : "Mic: O'chiq"}</span>
            </button>

            {/* Leaderboard button */}
            <button
              onClick={onOpenLeaderboard}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 transition"
              title="Global Reyting"
            >
              <Trophy className="w-4 h-4" />
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 transition"
              title="Hisobdan chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Mode Selection Prompt */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
            O'yin Menyu va Rejimlar
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Dunyo bo'yicha sakrang, do'stlar bilan lobi oching yoki 1vs1 duelda bellashing!
          </p>
        </div>

        {/* 3 TA ASOSIY MENYU:
            1) DUNYO O'YINI
            2) LOBI (GURUH XONASI)
            3) DO'STLARIM (FAQAT DO'STLAR, CHAT & 1VS1)
        */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* 1-MENYU: DUNYO O'YINI */}
          <div className="relative group rounded-3xl bg-gradient-to-b from-slate-850 to-slate-900 border-2 border-blue-600/40 hover:border-blue-500 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/30">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <Globe className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">
                    1-MENYU • DUNYO
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    🟢 {onlineCount} online
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">1. Dunyo O'yini</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Barcha kompyuter, telefon va hisoblardan kirgan odamlar umumiy 3D maydonda birga sakraydi va mikrofonda gaplashadi!
              </p>
            </div>

            <div className="pt-5">
              <button
                onClick={onSelectWorldGame}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 group-hover:shadow-blue-600/40"
              >
                🌍 DUNYO O'YINI <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 2-MENYU: LOBI (DO'STLAR GURUHI) */}
          <div className="relative group rounded-3xl bg-gradient-to-b from-slate-850 to-slate-900 border-2 border-indigo-600/40 hover:border-indigo-500 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-900/30">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">
                    2-MENYU • LOBI
                  </span>
                  <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-500/30">
                    🎙️ Xona & Golos
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">2. Lobi (Xona)</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Xususiy lobi ochib, pastda qabul qilgan do'stlaringizni taklif qiling va faqat o'z jamoangiz bilan mikrofon orqali o'ynang!
              </p>
            </div>

            <div className="pt-5">
              <button
                onClick={onOpenLobbyHub}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 group-hover:shadow-indigo-600/40"
              >
                👥 LOBI OCHISH <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* 3-MENYU: DO'STLARIM (FAQAT QABUL QILINGAN DO'STLAR: CHAT & 1VS1) */}
          <div className="relative group rounded-3xl bg-gradient-to-b from-slate-850 to-slate-900 border-2 border-purple-600/40 hover:border-purple-500 p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/30">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-purple-400 tracking-wider uppercase">
                    3-MENYU • DO'STLAR
                  </span>
                  <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/30">
                    🤝 {friendsCount} ta do'st
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">3. Do'stlarim</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Faqat sizning do'stlaringiz! Istalgan do'stni tanlab <span className="text-blue-400 font-bold">1) Chat & Golos</span> yoki <span className="text-rose-400 font-bold">2) 1vs1 O'yin</span> boshlang!
              </p>
            </div>

            <div className="pt-5">
              <button
                onClick={onOpenFriendsList}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 group-hover:shadow-purple-600/40"
              >
                🤝 DO'STLAR VA 1VS1 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-[11px] text-slate-400">
          <div className="flex items-center justify-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real-vaqt Ovozli Chat (Mikrofon)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Do'stlar Chati & 1vs1 Duellar</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>150+ To'rtburchak 3D Yerchalar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
