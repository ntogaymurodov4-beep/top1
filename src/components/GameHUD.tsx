import React, { useState } from 'react';
import { UserProfile, PlayerNetState } from '../types/game';
import {
  Trophy,
  Users,
  Volume2,
  VolumeX,
  RotateCcw,
  Flag,
  LogOut,
  HelpCircle,
  Sparkles,
  Mic,
  MicOff,
  Home,
  Globe,
  Radio,
  Bell,
  Swords,
  UserPlus,
  Maximize,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface GameHUDProps {
  user: UserProfile;
  currentBlock: number;
  maxBlock: number;
  distance: number;
  onlineCount: number;
  remotePlayers: Record<string, PlayerNetState>;
  roomId: string;
  isMicActive: boolean;
  isSelfSpeaking: boolean;
  pendingRequestsCount?: number;
  onToggleMic: () => void;
  onOpenLeaderboard: () => void;
  onOpenMenu: () => void;
  onOpenLobbyHub: () => void;
  onOpenFriendsList?: () => void;
  onOpenFriendRequests?: () => void;
  onOpenDuelInvite?: () => void;
  onOpenPlayerReaction?: (player: PlayerNetState) => void;
  onRespawn: () => void;
  onCheckpointRespawn: () => void;
  onLogout: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  user,
  currentBlock,
  maxBlock,
  distance,
  onlineCount,
  remotePlayers,
  roomId,
  isMicActive,
  isSelfSpeaking,
  pendingRequestsCount = 0,
  onToggleMic,
  onOpenLeaderboard,
  onOpenMenu,
  onOpenLobbyHub,
  onOpenFriendsList,
  onOpenFriendRequests,
  onOpenDuelInvite,
  onOpenPlayerReaction,
  onRespawn,
  onCheckpointRespawn,
  onLogout,
}) => {
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setMuted(!sound.enabled);
  };

  const isWorld = roomId === 'world';
  const isDuel = roomId.startsWith('duel_');
  const isLobby = roomId.startsWith('lobby_');

  const lobbyCode = isLobby ? roomId.replace('lobby_', '') : null;
  const duelCode = isDuel ? roomId.replace('duel_', '') : null;

  // Active talking players
  const speakingPlayers = Object.values(remotePlayers).filter((p) => p.isSpeaking);

  // Compile active players for live mini-leaderboard
  const allActivePlayers = [
    {
      id: user.id,
      name: user.name,
      color: user.color,
      block: currentBlock,
      isSpeaking: isSelfSpeaking,
      isSelf: true,
    },
    ...Object.values(remotePlayers).map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      block: p.currentBlock || 0,
      isSpeaking: !!p.isSpeaking,
      isSelf: false,
    })),
  ].sort((a, b) => b.block - a.block);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 md:p-5">
      {/* Top Bar */}
      <div className="flex items-start justify-between w-full gap-2 md:gap-3">
        {/* Left: Player Profile, Bell & Mode Indicator */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 p-2 pl-2.5 pr-3.5 rounded-2xl shadow-lg">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform hover:scale-105 active:scale-95 border-2 border-white/20 shrink-0"
              style={{ backgroundColor: user.color }}
            >
              {user.name.slice(0, 2).toUpperCase()}
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white leading-tight max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isWorld ? (
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-500/30 flex items-center gap-1">
                    <Globe className="w-2.5 h-2.5" /> Dunyo
                  </span>
                ) : isDuel ? (
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/30 flex items-center gap-1">
                    <Swords className="w-2.5 h-2.5" /> 1vs1 Duel
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-500/30 flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" /> Lobi: {lobbyCode}
                  </span>
                )}
              </div>
            </div>

            {/* QO'NG'IROQCHA (BELL ICON) FOR FRIEND REQUESTS */}
            {onOpenFriendRequests && (
              <button
                onClick={onOpenFriendRequests}
                className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/50 transition-all shadow active:scale-95 ml-1"
                title="Do'stlik so'rovlari"
              >
                <Bell className="w-4 h-4" />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] ring-2 ring-slate-900 animate-bounce">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}

            {/* PROMINENT TOP "O'YINDAN CHIQISH" (ASOSIY MENYU) BUTTON */}
            <button
              onClick={onOpenMenu}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs shadow-md shadow-rose-950/50 border border-rose-400/40 active:scale-95 transition-all ml-1 shrink-0"
              title="O'yindan chiqish va asosiy menyuga qaytish"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="tracking-wide uppercase">Chiqish</span>
            </button>
          </div>

          {/* User popup dropdown */}
          {showUserMenu && (
            <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-56 flex flex-col gap-2.5 text-xs text-slate-300 animate-fade-in">
              <div className="border-b border-slate-800 pb-2">
                <div className="text-white font-bold">{user.name}</div>
                <div className="text-slate-400 text-[11px] truncate">{user.email}</div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Maksimal rekord:</span>
                <span className="font-bold text-amber-400">{maxBlock}-yercha</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Xonada online:</span>
                <span className="font-bold text-emerald-400">{onlineCount} kishi</span>
              </div>
              <button
                onClick={onOpenMenu}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/30 transition-colors font-semibold"
              >
                <Home className="w-3.5 h-3.5" />
                Asosiy Menyu
              </button>
              <button
                onClick={onLogout}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-500/30 transition-colors font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Akkauntdan chiqish
              </button>
            </div>
          )}
        </div>

        {/* Center: Live Current Block / Distance Display & Speaking Banner & 1vs1 Top Bar */}
        <div className="flex flex-col items-center gap-1.5">
          {/* In 1vs1 mode: Prominent Top Invite Friend Button */}
          {isDuel && onOpenDuelInvite && (
            <button
              onClick={onOpenDuelInvite}
              className="pointer-events-auto px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:brightness-110 text-white font-black text-xs shadow-xl shadow-rose-950/60 border border-amber-400/50 flex items-center gap-1.5 active:scale-95 animate-pulse"
              title="Do'stlarni 1vs1 duelga chaqirish"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>⚔️ DO'ST TAKLIF QILISH (1VS1)</span>
            </button>
          )}

          <div className="bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 backdrop-blur-md border-2 border-blue-500/50 rounded-2xl px-5 py-2 shadow-2xl shadow-blue-500/20 text-center">
            <div className="text-[11px] uppercase tracking-widest font-bold text-blue-400">
              {isDuel ? '1vs1 Duel Hozirgi Yercha' : 'Hozirgi Turburchak'}
            </div>
            <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-400 drop-shadow">
              {currentBlock}
              <span className="text-sm font-semibold text-slate-400 ml-1.5">yercha</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Masofa: <span className="text-white font-bold">{distance} m</span>
            </div>
          </div>

          {/* Active Speaking Status Indicator */}
          {(isSelfSpeaking || speakingPlayers.length > 0) && (
            <div className="flex items-center gap-2 bg-emerald-950/90 border border-emerald-500/50 px-3.5 py-1 rounded-full text-xs text-emerald-200 backdrop-blur-md shadow-lg animate-pulse">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isSelfSpeaking
                  ? '🎙️ Siz gapiryapsiz...'
                  : `🔊 ${speakingPlayers.map((p) => p.name).join(', ')} gapirmoqda`}
              </span>
            </div>
          )}
        </div>

        {/* Right: Live Voice Chat, Friends Button, Menu & Quick Actions */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 p-1.5 rounded-2xl shadow-lg">
            {/* Realtime Microphone Toggle Button */}
            <button
              onClick={onToggleMic}
              title={isMicActive ? "Mikrofonni o'chirish" : "Mikrofonni yoqish"}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 font-bold text-xs ${
                isMicActive
                  ? isSelfSpeaking
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-400/50 ring-2 ring-emerald-300 animate-pulse'
                    : 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden md:inline">{isMicActive ? 'Mic: On' : 'Mic: Off'}</span>
            </button>

            {/* Do'stlarim button */}
            {onOpenFriendsList && (
              <button
                onClick={onOpenFriendsList}
                title="Do'stlarim & 1vs1"
                className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1 text-xs font-semibold"
              >
                <Users className="w-4 h-4" />
                <span className="hidden md:inline">Do'stlarim</span>
              </button>
            )}

            {/* Mode selection menu */}
            <button
              onClick={onOpenMenu}
              title="Asosiy Menyu"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
            >
              <Home className="w-4 h-4" />
            </button>

            {/* Leaderboard button */}
            <button
              onClick={onOpenLeaderboard}
              title="Reyting jadvali"
              className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
            >
              <Trophy className="w-4 h-4" />
            </button>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              title={muted ? 'Ovozni yoqish' : 'Ovozni o\'chirish'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </button>

            {/* Fullscreen / Landscape toggle */}
            <button
              onClick={async () => {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    if (screen.orientation && 'lock' in screen.orientation) {
                      // @ts-ignore
                      await screen.orientation.lock('landscape');
                    }
                  } else {
                    await document.exitFullscreen();
                  }
                } catch (e) {}
              }}
              title="To'liq ekran / Gorizontal rejim"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
            >
              <Maximize className="w-4 h-4" />
            </button>

            {/* Help */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              title="Yo'riqnoma"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Mini Live Room Board */}
          <div className="hidden sm:flex flex-col bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-2.5 w-48 shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 border-b border-slate-800 pb-1">
              <span className="flex items-center gap-1">
                {isDuel ? (
                  <>
                    <Swords className="w-3.5 h-3.5 text-rose-400" />
                    1vs1 Duel ({onlineCount})
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    {isWorld ? "Dunyo" : "Lobi"} ({onlineCount})
                  </>
                )}
              </span>
              <span>Yercha</span>
            </div>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
              {allActivePlayers.slice(0, 5).map((pl, idx) => (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (!pl.isSelf && remotePlayers[pl.id] && onOpenPlayerReaction) {
                      onOpenPlayerReaction(remotePlayers[pl.id]);
                    }
                  }}
                  className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg transition ${
                    pl.isSelf
                      ? 'bg-blue-600/30 border border-blue-500/40 font-bold text-white'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer active:scale-95'
                  }`}
                  title={!pl.isSelf ? `${pl.name} ga tezkor emoji reaksiya yuborish` : undefined}
                >
                  <span className="flex items-center gap-1.5 truncate max-w-[110px]">
                    <span className="text-[10px] text-slate-400">#{idx + 1}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: pl.color }}
                    />
                    <span className="truncate">{pl.name}</span>
                    {pl.isSpeaking && (
                      <Mic className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
                    )}
                    {!pl.isSelf && (
                      <span className="text-[10px] opacity-70 hover:opacity-100" title="Reaksiya">
                        👋
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-amber-300 font-semibold">{pl.block}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal Popup */}
      {showHelp && (
        <div className="pointer-events-auto self-center bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 shadow-2xl backdrop-blur-md max-w-sm w-full text-slate-300 text-xs">
          <div className="flex items-center justify-between font-bold text-white text-sm mb-3 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              O'yin qoidalari va Mikrofon
            </span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-white text-base"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2.5">
            <div>
              <span className="font-bold text-blue-400">Mikrofon (Ovozli chat):</span> Tepada mikrofon tugmasini yoqing va to'g'ridan-to'g'ri o'ynab turgan do'stlaringiz bilan real vaqtda gaplashing!
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl space-y-1 font-mono text-[11px]">
              <div><span className="text-white font-bold">W / A / S / D</span> yoki Strelkalar: Harakat</div>
              <div><span className="text-white font-bold">Probel (Space)</span>: Sakrash</div>
              <div><span className="text-white font-bold">Sichqoncha bilan surish</span>: Kamerani aylantirish</div>
              <div><span className="text-white font-bold">Mobil qurilma</span>: Chap joystik + O'ng sakrash</div>
            </div>
            <div className="text-[11px] text-slate-400">
              💡 Har 10-yercha oltin rangdagi <span className="text-amber-400 font-bold">Checkpoint</span>. Yashil yerchalar esa baland sakratuvchi batutlar!
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Checkpoint & Respawn Controls */}
      <div className="flex items-center justify-between w-full pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onRespawn}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs font-semibold transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            Boshidan
          </button>
          <button
            onClick={onCheckpointRespawn}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-lg text-xs font-semibold transition-all active:scale-95"
          >
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            Oxirgi Checkpoint
          </button>
        </div>
      </div>
    </div>
  );
};
