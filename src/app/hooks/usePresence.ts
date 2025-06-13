import { useEffect, useState } from 'react';
import { PresenceService } from '../services/matrix/presenceService';

interface PresenceInfo {
  isActive: boolean;
  lastActiveAgo?: number; // số mili-giây kể từ lần cuối hoạt động (server trả về)
  receivedAt?: number; // timestamp (ms) khi client nhận event
}

export const usePresence = (userId: string): PresenceInfo => {
  const [presenceInfo, setPresenceInfo] = useState<PresenceInfo>({
    isActive: false,
    lastActiveAgo: undefined,
    receivedAt: undefined
  });
  const presenceService = PresenceService.getInstance();

  useEffect(() => {
    const handlePresenceEvent = (event: any) => {
      const presenceData = presenceService.getPresence(userId);
      setPresenceInfo({
        isActive: presenceData.presence === 'online',
        lastActiveAgo: presenceData.lastActiveAgo,
        receivedAt: Date.now()
      });
    };

    // Kiểm tra trạng thái ban đầu
    const initialPresence = presenceService.getPresence(userId);
    setPresenceInfo({
      isActive: initialPresence.presence === 'online',
      lastActiveAgo: initialPresence.lastActiveAgo,
      receivedAt: Date.now()
    });

    // Đăng ký lắng nghe sự kiện thay đổi trạng thái
    presenceService.onPresenceEvent(handlePresenceEvent);

    return () => {
      presenceService.offPresenceEvent(handlePresenceEvent);
    };
  }, [userId]);

  return presenceInfo;
}; 