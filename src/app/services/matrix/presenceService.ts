import { MatrixClient, ClientEvent } from "matrix-js-sdk";

interface PresenceData {
  userId: string;
  presence: "online" | "offline" | "unavailable";
  statusMsg?: string;
  lastActiveAgo?: number;
}

type PresenceEvent =
  | {
      getSender: () => string;
      getContent: () => {
        userId: string;
        presence: string;
        statusMsg?: string;
      };
    }
  | {
      type: "read";
      userId: string;
      roomId: string;
    };

export class PresenceService {
  private static instance: PresenceService;
  private presenceMap: Map<string, PresenceData> = new Map();
  private client: MatrixClient | null = null;
  public ws: WebSocket | null = null;
  private lastActivity: number = Date.now();
  private inactivityTimeout: number = 5 * 60 * 1000;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private presenceCallbacks: Array<(event: PresenceEvent) => void> = [];
  private readCallbacks: Array<(userId: string, roomId: string) => void> = [];

  private constructor() {
    if (typeof window !== "undefined") {
      ["mousemove", "keydown", "click"].forEach((event) => {
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

    const userId = this.client.getUserId() || "";
    this.ws = new WebSocket(`ws://localhost:8080?userId=${userId}`);

    this.ws.onopen = () => {
      console.log(`[WS] Connected to WebSocket server for ${userId}`);
      this.updatePresence("online", "online").catch((err) =>
        console.error("[ERROR] Failed to set Online status:", err)
      );
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "read" && data.userId && data.roomId) {
          console.log(
            `[WS] Received read event: ${data.userId} read room ${data.roomId}`
          );
          this.readCallbacks.forEach((cb) => cb(data.userId, data.roomId));
          return;
        }

        const { userId, presence, statusMsg } = data;
        this.presenceMap.set(userId, {
          userId,
          presence,
          statusMsg,
          lastActiveAgo: 0,
        });
        console.log(
          `[WS] Received presence for ${userId}: ${presence}, ${statusMsg}`
        );
        this.presenceCallbacks.forEach((cb) =>
          cb({
            getSender: () => userId,
            getContent: () => ({ userId, presence, statusMsg }),
          })
        );
      } catch (error) {
        console.error("[WS] Error parsing WebSocket message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WS] WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("[WS] WebSocket connection closed, attempting to reconnect");
      this.ws = null;
      setTimeout(() => {
        if (this.client) {
          this.ws = new WebSocket(
            `ws://localhost:8080?userId=${this.client.getUserId() || ""}`
          );
          this.ws.onopen = () => {
            console.log("[WS] Reconnected to WebSocket server");
            this.updatePresence("online", "online").catch((err) =>
              console.error(
                "[ERROR] Failed to set online after reconnect:",
                err
              )
            );
          };
        }
      }, 1000);
    };

    this.client.on(ClientEvent.Sync, (state: string) => {
      if (state === "ERROR" || state === "STOPPED") {
        this.updatePresence("offline", "").catch((err) =>
          console.error("[ERROR] Failed to set Offline status:", err)
        );
      }
    });

    this.checkInactivity();
  }

  private checkInactivity(): void {
    const now = Date.now();
    const selfPresence = this.presenceMap.get(
      this.client?.getUserId() || ""
    )?.presence;
    if (
      now - this.lastActivity > this.inactivityTimeout &&
      selfPresence !== "unavailable"
    ) {
      this.updatePresence("unavailable", "Inactive").catch((err) =>
        console.error("[ERROR] Failed to set Unavailable:", err)
      );
    } else if (selfPresence !== "online") {
      this.updatePresence("online", "online").catch((err) =>
        console.error("[ERROR] Failed to restore Online:", err)
      );
    }

    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.checkInactivity(), 30 * 1000);
  }

  public getPresence(userId: string): PresenceData {
    const data = this.presenceMap.get(userId) || {
      userId,
      presence: "offline",
      statusMsg: "",
      lastActiveAgo: 0,
    };
    console.log(`[DEBUG] Get presence for ${userId}:`, data);
    return data;
  }

  public async updatePresence(
    presence: "online" | "offline" | "unavailable",
    statusMsg?: string
  ): Promise<void> {
    if (!this.ws || !this.client) {
      console.warn("[WS] WebSocket or client not initialized");
      return;
    }
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[WS] WebSocket not open, skip sending presence");
      return;
    }

    const userId = this.client.getUserId() || "";
    this.ws.send(JSON.stringify({ presence, statusMsg }));
    this.presenceMap.set(userId, {
      userId,
      presence,
      statusMsg,
      lastActiveAgo: 0,
    });
    console.log(
      `[WS] Updated presence for ${userId}: ${presence}, ${statusMsg}`
    );
  }

  public disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
      console.log("[WS] Disconnected from WebSocket server");
    }
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  public onPresenceEvent(callback: (event: PresenceEvent) => void): void {
    this.presenceCallbacks.push(callback);
  }

  public offPresenceEvent(callback: (event: PresenceEvent) => void): void {
    this.presenceCallbacks = this.presenceCallbacks.filter(
      (cb) => cb !== callback
    );
  }

  public onRead(callback: (userId: string, roomId: string) => void): void {
    this.readCallbacks.push(callback);
  }

  public offRead(callback: (userId: string, roomId: string) => void): void {
    this.readCallbacks = this.readCallbacks.filter((cb) => cb !== callback);
  }
}
