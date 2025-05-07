import { MatrixClient } from "matrix-js-sdk";
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
    if (typeof window === "undefined") {
      throw new Error("Login is not supported on server-side.");
    }

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
        const errorData: { errcode: string } = await response.json();
        const errorMessages: { [key: string]: string } = {
          M_FORBIDDEN: "Invalid username or password. Please check your credentials.",
          M_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
          M_USER_DEACTIVATED: "Your account has been deactivated.",
        };
        throw new Error(errorMessages[errorData.errcode] || "Login failed. Please check your credentials.");
      }

      const { access_token, user_id } = await response.json();

      localStorage.setItem("accessToken", access_token);
      localStorage.setItem("userId", user_id);
      localStorage.setItem("matrix_homeserver", baseUrl);

      await MatrixClientManager.initialize(access_token, user_id);
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
    if (typeof window === "undefined") {
      throw new Error("Login is not supported on server-side.");
    }

    try {
      // Validate token by calling /whoami
      const response = await fetch(`${baseUrl}/_matrix/client/r0/account/whoami`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessages: { [key: string]: string } = {
          M_UNKNOWN_TOKEN: "Invalid or expired access token. Please copy a new mx_access_token from Element's localStorage at https://app.element.io.",
          M_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
        };
        throw new Error(errorMessages[String(errorData.errcode)] || "Invalid access token. Please try again.");
      }

      const { user_id } = await response.json();
      if (!user_id) {
        throw new Error("User ID not found from access token.");
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userId", user_id);
      localStorage.setItem("matrix_homeserver", baseUrl);

      await MatrixClientManager.initialize(accessToken, user_id);
      console.log("✅ Login with access token successful:", user_id);
    } catch (error: any) {
      console.error("❌ Error during login with access token:", error);
      throw new Error(error.message || "Login with access token failed.");
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
    const baseUrl = localStorage.getItem("matrix_homeserver");

    if (!accessToken || !userId || !baseUrl) {
      throw new Error("You are not logged in to Matrix. Please log in or paste your Element access token (mx_access_token) from https://app.element.io.");
    }

    try {
      const client = await MatrixClientManager.initialize(accessToken, userId);
      console.log("MatrixClient initialized:", client.getUserId(), client.getSyncState());
      return client;
    } catch (error: any) {
      console.error("Error initializing client:", error);
      await this.logout();
      throw new Error("Session has expired. Please log in again or paste your Element access token (mx_access_token) from https://app.element.io.");
    }
  }

  /**
   * Logs out the user and clears the session.
   */
  async logout(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      const baseUrl = localStorage.getItem("matrix_homeserver");
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
    } catch (error: any) {
      console.error("Error during logout:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("matrix_homeserver");
    }
  }

  /**
   * Checks if the current access token is valid.
   * @returns True if the token is valid, false otherwise.
   */
  async isTokenValid(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false; // Cannot validate token on server-side
    }

    try {
      const client = await this.getAuthenticatedClient();
      await client.whoami();
      return true;
    } catch (error: any) {
      console.error("Token validation failed:", error);
      // Clear localStorage on invalid token
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("matrix_homeserver");
      return false;
    }
  }
}

export default AuthService.getInstance();