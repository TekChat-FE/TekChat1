/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, MatrixClient, SyncState, ClientEvent } from "matrix-js-sdk";
import { MATRIX_CONFIG } from "@/app/services/utils/config";
import { PresenceService } from "./presenceService";

// Optional PresenceService import to avoid breaking if not available
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export class MatrixClientManager {
  private static client: MatrixClient | null = null;
  private static isInitializing: boolean = false;
  private static syncPromise: Promise<void> | null = null;
  private static matrixSdk: any = null;

  /**
   * Validates the access token by calling /whoami.
   * @param baseUrl The homeserver URL.
   * @param accessToken The access token to validate.
   * @returns True if valid, throws error if invalid.
   */
  private static async validateToken(baseUrl: string, accessToken: string): Promise<boolean> {
    if (typeof window === "undefined") {
      throw new Error("Token validation is not supported on server-side.");
    }

    try {
      const response = await fetch(`${baseUrl}/_matrix/client/r0/account/whoami`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Invalid access token");
      }
      return true;
    } catch (error: any) {
      console.error("Token validation failed:", {
        message: error.message,
        baseUrl,
        accessToken: accessToken.substring(0, 10) + "...",
      });
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Loads matrix-js-sdk dynamically and caches it.
   * @returns The matrix-js-sdk module.
   */
  private static async loadMatrixSdk() {
    if (typeof window === "undefined") {
      throw new Error("Matrix SDK loading is not supported on server-side.");
    }
    if (!this.matrixSdk) {
      console.warn("Loading matrix-js-sdk. Ensure all imports use MatrixClientManager to avoid multiple entrypoints.");
      this.matrixSdk = await import("matrix-js-sdk");
    }
    return this.matrixSdk;
  }

  /**
   * Initializes the Matrix client and waits for sync to complete.
   * @param accessToken The access token for authentication.
   * @param userId The user ID.
   * @returns The initialized Matrix client.
   */
  static async initialize(accessToken: string, userId: string): Promise<MatrixClient> {
    if (typeof window === "undefined") {
      throw new Error("Matrix client initialization is not supported on server-side.");
    }

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
    this.syncPromise = new Promise(async (resolve, reject) => {
      try {
        // Get baseUrl from localStorage or fallback to config
        const baseUrl = localStorage.getItem("matrix_homeserver") || MATRIX_CONFIG.BASE_URL;
        if (!baseUrl) {
          throw new Error("Homeserver URL not found in localStorage or config.");
        }

        // Validate baseUrl
        try {
          new URL(baseUrl);
        } catch {
          throw new Error("Invalid homeserver URL: " + baseUrl);
        }

        // Load matrix-js-sdk
        await this.loadMatrixSdk();

        // Validate access token
        await this.validateToken(baseUrl, accessToken).catch((error) => {
          console.error(`Lỗi xác thực token cho ${userId}:`, error);
          reject(error);
        });

        let deviceId = sessionStorage.getItem(`deviceId_${userId}`);
        if (!deviceId) {
          deviceId = this.generateDeviceId(userId);
          sessionStorage.setItem(`deviceId_${userId}`, deviceId);
        }

        console.log(`Khởi tạo MatrixClient cho user ${userId} với deviceId: ${deviceId}, baseUrl: ${baseUrl}`);

        this.client = createClient({
          baseUrl,
          accessToken,
          userId,
          deviceId,
        });

        // Initialize PresenceService if available
        if (PresenceService) {
          const presenceService = PresenceService.getInstance();
          presenceService.initialize(this.client).then(() => {
            presenceService.updatePresence('online', 'online').catch((err) =>
              console.error('[ERROR] Failed to set online status after initialization:', err)
            );
          });
        }

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

        this.client.startClient({ initialSyncLimit: 10 }).catch((error: any) => {
          console.error(`Lỗi khi khởi động client cho ${userId}:`, error);
          reject(new Error(`Không thể khởi động client: ${error.message}`));
        });
      } catch (error: any) {
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
    } catch (error: any) {
      this.isInitializing = false;
      this.syncPromise = null;
      this.client = null;
      // Clear localStorage on token-related errors
      if (error.message.includes("Invalid access token") || error.message.includes("Token validation failed")) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("matrix_homeserver");
      }
      throw error;
    }
  }

  /**
   * Gets the current Matrix client.
   * @returns The Matrix client or null if not initialized.
   */
  static getClient(): MatrixClient | null {
    return this.client;
  }

  /**
   * Resets the Matrix client.
   */
  static async reset(): Promise<void> {
    if (this.client) {
      if (PresenceService) {
        await PresenceService.getInstance().updatePresence('offline', '');
      }
      this.client.stopClient();
      this.client = null;
    }
    this.isInitializing = false;
    this.syncPromise = null;
  }

  /**
   * Generates a unique device ID for the user.
   * @param userId The user ID.
   * @returns A unique device ID.
   */
  private static generateDeviceId(userId: string): string {
    return `${userId.split(':')[0]}-${Math.random().toString(36).substring(2, 15)}`;
  }

  // Exported utilities from matrix-js-sdk
  static createClient = createClient;
  static ClientEvent = ClientEvent;
  static SyncState = SyncState;
}