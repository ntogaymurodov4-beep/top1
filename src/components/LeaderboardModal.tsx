import React, { useEffect, useState } from 'react';
import { Trophy, Medal, X, RefreshCw } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardModalProps {
  onClose: () => void;
  currentUserId: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, currentUserId }) => {
  const [list, setList] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setList(data.leaderboard || []);
    } catch (e) {
      console.error('Failed to load leaderboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[85vh]">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-52 h-52 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Global Reyting Jadvali</h2>
              <p className="text-xs text-slate-400">Eng ko'p turburchaklardan sakrab o'tgan chempionlar</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchLeaderboard}
              title="Yangilash"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-2">
          {loading && list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-2">
              <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <span>Reyting yuklanmoqda...</span>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Hozircha hech kim rekord qo'ymagan. Birinchi bo'lib rekord o'rnating!
            </div>
          ) : (
            list.map((entry, index) => {
              const isSelf = entry.id === currentUserId;
              const rank = index + 1;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isSelf
                      ? 'bg-blue-950/50 border-blue-500/60 shadow-md ring-1 ring-blue-500/30'
                      : rank === 1
                      ? 'bg-amber-950/30 border-amber-500/40 shadow-sm'
                      : rank === 2
                      ? 'bg-slate-800/80 border-slate-600/50'
                      : rank === 3
                      ? 'bg-amber-900/20 border-amber-700/40'
                      : 'bg-slate-800/40 border-slate-700/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank icon / number */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                      {rank === 1 ? (
                        <Medal className="w-6 h-6 text-amber-400" />
                      ) : rank === 2 ? (
                        <Medal className="w-6 h-6 text-slate-300" />
                      ) : rank === 3 ? (
                        <Medal className="w-6 h-6 text-amber-600" />
                      ) : (
                        <span className="text-slate-400">#{rank}</span>
                      )}
                    </div>

                    {/* Avatar dot & Name */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 shrink-0"
                        style={{ backgroundColor: entry.color || '#3b82f6' }}
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          {entry.name}
                          {isSelf && (
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-normal">
                              Siz
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {entry.gamesPlayed} ta o'yin
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-lg font-black text-amber-400 font-mono">
                      {entry.bestScore}{' '}
                      <span className="text-xs font-normal text-slate-400">yercha</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {entry.bestDistance || 0} m masofa
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
