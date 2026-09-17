import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertCircle, Loader2 } from 'lucide-react';

const QrScanner = ({ onScanSuccess, onScanFailure, width = "100%", height = "100%" }) => {
    const scannerRef = useRef(null);
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        const config = {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
        };

        const scannerId = "reader-container";
        let html5QrCode;

        const startScanner = async () => {
            try {
                html5QrCode = new Html5Qrcode(scannerId);
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText, decodedResult) => {
                        if (onScanSuccess) onScanSuccess(decodedText, decodedResult);
                    },
                    (errorMessage) => {
                        if (onScanFailure) onScanFailure(errorMessage);
                    }
                );
            } catch (err) {
                console.error("Camera start failed", err);
                setError("Camera permission denied or camera not found.");
                setIsScanning(false);
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current.clear();
                }).catch(err => console.error("Failed to stop scanner", err));
            }
        };
    }, [onScanSuccess, onScanFailure]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-black">
            
            {/* CSS for the scanning animation */}
            <style>{`
                @keyframes scanner-move {
                    0% { top: 0; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scanner-line {
                    animation: scanner-move 2s linear infinite;
                }
            `}</style>

            {/* The Camera Feed */}
            {/* Ensuring full coverage to avoid white bars */}
            <div 
                id="reader-container" 
                className="w-full h-full object-cover"
                style={{ width: '100%', height: '100%', overflow: 'hidden' }} 
            />

            {/* PhonePe-like Overlay */}
            {isScanning && !error && (
                <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                    
                    {/* The Focus Box */}
                    {/* The massive shadow creates the dark dimming effect around the box */}
                    <div className="relative w-64 h-64 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                        
                        {/* Corner Markers (PhonePe Style) */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl -mb-1 -mr-1"></div>

                        {/* Moving Laser Line */}
                        <div className="absolute left-0 w-full h-12 bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-blue-500/60 border-b-2 border-blue-400 animate-scanner-line"></div>
                        
                        {/* Optional: 'Scanning' Text below box */}
                        <div className="absolute -bottom-12 left-0 right-0 text-center">
                            <p className="text-white/80 text-sm font-medium tracking-wide animate-pulse">Scanning QR Code...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {!isScanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black text-white z-20">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-6 text-center z-20">
                    <div className="bg-red-500/20 p-4 rounded-full mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-200">{error}</p>
                </div>
            )}
        </div>
    );
};

export default QrScanner;