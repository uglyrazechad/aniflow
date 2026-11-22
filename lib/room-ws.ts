export type RoomEvent = {
  type: string;
  [key: string]: unknown;
};

export type RoomWsMessage = {
  type: string;
  state?: import('@/lib/room-types').RoomState;
  members?: import('@/lib/room-types').RoomMember[];
  messages?: import('@/lib/room-types').RoomMessage[];
  member?: import('@/lib/room-types').RoomMember;
  message?: import('@/lib/room-types').RoomMessage;
  emoji?: string;
  userId?: string;
  nick?: string;
  time?: number;
  enable?: boolean;
  userId2?: never;
} & Record<string, unknown>;

/** Лёгкий WebSocket-клиент комнаты: автореконнект с бэкоффом и heartbeat. */
export class RoomClient {
  private ws: WebSocket | null = null;
  private closed = false;
  private timer: number | undefined;
  private pingTimer: number | undefined;
  private backoff = 1000;

  constructor(
    private url: string,
    private userId: string,
    private nick: string,
    private onEvent: (e: RoomWsMessage) => void,
    private password = '',
  ) {}

  start() {
    this.closed = false;
    this.connect();
  }

  private connect() {
    if (this.closed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 1000;
      this.send({ type: 'join', userId: this.userId, nick: this.nick, password: this.password });
      this.pingTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ type: 'ping' }));
      }, 20_000);
    };
    ws.onmessage = (event) => {
      try {
        this.onEvent(JSON.parse(event.data) as RoomWsMessage);
      } catch {
        /* игнорируем битые сообщения */
      }
    };
    ws.onclose = () => {
      if (this.pingTimer !== undefined) window.clearInterval(this.pingTimer);
      if (this.closed) return;
      this.ws = null;
      this.timer = window.setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 8000);
    };
    ws.onerror = () => ws.close();
  }

  send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.closed = true;
    if (this.pingTimer !== undefined) window.clearInterval(this.pingTimer);
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }
}
