import { MatrixClient, ClientEvent, SetPresence, MatrixEvent } from "matrix-js-sdk";

interface PresenceData {
  userId: string;
  presence: SetPresence;
  statusMsg?: string;
  lastActiveAgo?: number;
}

export class PresenceService {
  private static instance: PresenceService;
  private presenceMap: Map<string, PresenceData> = new Map();
  private client: MatrixClient | null = null;
  private lastActivity: number = Date.now();
  private inactivityTimeout: number = 5 * 60 * 1000;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private presenceCallbacks: Array<(event: MatrixEvent) => void> = [];
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

    // Lắng nghe sự kiện presence từ Matrix
    this.client.on(ClientEvent.Event, (event: MatrixEvent) => {
      if (event.getType() !== "m.presence") return;
      
      const userId = event.getSender()!;
      const content = event.getContent();
      
      this.presenceMap.set(userId, {
        userId,
        presence: content.presence as SetPresence,
        statusMsg: content.statusMsg,
        lastActiveAgo: content.last_active_ago
      });

      this.presenceCallbacks.forEach(cb => cb(event));
    });

    // Lắng nghe sự kiện sync để xử lý trạng thái offline
    this.client.on(ClientEvent.Sync, (state: string) => {
      if (state === "ERROR" || state === "STOPPED") {
        this.updatePresence(SetPresence.Offline, "").catch((err) =>
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
      selfPresence !== SetPresence.Unavailable
    ) {
      this.updatePresence(SetPresence.Unavailable, "Inactive").catch((err) =>
        console.error("[ERROR] Failed to set Unavailable:", err)
      );
    } else if (selfPresence !== SetPresence.Online) {
      this.updatePresence(SetPresence.Online, "online").catch((err) =>
        console.error("[ERROR] Failed to restore Online:", err)
      );
    }

    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.checkInactivity(), 30 * 1000);
  }

  public getPresence(userId: string): PresenceData {
    const data = this.presenceMap.get(userId) || {
      userId,
      presence: SetPresence.Offline,
      statusMsg: "",
      lastActiveAgo: 0,
    };
    return data;
  }

  public async updatePresence(
    presence: SetPresence,
    statusMsg?: string
  ): Promise<void> {
    if (!this.client) {
      console.warn("[Matrix] Client not initialized");
      return;
    }

    try {
      await this.client.setPresence({
        presence,
        status_msg: statusMsg
      });
      
      const userId = this.client.getUserId() || "";
      this.presenceMap.set(userId, {
        userId,
        presence,
        statusMsg,
        lastActiveAgo: 0,
      });
      
      console.log(`[Matrix] Updated presence for ${userId}: ${presence}, ${statusMsg}`);
    } catch (error) {
      console.error("[Matrix] Failed to update presence:", error);
    }
  }

  public onPresenceEvent(callback: (event: MatrixEvent) => void): void {
    this.presenceCallbacks.push(callback);
  }

  public offPresenceEvent(callback: (event: MatrixEvent) => void): void {
    this.presenceCallbacks = this.presenceCallbacks.filter(
      (cb) => cb !== callback
    );
  }

  public onRead(callback: (userId: string, roomId: string) => void): void {
    this.readCallbacks.push(callback);
  }

  public offRead(callback: (userId: string, roomId: string) => void): void {
    this.readCallbacks = this.readCallbacks.filter(cb => cb !== callback);
  }

  private notifyRead(userId: string, roomId: string): void {
    this.readCallbacks.forEach(cb => cb(userId, roomId));
  }
}
