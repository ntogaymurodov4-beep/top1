/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';

interface MobileControlsProps {
  onMove: (vector: { x: number; y: number }) => void;
  onJump: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onMove, onJump }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Left side joystick active touch position & origin
  const [activeTouch, setActiveTouch] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  // Right side jump visual ripple
  const [jumpRipple, setJumpRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const moveTouchIdRef = useRef<number | null>(null);
  const moveOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
  }, []);

  if (!isTouchDevice) return null;

  // Handle global touch events for left side (movement) and right side (jump)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const screenWidth = window.innerWidth;
    const midX = screenWidth * 0.5;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Check if touch is on LEFT half -> Movement Joystick
      if (touch.clientX < midX) {
        if (moveTouchIdRef.current === null) {
          moveTouchIdRef.current = touch.identifier;
          moveOriginRef.current = { x: touch.clientX, y: touch.clientY };
          setActiveTouch({
            startX: touch.clientX,
            startY: touch.clientY,
            currX: touch.clientX,
            currY: touch.clientY,
          });
        }
      } else {
        // Touch is on RIGHT half -> Instant Jump!
        onJump();

        // Show subtle neon splash ring where finger tapped
        setJumpRipple({
          x: touch.clientX,
          y: touch.clientY,
          id: Date.now() + Math.random(),
        });

        // Auto-dismiss ripple
        setTimeout(() => {
          setJumpRipple(null);
        }, 400);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (moveTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === moveTouchIdRef.current) {
        const origin = moveOriginRef.current;
        let dx = touch.clientX - origin.x;
        let dy = touch.clientY - origin.y;

        const maxRadius = 55;
        const dist = Math.hypot(dx, dy);

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        setActiveTouch({
          startX: origin.x,
          startY: origin.y,
          currX: origin.x + dx,
          currY: origin.y + dy,
        });

        // Normalize movement vector: x [-1, 1], y [-1, 1] (y is inverted: up is forward)
        const normX = dx / maxRadius;
        const normY = -dy / maxRadius;
        onMove({ x: normX, y: normY });
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === moveTouchIdRef.current) {
        moveTouchIdRef.current = null;
        setActiveTouch(null);
        onMove({ x: 0, y: 0 });
        break;
      }
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="fixed inset-0 z-25 pointer-events-auto select-none touch-none"
      style={{
        // Allow clicks on top HUD buttons while capturing game touch area
        top: '68px',
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      {/* 1. Left side: Dynamic Floating Joystick - ONLY visible when touching */}
      {activeTouch && (
        <div
          style={{
            left: `${activeTouch.startX}px`,
            top: `${activeTouch.startY - 68}px`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in zoom-in-75 duration-100"
        >
          {/* Subtle outer neon ring */}
          <div className="w-28 h-28 rounded-full border-2 border-cyan-400/40 bg-cyan-950/20 backdrop-blur-[2px] shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center">
            {/* Center knob following touch */}
            <div
              style={{
                transform: `translate(${activeTouch.currX - activeTouch.startX}px, ${
                  activeTouch.currY - activeTouch.startY
                }px)`,
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 border-2 border-white shadow-lg shadow-cyan-500/50"
            />
          </div>
        </div>
      )}

      {/* 2. Right side: Jump tap ripple effect */}
      {jumpRipple && (
        <div
          key={jumpRipple.id}
          style={{
            left: `${jumpRipple.x}px`,
            top: `${jumpRipple.y - 68}px`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="w-20 h-20 rounded-full border-2 border-emerald-400/80 bg-emerald-500/20 animate-ping" />
        </div>
      )}

      {/* 3. Subtle bottom hints that fade out (non-intrusive) */}
      <div className="absolute bottom-3 left-4 pointer-events-none opacity-40 text-[10px] font-bold text-cyan-200 uppercase tracking-widest bg-slate-900/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
        👈 Chap: Yurgich
      </div>
      <div className="absolute bottom-3 right-4 pointer-events-none opacity-40 text-[10px] font-bold text-emerald-200 uppercase tracking-widest bg-slate-900/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
        O'ng: Sakrash 👉
      </div>
    </div>
  );
};
