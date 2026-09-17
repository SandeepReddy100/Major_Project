import React, { useState, useEffect } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';

const TelegramBlocker = ({ children }) => {
    const [debugInfo, setDebugInfo] = useState({ ua: '', ref: '' });

    // 1. Initialize State (Lazy Load)
    const [isBlocked, setIsBlocked] = useState(() => {
        if (typeof window === 'undefined') return false;

        const ua = window.navigator.userAgent.toLowerCase();
        const referrer = document.referrer ? document.referrer.toLowerCase() : '';
        
        // --- DETECTION 1: The "Smoking Gun" (Referrer) ---
        // If they came from the Telegram Android App, this is usually set.
        const isTelegramReferrer = referrer.includes('android-app://org.telegram') || referrer.includes('telegram.org');

        // --- DETECTION 2: User Agent Checks ---
        // "wv" = WebView (Standard Android WebView)
        // "version/" = Most in-app browsers use this (Chrome usually doesn't)
        // "telegram" = Explicit Telegram (iOS/Desktop)
        const isTelegramUA = ua.includes('telegram') || ua.includes('tg/');
        const isAndroidWebView = /android/.test(ua) && (/wv/.test(ua) || /version\//.test(ua));

        return isTelegramReferrer || isTelegramUA || isAndroidWebView;
    });

    const [copied, setCopied] = useState(false);

    // --- EFFECT: Debugging & Poll for Proxy ---
    useEffect(() => {
        setDebugInfo({ ua: navigator.userAgent, ref: document.referrer });

        // Backup: Poll for the Telegram Proxy Object (sometimes injects late)
        const interval = setInterval(() => {
            if (window.TelegramWebviewProxy !== undefined) {
                setIsBlocked(true);
                clearInterval(interval);
            }
        }, 500);

        setTimeout(() => clearInterval(interval), 3000);
        return () => clearInterval(interval);
    }, []);

    // Lock scroll if blocked
    useEffect(() => {
        if (isBlocked) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isBlocked]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) { console.error(err); }
    };

    // --- RENDER ---
    
    // 1. IF BLOCKED
    if (isBlocked) {
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 font-sans min-h-[100dvh] overflow-hidden overscroll-none touch-none">
                <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border-4 border-rose-100 relative overflow-hidden z-10">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-rose-100">
                        <AlertTriangle className="w-10 h-10 text-rose-500 animate-pulse" />
                    </div>

                    <h1 className="text-2xl font-black text-slate-900 mb-2">Use Chrome Browser</h1>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                        Telegram's built-in browser breaks the camera.
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-left text-xs text-slate-600">
                        1. Tap <strong className="text-slate-900">3 dots (⋮)</strong> top right.<br/>
                        2. Select <strong className="text-slate-900">Open in Chrome</strong>.
                    </div>

                    <button onClick={handleCopyLink} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base shadow-lg active:scale-95 flex items-center justify-center gap-2">
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        {copied ? "Link Copied" : "Copy Link"}
                    </button>
                </div>
            </div>
        );
    }

    // 2. IF NOT BLOCKED (Render App + Safety CSS + Debug Bar)
    return (
        <>
            {/* SAFETY CSS: If detection fails, this FORCES the camera to look correct */}
            <style>{`
                #qr-reader video { 
                    object-fit: cover !important; 
                    width: 100% !important; 
                    height: 100% !important; 
                }
            `}</style>
            
            {children}

            {/* DEBUG BAR: Only visible if detection FAILS. 
                If you still see the app in Telegram, send me a screenshot of this bar. */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'rgba(0,0,0,0.9)', color: '#00ff00', fontSize: '10px', 
                padding: '12px', zIndex: 999999, fontFamily: 'monospace', 
                textAlign: 'center', pointerEvents: 'none', borderTop: '1px solid #004400'
            }}>
                UA: {debugInfo.ua.substring(0, 50)}... <br/>
                REF: {debugInfo.ref || 'None'}
            </div>
        </>
    );
};

export default TelegramBlocker;