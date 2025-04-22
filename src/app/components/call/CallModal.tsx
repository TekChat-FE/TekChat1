import React from 'react';
import { MatrixCall } from 'matrix-js-sdk';
import useCall  from '@/app/hooks/useCall';

interface CallModalProps {
    incomingCall: MatrixCall | null;
    callerName: string;
}

const CallModal: React.FC<CallModalProps> = ({ incomingCall, callerName }) => {
    const { answerCall, rejectCall } = useCall();

    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">
                    {incomingCall.type === 'video'
                        ? `Cuộc gọi video đến từ ${callerName}`
                        : `Cuộc gọi thoại đến từ ${callerName}`}
                </h3>
                <div className="flex space-x-4">
                    <button
                        onClick={() => answerCall(incomingCall)}
                        className="bg-green-500 text-white rounded-lg p-3 hover:bg-green-600 transition"
                    >
                        Chấp nhận
                    </button>
                    <button
                        onClick={() => rejectCall(incomingCall)}
                        className="bg-red-500 text-white rounded-lg p-3 hover:bg-red-600 transition"
                    >
                        Từ chối
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallModal;