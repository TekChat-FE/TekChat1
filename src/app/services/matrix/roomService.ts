import { MatrixClient, ICreateRoomOpts, Preset, Visibility, Room } from "matrix-js-sdk";
import authService from "@/app/services/auth/authService";

export interface RoomData {
  roomId: string;
  name: string;
  lastMessage?: string;
  timestamp?: string;
  ts?: number;
  isGroup?: boolean;
  sender?: string;
}

export class RoomService {
  constructor() {}

  private async getClient(): Promise<MatrixClient> {
    return await authService.getAuthenticatedClient();
  }

  async createRoomWithType(roomName: string, isGroup: boolean): Promise<string> {
    if (!roomName.trim()) {
      throw new Error("Tên phòng không được để trống.");
    }

    try {
      const client = await this.getClient();
      const roomOptions: ICreateRoomOpts = {
        name: roomName,
        preset: isGroup ? Preset.PublicChat : Preset.PrivateChat, // PublicChat cho nhóm, PrivateChat cho liên hệ
        visibility: Visibility.Private,
        invite: isGroup ? [] : undefined, // Không mời ai nếu là nhóm
      };

      const response = await client.createRoom(roomOptions);
      console.log(`✅ Phòng ${isGroup ? "nhóm" : "liên hệ"} được tạo:`, response.room_id);
      return response.room_id;
    } catch (error) {
      console.error("❌ Lỗi khi tạo phòng:", error);
      throw new Error("Không thể tạo phòng.");
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.leave(roomId);
      await client.forget(roomId);
      console.log("✅ Đã xóa phòng thành công:", roomId);
    } catch (error) {
      console.error("❌ Lỗi khi xóa phòng:", error);
      throw new Error("Không thể xóa phòng.");
    }
  }

  private async getLastMessageAndTimestamp(room: Room): Promise<{ lastMessage?: string; timestamp?: string; ts?: number; sender?: string }> {
    const client = await this.getClient();
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    if (events.length === 0) {
      console.log(`⚠️ Phòng ${room.roomId} - Timeline trống, không có sự kiện nào`);
      return { lastMessage: "No messages yet", timestamp: "N/A", ts: 0, sender: "N/A" };
    }

    const lastMessageEvent = events
      .slice()
      .reverse()
      .find(event => event.getType() === "m.room.message");

    if (!lastMessageEvent) {
      console.log(`⚠️ Phòng ${room.roomId} - Không tìm thấy tin nhắn nào`);
      return { lastMessage: "No messages yet", timestamp: "N/A", ts: 0, sender: "N/A" };
    }

    const content = lastMessageEvent.getContent();
    const sender = lastMessageEvent.getSender();
    const senderName = client.getUser(sender || "")?.displayName || sender || "Unknown";
    const lastMessage = content.body || "Message unavailable";

    const eventDate = new Date(lastMessageEvent.getTs());
    const today = new Date();
    const isToday = eventDate.toDateString() === today.toDateString();
    const timestamp = isToday
      ? eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : eventDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });

    console.log(`✅ Phòng ${room.roomId} - Tin nhắn cuối: ${lastMessage}, Thời gian: ${timestamp}, Người gửi: ${senderName}`);
    return { lastMessage, timestamp, ts: lastMessageEvent.getTs(), sender: senderName };
  }

  async fetchJoinedRooms(): Promise<RoomData[]> {
    try {
      const client = await this.getClient();
      const response = await client.getJoinedRooms();
      console.log("✅ Danh sách phòng đã tham gia:", response.joined_rooms);

      const rooms: RoomData[] = await Promise.all(
        response.joined_rooms.map(async (roomId: string) => {
          const room = client.getRoom(roomId);
          if (!room) {
            console.log(`⚠️ Phòng ${roomId} không tồn tại trong client`);
            return {
              roomId,
              name: "Chưa tải phòng",
              lastMessage: "No messages yet",
              timestamp: "N/A",
              ts: 0,
              sender: "N/A",
            };
          }

          const name = room.name || "Phòng không tên";
          console.log(`📋 Phòng ${roomId} - Tên: ${name}`);

          const { lastMessage, timestamp, ts, sender } = await this.getLastMessageAndTimestamp(room);

          let isGroup = false;
          try {
            const members = room.getJoinedMembers();
            isGroup = members.length > 2;
            console.log(`👥 Phòng ${roomId} - Số thành viên: ${members.length}, Là nhóm: ${isGroup}`);
          } catch (error) {
            console.error(`❌ Lỗi khi lấy danh sách thành viên cho phòng ${roomId}:`, error);
          }

          return {
            roomId,
            name,
            lastMessage,
            timestamp,
            ts,
            isGroup,
            sender,
          };
        })
      );

      const sortedRooms = rooms.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      console.log("📦 Dữ liệu phòng trả về (đã sắp xếp):", sortedRooms);
      return sortedRooms;
    } catch (error) {
      console.error("❌ Lỗi khi lấy danh sách phòng:", error);
      throw new Error("Không thể tải danh sách phòng.");
    }
  }
}

const roomService = new RoomService();
export default roomService;