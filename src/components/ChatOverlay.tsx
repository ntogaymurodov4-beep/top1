import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Smile, ChevronDown, Mic, Play, Pause } from 'lucide-react';
import { ChatMessage } from '../types/game';
import { voiceManager } from '../utils/voice';

interface ChatOverlayProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, audioUrl?: string) => void;
  onSendEmoji: (emoji: string) => void;
}

const QUICK_EMOJIS = ['🔥', '🚀', '😂', '👏', '⚡', '👑', '😱'];
const QUICK_PHRASES = ['Salom barchaga! 👋', 'Olg\'a! 🚀', 'Yiqilib tushdim 😂', 'Yangi rekord! 🏆'];

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  messages,
  onSendMessage,
  onSendEmoji,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [showQuickPhrases, setShowQuickPhrases] = useState(false);
  const [isRecordingGolos, setIsRecordingGolos] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleRecordGolosToggle = async () => {
    if (isRecordingGolos) {
      setIsRecordingGolos(false);
      const audioData = await voiceManager.stopVoiceNote();
      if (audioData) {
        onSendMessage('🎙️ Golos (Ovozli xabar)', audioData);
      }
    } else {
      const started = await voiceManager.startVoiceNote();
      if (started) {
        setIsRecordingGolos(true);
      }
    }
  };

  const playVoiceNote = (msgId: string, audioUrl: string) => {
    if (playingAudioId === msgId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }
    audioRef.current?.pause();
    const aud = new Audio(audioUrl);
    audioRef.current = aud;
    setPlayingAudioId(msgId);
    aud.onended = () => setPlayingAudioId(null);
    aud.play().catch(() => setPlayingAudioId(null));
  };

  return (
    <div className="fixed bottom-4 left-4 z-30 flex flex-col gap-2 max-w-sm pointer-events-none">
      {/* Quick Floating Message Previews (when chat is collapsed) */}
      {!isOpen && (
        <div className="flex flex-col gap-1.5 max-h-36 overflow-hidden pointer-events-none">
          {messages.slice(-3).map((m) => (
            <div
              key={m.id}
              className="bg-slate-900/80 backdrop-blur-md border border-slate-700/60 py-1.5 px-3 rounded-2xl shadow-lg text-xs text-white flex items-center gap-2 max-w-xs animate-fade-in"
            >
              <span className="font-bold shrink-0" style={{ color: m.color }}>
                {m.name}:
              </span>
              <span className="truncate text-slate-200">
                {m.audioUrl ? '🎙️ [Ovozli xabar]' : m.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Emojis Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/70 rounded-2xl shadow-lg pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-xl transition-colors ${
            isOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
          title="Chatni ochish"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 overflow-x-auto py-0.5 px-1 scrollbar-none">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendEmoji(emoji)}
              className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-lg active:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-md p-4 flex flex-col gap-3 pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              O'yinchilar Chati (Yozish & Golos)
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="h-44 overflow-y-auto space-y-2 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Hali xabarlar yo'q. Birinchi bo'lib salom bering yoki golos tashlang!
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold" style={{ color: m.color }}>
                      {m.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {m.audioUrl ? (
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => playVoiceNote(m.id, m.audioUrl!)}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow"
                      >
                        {playingAudioId === m.id ? (
                          <Pause className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        Golosni eshitish
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-200 break-words">{m.text}</div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick predefined phrases */}
          {showQuickPhrases && (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-800/80 p-2 rounded-2xl border border-slate-700/50">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => {
                    onSendMessage(phrase);
                    setShowQuickPhrases(false);
                  }}
                  className="text-left text-[11px] p-1.5 rounded-lg bg-slate-700/60 hover:bg-blue-600 text-slate-200 hover:text-white transition-colors truncate"
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}

          {/* Input Form with Golos Mic Button */}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQuickPhrases(!showQuickPhrases)}
              title="Tezkor iboralar"
              className={`p-2.5 rounded-xl border transition-colors ${
                showQuickPhrases
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Golos record button */}
            <button
              type="button"
              onClick={handleRecordGolosToggle}
              title={isRecordingGolos ? "Golosni yuborish" : "Golos (Ovozli xabar) tashlash"}
              className={`p-2.5 rounded-xl border transition-colors ${
                isRecordingGolos
                  ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                  : 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-500/40 text-emerald-400'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isRecordingGolos ? "Golos yozilmoqda... Tugmani bosing!" : "Xabar yozing..."}
              maxLength={80}
              disabled={isRecordingGolos}
              className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={!text.trim() || isRecordingGolos}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
