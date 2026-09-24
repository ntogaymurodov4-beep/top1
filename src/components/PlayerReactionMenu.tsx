/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerNetState } from '../types/game';
import { X, Swords, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface PlayerReactionMenuProps {
  targetPlayer: PlayerNetState;
  screenPos?: { x: number; y: number } | null;
  onSendReaction: (targetPlayerId: string, emoji: string, label: string) => void;
  onChallenge1vs1?: (targetPlayer: PlayerNetState) => void;
  onClose: () => void;
}

const REACTIONS = [
  { emoji: '👋', label: 'Salomlashish', soundKey: 'salom', desc: 'Salom!' },
  { emoji: '👏', label: 'Qarsak', soundKey: 'applause', desc: 'Qarsaklar!' },
  { emoji: '😂', label: 'Kulgi', soundKey: 'laugh', desc: 'Hahaha!' },
  { emoji: '🔥', label: 'Olov', soundKey: 'fire', desc: "Zo'rsan!" },
  { emoji: '❤️', label: 'Yurak', soundKey: 'salom', desc: "Do'stlik!" },
  { emoji: '🎉', label: 'Tabrik', soundKey: 'applause', desc: 'Qoyil!' },
];

export const PlayerReactionMenu: React.FC<PlayerReactionMenuProps> = ({
  targetPlayer,
  screenPos,
  onSendReaction,
  onChallenge1vs1,
  onClose,
}) => {
  const handleSelect = (emoji: string, label: string, soundKey: string) => {
    if (soundKey === 'salom') sound.playSalom();
    else if (soundKey === 'applause') sound.playApplause();
    else if (soundKey === 'laugh') sound.playLaugh();
    else if (soundKey === 'fire') sound.playFire();

    onSendReaction(targetPlayer.id, emoji, label);
    onClose();
  };

  // Position nicely on screen or center if no coordinates
  const style: React.CSSProperties = screenPos
    ? {
        position: 'fixed',
        left: `${Math.min(Math.max(screenPos.x - 140, 16), window.innerWidth - 300)}px`,
        top: `${Math.min(Math.max(screenPos.y - 170, 70), window.innerHeight - 340)}px`,
        zIndex: 60,
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
      };

  return (
    <>
      {/* Invisible backdrop to dismiss on click outside */}
      <div
        className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        style={style}
        className="bg-slate-900/95 border-2 border-cyan-500/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl w-72 animate-in fade-in zoom-in-95 duration-150 select-none"
      >
        {/* Header with target player info */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center font-bold text-xs text-white shadow-md"
              style={{ backgroundColor: targetPlayer.color || '#3b82f6' }}
            >
              {targetPlayer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1">
                <span>{targetPlayer.name}</span>
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-[10px] text-cyan-300/80">
                {targetPlayer.currentBlock || 0}-yercha | Rekord: {targetPlayer.score || 0}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reaction Emoji Grid */}
        <div className="text-[11px] font-semibold text-slate-400 mb-2 px-0.5">
          Tezkor emoji reaksiya yuborish:
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {REACTIONS.map((r) => (
            <button
              key={r.label}
              onClick={() => handleSelect(r.emoji, r.label, r.soundKey)}
              className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-800/80 hover:bg-cyan-500/20 hover:border-cyan-400/60 border border-slate-700/60 transition active:scale-90 group"
            >
              <span className="text-2xl mb-0.5 group-hover:scale-125 transition-transform">
                {r.emoji}
              </span>
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-cyan-300">
                {r.label}
              </span>
            </button>
          ))}
        </div>

        {/* 1vs1 Challenge Button right from character click */}
        {onChallenge1vs1 && (
          <button
            onClick={() => {
              onChallenge1vs1(targetPlayer);
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition active:scale-95"
          >
            <Swords className="w-4 h-4" />
            <span>1VS1 DUELGA CHAQIRISH</span>
          </button>
        )}
      </div>
    </>
  );
};
