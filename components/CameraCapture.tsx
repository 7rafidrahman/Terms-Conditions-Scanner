
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
    onCapture: (dataUrl: string) => void;
    onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please check permissions and try again.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if(context){
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/png');
                onCapture(dataUrl);
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center p-4">
             <div className="relative w-full max-w-lg aspect-[9/16] bg-black rounded-lg overflow-hidden shadow-2xl">
                 {error ? (
                    <div className="flex items-center justify-center h-full text-red-400 p-4">{error}</div>
                 ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                 )}
                 <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            <div className="mt-6 flex items-center space-x-4">
                 <button 
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-700 text-white rounded-full font-semibold shadow-lg hover:bg-gray-600 transition-colors">
                    Close
                </button>
                <button
                    onClick={handleCapture}
                    disabled={!stream}
                    className="w-20 h-20 bg-white rounded-full border-4 border-sky-400 flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
                >
                    <div className="w-16 h-16 bg-white rounded-full border-2 border-sky-500"></div>
                </button>
                 <div className="w-[100px]"></div>
            </div>
        </div>
    );
};

export default CameraCapture;
