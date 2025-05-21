/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  otherUserId?: string;
}

export class RoomService {
  constructor() {}

  private async getClient(): Promise<MatrixClient> {
    return await authService.getAuthenticatedClient();
  }

  async checkUserExists(userId: string): Promise<boolean> {
    if (!userId.trim() || !/^@[\w.-]+:[\w.-]+$/.test(userId)) {
      return false;
    }

    try {
      const client = await this.getClient();
      await client.getProfileInfo(userId);
      return true;
    } catch (error) {
      console.error(`❌ Error checking user ${userId}:`, error);
      return false;
    }
  }

  async createRoomWithType(roomName: string, isGroup: boolean): Promise<string> {
    if (!roomName.trim()) {
      throw new Error("Room name cannot be empty.");
    }

    try {
      const client = await this.getClient();
      const roomOptions: ICreateRoomOpts = {
        name: roomName,
        preset: isGroup ? Preset.PublicChat : Preset.PrivateChat,
        visibility: Visibility.Private,
        invite: isGroup ? [] : undefined,
      };

      const response = await client.createRoom(roomOptions);
      console.log(`✅ Room ${isGroup ? "group" : "contact"} created:`, response.room_id);
      return response.room_id;
    } catch (error) {
      console.error("❌ Error creating room:", error);
      throw new Error(`Cannot create room: ${(error as Error).message}`);
    }
  }

  async createDirectMessage(userId: string): Promise<string> {
    if (!userId.trim() || !/^@[\w.-]+:[\w.-]+$/.test(userId)) {
      throw new Error("Invalid user ID.");
    }

    try {
      const client = await this.getClient();
      const currentUserId = client.getUserId();
      if (!currentUserId) {
        throw new Error("Current user ID not found.");
      }
      if (userId === currentUserId) {
        throw new Error("Cannot create room with yourself.");
      }

      // Check if user exists
      try {
        await client.getProfileInfo(userId);
      } catch (error) {
        throw new Error(`User ${userId} does not exist.`);
      }

      // Create private room with is_direct flag
      const roomOptions: ICreateRoomOpts = {
        preset: Preset.PrivateChat,
        visibility: Visibility.Private,
        invite: [userId],
        is_direct: true,
      };

      const response = await client.createRoom(roomOptions);
      const roomId = response.room_id;
      console.log(`✅ DM room created: ${roomId} with ${userId}`);

      // Mark as direct message in account data
      const accountData = await client.getAccountDataFromServer("m.direct" as any);
      let dmRooms: Record<string, string[]> = {};
      if (accountData && typeof accountData === "object") {
        dmRooms = accountData as unknown as Record<string, string[]>;
      }
      dmRooms[currentUserId] = dmRooms[currentUserId] || [];
      if (!dmRooms[currentUserId].includes(roomId)) {
        dmRooms[currentUserId].push(roomId);
        await client.setAccountData('m.direct' as any, dmRooms as unknown as any);
      }

      return roomId;
    } catch (error) {
      console.error("❌ Error creating DM room:", error);
      throw new Error(`Cannot create DM room: ${(error as Error).message}`);
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} does not exist.`);
      }
      await client.leave(roomId);
      await client.forget(roomId);
      console.log("✅ Room deleted successfully:", roomId);
    } catch (error) {
      console.error("❌ Error deleting room:", error);
      throw new Error(`Cannot delete room: ${(error as Error).message}`);
    }
  }

  private async getLastMessageAndTimestamp(room: Room): Promise<{ lastMessage?: string; timestamp?: string; ts?: number; sender?: string }> {
    const client = await this.getClient();
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    if (events.length === 0) {
      console.log(`⚠️ Room ${room.roomId} - Timeline empty, no events found`);
      return { lastMessage: "No messages yet", timestamp: "N/A", ts: 0, sender: "N/A" };
    }

    const lastMessageEvent = events
      .slice()
      .reverse()
      .find(event => event.getType() === "m.room.message");

    if (!lastMessageEvent) {
      console.log(`⚠️ Room ${room.roomId} - No messages found`);
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

    console.log(`✅ Room ${room.roomId} - Last message: ${lastMessage}, Time: ${timestamp}, Sender: ${senderName}`);
    return { lastMessage, timestamp, ts: lastMessageEvent.getTs(), sender: senderName };
  }

  async fetchJoinedRooms(): Promise<RoomData[]> {
    try {
      const client = await this.getClient();
      const response = await client.getJoinedRooms();
      console.log("✅ Joined rooms list:", response.joined_rooms);

      const currentUserId = client.getUserId();

      const rooms: RoomData[] = await Promise.all(
        response.joined_rooms.map(async (roomId: string) => {
          const room = client.getRoom(roomId);
          if (!room) {
            console.log(`⚠️ Room ${roomId} does not exist in client`);
            return {
              roomId,
              name: "Room not loaded yet",
              lastMessage: "No messages yet",
              timestamp: "N/A",
              ts: 0,
              sender: "N/A",
              otherUserId: undefined,
            };
          }

          const name = room.name || "Room with no name";
          console.log(`📋 Room ${roomId} - Name: ${name}`);

          const { lastMessage, timestamp, ts, sender } = await this.getLastMessageAndTimestamp(room);

          let isGroup = false;
          let otherUserId = undefined;
          try {
            const members = room.getJoinedMembers();
            isGroup = members.length > 2;
            if (!isGroup) {
              const other = members.find(m => m.userId !== currentUserId);
              otherUserId = other?.userId;
            }
            console.log(`👥 Room ${roomId} - Number of members: ${members.length}, Is group: ${isGroup}`);
          } catch (error) {
            console.error(`❌ Error getting member list for room ${roomId}:`, error);
          }

          return {
            roomId,
            name,
            lastMessage,
            timestamp,
            ts,
            isGroup,
            sender,
            otherUserId,
          };
        })
      );

      const sortedRooms = rooms.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      console.log("📦 Room data returned (sorted):", sortedRooms);
      return sortedRooms;
    } catch (error) {
      console.error("❌ Error fetching joined rooms:", error);
      throw new Error(`Cannot fetch joined rooms: ${(error as Error).message}`);
    }
  }

  async checkExistingContact(userId: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const currentUserId = client.getUserId();
      if (!currentUserId) {
        throw new Error("Current user ID not found.");
      }

      // Lấy danh sách các phòng trực tiếp
      const accountData = await client.getAccountDataFromServer("m.direct" as any);
      if (accountData && typeof accountData === "object") {
        const dmRooms: Record<string, string[]> = accountData as unknown as Record<string, string[]>;
        const userRooms = dmRooms[currentUserId] || [];
        
        // Kiểm tra xem có phòng nào với người dùng này không
        for (const roomId of userRooms) {
          const room = client.getRoom(roomId);
          if (room && room.getMember(userId)) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking existing contact:", error);
      throw new Error(`Failed to check existing contact: ${(error as Error).message}`);
    }
  }
}

const roomService = new RoomService();
export default roomService;
