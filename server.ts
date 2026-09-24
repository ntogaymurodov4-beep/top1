import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Persistent storage setup
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'users.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  code: string; // 4-digit code
  color: string;
  skin: string;
  bestScore: number;
  bestDistance: number;
  gamesPlayed: number;
  createdAt: number;
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted';
  createdAt: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderColor: string;
  text?: string;
  audioData?: string; // base64 voice note (golos)
  time: number;
}

let users: Record<string, UserProfile> = {};
let friendships: Friendship[] = [];
let directMessages: DirectMessage[] = [];

// Load DB files
try {
  if (fs.existsSync(DB_FILE)) {
    users = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  }
} catch (e) {
  console.error('Failed to load users DB:', e);
  users = {};
}

try {
  if (fs.existsSync(FRIENDS_FILE)) {
    friendships = JSON.parse(fs.readFileSync(FRIENDS_FILE, 'utf-8'));
  }
} catch (e) {
  friendships = [];
}

try {
  if (fs.existsSync(MESSAGES_FILE)) {
    directMessages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
  }
} catch (e) {
  directMessages = [];
}

function saveUsers() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save users DB:', e);
  }
}

function saveFriends() {
  try {
    fs.writeFileSync(FRIENDS_FILE, JSON.stringify(friendships, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save friends DB:', e);
  }
}

function saveMessages() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(directMessages.slice(-500), null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save messages DB:', e);
  }
}

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { name, email, code, color = '#3b82f6', skin = 'runner' } = req.body;
  if (!name || !email || !code) {
    return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = String(code).trim();

  if (cleanCode.length !== 4) {
    return res.status(400).json({ error: "Kod aniq 4 xonali bo'lishi shart!" });
  }

  const existingId = Object.keys(users).find(
    (id) => users[id].email.toLowerCase() === cleanEmail
  );

  if (existingId) {
    return res.status(409).json({ error: "Bu Gmail bilan ro'yxatdan o'tilgan. Iltimos, Kirish qiling!" });
  }

  const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
  const newUser: UserProfile = {
    id: userId,
    name: name.trim(),
    email: cleanEmail,
    code: cleanCode,
    color,
    skin,
    bestScore: 0,
    bestDistance: 0,
    gamesPlayed: 0,
    createdAt: Date.now(),
  };

  users[userId] = newUser;
  saveUsers();

  const { code: _, ...safeUser } = newUser;
  res.json({ success: true, user: safeUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Gmail va 4 xonali kodni kiriting!" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = String(code).trim();

  const userId = Object.keys(users).find(
    (id) => users[id].email.toLowerCase() === cleanEmail
  );

  if (!userId) {
    return res.status(404).json({ error: "Ushbu Gmail topilmadi! Pastdagi 'Ro'yxatdan o'tish' orqali hisob yarating." });
  }

  if (users[userId].code !== cleanCode) {
    return res.status(401).json({ error: "4 xonali kod noto'g'ri kiritildi!" });
  }

  const { code: _, ...safeUser } = users[userId];
  res.json({ success: true, user: safeUser });
});

app.get('/api/leaderboard', (_req, res) => {
  const list = Object.values(users)
    .map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      bestScore: u.bestScore || 0,
      bestDistance: u.bestDistance || 0,
      gamesPlayed: u.gamesPlayed || 0,
    }))
    .sort((a, b) => (b.bestScore - a.bestScore) || (b.bestDistance - a.bestDistance))
    .slice(0, 20);

  res.json({ leaderboard: list });
});

// ----------------------------------------------------
// FRIENDS & DRUZYA ENDPOINTS
// ----------------------------------------------------
// Search users to add as friend
app.get('/api/friends/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const currentUserId = String(req.query.currentUserId || '');

  if (!q) {
    return res.json({ results: [] });
  }

  const results = Object.values(users)
    .filter((u) => u.id !== currentUserId && (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
    .slice(0, 15)
    .map((u) => {
      // Find friendship status
      const fs = friendships.find(
        (f) =>
          (f.requesterId === currentUserId && f.receiverId === u.id) ||
          (f.receiverId === currentUserId && f.requesterId === u.id)
      );

      let status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none';
      let friendshipId = undefined;

      if (fs) {
        friendshipId = fs.id;
        if (fs.status === 'accepted') {
          status = 'accepted';
        } else if (fs.requesterId === currentUserId) {
          status = 'pending_sent';
        } else {
          status = 'pending_received';
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        color: u.color,
        bestScore: u.bestScore || 0,
        status,
        friendshipId,
        isOnline: connectedPlayers.has(u.id),
      };
    });

  res.json({ results });
});

// Send friend request
app.post('/api/friends/request', (req, res) => {
  const { fromUserId, toUserId } = req.body;
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return res.status(400).json({ error: "Noto'g'ri so'rov!" });
  }

  const existing = friendships.find(
    (f) =>
      (f.requesterId === fromUserId && f.receiverId === toUserId) ||
      (f.receiverId === fromUserId && f.requesterId === toUserId)
  );

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ error: "Siz allaqachon do'stsiz!" });
    }
    return res.status(400).json({ error: "Do'stlik so'rovi allaqachon yuborilgan!" });
  }

  const newFs: Friendship = {
    id: 'fr_' + Math.random().toString(36).substring(2, 9),
    requesterId: fromUserId,
    receiverId: toUserId,
    status: 'pending',
    createdAt: Date.now(),
  };

  friendships.push(newFs);
  saveFriends();

  // Send real-time notification to receiver if online
  const receiverSocket = connectedPlayers.get(toUserId)?.socket;
  if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
    receiverSocket.send(
      JSON.stringify({
        event: 'friend:requested',
        data: {
          friendshipId: newFs.id,
          sender: {
            id: fromUserId,
            name: users[fromUserId]?.name || 'O\'yinchi',
            email: users[fromUserId]?.email || '',
            color: users[fromUserId]?.color || '#3b82f6',
            bestScore: users[fromUserId]?.bestScore || 0,
          },
          time: newFs.createdAt,
        },
      })
    );
  }

  res.json({ success: true, friendship: newFs });
});

// Accept or reject friend request
app.post('/api/friends/respond', (req, res) => {
  const { friendshipId, currentUserId, action } = req.body;
  const idx = friendships.findIndex((f) => f.id === friendshipId);
  if (idx === -1) {
    return res.status(404).json({ error: "Do'stlik so'rovi topilmadi!" });
  }

  const fsItem = friendships[idx];
  if (action === 'accept') {
    fsItem.status = 'accepted';
    saveFriends();

    // Notify requester
    const otherId = fsItem.requesterId === currentUserId ? fsItem.receiverId : fsItem.requesterId;
    const otherSocket = connectedPlayers.get(otherId)?.socket;
    if (otherSocket && otherSocket.readyState === WebSocket.OPEN) {
      otherSocket.send(
        JSON.stringify({
          event: 'friend:accepted',
          data: {
            friend: {
              id: currentUserId,
              name: users[currentUserId]?.name || 'Do\'st',
              color: users[currentUserId]?.color,
            },
          },
        })
      );
    }

    return res.json({ success: true, status: 'accepted' });
  } else {
    // Reject
    friendships.splice(idx, 1);
    saveFriends();
    return res.json({ success: true, status: 'rejected' });
  }
});

// Get friend list (accepted & pending)
app.get('/api/friends/list', (req, res) => {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).json({ error: "userId talab qilinadi" });

  const userFriends = friendships.filter(
    (f) => f.requesterId === userId || f.receiverId === userId
  );

  const accepted: any[] = [];
  const pendingReceived: any[] = [];
  const pendingSent: any[] = [];

  userFriends.forEach((f) => {
    const otherId = f.requesterId === userId ? f.receiverId : f.requesterId;
    const other = users[otherId];
    if (!other) return;

    const friendObj = {
      id: other.id,
      name: other.name,
      email: other.email,
      color: other.color,
      bestScore: other.bestScore || 0,
      isOnline: connectedPlayers.has(other.id),
      friendshipId: f.id,
      status: f.status,
    };

    if (f.status === 'accepted') {
      accepted.push(friendObj);
    } else if (f.receiverId === userId) {
      pendingReceived.push(friendObj);
    } else {
      pendingSent.push(friendObj);
    }
  });

  res.json({ accepted, pendingReceived, pendingSent });
});

// Direct Messages & Golos (Voice Notes)
app.get('/api/friends/messages', (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) return res.json({ messages: [] });

  const msgs = directMessages.filter(
    (m) =>
      (m.senderId === user1 && m.receiverId === user2) ||
      (m.senderId === user2 && m.receiverId === user1)
  );

  res.json({ messages: msgs.slice(-50) });
});

app.post('/api/friends/message', (req, res) => {
  const { senderId, receiverId, text, audioData } = req.body;
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "Ma'lumotlar to'liq emas" });
  }

  const sender = users[senderId];
  const newMsg: DirectMessage = {
    id: 'dm_' + Math.random().toString(36).substring(2, 9),
    senderId,
    receiverId,
    senderName: sender?.name || 'Do\'st',
    senderColor: sender?.color || '#3b82f6',
    text: text?.slice(0, 300),
    audioData, // voice note
    time: Date.now(),
  };

  directMessages.push(newMsg);
  saveMessages();

  // Push to receiver real-time if online
  const receiverSocket = connectedPlayers.get(receiverId)?.socket;
  if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
    receiverSocket.send(
      JSON.stringify({
        event: 'friend:message',
        data: newMsg,
      })
    );
  }

  res.json({ success: true, message: newMsg });
});

// ----------------------------------------------------
// MULTIPLAYER ROOMS & LOBBIES
// ----------------------------------------------------
interface ConnectedPlayer {
  id: string;
  name: string;
  email: string;
  color: string;
  skin: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  isJumping: boolean;
  animState: string;
  currentBlock: number;
  score: number;
  lastPing: number;
  roomId: string; // 'world' or 'lobby_{code}'
  isSpeaking: boolean;
  socket: WebSocket;
}

interface ServerLobby {
  code: string;
  hostId: string;
  hostName: string;
  members: Set<string>;
  started: boolean;
}

interface ServerDuel {
  duelCode: string;
  hostId: string;
  hostName: string;
  hostColor: string;
  hostScore: number;
  guestId: string;
  guestName: string;
  createdAt: number;
}

const connectedPlayers = new Map<string, ConnectedPlayer>();
const activeLobbies = new Map<string, ServerLobby>();
const activeDuels = new Map<string, ServerDuel>();

const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToRoom(roomId: string, event: string, data: any, excludeId?: string) {
  const payload = JSON.stringify({ event, data });
  for (const [id, player] of connectedPlayers) {
    if (player.roomId !== roomId) continue;
    if (excludeId && id === excludeId) continue;
    if (player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(payload);
    }
  }
}

function getRoomPlayers(roomId: string, excludeId?: string) {
  return Array.from(connectedPlayers.values())
    .filter((p) => p.roomId === roomId && (!excludeId || p.id !== excludeId))
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      skin: p.skin,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      isJumping: p.isJumping,
      animState: p.animState,
      currentBlock: p.currentBlock,
      score: p.score,
      isSpeaking: p.isSpeaking,
    }));
}

wss.on('connection', (ws: WebSocket) => {
  let playerId: string | null = null;

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      const { event, data } = parsed;

      switch (event) {
        case 'join': {
          playerId = data.id || ('pl_' + Math.random().toString(36).substring(2, 9));
          const roomId = data.roomId || 'world';

          const newPlayer: ConnectedPlayer = {
            id: playerId!,
            name: data.name || 'Mehmon',
            email: data.email || '',
            color: data.color || '#3b82f6',
            skin: data.skin || 'default',
            x: data.x ?? 0,
            y: data.y ?? 1.5,
            z: data.z ?? 0,
            rotY: data.rotY ?? 0,
            isJumping: false,
            animState: 'idle',
            currentBlock: 0,
            score: 0,
            lastPing: Date.now(),
            roomId,
            isSpeaking: false,
            socket: ws,
          };

          connectedPlayers.set(playerId!, newPlayer);

          // If joining a lobby, add to lobby members
          if (roomId.startsWith('lobby_')) {
            const lobbyCode = roomId.replace('lobby_', '');
            const lobby = activeLobbies.get(lobbyCode);
            if (lobby) {
              lobby.members.add(playerId!);
            }
          }

          const existingList = getRoomPlayers(roomId, playerId!);
          const totalInRoom = existingList.length + 1;

          ws.send(
            JSON.stringify({
              event: 'init',
              data: {
                selfId: playerId,
                players: existingList,
                roomId,
                onlineCount: totalInRoom,
                globalOnlineCount: connectedPlayers.size,
              },
            })
          );

          broadcastToRoom(
            roomId,
            'player:joined',
            {
              id: newPlayer.id,
              name: newPlayer.name,
              color: newPlayer.color,
              skin: newPlayer.skin,
              x: newPlayer.x,
              y: newPlayer.y,
              z: newPlayer.z,
              rotY: newPlayer.rotY,
              isJumping: newPlayer.isJumping,
              animState: newPlayer.animState,
              currentBlock: 0,
              score: 0,
              isSpeaking: false,
              onlineCount: totalInRoom,
            },
            playerId!
          );
          break;
        }

        case 'room:switch': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (!pl) return;

          const oldRoom = pl.roomId;
          const newRoom = data.roomId || 'world';
          if (oldRoom === newRoom) return;

          // Notify old room that player left
          broadcastToRoom(oldRoom, 'player:left', {
            id: playerId,
            name: pl.name,
            onlineCount: Array.from(connectedPlayers.values()).filter((p) => p.roomId === oldRoom && p.id !== playerId).length,
          });

          pl.roomId = newRoom;
          pl.x = 0;
          pl.y = 1.5;
          pl.z = 0;
          pl.currentBlock = 0;

          const roomPlayers = getRoomPlayers(newRoom, playerId);
          ws.send(
            JSON.stringify({
              event: 'room:switched',
              data: {
                roomId: newRoom,
                players: roomPlayers,
                onlineCount: roomPlayers.length + 1,
              },
            })
          );

          broadcastToRoom(
            newRoom,
            'player:joined',
            {
              id: pl.id,
              name: pl.name,
              color: pl.color,
              skin: pl.skin,
              x: pl.x,
              y: pl.y,
              z: pl.z,
              rotY: pl.rotY,
              isJumping: false,
              animState: 'idle',
              currentBlock: 0,
              score: 0,
              onlineCount: roomPlayers.length + 1,
            },
            playerId
          );
          break;
        }

        case 'move': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (pl) {
            pl.x = data.x;
            pl.y = data.y;
            pl.z = data.z;
            pl.rotY = data.rotY ?? pl.rotY;
            pl.isJumping = !!data.isJumping;
            pl.animState = data.animState || 'idle';
            pl.currentBlock = data.currentBlock ?? pl.currentBlock;
            pl.score = data.score ?? pl.score;
            pl.lastPing = Date.now();

            broadcastToRoom(
              pl.roomId,
              'player:moved',
              {
                id: playerId,
                x: pl.x,
                y: pl.y,
                z: pl.z,
                rotY: pl.rotY,
                isJumping: pl.isJumping,
                animState: pl.animState,
                currentBlock: pl.currentBlock,
                score: pl.score,
              },
              playerId
            );
          }
          break;
        }

        // Live Voice Streaming & Indicator
        case 'voice:speaking': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (pl) {
            pl.isSpeaking = !!data.speaking;
            broadcastToRoom(
              pl.roomId,
              'player:speaking',
              {
                id: playerId,
                speaking: pl.isSpeaking,
              },
              playerId
            );
          }
          break;
        }

        case 'voice:stream': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (pl && data.chunk) {
            // Forward audio packet to everyone in same room
            broadcastToRoom(
              pl.roomId,
              'voice:chunk',
              {
                id: playerId,
                chunk: data.chunk,
              },
              playerId
            );
          }
          break;
        }

        case 'record': {
          if (!playerId) return;
          const { score, distance } = data;
          const pl = connectedPlayers.get(playerId);
          if (pl) {
            pl.score = Math.max(pl.score, score || 0);
          }

          if (users[playerId]) {
            let updated = false;
            if ((score || 0) > (users[playerId].bestScore || 0)) {
              users[playerId].bestScore = score;
              updated = true;
            }
            if ((distance || 0) > (users[playerId].bestDistance || 0)) {
              users[playerId].bestDistance = distance;
              updated = true;
            }
            users[playerId].gamesPlayed = (users[playerId].gamesPlayed || 0) + 1;
            if (updated) {
              saveUsers();
            }
          }

          if (pl) {
            broadcastToRoom(pl.roomId, 'player:record', {
              id: playerId,
              name: pl.name,
              score,
              distance,
            });
          }
          break;
        }

        case 'chat': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (!pl) return;

          const text = String(data.text || '').slice(0, 150);
          const audioUrl = data.audioUrl; // Voice note (golos)

          if (text.trim() || audioUrl) {
            broadcastToRoom(pl.roomId, 'chat:message', {
              id: playerId,
              name: pl.name,
              color: pl.color,
              text,
              audioUrl,
              time: Date.now(),
            });
          }
          break;
        }

        case 'emoji': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (!pl) return;
          const emoji = String(data.emoji || '🔥');
          broadcastToRoom(pl.roomId, 'player:emoji', {
            id: playerId,
            name: pl.name,
            emoji,
            x: pl.x,
            y: pl.y,
            z: pl.z,
          });
          break;
        }

        case 'fell': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (pl) {
            broadcastToRoom(pl.roomId, 'player:fell', {
              id: playerId,
              name: pl.name,
              block: data.currentBlock || 0,
            });
          }
          break;
        }

        // LOBBY ACTIONS
        case 'lobby:create': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (!pl) return;

          const code = Math.random().toString(36).substring(2, 7).toUpperCase();
          const lobby: ServerLobby = {
            code,
            hostId: playerId,
            hostName: pl.name,
            members: new Set([playerId]),
            started: false,
          };
          activeLobbies.set(code, lobby);

          pl.roomId = `lobby_${code}`;

          ws.send(
            JSON.stringify({
              event: 'lobby:created',
              data: {
                code,
                hostId: playerId,
                hostName: pl.name,
                members: [
                  {
                    id: pl.id,
                    name: pl.name,
                    color: pl.color,
                    isHost: true,
                    ready: true,
                    micEnabled: true,
                  },
                ],
                started: false,
              },
            })
          );
          break;
        }

        case 'lobby:invite': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          const { friendId, lobbyCode } = data;
          const targetPlayer = connectedPlayers.get(friendId);

          if (targetPlayer && targetPlayer.socket.readyState === WebSocket.OPEN) {
            targetPlayer.socket.send(
              JSON.stringify({
                event: 'lobby:invited',
                data: {
                  lobbyCode,
                  hostId: playerId,
                  hostName: pl ? pl.name : 'Do\'stingiz',
                },
              })
            );
          }
          break;
        }

        case 'lobby:join': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (!pl) return;

          const code = String(data.code || '').toUpperCase();
          const lobby = activeLobbies.get(code);

          if (!lobby) {
            ws.send(JSON.stringify({ event: 'lobby:error', data: { message: "Lobi topilmadi!" } }));
            return;
          }

          lobby.members.add(playerId);
          pl.roomId = `lobby_${code}`;

          const memberList = Array.from(lobby.members).map((mId) => {
            const mem = connectedPlayers.get(mId);
            return {
              id: mId,
              name: mem?.name || users[mId]?.name || 'O\'yinchi',
              color: mem?.color || users[mId]?.color || '#3b82f6',
              isHost: mId === lobby.hostId,
              ready: true,
              micEnabled: true,
            };
          });

          // Broadcast updated lobby state to all lobby members
          broadcastToRoom(`lobby_${code}`, 'lobby:updated', {
            code,
            hostId: lobby.hostId,
            hostName: lobby.hostName,
            members: memberList,
            started: lobby.started,
          });
          break;
        }

        case 'lobby:start': {
          if (!playerId) return;
          const { code } = data;
          const lobby = activeLobbies.get(code);
          if (lobby && lobby.hostId === playerId) {
            lobby.started = true;
            broadcastToRoom(`lobby_${code}`, 'lobby:game_started', {
              code,
              players: getRoomPlayers(`lobby_${code}`),
            });
          }
          break;
        }

        // 1VS1 DUEL ACTIONS
        case 'duel:invite': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (!pl) return;
          const { friendId, duelCode } = data;
          const targetPlayer = connectedPlayers.get(friendId);

          if (!targetPlayer || targetPlayer.socket.readyState !== WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                event: 'chat:message',
                data: {
                  id: 'sys_' + Date.now(),
                  name: 'TIZIM',
                  color: '#ef4444',
                  text: "Do'stingiz ayni vaqtda o'yinda online emas.",
                  time: Date.now(),
                },
              })
            );
            return;
          }

          const code = duelCode || Math.random().toString(36).substring(2, 7).toUpperCase();
          activeDuels.set(code, {
            duelCode: code,
            hostId: playerId,
            hostName: pl.name,
            hostColor: pl.color,
            hostScore: pl.score || 0,
            guestId: friendId,
            guestName: targetPlayer.name,
            createdAt: Date.now(),
          });

          // Inform host that invite was sent
          ws.send(
            JSON.stringify({
              event: 'duel:waiting',
              data: {
                duelCode: code,
                targetName: targetPlayer.name,
              },
            })
          );

          // Inform guest with full details for the BIG top banner
          targetPlayer.socket.send(
            JSON.stringify({
              event: 'duel:invited',
              data: {
                duelCode: code,
                hostId: playerId,
                hostName: pl.name,
                hostColor: pl.color,
                hostScore: pl.score || 0,
              },
            })
          );
          break;
        }

        case 'duel:accept': {
          if (!playerId) return;
          const { duelCode } = data;
          const duel = activeDuels.get(duelCode);
          const guestPlayer = connectedPlayers.get(playerId);
          if (!guestPlayer) return;

          const hostId = duel ? duel.hostId : data.hostId;
          const hostPlayer = hostId ? connectedPlayers.get(hostId) : null;

          const duelRoomId = `duel_${duelCode}`;

          // Reposition and move HOST
          if (hostPlayer && hostPlayer.socket.readyState === WebSocket.OPEN) {
            const oldHostRoom = hostPlayer.roomId;
            hostPlayer.roomId = duelRoomId;
            hostPlayer.x = -1.2;
            hostPlayer.y = 1.5;
            hostPlayer.z = 0;
            hostPlayer.rotY = 0;
            hostPlayer.currentBlock = 0;
            hostPlayer.score = 0;

            if (oldHostRoom !== duelRoomId) {
              broadcastToRoom(oldHostRoom, 'player:left', {
                id: hostPlayer.id,
                name: hostPlayer.name,
                onlineCount: getRoomPlayers(oldHostRoom).length,
              });
            }
          }

          // Reposition and move GUEST
          const oldGuestRoom = guestPlayer.roomId;
          guestPlayer.roomId = duelRoomId;
          guestPlayer.x = 1.2;
          guestPlayer.y = 1.5;
          guestPlayer.z = 0;
          guestPlayer.rotY = 0;
          guestPlayer.currentBlock = 0;
          guestPlayer.score = 0;

          if (oldGuestRoom !== duelRoomId) {
            broadcastToRoom(oldGuestRoom, 'player:left', {
              id: guestPlayer.id,
              name: guestPlayer.name,
              onlineCount: getRoomPlayers(oldGuestRoom).length,
            });
          }

          // Clean up duel record
          if (duelCode) {
            activeDuels.delete(duelCode);
          }

          // SEND duel:started TO BOTH PLAYERS SIMULTANEOUSLY!
          if (hostPlayer && hostPlayer.socket.readyState === WebSocket.OPEN) {
            hostPlayer.socket.send(
              JSON.stringify({
                event: 'duel:started',
                data: {
                  roomId: duelRoomId,
                  duelCode,
                  opponent: {
                    id: guestPlayer.id,
                    name: guestPlayer.name,
                    color: guestPlayer.color,
                    skin: guestPlayer.skin,
                    x: guestPlayer.x,
                    y: guestPlayer.y,
                    z: guestPlayer.z,
                    rotY: 0,
                    isJumping: false,
                    animState: 'idle',
                    currentBlock: 0,
                    score: 0,
                  },
                  players: [
                    {
                      id: guestPlayer.id,
                      name: guestPlayer.name,
                      color: guestPlayer.color,
                      skin: guestPlayer.skin,
                      x: guestPlayer.x,
                      y: guestPlayer.y,
                      z: guestPlayer.z,
                      rotY: 0,
                      isJumping: false,
                      animState: 'idle',
                      currentBlock: 0,
                      score: 0,
                    },
                  ],
                  onlineCount: 2,
                },
              })
            );
          }

          guestPlayer.socket.send(
            JSON.stringify({
              event: 'duel:started',
              data: {
                roomId: duelRoomId,
                duelCode,
                opponent: hostPlayer
                  ? {
                      id: hostPlayer.id,
                      name: hostPlayer.name,
                      color: hostPlayer.color,
                      skin: hostPlayer.skin,
                      x: hostPlayer.x,
                      y: hostPlayer.y,
                      z: hostPlayer.z,
                      rotY: 0,
                      isJumping: false,
                      animState: 'idle',
                      currentBlock: 0,
                      score: 0,
                    }
                  : null,
                players: hostPlayer
                  ? [
                      {
                        id: hostPlayer.id,
                        name: hostPlayer.name,
                        color: hostPlayer.color,
                        skin: hostPlayer.skin,
                        x: hostPlayer.x,
                        y: hostPlayer.y,
                        z: hostPlayer.z,
                        rotY: 0,
                        isJumping: false,
                        animState: 'idle',
                        currentBlock: 0,
                        score: 0,
                      },
                    ]
                  : [],
                onlineCount: 2,
              },
            })
          );
          break;
        }

        case 'duel:decline': {
          if (!playerId) return;
          const { duelCode } = data;
          const duel = activeDuels.get(duelCode);
          if (duel) {
            const hostPlayer = connectedPlayers.get(duel.hostId);
            if (hostPlayer && hostPlayer.socket.readyState === WebSocket.OPEN) {
              hostPlayer.socket.send(
                JSON.stringify({
                  event: 'duel:declined',
                  data: {
                    guestName: connectedPlayers.get(playerId)?.name || "Do'stingiz",
                  },
                })
              );
            }
            activeDuels.delete(duelCode);
          }
          break;
        }

        // QUICK EMOJI REACTIONS (WHEN TAPPING/CLICKING OTHER PLAYERS)
        case 'player:react': {
          if (!playerId) return;
          const pl = connectedPlayers.get(playerId);
          if (!pl) return;
          const { targetPlayerId, emoji, label } = data;
          const targetPlayer = connectedPlayers.get(targetPlayerId);

          broadcastToRoom(pl.roomId, 'player:reacted', {
            fromId: pl.id,
            fromName: pl.name,
            fromColor: pl.color,
            targetId: targetPlayerId,
            targetName: targetPlayer ? targetPlayer.name : "O'yinchi",
            targetColor: targetPlayer ? targetPlayer.color : '#3b82f6',
            emoji: emoji || '👋',
            label: label || 'Salomlashish',
            time: Date.now(),
          });
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (playerId && connectedPlayers.has(playerId)) {
      const pl = connectedPlayers.get(playerId);
      if (pl && pl.socket !== ws) {
        // Stale socket closure, do not disconnect active player
        return;
      }
      const roomId = pl?.roomId || 'world';
      connectedPlayers.delete(playerId);

      // Clean up from lobbies if in one
      if (roomId.startsWith('lobby_')) {
        const code = roomId.replace('lobby_', '');
        const lobby = activeLobbies.get(code);
        if (lobby) {
          lobby.members.delete(playerId);
          if (lobby.members.size === 0) {
            activeLobbies.delete(code);
          } else if (lobby.hostId === playerId) {
            // Assign next member as host
            lobby.hostId = Array.from(lobby.members)[0];
            const newHost = connectedPlayers.get(lobby.hostId);
            if (newHost) lobby.hostName = newHost.name;
          }
        }
      }

      broadcastToRoom(roomId, 'player:left', {
        id: playerId,
        name: pl?.name,
        onlineCount: Array.from(connectedPlayers.values()).filter((p) => p.roomId === roomId).length,
      });
    }
  });

  ws.on('error', (err) => {
    console.error('WS Error for', playerId, err);
  });
});

// Periodic ping cleanup
setInterval(() => {
  const now = Date.now();
  for (const [id, player] of connectedPlayers) {
    if (now - player.lastPing > 50000) {
      try {
        player.socket.terminate();
      } catch {}
      connectedPlayers.delete(id);
      broadcastToRoom(player.roomId, 'player:left', {
        id,
        onlineCount: Array.from(connectedPlayers.values()).filter((p) => p.roomId === player.roomId).length,
      });
    }
  }
}, 15000);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
