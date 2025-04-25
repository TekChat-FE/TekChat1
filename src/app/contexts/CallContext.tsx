// src/app/contexts/CallContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MatrixCall, MatrixClient, CallEvent } from 'matrix-js-sdk';
import { CallService, CallType } from '@/app/services/matrix/callService';

interface CallState {
  activeCall: MatrixCall | null;
  incomingCall: MatrixCall | null;
  callType: CallType | null;
  callState: string;
  callDuration: number;
  callerName: string;
  receiverName: string;
  isCaller: boolean;
  error: string | null;
}

interface CallContextType {
  state: CallState;
  startCall: (roomId: string, type: CallType) => Promise<void>;
  answerCall: (call: MatrixCall) => Promise<void>;
  rejectCall: (call: MatrixCall) => void;
  hangupCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ matrixClient: MatrixClient | null; children: React.ReactNode }> = ({ matrixClient, children }) => {
  const callService = useMemo(() => (matrixClient ? new CallService(matrixClient) : null), [matrixClient]);
  const [state, setState] = useState<CallState>({
    activeCall: null,
    incomingCall: null,
    callType: null,
    callState: '',
    callDuration: 0,
    callerName: 'Người dùng không xác định',
    receiverName: 'Người dùng không xác định',
    isCaller: false,
    error: null,
  });

  useEffect(() => {
    if (!callService) return; // Skip if callService is null (i.e., matrixClient is null)

    const handleDurationUpdate = (duration: number) => {
      setState((prev) => ({ ...prev, callDuration: duration }));
    };

    const handleStateUpdate = (callState: string) => {
      setState((prev) => {
        // Reset callDuration when the call is not yet fully connected
        const isFullyConnected = callState === 'connected' && (prev.activeCall?.getRemoteFeeds()?.length ?? 0) > 0;
        return {
          ...prev,
          callState,
          callDuration: isFullyConnected ? prev.callDuration : 0, // Reset duration until fully connected
        };
      });
    };

    console.log('Registering call duration listener');
    const removeDurationListener = callService.onCallDuration(handleDurationUpdate);
    console.log('Registering call state listener');
    const removeStateListener = callService.onCallState(handleStateUpdate);

    return () => {
      removeDurationListener();
      removeStateListener();
    };
  }, [callService]);

  useEffect(() => {
    if (!callService || !matrixClient) return; // Skip if callService or matrixClient is null

    const handleIncomingCall = async (call: MatrixCall) => {
      const currentUserId = matrixClient.getUserId();
      let callerName = 'Người dùng không xác định';
      const receiverName = currentUserId ? matrixClient.getUser(currentUserId)?.displayName || currentUserId || 'Bạn' : 'Bạn';
      const opponentMember = call.getOpponentMember();

      if (opponentMember) {
        callerName = opponentMember.name || opponentMember.userId;
      } else {
        const room = matrixClient.getRoom(call.roomId);
        if (room) {
          const members = room.getJoinedMembers();
          const otherMembers = currentUserId ? members.filter((m) => m.userId !== currentUserId) : members;
          if (otherMembers.length === 1) {
            callerName = otherMembers[0].name || otherMembers[0].userId;
          } else if (otherMembers.length > 1) {
            callerName = room.name || 'Cuộc gọi nhóm';
          }
        }
      }

      setState((prev) => ({
        ...prev,
        incomingCall: call,
        callerName,
        receiverName,
        callType: call.type as CallType,
        callDuration: 0, // Reset duration on incoming call
        callState: 'incoming', // Initial state for incoming call
        isCaller: false,
      }));

      call.on(CallEvent.Hangup, () => {
        setState((prev) => ({
          ...prev,
          incomingCall: null,
          activeCall: null,
          callType: null,
          callState: '',
          callDuration: 0,
          isCaller: false,
        }));
      });
      call.on(CallEvent.Error, () => {
        setState((prev) => ({
          ...prev,
          incomingCall: null,
          activeCall: null,
          callType: null,
          callState: '',
          callDuration: 0,
          isCaller: false,
          error: 'Lỗi cuộc gọi',
        }));
      });
    };

    console.log('Registering incoming call listener');
    const removeListener = callService.onIncomingCall(handleIncomingCall);
    return () => removeListener();
  }, [matrixClient, callService]);

  const startCall = async (roomId: string, type: CallType) => {
    if (!callService) {
      setState((prev) => ({
        ...prev,
        error: 'MatrixClient chưa được khởi tạo. Vui lòng đăng nhập.',
      }));
      return;
    }

    try {
      const call = await callService.startCall(roomId, type);
      const currentUserId = matrixClient!.getUserId(); // Safe because callService exists
      const callerName = currentUserId ? matrixClient!.getUser(currentUserId)?.displayName || currentUserId || 'Bạn' : 'Bạn';
      let receiverName = 'Người dùng không xác định';
      const room = matrixClient!.getRoom(roomId);
      if (room) {
        const members = room.getJoinedMembers();
        const otherMembers = currentUserId ? members.filter((m) => m.userId !== currentUserId) : members;
        if (otherMembers.length === 1) {
          receiverName = otherMembers[0].name || otherMembers[0].userId;
        } else {
          receiverName = room.name || 'Cuộc gọi nhóm';
        }
      }
      setState((prev) => ({
        ...prev,
        activeCall: call,
        callType: type,
        callerName,
        receiverName,
        callDuration: 0, // Reset duration on call start
        callState: 'initiating', // Initial state for outgoing call
        isCaller: true,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Không thể bắt đầu cuộc gọi',
      }));
    }
  };

  const answerCall = async (call: MatrixCall) => {
    if (!callService) {
      setState((prev) => ({
        ...prev,
        error: 'MatrixClient chưa được khởi tạo. Vui lòng đăng nhập.',
      }));
      return;
    }

    try {
      await callService.answerCall(call);
      setState((prev) => ({
        ...prev,
        activeCall: call,
        incomingCall: null,
        callType: call.type as CallType,
        callDuration: 0, // Reset duration on call answer
        callState: 'answering', // Initial state for answering
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Không thể chấp nhận cuộc gọi',
        incomingCall: null,
      }));
      callService.rejectCall(call);
    }
  };

  const rejectCall = (call: MatrixCall) => {
    if (!callService) {
      setState((prev) => ({
        ...prev,
        error: 'MatrixClient chưa được khởi tạo. Vui lòng đăng nhập.',
      }));
      return;
    }

    callService.rejectCall(call);
    setState((prev) => ({
      ...prev,
      incomingCall: null,
      callDuration: 0, // Reset duration on call rejection
      callState: '',
    }));
  };

  const hangupCall = () => {
    if (!callService) {
      setState((prev) => ({
        ...prev,
        error: 'MatrixClient chưa được khởi tạo. Vui lòng đăng nhập.',
      }));
      return;
    }

    callService.hangupCall();
    setState((prev) => ({
      ...prev,
      activeCall: null,
      callType: null,
      callState: '',
      callDuration: 0,
      isCaller: false,
    }));
  };

  return (
    <CallContext.Provider value={{ state, startCall, answerCall, rejectCall, hangupCall }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};