import React from 'react';
import { FriendRequestNotification } from '../types/game';
import { Bell, Check, X, Trophy, Mail, Sparkles } from 'lucide-react';

interface FriendRequestsModalProps {
  requests: FriendRequestNotification[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onClose: () => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({
  requests,
  onAccept,
  onReject,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Do'stlik So'rovlari</h2>
              <p className="text-xs text-slate-400">
                Sizga do'st bo'lishni taklif qilganlar ({requests.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* List of Requests */}
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {requests.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <div>Yangi do'stlik so'rovlari yo'q.</div>
              <div className="text-[11px] text-slate-600">
                Do'stlaringiz sizga drujba yuborganda shu qo'ng'iroqchada ko'rinadi!
              </div>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between gap-3 transition-all hover:border-slate-600"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow border-2 border-white/20"
                    style={{ backgroundColor: req.sender.color }}
                  >
                    {req.sender.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">
                      {req.sender.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 text-slate-500" />
                      <span className="truncate">{req.sender.email}</span>
                    </div>
                    <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      Rekord: {req.sender.bestScore}-yercha
                    </div>
                  </div>
                </div>

                {/* 2 TA TUGMA: YASHIL (QABUL QILISH) VA QIZIL (RAD ETISH) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Yashil tugma: Qabul qilish */}
                  <button
                    onClick={() => onAccept(req.id)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95"
                    title="Qabul qilish"
                  >
                    <Check className="w-4 h-4" />
                    <span className="hidden sm:inline">Qabul qilish</span>
                  </button>

                  {/* Qizil tugma: Rad etish */}
                  <button
                    onClick={() => onReject(req.id)}
                    className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition active:scale-95"
                    title="Rad etish"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
        >
          Yopish
        </button>
      </div>
    </div>
  );
};
