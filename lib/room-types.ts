export interface RoomState {
  episode: number;
  time: number;
  paused: boolean;
  quality: string | null;
  translationId: number | null;
  updatedBy: string | null;
  hostMode: boolean;
  busy: string | null;
  serverTime: number;
  /** Скорость воспроизведения (0.25–2). */
  playbackRate?: number;
  /** Ставить ли паузу всем, пока кто-то буферизует. */
  pauseOnBuffering?: boolean;
  /** Кто сейчас ждёт загрузку. */
  waiting?: Array<{ userId: string; nick: string }>;
}

export interface RoomMember {
  userId: string;
  nick: string;
  isHost: boolean;
  muted: boolean;
  joinedAt: number;
  /** Ждёт загрузку видео. */
  waiting?: boolean;
  /** Вошёл по токену аккаунта. */
  authed?: boolean;
}

export interface RoomMessage {
  id: number;
  userId: string;
  nick: string;
  text: string;
  emoji: string | null;
  time: number;
  system?: string;
}

export interface RoomRoom {
  slug: string;
  hostId: string | null;
  animeId: number | string | null;
  name: string;
  isPublic: boolean;
  maxMembers: number;
  createdAt: number;
  state: RoomState;
  members: RoomMember[];
  messages: RoomMessage[];
}

export interface AnimeLike {
  id: string | number;
  title: string;
  posterUrl?: string;
}

export interface PlayerStream {
  src: string;
  type: 'hls' | 'mp4';
}
