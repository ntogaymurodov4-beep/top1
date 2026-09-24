/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserProfile,
  PlayerNetState,
  ChatMessage,
  LobbyInfo,
  LobbyInvite,
  FriendUser,
  FriendRequestNotification,
  DuelInvite,
} from './types/game';
import { AuthModal } from './components/AuthModal';
import { GameCanvas } from './game/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ChatOverlay } from './components/ChatOverlay';
import { MobileControls } from './components/MobileControls';
import { MainMenuModal } from './components/MainMenuModal';
import { LobbyHubModal } from './components/LobbyHubModal';
import { LobbyInviteBanner } from './components/LobbyInviteBanner';
import { FriendsListModal } from './components/FriendsListModal';
import { FriendRequestsModal } from './components/FriendRequestsModal';
import { DirectFriendChatModal } from './components/DirectFriendChatModal';
import { DuelInviteModal } from './components/DuelInviteModal';
import { DuelInviteBanner } from './components/DuelInviteBanner';
import { PlayerReactionMenu } from './components/PlayerReactionMenu';
import { LandscapePrompt } from './components/LandscapePrompt';
import { voiceManager } from './utils/voice';
import { sound } from './utils/audio';

interface ToastItem {
  id: string;
  text: string;
  type: 'join' | 'leave' | 'record' | 'fell' | 'info' | 'voice' | 'friend';
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'menu' | 'game'>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<string>('world');

  // Lobby States
  const [showLobbyHub, setShowLobbyHub] = useState<boolean>(false);
  const [currentLobby, setCurrentLobby] = useState<LobbyInfo | null>(null);
  const [lobbyInvite, setLobbyInvite] = useState<LobbyInvite | null>(null);

  // Friends & Notifications States (Qo'ng'iroqcha & Do'stlarim)
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequestNotification[]>([]);
  const [showFriendsListModal, setShowFriendsListModal] = useState<boolean>(false);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState<boolean>(false);
  const [chatFriend, setChatFriend] = useState<FriendUser | null>(null);

  // 1vs1 Duel States
  const [currentDuelCode, setCurrentDuelCode] = useState<string | null>(null);
  const [showDuelInviteModal, setShowDuelInviteModal] = useState<boolean>(false);
  const [duelInvite, setDuelInvite] = useState<DuelInvite | null>(null);
  const [duelWaitingInfo, setDuelWaitingInfo] = useState<{ targetName: string; duelCode: string } | null>(null);

  // Player Interaction & Quick Emoji Reactions State
  const [reactionTarget, setReactionTarget] = useState<{
    player: PlayerNetState;
    screenPos?: { x: number; y: number } | null;
  } | null>(null);

  // Voice Chat States
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [isSelfSpeaking, setIsSelfSpeaking] = useState<boolean>(false);

  // Multiplayer States
  const [remotePlayers, setRemotePlayers] = useState<Record<string, PlayerNetState>>({});
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Gameplay HUD states
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [maxBlock, setMaxBlock] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [respawnTrigger, setRespawnTrigger] = useState<number>(0);
  const [checkpointRespawnTrigger, setCheckpointRespawnTrigger] = useState<number>(0);

  // Mobile controls state
  const [joystickVector, setJoystickVector] = useState({ x: 0, y: 0 });
  const [mobileJumpCounter, setMobileJumpCounter] = useState<number>(0);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Helper to add toast messages
  const addToast = useCallback((text: string, type: ToastItem['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Check saved profile in device localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('turburchak_player_profile');
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          setUser(parsed);
          setMaxBlock(parsed.bestScore || 0);
        }
      }
    } catch (e) {
      console.error('Error reading saved profile:', e);
    }
  }, []);

  // Fetch Friends List & Pending Requests (for Qo'ng'iroqcha Bell)
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends/list?userId=${user.id}`);
      const data = await res.json();
      if (data.accepted) {
        setFriends(data.accepted);
      }
      if (data.pendingReceived) {
        setPendingRequests(
          data.pendingReceived.map((p: any) => ({
            id: p.friendshipId || p.id,
            sender: {
              id: p.id,
              name: p.name,
              email: p.email || '',
              color: p.color || '#3b82f6',
              bestScore: p.bestScore || 0,
            },
            time: Date.now(),
          }))
        );
      }
    } catch (e) {
      console.error('Failed to fetch friends:', e);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchFriends();
    const interval = setInterval(fetchFriends, 12000);
    return () => clearInterval(interval);
  }, [user, fetchFriends]);

  // Initialize Voice Manager callbacks
  useEffect(() => {
    const unsubSpeaking = voiceManager.onSpeakingChange((speaking) => {
      setIsSelfSpeaking(speaking);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'voice:speaking',
            data: { speaking },
          })
        );
      }
    });

    const unsubChunk = voiceManager.onAudioChunk((chunkBase64) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'voice:stream',
            data: { chunk: chunkBase64 },
          })
        );
      }
    });

    return () => {
      unsubSpeaking();
      unsubChunk();
    };
  }, []);

  // Toggle Microphone
  const handleToggleMic = async () => {
    const enabled = await voiceManager.toggleMicrophone();
    setMicEnabled(enabled);
    addToast(
      enabled
        ? "🎙️ Mikrofon yoqildi! Boshqa o'yinchilar sizni eshitadi."
        : "🔇 Mikrofon o'chirildi.",
      'voice'
    );
  };

  // Connect WebSocket when user is logged in
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    function connectWS() {
      if (!user) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            event: 'join',
            data: {
              id: user.id,
              name: user.name,
              email: user.email,
              color: user.color,
              skin: user.skin,
              roomId: currentRoomId,
              x: 0,
              y: 1.5,
              z: 0,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const parsed = JSON.parse(event.data);
          const { event: evt, data } = parsed;

          switch (evt) {
            case 'init': {
              const playerMap: Record<string, PlayerNetState> = {};
              data.players.forEach((p: PlayerNetState) => {
                playerMap[p.id] = p;
              });
              setRemotePlayers(playerMap);
              setOnlineCount(data.onlineCount || 1);
              break;
            }

            case 'room:switched': {
              const playerMap: Record<string, PlayerNetState> = {};
              data.players.forEach((p: PlayerNetState) => {
                playerMap[p.id] = p;
              });
              setRemotePlayers(playerMap);
              setOnlineCount(data.onlineCount || 1);
              setCurrentRoomId(data.roomId);
              break;
            }

            case 'player:joined': {
              setRemotePlayers((prev) => ({
                ...prev,
                [data.id]: data,
              }));
              if (data.onlineCount !== undefined) {
                setOnlineCount(data.onlineCount);
              }
              addToast(`⚡ ${data.name} xonaga qo'shildi!`, 'join');
              break;
            }

            case 'player:moved': {
              setRemotePlayers((prev) => {
                const existing = prev[data.id];
                if (!existing) return prev;
                return {
                  ...prev,
                  [data.id]: {
                    ...existing,
                    ...data,
                  },
                };
              });
              break;
            }

            case 'player:speaking': {
              setRemotePlayers((prev) => {
                const existing = prev[data.id];
                if (!existing) return prev;
                return {
                  ...prev,
                  [data.id]: {
                    ...existing,
                    isSpeaking: !!data.speaking,
                  },
                };
              });
              break;
            }

            case 'voice:chunk': {
              if (data.chunk) {
                voiceManager.playRemoteVoiceChunk(data.chunk);
              }
              break;
            }

            case 'player:left': {
              setRemotePlayers((prev) => {
                const copy = { ...prev };
                delete copy[data.id];
                return copy;
              });
              if (data.onlineCount !== undefined) {
                setOnlineCount(data.onlineCount);
              }
              if (data.name) {
                addToast(`👋 ${data.name} xonadan chiqdi`, 'leave');
              }
              break;
            }

            case 'player:record': {
              addToast(`🏆 ${data.name} yangi rekord o'rnatdi: ${data.score}-yercha!`, 'record');
              break;
            }

            case 'player:fell': {
              addToast(`😂 ${data.name} ${data.block}-yerchadan yiqildi!`, 'fell');
              break;
            }

            case 'player:emoji': {
              addToast(`${data.emoji} ${data.name} reaksiya bildirdi`, 'info');
              break;
            }

            case 'chat:message': {
              setMessages((prev) => [...prev.slice(-30), data]);
              break;
            }

            // LOBBY EVENTS
            case 'lobby:created': {
              setCurrentLobby(data);
              setCurrentRoomId(`lobby_${data.code}`);
              setShowLobbyHub(true);
              addToast(`✨ Lobi yaratildi! Kodi: ${data.code}`, 'info');
              break;
            }

            case 'lobby:updated': {
              setCurrentLobby(data);
              break;
            }

            case 'lobby:invited': {
              setLobbyInvite(data);
              addToast(`🔔 ${data.hostName} sizni o'z lobisiga taklif qildi!`, 'friend');
              break;
            }

            case 'lobby:game_started': {
              setActiveView('game');
              setShowLobbyHub(false);
              addToast("🎮 Lobi o'yini boshlandi! Hammaga omad!", 'record');
              break;
            }

            // 1VS1 DUEL EVENTS
            case 'duel:invited': {
              setDuelInvite(data);
              sound.playDuelStart();
              addToast(`⚔️ ${data.hostName} sizni 1vs1 duelga chaqirdi!`, 'friend');
              break;
            }

            case 'duel:waiting': {
              setDuelWaitingInfo(data);
              addToast(`⏳ ${data.targetName} ga 1vs1 taklif yuborildi. Javobini kuting...`, 'info');
              break;
            }

            case 'duel:started': {
              setDuelWaitingInfo(null);
              setDuelInvite(null);
              setCurrentRoomId(data.roomId);
              setCurrentDuelCode(data.duelCode);

              const playerMap: Record<string, PlayerNetState> = {};
              (data.players || []).forEach((p: PlayerNetState) => {
                playerMap[p.id] = p;
              });
              setRemotePlayers(playerMap);
              setOnlineCount(data.onlineCount || 2);
              setActiveView('game');
              setShowLobbyHub(false);
              setShowFriendsListModal(false);
              setShowDuelInviteModal(false);
              setRespawnTrigger((n) => n + 1);
              sound.playDuelStart();

              const oppName = data.opponent?.name || "Raqibingiz";
              addToast(`⚔️ 1 VS 1 JANG BOSHLANDI! Raqib: ${oppName}! Omad!`, 'record');
              break;
            }

            case 'duel:declined': {
              setDuelWaitingInfo(null);
              addToast(`❌ ${data.guestName} duel taklifini rad etdi.`, 'fell');
              break;
            }

            // QUICK EMOJI REACTIONS
            case 'player:reacted': {
              const { fromName, targetName, emoji, label, targetId, fromId } = data;
              if (emoji === '👋') sound.playSalom();
              else if (emoji === '👏') sound.playApplause();
              else if (emoji === '😂') sound.playLaugh();
              else if (emoji === '🔥') sound.playFire();

              if (user && targetId === user.id) {
                addToast(`${emoji} ${fromName} siz bilan salomlashdi / reaksiya yubordi: "${label}"!`, 'record');
              } else if (user && fromId === user.id) {
                addToast(`${emoji} Siz ${targetName} ga "${label}" reaksiyasini yubordingiz!`, 'friend');
              } else {
                addToast(`${emoji} ${fromName} -> ${targetName}: ${label}`, 'info');
              }
              break;
            }

            // FRIEND NOTIFICATION EVENTS (QO'NG'IROQCHA)
            case 'friend:requested': {
              fetchFriends();
              addToast(`🔔 ${data.sender.name} sizga do'stlik (drujba) so'rovi yubordi!`, 'friend');
              break;
            }

            case 'friend:accepted': {
              fetchFriends();
              addToast(`🤝 ${data.friend.name} do'stlik so'rovingizni qabul qildi!`, 'friend');
              break;
            }

            case 'friend:message': {
              addToast(`💬 ${data.senderName} dan yangi xabar keldi!`, 'info');
              break;
            }
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWS();
        }, 3000);
      };

      ws.onerror = (e) => {
        console.warn('WS Error:', e);
      };
    }

    connectWS();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, currentRoomId, addToast, fetchFriends]);

  // Outbound socket helpers
  const handleSendMove = useCallback(
    (data: {
      x: number;
      y: number;
      z: number;
      rotY: number;
      isJumping: boolean;
      animState: string;
      currentBlock: number;
      score: number;
    }) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'move', data }));
      }
    },
    []
  );

  const handleSendRecord = useCallback(
    (score: number, distanceVal: number) => {
      setMaxBlock((prev) => Math.max(prev, score));
      if (user) {
        const updated = {
          ...user,
          bestScore: Math.max(user.bestScore || 0, score),
          bestDistance: Math.max(user.bestDistance || 0, distanceVal),
        };
        setUser(updated);
        localStorage.setItem('turburchak_player_profile', JSON.stringify(updated));
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'record',
            data: { score, distance: distanceVal },
          })
        );
      }
    },
    [user]
  );

  const handleSendFell = useCallback((block: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'fell', data: { currentBlock: block } }));
    }
  }, []);

  const handleSendMessage = useCallback((text: string, audioUrl?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'chat', data: { text, audioUrl } }));
    }
  }, []);

  const handleSendEmoji = useCallback((emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'emoji', data: { emoji } }));
    }
  }, []);

  // Friend Request Accept/Reject (Qo'ng'iroqcha: Yashil va Qizil tugmalar)
  const handleAcceptFriendRequest = async (requestId: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendshipId: requestId,
          currentUserId: user.id,
          action: 'accept',
        }),
      });
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        fetchFriends();
        addToast("🤝 Do'stlik so'rovi qabul qilindi!", 'friend');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendshipId: requestId,
          currentUserId: user.id,
          action: 'reject',
        }),
      });
      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        addToast("❌ Do'stlik so'rovi rad etildi.", 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1VS1 DUEL ACTIONS
  const handleStart1vs1WithFriend = (friend: FriendUser) => {
    const duelCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCurrentDuelCode(duelCode);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'duel:invite',
          data: { friendId: friend.id, duelCode },
        })
      );
    }

    setShowFriendsListModal(false);
    addToast(`⏳ ${friend.name} ga 1vs1 duel taklifi yuborildi. Qabul qilishini kuting...`, 'friend');
  };

  const handleAcceptDuelInvite = () => {
    if (!duelInvite) return;
    const { duelCode, hostId } = duelInvite;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'duel:accept',
          data: { duelCode, hostId },
        })
      );
    }

    setDuelInvite(null);
    addToast("⚔️ Duel qabul qilindi! O'yinga kirilmoqda...", 'info');
  };

  const handleDeclineDuelInvite = () => {
    if (!duelInvite) return;
    const { duelCode } = duelInvite;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'duel:decline',
          data: { duelCode },
        })
      );
    }

    setDuelInvite(null);
    addToast("❌ Duel taklifi rad etildi.", 'info');
  };

  const handleInviteFriendToDuel = (friendId: string) => {
    if (!currentDuelCode) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'duel:invite',
          data: { friendId, duelCode: currentDuelCode },
        })
      );
      setShowDuelInviteModal(false);
      addToast("⚔️ Do'stga 1vs1 duel taklifi yuborildi!", 'friend');
    }
  };

  // PLAYER-TO-PLAYER INTERACTION & EMOJI REACTIONS
  const handleSendPlayerReaction = (targetPlayerId: string, emoji: string, label: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'player:react',
          data: { targetPlayerId, emoji, label },
        })
      );
    }
  };

  const handleChallenge1vs1FromPlayer = (targetPlayer: PlayerNetState) => {
    const duelCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    setCurrentDuelCode(duelCode);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'duel:invite',
          data: { friendId: targetPlayer.id, duelCode },
        })
      );
    }

    addToast(`⏳ ${targetPlayer.name} ga 1vs1 duel taklifi yuborildi. Javobini kuting...`, 'friend');
  };

  // Lobby Actions
  const handleCreateLobby = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'lobby:create', data: {} }));
    }
  };

  const handleJoinLobby = (code: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'lobby:join', data: { code } }));
      setCurrentRoomId(`lobby_${code}`);
      addToast(`Lobiga qo'shilindi: ${code}`, 'info');
    }
  };

  const handleLeaveLobby = () => {
    setCurrentLobby(null);
    setCurrentRoomId('world');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'room:switch', data: { roomId: 'world' } }));
    }
    addToast("Lobidan chiqildi. Dunyo serveriga qaytdingiz.", 'info');
  };

  const handleInviteFriendToLobby = (friendId: string, lobbyCode: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'lobby:invite',
          data: { friendId, lobbyCode },
        })
      );
      addToast("Do'stga lobi taklifi yuborildi!", 'friend');
    }
  };

  const handleStartLobbyGame = () => {
    if (!currentLobby) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'lobby:start',
          data: { code: currentLobby.code },
        })
      );
    }
  };

  // Switch to World Game (1-Menyu: Dunyo o'yini)
  const handleEnterWorldGame = () => {
    if (currentRoomId !== 'world') {
      setCurrentRoomId('world');
      setCurrentLobby(null);
      setCurrentDuelCode(null);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'room:switch', data: { roomId: 'world' } }));
      }
    }
    setShowLobbyHub(false);
    setShowFriendsListModal(false);
    setActiveView('game');
    addToast("🌍 Dunyo o'yiniga kirdingiz! Barcha o'yinchilar bir maydonda.", 'info');
  };

  // Accept Lobby Invitation
  const handleAcceptLobbyInvite = () => {
    if (!lobbyInvite) return;
    handleJoinLobby(lobbyInvite.lobbyCode);
    setLobbyInvite(null);
    setShowLobbyHub(true);
  };

  const handleLogout = () => {
    voiceManager.disableMicrophone();
    setMicEnabled(false);
    localStorage.removeItem('turburchak_player_profile');
    if (wsRef.current) {
      wsRef.current.close();
    }
    setUser(null);
    setActiveView('menu');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      {/* 1. Auth Modal (If not logged in) */}
      {!user ? (
        <AuthModal
          onSuccess={(profile) => {
            setUser(profile);
            setMaxBlock(profile.bestScore || 0);
            setActiveView('menu');
          }}
        />
      ) : (
        <>
          {/* 2. Main 3D Game World Canvas */}
          <GameCanvas
            user={user}
            remotePlayers={remotePlayers}
            isLocalSpeaking={isSelfSpeaking}
            onSendMove={handleSendMove}
            onSendRecord={handleSendRecord}
            onSendFell={handleSendFell}
            onSendEmoji={handleSendEmoji}
            onSelectPlayer={(targetPl, pos) => {
              setReactionTarget({ player: targetPl, screenPos: pos });
            }}
            joystickInput={joystickVector}
            mobileJumpTrigger={mobileJumpCounter}
            onBlockChange={(cur, max, dist) => {
              setCurrentBlock(cur);
              setMaxBlock(max);
              setDistance(dist);
            }}
            respawnTrigger={respawnTrigger}
            checkpointRespawnTrigger={checkpointRespawnTrigger}
          />

          {/* 3. In-Game HUD (Only during active gameplay) */}
          {activeView === 'game' && (
            <>
              <GameHUD
                user={user}
                currentBlock={currentBlock}
                maxBlock={maxBlock}
                distance={distance}
                onlineCount={onlineCount}
                remotePlayers={remotePlayers}
                roomId={currentRoomId}
                isMicActive={micEnabled}
                isSelfSpeaking={isSelfSpeaking}
                pendingRequestsCount={pendingRequests.length}
                onToggleMic={handleToggleMic}
                onOpenLeaderboard={() => setShowLeaderboard(true)}
                onOpenMenu={() => setActiveView('menu')}
                onOpenLobbyHub={() => setShowLobbyHub(true)}
                onOpenFriendsList={() => setShowFriendsListModal(true)}
                onOpenFriendRequests={() => setShowFriendRequestsModal(true)}
                onOpenDuelInvite={() => setShowDuelInviteModal(true)}
                onOpenPlayerReaction={(targetPl) => {
                  setReactionTarget({ player: targetPl, screenPos: null });
                }}
                onRespawn={() => setRespawnTrigger((n) => n + 1)}
                onCheckpointRespawn={() => setCheckpointRespawnTrigger((n) => n + 1)}
                onLogout={handleLogout}
              />

              {/* Chat & Emoji Drawer */}
              <ChatOverlay
                messages={messages}
                onSendMessage={handleSendMessage}
                onSendEmoji={handleSendEmoji}
              />

              {/* Mobile Joystick Controls */}
              <MobileControls
                onMove={(vec) => setJoystickVector(vec)}
                onJump={() => setMobileJumpCounter((n) => n + 1)}
              />
            </>
          )}

          {/* 4. The 3 Main Menus (Appears right after login or when clicking Home) */}
          {activeView === 'menu' && (
            <MainMenuModal
              user={user}
              onlineCount={onlineCount}
              micEnabled={micEnabled}
              pendingRequests={pendingRequests}
              friendsCount={friends.length}
              onToggleMic={handleToggleMic}
              onSelectWorldGame={handleEnterWorldGame}
              onOpenLobbyHub={() => setShowLobbyHub(true)}
              onOpenFriendsList={() => setShowFriendsListModal(true)}
              onOpenFriendRequests={() => setShowFriendRequestsModal(true)}
              onOpenLeaderboard={() => setShowLeaderboard(true)}
              onLogout={handleLogout}
            />
          )}

          {/* 5. Qo'ng'iroqcha: Do'stlik so'rovlari (Yashil va Qizil tugmalar) */}
          {showFriendRequestsModal && (
            <FriendRequestsModal
              requests={pendingRequests}
              onAccept={handleAcceptFriendRequest}
              onReject={handleRejectFriendRequest}
              onClose={() => setShowFriendRequestsModal(false)}
            />
          )}

          {/* 6. 3-Menyu: Faqat mening do'stlarim (Chat & 1vs1 tanlash) */}
          {showFriendsListModal && (
            <FriendsListModal
              currentUser={user}
              friends={friends}
              onSelectChat={(friend) => setChatFriend(friend)}
              onSelect1vs1={(friend) => handleStart1vs1WithFriend(friend)}
              onOpenSearch={() => {
                setShowFriendsListModal(false);
                setShowLobbyHub(true);
              }}
              onClose={() => setShowFriendsListModal(false)}
            />
          )}

          {/* 7. Direct 1-on-1 Friend Chat & Golos */}
          {chatFriend && (
            <DirectFriendChatModal
              currentUser={user}
              friend={chatFriend}
              onClose={() => setChatFriend(null)}
            />
          )}

          {/* 8. 1vs1 Tepasidagi Do'st Taklif Qilish Oynasi */}
          {showDuelInviteModal && (
            <DuelInviteModal
              friends={friends}
              duelCode={currentDuelCode || 'DUEL'}
              onInvite={handleInviteFriendToDuel}
              onClose={() => setShowDuelInviteModal(false)}
            />
          )}

          {/* 9. 1vs1 Duel Taklifnomasi (Big Top Banner for receiver) */}
          {duelInvite && (
            <DuelInviteBanner
              invite={duelInvite}
              onAccept={handleAcceptDuelInvite}
              onDecline={handleDeclineDuelInvite}
            />
          )}

          {/* Host 1vs1 Waiting Status Indicator */}
          {duelWaitingInfo && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border-2 border-amber-500/70 rounded-full px-5 py-2.5 backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <div className="text-xs font-bold text-amber-200">
                <span className="text-white font-extrabold">{duelWaitingInfo.targetName}</span> ning 1vs1 duelga kirishini kutmoqdasiz...
              </div>
              <button
                onClick={() => setDuelWaitingInfo(null)}
                className="text-xs text-slate-400 hover:text-white px-1 font-bold"
                title="Yopish"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Player Reaction Menu (Emoji & 1vs1 Challenge) */}
          {reactionTarget && (
            <PlayerReactionMenu
              targetPlayer={reactionTarget.player}
              screenPos={reactionTarget.screenPos}
              onSendReaction={handleSendPlayerReaction}
              onChallenge1vs1={handleChallenge1vs1FromPlayer}
              onClose={() => setReactionTarget(null)}
            />
          )}

          {/* 10. Lobby & Friends Hub Modal */}
          {showLobbyHub && (
            <LobbyHubModal
              currentUser={user}
              currentLobby={currentLobby}
              onClose={() => {
                setShowLobbyHub(false);
                if (activeView !== 'game') {
                  setActiveView('menu');
                }
              }}
              onCreateLobby={handleCreateLobby}
              onJoinLobby={handleJoinLobby}
              onLeaveLobby={handleLeaveLobby}
              onInviteFriend={handleInviteFriendToLobby}
              onStartLobbyGame={handleStartLobbyGame}
              onEnterWorldGame={handleEnterWorldGame}
            />
          )}

          {/* 11. Floating Lobby Invitation Popup */}
          {lobbyInvite && (
            <LobbyInviteBanner
              invite={lobbyInvite}
              onAccept={handleAcceptLobbyInvite}
              onDecline={() => setLobbyInvite(null)}
            />
          )}

          {/* 12. Floating Live Event Toast Feed */}
          <LandscapePrompt />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 pointer-events-none w-full max-w-sm px-4">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`py-1.5 px-4 rounded-full text-xs font-semibold backdrop-blur-md shadow-xl border animate-bounce-short transition-all ${
                  t.type === 'record'
                    ? 'bg-amber-500/90 text-slate-950 border-amber-300 font-bold'
                    : t.type === 'join'
                    ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500/50'
                    : t.type === 'voice'
                    ? 'bg-cyan-950/85 text-cyan-200 border-cyan-500/50'
                    : t.type === 'friend'
                    ? 'bg-purple-950/85 text-purple-200 border-purple-500/50'
                    : t.type === 'fell'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-600/40'
                    : 'bg-slate-900/85 text-white border-slate-700/80'
                }`}
              >
                {t.text}
              </div>
            ))}
          </div>

          {/* 13. Global Leaderboard Modal */}
          {showLeaderboard && (
            <LeaderboardModal
              onClose={() => setShowLeaderboard(false)}
              currentUserId={user.id}
            />
          )}
        </>
      )}
    </div>
  );
}
