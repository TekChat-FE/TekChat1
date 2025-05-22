import { useEffect, useState } from 'react';
import { PresenceService } from '../services/matrix/presenceService';

export const usePresence = (userId: string) => {
  const [isActive, setIsActive] = useState(false);
  const presenceService = PresenceService.getInstance();

  useEffect(() => {
    const handlePresenceEvent = (event: any) => {
      const presenceData = presenceService.getPresence(userId);
      setIsActive(presenceData.presence === 'online');
    };

    // Kiểm tra trạng thái ban đầu
    const initialPresence = presenceService.getPresence(userId);
    setIsActive(initialPresence.presence === 'online');

    // Đăng ký lắng nghe sự kiện thay đổi trạng thái
    presenceService.onPresenceEvent(handlePresenceEvent);

    return () => {
      presenceService.offPresenceEvent(handlePresenceEvent);
    };
  }, [userId]);

  return isActive;
}; 