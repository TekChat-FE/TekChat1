import { MatrixClient, ClientEvent } from 'matrix-js-sdk';

interface PresenceData {
  userId: string;
  presence: 'online' | 'offline' | 'unavailable';
  statusMsg?: string;
  lastActiveAgo?: number;
}

export class PresenceService {
  private static instance: PresenceService;
  private presenceMap: Map<string, PresenceData> = new Map();
  private client: MatrixClient | null = null;
  private ws: WebSocket | null = null;
  private lastActivity: number = Date.now();
  private inactivityTimeout: number = 5 * 60 * 1000; // 5 phút
  private inactivityTimer: NodeJS.Timeout | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private presenceCallbacks: Array<(event: any) => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      ['mousemove', 'keydown', 'click'].forEach((event) => {
        window.addEventListener(event, () => {
          this.lastActivity = Date.now();
          this.checkInactivity();
        });
      });
    }
  }

  public static getInstance(): PresenceService {
    if (!PresenceService.instance) {
      PresenceService.instance = new PresenceService();
    }
    return PresenceService.instance;
  }

  public async initialize(client: MatrixClient): Promise<void> {
    this.client = client;

    // Kết nối đến WebSocket server
    const userId = this.client.getUserId() || '';
    this.ws = new WebSocket(`ws://localhost:8080?userId=${userId}`);

    this.ws.onopen = () => {
      console.log(`[WS] Connected to WebSocket server for ${userId}`);
      this.updatePresence('online', 'online').catch((err) =>
        console.error('[ERROR] Lỗi đặt trạng thái Online:', err)
      );
    };

    this.ws.onmessage = (event) => {
      try {
        const { userId, presence, statusMsg } = JSON.parse(event.data);
        this.presenceMap.set(userId, {
          userId,
          presence,
          statusMsg,
          lastActiveAgo: 0,
        });
        console.log(`[WS] Received presence for ${userId}: ${presence}, ${statusMsg}`);
        this.presenceCallbacks.forEach((cb) =>
          cb({ getSender: () => userId, getContent: () => ({ userId, presence, statusMsg }) })
        );
      } catch (error) {
        console.error('[WS] Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WS] WebSocket connection closed, attempting to reconnect');
      this.ws = null;
      setTimeout(() => {
        if (this.client) {
          this.ws = new WebSocket(`ws://localhost:8080?userId=${this.client.getUserId() || ''}`);
          this.ws.onopen = () => {
            console.log('[WS] Reconnected to WebSocket server');
            this.updatePresence('online', 'online').catch((err) =>
              console.error('[ERROR] Failed to set online status after reconnect:', err)
            );
          };
        }
      }, 1000);
    };

    // Lắng nghe sự kiện ngắt kết nối Matrix
    this.client.on(ClientEvent.Sync, (state: string) => {
      if (state === 'ERROR' || state === 'STOPPED') {
        this.updatePresence('offline', '').catch((err) =>
          console.error('[ERROR] Lỗi đặt trạng thái Offline:', err)
        );
      }
    });

    this.checkInactivity();
  }

  private checkInactivity(): void {
    const now = Date.now();
    if (now - this.lastActivity > this.inactivityTimeout && this.presenceMap.get(this.client?.getUserId() || '')?.presence !== 'unavailable') {
      this.updatePresence('unavailable', 'Không hoạt động').catch((err) =>
        console.error('[ERROR] Lỗi đặt trạng thái Unavailable:', err)
      );
    } else if (this.presenceMap.get(this.client?.getUserId() || '')?.presence !== 'online') {
      this.updatePresence('online', 'online').catch((err) =>
        console.error('[ERROR] Lỗi đặt trạng thái Online:', err)
      );
    }

    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.checkInactivity(), 30 * 1000);
  }

  public getPresence(userId: string): PresenceData {
    const data = this.presenceMap.get(userId) || {
      userId,
      presence: 'offline',
      statusMsg: '',
      lastActiveAgo: 0,
    };
    console.log(`[DEBUG] Get presence for ${userId}:`, data);
    return data;
  }

  public async updatePresence(presence: 'online' | 'offline' | 'unavailable', statusMsg?: string): Promise<void> {
    if (!this.ws || !this.client) {
      console.warn('[WS] WebSocket or client not initialized, skipping presence update');
      return;
    }
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] WebSocket not connected, attempting to reconnect');
      this.ws = new WebSocket(`ws://localhost:8080?userId=${this.client.getUserId() || ''}`);
      await new Promise((resolve) => {
        this.ws!.onopen = () => resolve(undefined);
      });
    }
    const userId = this.client.getUserId() || '';
    this.ws.send(JSON.stringify({ presence, statusMsg }));
    this.presenceMap.set(userId, {
      userId,
      presence,
      statusMsg,
      lastActiveAgo: 0,
    });
    console.log(`[WS] Updated presence for ${userId}: ${presence}, ${statusMsg}`);
  }

  public disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
      console.log('[WS] Disconnected from WebSocket server');
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public onPresenceEvent(callback: (event: any) => void): void {
    this.presenceCallbacks.push(callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public offPresenceEvent(callback: (event: any) => void): void {
    this.presenceCallbacks = this.presenceCallbacks.filter((cb) => cb !== callback);
  }
}