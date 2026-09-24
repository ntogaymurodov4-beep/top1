import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FriendUser, DirectMessage } from '../types/game';
import { X, Send, Mic, MicOff, Play, Pause, Volume2, Clock } from 'lucide-react';
import { voiceManager } from '../utils/voice';

interface DirectFriendChatModalProps {
  currentUser: UserProfile;
  friend: FriendUser;
  onClose: () => void;
  onSendRealtimeMessage?: (msg: DirectMessage) => void;
}

export const DirectFriendChatModal: React.FC<DirectFriendChatModalProps> = ({
  currentUser,
  friend,
  onClose,
}) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Fetch direct messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/friends/messages?user1=${currentUser.id}&user2=${friend.id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error('Failed to load friend messages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3500);
    return () => clearInterval(interval);
  }, [currentUser.id, friend.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send text message
  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    try {
      const res = await fetch('/api/friends/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: friend.id,
          text: textToSend,
        }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Start recording Voice Note ("Golos")
  const startRecordingGolos = async () => {
    const started = await voiceManager.startVoiceNote();
    if (started) {
      setIsRecordingVoice(true);
      setVoiceDuration(0);
      timerRef.current = setInterval(() => {
        setVoiceDuration((s) => s + 1);
      }, 1000);
    }
  };

  // Stop recording Voice Note and Send
  const stopAndSendGolos = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecordingVoice(false);

    const base64Audio = await voiceManager.stopVoiceNote();
    if (base64Audio) {
      try {
        const res = await fetch('/api/friends/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUser.id,
            receiverId: friend.id,
            audioData: base64Audio,
            text: '🎙️ Ovozli xabar (Golos)',
          }),
        });
        const data = await res.json();
        if (data.success && data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      } catch (e) {
        console.error('Failed to send voice note:', e);
      }
    }
  };

  const cancelRecordingGolos = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecordingVoice(false);
    voiceManager.stopVoiceNote();
  };

  // Play audio voice note
  const handlePlayVoice = (msgId: string, audioData: string) => {
    if (playingAudioId === msgId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(audioData);
    audioPlayerRef.current = audio;
    setPlayingAudioId(msgId);

    audio.onended = () => {
      setPlayingAudioId(null);
    };

    audio.play().catch((e) => {
      console.warn('Audio play error:', e);
      setPlayingAudioId(null);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[620px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md border-2 border-white/20"
              style={{ backgroundColor: friend.color }}
            >
              {friend.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">{friend.name}</h3>
                {friend.isOnline && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">⭐ Rekordi: {friend.bestScore}-yercha</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Xabarlar yuklanmoqda...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm flex flex-col items-center gap-2">
              <span className="text-4xl">💬</span>
              <span>Hozircha xabarlar yo'q. Birinchi bo'lib yozing yoki golos tashlang!</span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              const hasAudio = !!msg.audioData;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm shadow-md ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
                    }`}
                  >
                    {hasAudio ? (
                      <div className="flex items-center gap-3 py-1">
                        <button
                          onClick={() => handlePlayVoice(msg.id, msg.audioData!)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow ${
                            playingAudioId === msg.id
                              ? 'bg-amber-400 text-slate-950 animate-pulse'
                              : isMe
                              ? 'bg-blue-700 hover:bg-blue-800 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs flex items-center gap-1">
                            <Mic className="w-3.5 h-3.5 text-emerald-300" />
                            Ovozli xabar (Golos)
                          </span>
                          <span className="text-[11px] opacity-80">
                            {playingAudioId === msg.id ? "Tinglanmoqda..." : "Eshitish uchun bosing"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="break-words leading-relaxed">{msg.text}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">
                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Recording Active Bar */}
        {isRecordingVoice && (
          <div className="px-4 py-3 bg-rose-950/80 border-t border-rose-800 flex items-center justify-between text-rose-200 animate-pulse">
            <div className="flex items-center gap-2 font-medium text-sm">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span>Golos yozilmoqda... {voiceDuration}s</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecordingGolos}
                className="px-3 py-1 text-xs rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Bekor qilish
              </button>
              <button
                onClick={stopAndSendGolos}
                className="px-3.5 py-1 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition shadow"
              >
                Yuborish 🚀
              </button>
            </div>
          </div>
        )}

        {/* Chat Input & Voice Trigger */}
        {!isRecordingVoice && (
          <form
            onSubmit={handleSendText}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Xabar yozing..."
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />

            {/* Golos (Voice note button) */}
            <button
              type="button"
              onClick={startRecordingGolos}
              title="Golos (Ovozli xabar) tashlash"
              className="p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition flex items-center justify-center active:scale-95"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Text Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow active:scale-95 flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
