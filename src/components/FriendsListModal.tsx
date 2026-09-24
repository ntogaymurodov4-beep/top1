import React, { useState } from 'react';
import { FriendUser, UserProfile } from '../types/game';
import { Users, MessageSquare, Swords, Search, Trophy, Sparkles, X, UserPlus, ArrowLeft } from 'lucide-react';

interface FriendsListModalProps {
  currentUser: UserProfile;
  friends: FriendUser[];
  onSelectChat: (friend: FriendUser) => void;
  onSelect1vs1: (friend: FriendUser) => void;
  onOpenSearch: () => void;
  onClose: () => void;
}

export const FriendsListModal: React.FC<FriendsListModalProps> = ({
  currentUser: _currentUser,
  friends,
  onSelectChat,
  onSelect1vs1,
  onOpenSearch,
  onClose,
}) => {
  const [selectedFriend, setSelectedFriend] = useState<FriendUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFriends = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Do'stlarim</h2>
              <p className="text-xs text-slate-400">
                Faqat siz qabul qilgan do'stlar ro'yxati ({friends.length} ta)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSearch}
              className="p-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Do'st qidirish va qo'shish"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Do'st qo'shish</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        {friends.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Do'stlar orasidan qidirish..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Friends List or Action Sheet for Selected Friend */}
        {!selectedFriend ? (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
            {friends.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-3">
                <Sparkles className="w-10 h-10 text-indigo-400/60 mx-auto" />
                <div className="font-bold text-white text-sm">Hali do'stlaringiz yo'q</div>
                <p className="max-w-xs mx-auto text-slate-400">
                  Tepada "Do'st qo'shish" tugmasini bosing, do'stingizni qidirib do'stlik (drujba) tashlang!
                </p>
                <button
                  onClick={onOpenSearch}
                  className="mt-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition"
                >
                  🔍 Do'st qidirish
                </button>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Ushbu nom bo'yicha do'st topilmadi
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className="group p-3.5 rounded-2xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/60 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-md border-2 border-white/20 relative"
                      style={{ backgroundColor: friend.color }}
                    >
                      {friend.name.slice(0, 2).toUpperCase()}
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          friend.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                        title={friend.isOnline ? 'Online' : 'Offline'}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors truncate">
                          {friend.name}
                        </span>
                        {friend.isOnline && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            online
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{friend.email}</div>
                      <div className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        Rekord: {friend.bestScore || 0}-yercha
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-xs text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>Tanlash</span> →
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* 2 TA NARSA CHIQADIGAN POPUP (CHAT YOKI 1VS1) */
          <div className="flex flex-col gap-4 animate-fade-in p-2">
            <button
              onClick={() => setSelectedFriend(null)}
              className="self-start flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> Ortga (Do'stlar ro'yxatiga)
            </button>

            {/* Friend banner */}
            <div className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg border-2 border-white/20 relative"
                style={{ backgroundColor: selectedFriend.color }}
              >
                {selectedFriend.name.slice(0, 2).toUpperCase()}
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                    selectedFriend.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
              </div>
              <div className="min-w-0">
                <div className="text-base font-extrabold text-white truncate">
                  {selectedFriend.name}
                </div>
                <div className="text-xs text-slate-400">{selectedFriend.email}</div>
                <div className="text-xs text-amber-400 font-bold mt-1">
                  ⭐ Rekord: {selectedFriend.bestScore || 0}-yercha
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-300 font-bold text-center uppercase tracking-wider text-indigo-400">
              Bajarmoqchi bo'lgan amalingizni tanlang:
            </div>

            {/* THE 2 CHOICES: 1) CHAT & GOLOS, 2) 1VS1 O'YIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Variant 1: Chat & Golos */}
              <button
                onClick={() => {
                  const fr = selectedFriend;
                  setSelectedFriend(null);
                  onSelectChat(fr);
                }}
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 hover:from-blue-900/60 hover:to-indigo-900/60 border-2 border-blue-500/40 hover:border-blue-400 flex flex-col items-center text-center gap-2.5 transition-all group active:scale-95 shadow-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-black text-white text-sm">1. Chat & Golos</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Xabar yozish va ovozli xabar (golos) yuborish
                  </div>
                </div>
              </button>

              {/* Variant 2: 1vs1 O'yin */}
              <button
                onClick={() => {
                  const fr = selectedFriend;
                  setSelectedFriend(null);
                  onSelect1vs1(fr);
                }}
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 hover:from-rose-900/60 hover:to-amber-900/60 border-2 border-rose-500/40 hover:border-rose-400 flex flex-col items-center text-center gap-2.5 transition-all group active:scale-95 shadow-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <Swords className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-black text-white text-sm">2. 1vs1 O'yin (Duel)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Do'stingiz bilan yakkama-yakka bellashuv boshlash!
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
