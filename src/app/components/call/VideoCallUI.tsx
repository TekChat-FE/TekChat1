'use client';

import React, { useState } from 'react';
import useCall from '@/app/hooks/useCall';
import CallControls from './CallControls';
import VideoFeed from './VideoFeed';
import { useTranslations } from 'next-intl';

const VideoCallUI: React.FC = () => {
  const t = useTranslations('CallUI');
  const { state, hangupCall } = useCall();
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMic = () => {
    console.log('Toggling mic, current state:', isMicOn);
    setIsMicOn((prev) => {
      const newMicState = !prev;
      if (state.activeCall) {
        const localFeed = state.activeCall.getLocalFeeds()[0];
        if (localFeed) {
          const audioTracks = localFeed.stream.getAudioTracks();
          audioTracks.forEach((track) => {
            track.enabled = newMicState;
            console.log('Mic track enabled:', track.enabled);
          });
        }
      }
      return newMicState;
    });
  };

  const toggleCamera = () => {
    console.log('Toggling camera, current state:', isCameraOn);
    setIsCameraOn((prev) => {
      const newCameraState = !prev;
      if (state.activeCall) {
        const localFeed = state.activeCall.getLocalFeeds()[0];
        if (localFeed) {
          const videoTracks = localFeed.stream.getVideoTracks();
          videoTracks.forEach((track) => {
            track.enabled = newCameraState;
            console.log('Camera track enabled:', track.enabled);
          });
        }
      }
      return newCameraState;
    });
  };

  const toggleSpeaker = () => {
    console.log('Toggling speaker, current state:', isSpeakerOn);
    setIsSpeakerOn((prev) => {
      const newSpeakerState = !prev;
      if (state.activeCall) {
        const remoteFeeds = state.activeCall.getRemoteFeeds();
        remoteFeeds.forEach((feed) => {
          const audioTracks = feed.stream.getAudioTracks();
          audioTracks.forEach((track) => {
            track.enabled = newSpeakerState;
            console.log('Speaker track enabled:', track.enabled);
          });
        });
      }
      return newSpeakerState;
    });
  };

  if (!state.activeCall || state.callType !== 'video') return null;

  const isFullyConnected =
    state.callState === 'connected' && state.activeCall.getRemoteFeeds().length > 0;

  return (
    <div
      className="h-full flex flex-col justify-between items-center relative overflow-hidden"
      style={{
        background: isCameraOn
          ? 'black'
          : 'linear-gradient(135deg, #75e377 0%, #45d2db 100%)',
      }}
    >
      {isCameraOn && (
        <div className="absolute inset-0 z-0">
          <VideoFeed call={state.activeCall} />
        </div>
      )}
      {!isCameraOn && (
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="relative flex items-center justify-center w-48 h-48">
            <span
              className="absolute w-48 h-48 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.15)',
                boxShadow: '0 0 30px 8px #8de6cb',
                filter: 'blur(2px)',
              }}
            />
            <span
              className="absolute w-44 h-44 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.11)',
                boxShadow: '0 0 30px 8px #60bc98',
                filter: 'blur(0.5px)',
              }}
            />
            <h2 className="text-3xl font-normal text-white z-10">
              {state.isCaller ? state.receiverName : state.callerName}
            </h2>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-center mt-3 z-10">
        <div className="flex items-center justify-center">
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
            <rect x="0" y="12" width="4" height="8" rx="2" fill="#fff" fillOpacity="0.4" />
            <rect x="6" y="8" width="4" height="12" rx="2" fill="#fff" fillOpacity="0.6" />
            <rect x="12" y="4" width="4" height="16" rx="2" fill="#fff" fillOpacity="0.7" />
            <rect x="18" y="2" width="4" height="18" rx="2" fill="#fff" fillOpacity="0.7" />
            <rect x="24" y="0" width="4" height="20" rx="2" fill="#fff" />
          </svg>
          <span className="text-white text-base ml-2">
            {isFullyConnected
              ? formatDuration(state.callDuration)
              : t('waitingForConnection')}
          </span>
        </div>
        {state.error && (
          <p className="text-red-500 text-sm mt-1">{t('errorPlaceholder')}</p>
        )}
      </div>
      <div className="flex-1" />
      <div className="z-10">
        <CallControls
          isMicOn={isMicOn}
          isSpeakerOn={isSpeakerOn}
          isCameraOn={isCameraOn}
          onToggleMic={toggleMic}
          onToggleSpeaker={toggleSpeaker}
          onToggleCamera={toggleCamera}
          onHangup={hangupCall}
        />
      </div>
      <audio
        ref={(el) => {
          if (el && state.activeCall) {
            const remoteStream = state.activeCall.getRemoteFeeds()[0]?.stream;
            if (remoteStream && el.srcObject !== remoteStream) {
              el.srcObject = remoteStream;
              el.play().catch((err) => console.error('Error playing remote audio:', err));
            }
          }
        }}
        autoPlay
        className="hidden"
      />
    </div>
  );
};

export default VideoCallUI;