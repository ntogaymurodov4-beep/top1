/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { DuelInvite } from '../types/game';
import { Swords, Check, X, ShieldAlert } from 'lucide-react';
import { sound } from '../utils/audio';

interface DuelInviteBannerProps {
  invite: DuelInvite;
  onAccept: () => void;
  onDecline: () => void;
}

export const DuelInviteBanner: React.FC<DuelInviteBannerProps> = ({
  invite,
  onAccept,
  onDecline,
}) => {
  // Play alert sound when 1vs1 invite arrives
  useEffect(() => {
    sound.playDuelStart();
  }, []);

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-3 animate-in slide-in-from-top-6 duration-300 select-none">
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.45)] rounded-3xl p-4 sm:p-5 backdrop-blur-2xl overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute -right-10 -top-10 w-36 h-36 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-black tracking-wider uppercase animate-pulse">
            <Swords className="w-4 h-4 text-rose-400" />
            <span>1 VS 1 JANG TAKLIFI!</span>
          </div>

          <div className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
            KOD: {invite.duelCode}
          </div>
        </div>

        {/* Main Invite Info */}
        <div className="flex items-center gap-3.5 mb-4">
          <div
            className="w-14 h-14 rounded-2xl border-2 border-white/40 flex items-center justify-center font-black text-2xl text-white shadow-xl shrink-0"
            style={{ backgroundColor: invite.hostColor || '#f43f5e' }}
          >
            {invite.hostName ? invite.hostName.charAt(0).toUpperCase() : '⚔️'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-base sm:text-lg font-black text-white truncate flex items-center gap-1.5">
              <span>{invite.hostName}</span>
              <span className="text-slate-400 font-medium text-xs sm:text-sm">sizni duelga chaqirdi!</span>
            </div>
            <p className="text-xs text-rose-300/90 font-medium mt-0.5">
              Tugmani bossangiz, ikkalangiz bir vaqtda 1vs1 xonasiga kirasiz!
            </p>
          </div>
        </div>

        {/* Action Buttons: Big & Clear */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              sound.playDuelStart();
              onAccept();
            }}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 border border-emerald-400/50 transition-all active:scale-95 group"
          >
            <Check className="w-5 h-5 group-hover:scale-125 transition-transform" />
            <span>⚔️ KIRISH (BOSHLASH)</span>
          </button>

          <button
            onClick={onDecline}
            className="py-3.5 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-95 shrink-0"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Rad etish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
