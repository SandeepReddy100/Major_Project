import React, { useState, useEffect } from 'react';
import { MonitorX, WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

// --- HOOK: DETECT NETWORK STATUS ---
export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};

// --- COMPONENT: ERROR DISPLAY UI ---
const ErrorDisplay = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 text-center select-none">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md"
            >
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
                    <WifiOff className="text-red-500 w-10 h-10 relative z-10" strokeWidth={2} />
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
                    Connection Lost
                </h2>
                
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    We cannot verify your session integrity without an active internet connection. 
                    <br className="hidden md:block"/>
                    Please check your network settings to continue.
                </p>

                <div className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 rounded-xl text-slate-600 text-sm font-bold animate-pulse">
                    <MonitorX size={16} />
                    <span>Waiting for network...</span>
                </div>
            </motion.div>
        </div>
    );
};

export default ErrorDisplay;