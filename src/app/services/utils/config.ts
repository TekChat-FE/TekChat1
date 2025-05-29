// config.ts
export const MATRIX_CONFIG = {
    SYNC_TIMEOUT_MS: 120000, // Thời gian chờ đồng bộ
    FETCH_MESSAGES_LIMIT: 1000, // Số lượng tin nhắn tối đa khi fetch
    INITIAL_SYNC_LIMIT: 10, // Giới hạn đồng bộ ban đầu
    BASE_URL: "https://matrix.teknix.dev",
    ICE_SERVERS: [
      { urls: "stun:stun.matrix.org:3478" },
      { urls: "turn:turn.matrix.org:3478", username: "matrix", credential: "turnpassword" },
    ],
  };