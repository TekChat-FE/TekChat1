import React, { useRef, useEffect } from 'react';
import { MatrixCall, CallEvent } from 'matrix-js-sdk';

interface VideoFeedProps {
    call: MatrixCall | null;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ call }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const currentStreamId = useRef<string | null>(null);

    useEffect(() => {
        if (!call) return;

        const onFeedsChanged = () => {
            const localStream = call.getLocalFeeds()[0]?.stream;
            const remoteStream = call.getRemoteFeeds()[0]?.stream;

            if (localStream && localVideoRef.current) {
                localVideoRef.current.srcObject = localStream;
                localVideoRef.current.play().catch((err) => console.error('Error playing local video:', err));
            }
            if (remoteStream && remoteVideoRef.current) {
                if (currentStreamId.current !== remoteStream.id) {
                    console.log('Assigning new remote stream:', remoteStream.id);
                    remoteVideoRef.current.srcObject = remoteStream;
                    currentStreamId.current = remoteStream.id;
                    remoteVideoRef.current.play().catch((err) => console.error('Error playing remote video:', err));
                } else {
                    console.log('Skipping redundant stream assignment:', remoteStream.id);
                }
            }
        };

        call.on(CallEvent.FeedsChanged, onFeedsChanged);
        onFeedsChanged(); // Initial check

        return () => {
            call.removeListener(CallEvent.FeedsChanged, onFeedsChanged);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
                // eslint-disable-next-line react-hooks/exhaustive-deps
                localVideoRef.current.pause();
            }
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
                // eslint-disable-next-line react-hooks/exhaustive-deps
                remoteVideoRef.current.pause();
            }
            currentStreamId.current = null;
        };
    }, [call]);

    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-600 rounded-lg overflow-hidden">
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
};

export default VideoFeed;