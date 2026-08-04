import type { EncryptedMessage, MessageHandler, QsoConnectTransport } from './protocol.js';

type SocketFactory = (url: string) => WebSocket;

/** Internet relay transport. The relay receives encrypted envelopes only. */
export class WebSocketRelayTransport implements QsoConnectTransport {
  readonly kind = 'relay' as const;
  private socket?: WebSocket;
  private roomId = '';
  private readonly handlers = new Set<MessageHandler>();

  constructor(private readonly endpoint: string, private readonly createSocket: SocketFactory = (url) => new WebSocket(url)) {}

  connect(roomId: string): Promise<void> {
    if (!this.endpoint) return Promise.reject(new Error('Relay endpoint is not configured'));
    this.roomId = roomId;
    return new Promise((resolve, reject) => {
      const socket = this.createSocket(this.endpoint);
      this.socket = socket;
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({ type: 'join', roomId }));
        resolve();
      }, { once: true });
      socket.addEventListener('error', () => reject(new Error('Could not connect to the relay')), { once: true });
      socket.addEventListener('message', (event) => this.receive(event.data));
    });
  }

  async send(message: EncryptedMessage): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error('Relay is not connected');
    if (message.roomId !== this.roomId) throw new Error('Cannot send a message to another room');
    this.socket.send(JSON.stringify({ type: 'message', roomId: this.roomId, payload: message }));
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async disconnect(): Promise<void> {
    this.socket?.close(1000, 'Client disconnected');
    this.socket = undefined;
    this.roomId = '';
  }

  private receive(data: unknown): void {
    try {
      const packet = JSON.parse(String(data)) as { type?: string; roomId?: string; payload?: EncryptedMessage };
      if (packet.type !== 'message' || packet.roomId !== this.roomId || !packet.payload) return;
      for (const handler of this.handlers) handler(packet.payload);
    } catch {
      // EN/UK/DE: Ignore malformed relay traffic; an untrusted network must not stop the logbook.
    }
  }
}
