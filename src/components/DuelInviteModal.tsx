import React from 'react';
import { FriendUser } from '../types/game';
import { Swords, Send, Trophy, X, Sparkles } from 'lucide-react';

interface DuelInviteModalProps {
  friends: FriendUser[];
  duelCode: string;
  onInvite: (friendId: string) => void;
  onClose: () => void;
}

export const DuelInviteModal: React.FC<DuelInviteModalProps> = ({
  friends,
  duelCode,
  onInvite,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900/95 border-2 border-rose-500/50 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/50">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">1vs1 ga Do'st Taklif Qilish</h2>
              <p className="text-xs text-slate-400">Duel xonasi kodi: <span className="text-rose-400 font-mono font-bold">{duelCode}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of friends to invite */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
          {friends.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <div>Hali qabul qilingan do'stlaringiz yo'q.</div>
              <div className="text-[11px] text-slate-500">
                Avval bosh menyudan do'stlarga drujba tashlang va ular qabul qilsin!
              </div>
            </div>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 border-2 border-white/20"
                    style={{ backgroundColor: friend.color }}
                  >
                    {friend.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs truncate">{friend.name}</span>
                      {friend.isOnline && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      <Trophy className="w-2.5 h-2.5" />
                      Rekord: {friend.bestScore || 0}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onInvite(friend.id)}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Taklif qilish</span>
                </button>
              </div>
            ))
          )}
        </div>

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
