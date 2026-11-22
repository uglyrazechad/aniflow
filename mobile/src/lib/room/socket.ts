import type { ConnectionStatus, RoomEvent } from '../types';

interface Handlers {
  onOpen: () => void;
  onEvent: (event: RoomEvent) => void;
  onStatus: (status: ConnectionStatus) => void;
}

/** WebSocket-клиент комнаты: автореконнект с бэкоффом, heartbeat, очередь до открытия. */
export class RoomSocket {
  private ws: WebSocket | null = null;
  private closed = false;
  private backoff = 1000;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: string[] = [];

  constructor(
    private url: string,
    private handlers: Handlers,
  ) {}

  start(): void {
    this.closed = false;
    this.connect();
  }

  private connect(): void {
    if (this.closed) return;

    this.handlers.onStatus('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = 1000;
      this.handlers.onStatus('online');
      this.handlers.onOpen();
      while (this.queue.length && ws.readyState === WebSocket.OPEN) {
        const payload = this.queue.shift();
        if (payload) ws.send(payload);
      }
      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onmessage = (message) => {
      try {
        this.handlers.onEvent(JSON.parse(String(message.data)) as RoomEvent);
      } catch {
        /* битые сообщения игнорируем */
      }
    };

    ws.onerror = () => ws.close();

    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.ws = null;
      if (this.closed) return;

      this.handlers.onStatus('offline');
      this.retryTimer = setTimeout(() => this.connect(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 8000);
    };
  }

  send(message: Record<string, unknown>): void {
    const payload = JSON.stringify(message);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(payload);
    else if (this.queue.length < 50) this.queue.push(payload);
  }

  close(): void {
    this.closed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    this.queue = [];
  }
}
