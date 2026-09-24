import React from 'react';
import { LobbyInvite } from '../types/game';
import { Users, Check, X } from 'lucide-react';

interface LobbyInviteBannerProps {
  invite: LobbyInvite;
  onAccept: () => void;
  onDecline: () => void;
}

export const LobbyInviteBanner: React.FC<LobbyInviteBannerProps> = ({
  invite,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="fixed top-5 right-5 z-50 animate-bounce-short">
      <div className="bg-slate-900 border-2 border-indigo-500 rounded-3xl p-4 shadow-2xl backdrop-blur-md flex items-center gap-3.5 max-w-md">
        <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg">
          <Users className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="text-xs font-bold text-indigo-400">LOBI TAKLIFI KELDI!</div>
          <div className="text-sm font-extrabold text-white">
            {invite.hostName} sizni lobisiga taklif qildi!
          </div>
          <div className="text-[11px] text-slate-400">Kod: {invite.lobbyCode}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg flex items-center justify-center active:scale-95"
            title="Qo'shilish"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onDecline}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center"
            title="Rad etish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
