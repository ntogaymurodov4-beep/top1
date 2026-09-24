/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw, Maximize } from 'lucide-react';

export const LandscapePrompt: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Touch device check
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (!isTouch) {
        setIsPortrait(false);
        return;
      }

      // Check if width is smaller than height (Portrait mode)
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      // Attempt screen orientation lock if supported by modern mobile browser
      if (screen.orientation && 'lock' in screen.orientation) {
        // @ts-ignore
        await screen.orientation.lock('landscape');
      }
    } catch (e) {
      console.log('Fullscreen/orientation lock notice:', e);
    }
    setDismissed(true);
  };

  if (!isPortrait || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
      {/* Animated Phone Rotation Icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-cyan-500/20 border-2 border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.4)] animate-pulse">
          <Smartphone className="w-12 h-12 rotate-90 animate-bounce" />
        </div>
        <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
          <RotateCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase mb-2">
        Telefonni yotgan holatga buring!
      </h2>

      {/* Description */}
      <p className="text-sm text-cyan-200/90 max-w-sm mb-6 leading-relaxed">
        Katta o'yinlar kabi qulay o'ynash uchun telefoningizni yonga (gorizontal / landscape) aylantiring.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleRequestLandscape}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-900/50 border border-cyan-400/50 active:scale-95 transition-all"
        >
          <Maximize className="w-4 h-4" />
          <span>TO'LIQ EKRAN (GORIZONTAL)</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          Tik holatda davom etish
        </button>
      </div>
    </div>
  );
};
