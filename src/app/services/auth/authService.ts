
import { MatrixClient } from "matrix-js-sdk";
import { MATRIX_CONFIG } from "@/app/services/utils/config";
import { MatrixClientManager } from "@/app/services/matrix/matrixClient";

class AuthService {
  private static instance: AuthService | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Logs in a user with username and password.
   * @param baseUrl The Matrix homeserver URL.
   * @param username The Matrix username (e.g., @user:matrix.org).
   * @param password The password.
   */
  async login(baseUrl: string, username: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${baseUrl}/_matrix/client/r0/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "m.login.password",
          identifier: { type: "m.id.user", user: username },
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          {
            M_FORBIDDEN: "Invalid username or password.",
            M_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
            M_USER_DEACTIVATED: "Your account has been deactivated.",
          }[errorData.errcode] || "Login failed. Please check your credentials."
        );
      }

      const { access_token, user_id } = await response.json();

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", access_token);
        localStorage.setItem("userId", user_id);
        localStorage.setItem("matrix_homeserver", baseUrl);
      }

      await MatrixClientManager.initialize(access_token, user_id, baseUrl);
      console.log("✅ Login successful:", user_id);
    } catch (error: any) {
      console.error("❌ Error during login:", error);
      throw new Error(error.message || "Login failed. Please try again.");
    }
  }

  /**
   * Logs in a user with an access token.
   * @param baseUrl The Matrix homeserver URL.
   * @param accessToken The Matrix access token.
   */
  async loginWithAccessToken(baseUrl: string, accessToken: string): Promise<void> {
    try {
      if (typeof window === "undefined") {
        throw new Error("Login is only supported on client-side.");
      }

      // Validate token by calling /whoami
      const response = await fetch(`${baseUrl}/_matrix/client/r0/account/whoami`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          {
            M_UNKNOWN_TOKEN: "Invalid or expired Access Token.",
            M_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
          }[errorData.errcode] || "Invalid Access Token."
        );
      }

      const { user_id } = await response.json();
      if (!user_id) {
        throw new Error("User ID not found from Access Token.");
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userId", user_id);
      localStorage.setItem("matrix_homeserver", baseUrl);

      await MatrixClientManager.initialize(accessToken, user_id, baseUrl);
      console.log("✅ Login with Access Token successful:", user_id);
    } catch (error: any) {
      console.error("❌ Error during login with Access Token:", error);
      throw new Error(error.message || "Login with Access Token failed.");
    }
  }

  /**
   * Gets the authenticated Matrix client.
   * @returns The Matrix client instance.
   * @throws Error if user is not logged in or client initialization fails.
   */
  async getAuthenticatedClient(): Promise<MatrixClient> {
    if (typeof window === "undefined") {
      throw new Error("Matrix client only works on client-side.");
    }

    const accessToken = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    const baseUrl = localStorage.getItem("matrix_homeserver") || MATRIX_CONFIG.BASE_URL;

    if (!accessToken || !userId) {
      throw new Error("You are not logged in to Matrix. Please log in first.");
    }

    try {
      const client = await MatrixClientManager.initialize(accessToken, userId, baseUrl);
      console.log("MatrixClient initialized:", client.getUserId(), client.getSyncState());
      return client;
    } catch (error) {
      console.error("Error initializing client:", error);
      this.logout();
      throw new Error("Session has expired. Please log in again.");
    }
  }

  /**
   * Logs out the user and clears the session.
   */
  async logout(): Promise<void> {
    try {
      if (typeof window === "undefined") return;

      const accessToken = localStorage.getItem("accessToken");
      const baseUrl = localStorage.getItem("matrix_homeserver") || MATRIX_CONFIG.BASE_URL;

      if (accessToken && baseUrl) {
        // Call Matrix /logout endpoint
        await fetch(`${baseUrl}/_matrix/client/r0/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      const userId = MatrixClientManager.getClient()?.getUserId();
      if (userId) {
        sessionStorage.removeItem(`deviceId_${userId}`);
      }

      MatrixClientManager.reset();
      console.log("✅ Logout successful.");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("matrix_homeserver");
      }
    }
  }

  /**
   * Checks if the current access token is valid.
   * @returns True if the token is valid, false otherwise.
   */
  async isTokenValid(): Promise<boolean> {
    try {
      const client = await this.getAuthenticatedClient();
      await client.whoami();
      return true;
    } catch {
      return false;
    }
  }
}

const authService = AuthService.getInstance();
export default authService;