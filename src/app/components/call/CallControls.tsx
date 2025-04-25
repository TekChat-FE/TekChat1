import React from 'react';

interface CallControlsProps {
    isMicOn: boolean;
    isSpeakerOn?: boolean;
    isCameraOn?: boolean;
    onToggleMic: () => void;
    onToggleSpeaker?: () => void;
    onToggleCamera?: () => void;
    onHangup: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({
    isMicOn,
    isSpeakerOn,
    isCameraOn,
    onToggleMic,
    onToggleSpeaker,
    onToggleCamera,
    onHangup,
}) => {
    return (
        <div className="w-full flex flex-col items-center mb-6">
            <div className="flex flex-row gap-8 justify-center items-center w-full mt-2 mb-4">
                {/* SPEAKER BUTTON */}
                {onToggleSpeaker && (
                    <button
                        onClick={onToggleSpeaker}
                        className="flex flex-col items-center focus:outline-none"
                        aria-label={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
                        type="button"
                    >
                        <span className="w-16 h-16 rounded-full flex items-center justify-center bg-white bg-opacity-70 shadow-lg">
                            {isSpeakerOn ? (
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                                    <path d="M5 9v6h4l5 5V4l-5 5H5Z" fill="#3ec3a8" />
                                    <path
                                        d="M16 7c1.66 1.66 2 4 0 5.66M16 3.5c3.33 3.33 4 8.66 0 12"
                                        stroke="#3ec3a8"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            ) : (
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                                    <path d="M5 9v6h4l5 5V4l-5 5H5Z" fill="#ccc" />
                                    <line x1="7" y1="21" x2="17" y2="3" stroke="#f75555" strokeWidth="2" />
                                </svg>
                            )}
                        </span>
                        <span className="text-white text-xs mt-1 select-none">speaker</span>
                    </button>
                )}
                {/* MIC BUTTON */}
                <button
                    onClick={onToggleMic}
                    className="flex flex-col items-center focus:outline-none"
                    aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
                    type="button"
                >
                    <span className="w-16 h-16 rounded-full flex items-center justify-center bg-white bg-opacity-70 shadow-lg">
                        {isMicOn ? (
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                                <rect x="9" y="3" width="6" height="12" rx="3" fill="#3ec3a8" />
                                <path d="M5 10a7 7 0 0 0 14 0" stroke="#3ec3a8" strokeWidth="2" strokeLinecap="round" />
                                <path d="M12 19v2m0-2h-4m4 0h4" stroke="#3ec3a8" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                                <rect x="9" y="3" width="6" height="12" rx="3" fill="#ccc" />
                                <path d="M5 10a7 7 0 0 0 14 0" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 2" />
                                <line x1="7" y1="21" x2="17" y2="3" stroke="#f75555" strokeWidth="2" />
                            </svg>
                        )}
                    </span>
                    <span className="text-white text-xs mt-1 select-none">mute</span>
                </button>
                {/* CAMERA BUTTON */}
                {onToggleCamera && (
                    <button
                        onClick={onToggleCamera}
                        className="flex flex-col items-center focus:outline-none"
                        aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
                        type="button"
                    >
                        <span className="w-16 h-16 rounded-full flex items-center justify-center bg-white bg-opacity-70 shadow-lg">
                            {isCameraOn ? (
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                                    <rect x="5" y="7" width="14" height="10" rx="2" fill="#3ec3a8" />
                                    <rect x="17" y="9" width="2" height="6" rx="1" fill="#3ec3a8" />
                                </svg>
                            ) : (
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                                    <rect x="5" y="7" width="14" height="10" rx="2" fill="#ccc" />
                                    <rect x="17" y="9" width="2" height="6" rx="1" fill="#ccc" />
                                    <line x1="7" y1="21" x2="17" y2="3" stroke="#f75555" strokeWidth="2" />
                                </svg>
                            )}
                        </span>
                        <span className="text-white text-xs mt-1 select-none">video</span>
                    </button>
                )}
                {/* END BUTTON */}
                <button
                    onClick={onHangup}
                    className="flex flex-col items-center focus:outline-none"
                    aria-label="End call"
                    type="button"
                >
                    <span className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500 shadow-lg">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                            <circle cx="12" cy="12" r="10" fill="none" />
                            <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" />
                        </svg>
                    </span>
                    <span className="text-white text-xs mt-1 select-none">end</span>
                </button>
            </div>
        </div>
    );
};

export default CallControls;