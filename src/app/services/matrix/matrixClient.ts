import { createClient, MatrixClient, SyncState, ClientEvent } from "matrix-js-sdk";
import { MATRIX_CONFIG } from "@/app/services/utils/config";
import { PresenceService } from "./presenceService";

export class MatrixClientManager {
  private static client: MatrixClient | null = null;
  private static isInitializing: boolean = false;
  private static syncPromise: Promise<void> | null = null;

  static async initialize(accessToken: string, userId: string): Promise<MatrixClient> {
    if (this.client && this.client.getSyncState() !== null) {
      console.log(`Trả về client đã khởi tạo: ${userId}, trạng thái: ${this.client.getSyncState()}`);
      return this.client;
    }

    if (this.isInitializing) {
      console.log(`Đang khởi tạo client cho ${userId}, chờ hoàn tất...`);
      await this.syncPromise;
      if (this.client) return this.client;
      throw new Error("Khởi tạo client thất bại.");
    }

    this.isInitializing = true;
    this.syncPromise = new Promise((resolve, reject) => {
      try {
        let deviceId = sessionStorage.getItem(`deviceId_${userId}`);
        if (!deviceId) {
          deviceId = this.generateDeviceId(userId);
          sessionStorage.setItem(`deviceId_${userId}`, deviceId);
        }

        console.log(`Khởi tạo MatrixClient cho user ${userId} với deviceId: ${deviceId}`);

        this.client = createClient({
          baseUrl: MATRIX_CONFIG.BASE_URL,
          accessToken,
          userId,
          deviceId,
        });

        // Initialize PresenceService with the client
        const presenceService = PresenceService.getInstance();
        presenceService.initialize(this.client).then(() => {
          // Đảm bảo trạng thái online được gửi sau khi khởi tạo
          presenceService.updatePresence('online', 'online').catch((err) =>
            console.error('[ERROR] Failed to set online status after initialization:', err)
          );
        });

        this.client.on(ClientEvent.Sync, (state: SyncState, prevState: SyncState | null) => {
          console.log(`Trạng thái sync cho ${userId} (deviceId: ${deviceId}): ${state} (trước đó: ${prevState})`);
          if (state === "PREPARED" || state === "SYNCING") {
            console.log(`✅ MatrixClient đã đồng bộ xong cho ${userId}!`);
            resolve();
          } else if (state === "ERROR") {
            console.error(`❌ Lỗi đồng bộ hóa cho ${userId}!`);
            reject(new Error("Lỗi đồng bộ hóa client."));
          }
        });

        // Yêu cầu đồng bộ Presence
        this.client.startClient({ initialSyncLimit: 10 }).catch(error => {
          console.error(`Lỗi khi khởi động client cho ${userId}:`, error);
          reject(error);
        });
      } catch (error) {
        console.error(`Lỗi khi khởi tạo client cho ${userId}:`, error);
        reject(error);
      }
    });

    try {
      await this.syncPromise;
      this.isInitializing = false;
      this.syncPromise = null;
      if (!this.client) throw new Error("Client không được khởi tạo.");
      return this.client;
    } catch (error) {
      this.isInitializing = false;
      this.syncPromise = null;
      this.client = null;
      throw error;
    }
  }

  static getClient(): MatrixClient | null {
    return this.client;
  }

  static async reset(): Promise<void> {
    if (this.client) {
      await PresenceService.getInstance().updatePresence('offline', '');
      this.client.stopClient();
      this.client = null;
    }
    this.isInitializing = false;
    this.syncPromise = null;
  }

  private static generateDeviceId(userId: string): string {
    return `${userId.split(':')[0]}-${Math.random().toString(36).substring(2, 15)}`;
  }
}