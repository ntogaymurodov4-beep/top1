export interface UserProfile {
  id: string;
  name: string;
  email: string;
  color: string;
  skin: string;
  bestScore: number;
  bestDistance: number;
  gamesPlayed: number;
  totalPlayTime?: number; // total seconds played
  totalBlocksPassed?: number; // total platforms stepped/hopped
  wins?: number; // duel victories and level completions
  losses?: number; // duel defeats and falls
  fallsCount?: number; // total falls
  finishCount?: number; // reached finish line
  createdAt: number;
}

export interface PlayerNetState {
  id: string;
  name: string;
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
  isSpeaking?: boolean;
  micEnabled?: boolean;
}

export interface PlatformData {
  id: number;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  type: 'normal' | 'moving' | 'bouncy' | 'narrow' | 'checkpoint' | 'finish';
  color: string;
  moveSpeed?: number;
  moveRange?: number;
  moveAxis?: 'x' | 'y';
  initialX?: number;
  initialY?: number;
}

export interface ChatMessage {
  id: string;
  name: string;
  color: string;
  text: string;
  time: number;
  audioUrl?: string; // Voice note in chat (golos)
}

export interface EmojiBubble {
  id: string;
  playerId: string;
  emoji: string;
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  color: string;
  bestScore: number;
  bestDistance: number;
  gamesPlayed: number;
}

export interface FriendUser {
  id: string;
  name: string;
  email: string;
  color: string;
  bestScore: number;
  isOnline?: boolean;
  friendshipId?: string;
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderColor: string;
  text?: string;
  audioData?: string; // Base64 audio for golos
  time: number;
}

export interface LobbyMember {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  ready: boolean;
  micEnabled: boolean;
}

export interface LobbyInfo {
  code: string;
  hostId: string;
  hostName: string;
  members: LobbyMember[];
  started: boolean;
}

export interface LobbyInvite {
  lobbyCode: string;
  hostName: string;
  hostId: string;
}

export interface DuelInvite {
  duelCode: string;
  hostName: string;
  hostId: string;
  hostColor?: string;
  hostScore?: number;
}

export interface PlayerReactionEvent {
  fromId: string;
  fromName: string;
  fromColor: string;
  targetId: string;
  targetName: string;
  targetColor?: string;
  emoji: string;
  label: string;
  time: number;
}

export interface FriendRequestNotification {
  id: string; // friendshipId
  sender: {
    id: string;
    name: string;
    email: string;
    color: string;
    bestScore: number;
  };
  time: number;
}
