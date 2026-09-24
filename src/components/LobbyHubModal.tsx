import React, { useState, useEffect } from 'react';
import { UserProfile, FriendUser, LobbyInfo } from '../types/game';
import {
  X,
  Search,
  UserPlus,
  Users,
  Check,
  PhoneCall,
  MessageSquare,
  Play,
  Share2,
  Copy,
  Mic,
  Shield,
  Sparkles,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { DirectFriendChatModal } from './DirectFriendChatModal';

interface LobbyHubModalProps {
  currentUser: UserProfile;
  currentLobby: LobbyInfo | null;
  onClose: () => void;
  onCreateLobby: () => void;
  onJoinLobby: (code: string) => void;
  onLeaveLobby: () => void;
  onInviteFriend: (friendId: string, lobbyCode: string) => void;
  onStartLobbyGame: () => void;
  onEnterWorldGame: () => void;
}

export const LobbyHubModal: React.FC<LobbyHubModalProps> = ({
  currentUser,
  currentLobby,
  onClose,
  onCreateLobby,
  onJoinLobby,
  onLeaveLobby,
  onInviteFriend,
  onStartLobbyGame,
  onEnterWorldGame,
}) => {
  // Tabs: 'lobby' | 'friends'
  const [activeTab, setActiveTab] = useState<'lobby' | 'friends'>('lobby');

  // Friends & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [acceptedFriends, setAcceptedFriends] = useState<FriendUser[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendUser[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendUser[]>([]);

  // Join lobby input
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState(false);

  // Chatting friend modal
  const [chatFriend, setChatFriend] = useState<FriendUser | null>(null);

  // Load friend list
  const loadFriends = async () => {
    try {
      const res = await fetch(`/api/friends/list?userId=${currentUser.id}`);
      const data = await res.json();
      if (data) {
        setAcceptedFriends(data.accepted || []);
        setPendingReceived(data.pendingReceived || []);
        setPendingSent(data.pendingSent || []);
      }
    } catch (e) {
      console.error('Error loading friends:', e);
    }
  };

  useEffect(() => {
    loadFriends();
    const interval = setInterval(loadFriends, 4000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  // Search users live
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}&currentUserId=${currentUser.id}`
        );
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [searchQuery, currentUser.id]);

  // Send friend request (Drujba tashlash)
  const handleSendFriendRequest = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: targetUserId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadFriends();
        // Update local search results status
        setSearchResults((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, status: 'pending_sent' } : u))
        );
      }
    } catch (e) {
      console.error('Error sending friend request:', e);
    }
  };

  // Respond to incoming friend request (Qabul qilish / Rad etish)
  const handleRespondFriendRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendshipId,
          currentUserId: currentUser.id,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadFriends();
      }
    } catch (e) {
      console.error('Error responding to friend request:', e);
    }
  };

  // Invite friend to lobby
  const handleInviteToLobby = (friendId: string) => {
    if (!currentLobby) return;
    onInviteFriend(friendId, currentLobby.code);
    setInvitedFriendIds((prev) => new Set(prev).add(friendId));
  };

  const copyLobbyCode = () => {
    if (!currentLobby) return;
    navigator.clipboard.writeText(currentLobby.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isHost = currentLobby && currentLobby.hostId === currentUser.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl flex flex-col h-[88vh] max-h-[700px] overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Lobi & Do'stlar Markazi
                <span className="text-xs font-normal text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Online
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Do'stlar orttiring, golos tashlang va yopiq lobida birga sakrang!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Search Bar (Tepada qidiruv) */}
        <div className="px-6 pt-4 pb-2 bg-slate-900">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tepada qidiruv: Do'stlaringizni ismi yoki Gmail orqali qidiring..."
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown / Live Results */}
          {searchQuery.trim() && (
            <div className="mt-2 bg-slate-950 border border-slate-700 rounded-2xl p-2.5 shadow-2xl max-h-48 overflow-y-auto space-y-1.5 z-20">
              <div className="text-[11px] font-semibold text-slate-400 px-2">QIDIRUV NATIJALARI:</div>
              {isSearching ? (
                <div className="text-xs text-slate-400 py-2 text-center">Qidirilmoqda...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">Foydalanuvchi topilmadi</div>
              ) : (
                searchResults.map((resUser) => (
                  <div
                    key={resUser.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 hover:bg-slate-850 transition border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow"
                        style={{ backgroundColor: resUser.color }}
                      >
                        {resUser.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">{resUser.name}</div>
                        <div className="text-[10px] text-slate-400">{resUser.email}</div>
                      </div>
                    </div>

                    <div>
                      {resUser.status === 'accepted' ? (
                        <span className="text-[11px] text-emerald-400 font-semibold px-2 py-1 bg-emerald-950/60 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Do'st
                        </span>
                      ) : resUser.status === 'pending_sent' ? (
                        <span className="text-[11px] text-amber-300 px-2 py-1 bg-amber-950/60 rounded-lg border border-amber-500/30">
                          Kutilmoqda...
                        </span>
                      ) : resUser.status === 'pending_received' ? (
                        <span className="text-[11px] text-blue-300 px-2 py-1 bg-blue-950/60 rounded-lg border border-blue-500/30">
                          Sizga so'rov yuborgan
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(resUser.id)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Do'stlik tashlash
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Incoming Friend Requests Alert */}
        {pendingReceived.length > 0 && (
          <div className="mx-6 my-2 p-3 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 flex flex-col gap-2">
            <div className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Sizga do'stlik (drujba) so'rovi keldi ({pendingReceived.length}):
            </div>
            <div className="flex flex-col gap-1.5">
              {pendingReceived.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-indigo-500/20"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: req.color }}
                    >
                      {req.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">{req.name}</span>
                      <span className="text-[10px] text-slate-400 block">{req.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRespondFriendRequest(req.friendshipId!, 'accept')}
                      className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow transition"
                    >
                      Qabul qilish
                    </button>
                    <button
                      onClick={() => handleRespondFriendRequest(req.friendshipId!, 'reject')}
                      className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      Rad etish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex px-6 border-b border-slate-800 gap-4 mt-2">
          <button
            onClick={() => setActiveTab('lobby')}
            className={`pb-3 font-bold text-sm transition relative ${
              activeTab === 'lobby' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎮 Maxsus Lobi Xonasi
            {activeTab === 'lobby' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`pb-3 font-bold text-sm transition relative flex items-center gap-2 ${
              activeTab === 'friends' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Mening Do'stlarim ({acceptedFriends.length})
            {activeTab === 'friends' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {activeTab === 'lobby' && (
            <div>
              {!currentLobby ? (
                /* No Active Lobby: Options to Create or Join */
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Create Lobby Card */}
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-600/40 flex flex-col justify-between shadow-xl">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-3 shadow-lg">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">Yangi Lobi Ochish</h3>
                        <p className="text-xs text-slate-300 leading-relaxed mb-4">
                          Yopiq xona yarating, pastda faqat o'z do'stlaringizni taklif qiling va mikrofonda gaplashib birga sakrang!
                        </p>
                      </div>
                      <button
                        onClick={onCreateLobby}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> Lobi Yaratish
                      </button>
                    </div>

                    {/* Join Lobby Card */}
                    <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between shadow-xl">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-700/60 flex items-center justify-center text-indigo-300 mb-3 border border-indigo-500/30">
                          <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1">Do'st Lobisiga Qo'shilish</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                          Do'stingiz bergan 5 xonali Lobi kodini kiriting:
                        </p>
                        <input
                          type="text"
                          maxLength={6}
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          placeholder="KOD: MASALAN X8Z9A"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-sm font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (joinCodeInput.trim()) onJoinLobby(joinCodeInput.trim());
                        }}
                        disabled={!joinCodeInput.trim()}
                        className="w-full mt-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        Lobiga Kirish <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Or switch to World Game */}
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🌍</span>
                      <div>
                        <div className="text-xs font-bold text-emerald-300">
                          Dunyo bo'yicha barcha o'yinchilar bilan o'ynamoqchimisiz?
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Boshqa barcha kompyuter va telefonlardan kirgan odamlar bilan umumiy maydonda uchrashing.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onEnterWorldGame}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95 shrink-0"
                    >
                      Dunyo o'yiniga kirish 🚀
                    </button>
                  </div>
                </div>
              ) : (
                /* ACTIVE LOBBY VIEW */
                <div className="flex flex-col gap-5">
                  {/* Lobby Code & Status Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-300 block">LOBI KODI:</span>
                      <span className="text-2xl font-black tracking-widest text-white font-mono">
                        {currentLobby.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={copyLobbyCode}
                        className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Nusxa olindi!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Kodni nusxalash
                          </>
                        )}
                      </button>
                      <button
                        onClick={onLeaveLobby}
                        className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition"
                        title="Lobidan chiqish"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Members in this lobby */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      Lobidagi O'yinchilar ({currentLobby.members.length}):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentLobby.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow"
                              style={{ backgroundColor: m.color }}
                            >
                              {m.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {m.name}
                                {m.isHost && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                                    Host
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <Mic className="w-3 h-3 text-emerald-400" /> Mikrofonda tayyor
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">Tayyor ✅</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PASTDA DO'ST TAKLIF QILISH (Faqat qabul qilingan do'stlar) */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      Pastda Do'st Taklif Qilish (Faqat do'stlikni qabul qilgan do'stlaringiz):
                    </h4>
                    {acceptedFriends.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500">
                        Hozircha qabul qilingan do'stlaringiz yo'q. Tepada qidiruvdan do'stlik (drujba) tashlang!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {acceptedFriends.map((fr) => {
                          const alreadyInLobby = currentLobby.members.some((m) => m.id === fr.id);
                          const isInvited = invitedFriendIds.has(fr.id);

                          return (
                            <div
                              key={fr.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/80"
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow"
                                  style={{ backgroundColor: fr.color }}
                                >
                                  {fr.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    {fr.name}
                                    {fr.isOnline && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {fr.isOnline ? '🟢 Online' : '⚪ Offline'} • Rekord: {fr.bestScore}-yercha
                                  </span>
                                </div>
                              </div>

                              <div>
                                {alreadyInLobby ? (
                                  <span className="text-[11px] text-blue-400 font-semibold px-2 py-1 bg-blue-950/60 rounded-lg">
                                    Lobida ✅
                                  </span>
                                ) : isInvited ? (
                                  <span className="text-[11px] text-amber-300 font-semibold px-2 py-1 bg-amber-950/60 rounded-lg">
                                    Taklif yuborildi ⏳
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleInviteToLobby(fr.id)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition active:scale-95 flex items-center gap-1"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" /> Taklif qilish
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Start Game button (Host controls start) */}
                  <div className="pt-2">
                    {isHost ? (
                      <button
                        onClick={onStartLobbyGame}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Play className="w-5 h-5 fill-current" /> 🎮 O'YINNI BOSHLASH
                      </button>
                    ) : (
                      <div className="py-3 text-center text-xs text-amber-300 font-semibold bg-amber-950/40 rounded-xl border border-amber-600/30">
                        Host o'yinni boshlashini kutyapmiz...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'friends' && (
            /* FRIENDS TAB: Direct chat & Voice Message (Golos) */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Qabul qilingan do'stlar ({acceptedFriends.length})</span>
                <span>Yozishish va Golos tashlash mumkin</span>
              </div>

              {acceptedFriends.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm flex flex-col items-center gap-2">
                  <Users className="w-8 h-8 text-slate-600" />
                  <span>Sizda hali do'stlar yo'q.</span>
                  <span className="text-xs text-slate-400">
                    Tepadagi qidiruvdan do'stingizning ismi yoki Gmail orqali qidiring va do'stlik tashlang!
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {acceptedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow"
                          style={{ backgroundColor: friend.color }}
                        >
                          {friend.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {friend.name}
                            {friend.isOnline && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Online
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            ⭐ Rekordi: {friend.bestScore}-yercha • {friend.email}
                          </span>
                        </div>
                      </div>

                      {/* Chat & Golos Button */}
                      <button
                        onClick={() => setChatFriend(friend)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        Chat & Golos
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Direct Friend Chat Modal */}
      {chatFriend && (
        <DirectFriendChatModal
          currentUser={currentUser}
          friend={chatFriend}
          onClose={() => setChatFriend(null)}
        />
      )}
    </div>
  );
};
