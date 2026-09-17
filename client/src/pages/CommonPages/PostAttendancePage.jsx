import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode'; 
import { useAuth } from '../../context/AuthContext';
import { 
    Check, LogOut, ScanLine, ArrowRight, BookOpen, ChevronDown, 
    Users, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, 
    Loader2, ShieldCheck, CameraOff, Info, Clock, Wifi, 
    WifiOff, Signal, Lock, Layers, Calendar, Unlock
} from 'lucide-react';

// Environment Variable
const BACKEND_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
// console.log(BACKEND_URL);
// --- UTILITIES ---
const toggleFullScreen = (action) => {
    const doc = window.document;
    const docEl = doc.documentElement;
    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (action === 'enter' && !doc.fullscreenElement && requestFullScreen) {
        requestFullScreen.call(docEl).catch(err => console.log("Fullscreen blocked:", err));
    } else if (action === 'exit' && doc.fullscreenElement && cancelFullScreen) {
        cancelFullScreen.call(doc).catch(err => {});
    }
};

const calculatePercentage = (present, total) => {
    if (!total || total === 0) return 0;
    return Math.round((present / total) * 100);
};

// ============================================================================
// 1. VISUAL SUB-COMPONENTS (V1 Visuals Restored)
// ============================================================================

const ScannerOverlay = ({ cooldown }) => (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl">
        {cooldown === 0 && (
            <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] animate-scan-laser z-20 opacity-80"></div>
        )}
        {/* V1 Blue Corners */}
        <div className="absolute top-0 left-0 w-16 sm:w-20 h-16 sm:h-20 border-t-[6px] border-l-[6px] border-blue-500 rounded-tl-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
        <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 border-t-[6px] border-r-[6px] border-blue-500 rounded-tr-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
        <div className="absolute bottom-0 left-0 w-16 sm:w-20 h-16 sm:h-20 border-b-[6px] border-l-[6px] border-blue-500 rounded-bl-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
        <div className="absolute bottom-0 right-0 w-16 sm:w-20 h-16 sm:h-20 border-b-[6px] border-r-[6px] border-blue-500 rounded-br-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>

        {/* V1 Countdown Overlay */}
        {cooldown > 0 && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                <div className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] tabular-nums">
                    {cooldown}
                </div>
                <p className="text-blue-200 font-bold mt-2 text-lg uppercase tracking-widest">Next Scan In</p>
            </div>
        )}
    </div>
);

const CircularProgress = ({ percentage, size = 160, strokeWidth = 12 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90 drop-shadow-xl">
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="transparent" />
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="url(#gradient)" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                <defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#3B82F6" /><stop offset="100%" stopColor="#1D4ED8" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tighter">{percentage}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Attendance</span>
            </div>
        </div>
    );
};

const SessionTimer = ({ startTime }) => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, []);
    const formatDuration = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    return (
        <div className="flex items-center gap-2 text-white bg-white/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-mono border border-white/10 backdrop-blur-md shadow-sm">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 animate-pulse" />
            <span className="tracking-widest font-bold">{formatDuration(seconds)}</span>
        </div>
    );
};

const HeaderNetworkStatus = ({ isOnline }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border backdrop-blur-md text-xs font-bold transition-all duration-300 shadow-sm ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
        {isOnline ? <Signal className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
        <span className="hidden sm:inline tracking-wider">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
    </div>
);

const NetworkIndicator = ({ isOnline }) => {
    const style = isOnline ? { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'Strong' } : { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600', label: 'Offline' };
    return (
        <div className={`${style.bg} ${style.border} border-2 p-3 rounded-2xl flex flex-col items-center justify-center transition-colors duration-300 h-full min-h-[90px]`}>
            {isOnline ? <Signal className={`w-5 h-5 sm:w-6 sm:h-6 ${style.text} mb-1`} /> : <WifiOff className={`w-5 h-5 sm:w-6 sm:h-6 ${style.text} mb-1`} />}
            <span className={`text-[9px] sm:text-[10px] font-black uppercase ${style.text} opacity-70`}>Network</span>
            <span className={`text-xs sm:text-sm font-bold ${style.text}`}>{style.label}</span>
        </div>
    );
};

const NetworkErrorModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[1000] p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-xs sm:max-w-sm w-full border-4 border-rose-100 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"><WifiOff className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 animate-pulse"/></div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">No Connection</h3>
            <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed mb-6 sm:mb-8">You need internet to submit. <strong className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">Do not refresh</strong> or you will lose your scanned list.</p>
            <button onClick={onClose} className="w-full py-3.5 sm:py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-base sm:text-lg transition-colors shadow-lg active:scale-95">Check Again</button>
        </div>
    </div>
);

// MODIFIED: Modal attached to top to avoid keyboard overlap
const ConfirmModal = ({ message, onConfirm, onCancel, requireTyping, validationString, validateNet }) => {
    const [confirmInput, setConfirmInput] = useState('');
    const validationTarget = requireTyping ? "EXIT" : (validationString || "CONFIRM");
    const displayHint = requireTyping ? "EXIT" : (validationString ? "YOUR USERNAME" : "CONFIRM");
    const isMatch = confirmInput.trim().toUpperCase() === validationTarget.toUpperCase();
    const isDestructive = requireTyping;
    const activeColor = isDestructive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700';
    const shadowColor = isDestructive ? 'shadow-rose-500/30' : 'shadow-blue-500/30';

    const handleConfirmClick = () => { if (validateNet && !validateNet()) return; onConfirm(); };

    return (
        // KEY FIX: items-start + pt-20 moves modal to top on mobile
        <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 overflow-y-auto pt-20 sm:items-center sm:pt-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onCancel}></div>
            <div className="bg-white relative z-10 w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200 p-6 sm:p-8 border border-white/20 max-h-[85dvh] overflow-y-auto">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${isDestructive ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'}`}>
                    {isDestructive ? <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8" /> : <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-center text-slate-900 mb-2 leading-tight">Confirmation</h3>
                <p className="text-slate-500 text-center mb-6 sm:mb-8 text-sm font-medium leading-relaxed px-1">{message}</p>
                <div className="mb-6 sm:mb-8 relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5 pointer-events-none">{isMatch ? <Unlock className={`w-5 h-5 ${isDestructive ? 'text-rose-500' : 'text-blue-500'} transition-colors`} /> : <Lock className="w-5 h-5 text-slate-300 transition-colors" />}</div>
                    <input type="text" className={`w-full bg-slate-50 border-2 rounded-2xl py-4 sm:py-5 pl-12 sm:pl-14 pr-4 text-center font-black tracking-[0.15em] text-lg sm:text-xl uppercase outline-none transition-all duration-300 ${isMatch ? (isDestructive ? 'border-rose-500 text-rose-600 bg-rose-50/10' : 'border-blue-500 text-blue-600 bg-blue-50/10') : 'border-slate-200 text-slate-400 focus:border-slate-400 focus:bg-white'}`} placeholder={displayHint} value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} autoFocus autoComplete="off"/>
                    <p className="text-[10px] text-center font-bold text-slate-400 mt-2 sm:mt-3 uppercase tracking-wider">Type <span className="text-slate-800">"{displayHint}"</span> to unlock</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3.5 sm:py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors text-xs sm:text-sm active:scale-95">Cancel</button>
                    <button onClick={handleConfirmClick} disabled={!isMatch} className={`flex-[1.5] py-3.5 sm:py-4 rounded-2xl font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 ${isMatch ? `${activeColor} ${shadowColor} scale-100` : 'bg-slate-300 cursor-not-allowed scale-95 opacity-70'}`}>{isMatch ? (isDestructive ? 'Exit Session' : 'Confirm') : 'Locked'} {isMatch && <ArrowRight className="w-4 h-4" />}</button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================
export default function PostAttendancePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- State ---
    const [view, setView] = useState('splash');
    const [semester, setSemester] = useState('');
    const [batch, setBatch] = useState('');
    const [course, setCourse] = useState('');
    const [semesterConfig, setSemesterConfig] = useState([]); 
    const [availableBatches, setAvailableBatches] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [validStudentSet, setValidStudentSet] = useState(new Set());
    const [attendanceReport, setAttendanceReport] = useState(null); 
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [sessionStartTime, setSessionStartTime] = useState(null);

    // Scanner
    const [scanResult, setScanResult] = useState({ rollNumber: null, message: 'Align QR Code', type: 'info' });
    const [presentMap, setPresentMap] = useState({});
    const [scanCount, setScanCount] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [cooldown, setCooldown] = useState(0); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    
    // UI
    const [userMsg, setUserMsg] = useState({ text: null, type: 'info' });
    const [showExitModal, setShowExitModal] = useState(false);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [showNetworkErrorModal, setShowNetworkErrorModal] = useState(false);

    // Refs
    const scanCallback = useRef(null);
    const processingRef = useRef(false); 
    
    const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    // Update online status
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

    const checkInternetConnection = useCallback(() => {
        if (!navigator.onLine) {
            setShowNetworkErrorModal(true);
            return false;
        }
        return true;
    }, []);

    // Prevent Page Refresh / Navigation while in Scanner Mode
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (view === 'scanner') {
                event.preventDefault();
                event.returnValue = true;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [view]);

    // Session Lock Effects
    useEffect(() => {
        if (view === 'scanner') {
            document.body.style.overscrollBehavior = 'none';
            document.body.style.touchAction = 'none';
            document.body.style.overflow = 'hidden';
            window.history.pushState({ page: 'scanner' }, document.title, window.location.href);

            const handlePopState = (event) => {
                event.preventDefault();
                window.history.pushState({ page: 'scanner' }, document.title, window.location.href);
                setShowExitModal(true); 
            };

            const handleFullScreenChange = () => {
                const isFS = document.fullscreenElement || document.webkitFullscreenElement;
                if (!isFS && view === 'scanner') setShowExitModal(true);
            };

            window.addEventListener('popstate', handlePopState);
            document.addEventListener('fullscreenchange', handleFullScreenChange);

            return () => {
                document.body.style.overscrollBehavior = ''; document.body.style.touchAction = ''; document.body.style.overflow = '';
                window.removeEventListener('popstate', handlePopState);
                document.removeEventListener('fullscreenchange', handleFullScreenChange);
            };
        }
    }, [view]);

    // Cooldown Timer
    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => {
                    if (prev <= 1) {
                        setScanResult({ rollNumber: null, message: 'Align QR Code', type: 'info' });
                        setIsPaused(false);
                        processingRef.current = false;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    // Data Fetching
    useEffect(() => {
        setSemesterConfig([]); setAvailableBatches([]); setAvailableCourses([]); setBatch(''); setCourse('');
        if (!semester) return;
        const fetchConfig = async () => {
            setIsLoadingData(true);
            try {
                const response = await fetch(`${BACKEND_URL}/api/get-sem-config/${semester}`, { method: 'GET', credentials: 'include' });
                const result = await response.json();
                if (result.success && result.data?.config) {
                    setSemesterConfig(result.data.config);
                    setAvailableBatches(result.data.config.map(item => item.name));
                }
            } catch (err) { setUserMsg({ text: "Failed to load config.", type: "error" }); } 
            finally { setIsLoadingData(false); }
        };
        fetchConfig();
    }, [semester]);

    useEffect(() => {
        if (!batch || semesterConfig.length === 0) { setAvailableCourses([]); setCourse(''); return; }
        const batchConfig = semesterConfig.find(item => item.name === batch);
        setAvailableCourses(batchConfig?.availableCourses || []);
        setCourse('');
    }, [batch, semesterConfig]);

    // QR Init (Using your V1 Logic specifically)
    useEffect(() => {
        if (view !== 'scanner') return;
        setCameraError(null);
        let mounted = true;
        const scanner = new Html5Qrcode('qr-reader');
        const startScanner = async () => {
            try {
                // V1 LOGIC: Exact aspect ratio check you requested
                const isMobile = window.innerWidth < 768;
                const config = { 
                    fps: 30, 
                    aspectRatio: isMobile ? 0.75 : 1.777 
                }; 
                await scanner.start({ facingMode: 'environment' }, config, (decoded) => scanCallback.current?.(decoded), () => {});
            } catch (err) { if (mounted) setCameraError("Camera permission denied."); }
        };
        startScanner();
        return () => { mounted = false; if(scanner.isScanning) scanner.stop().catch(console.error); };
    }, [view]);

    const handleFetchStudents = async (e) => {
        e.preventDefault();
        setIsLoadingData(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/students-by-batch/?semname=${semester}&batch=${batch}`, { method: 'GET', credentials: 'include' });
            const result = await response.json();
            if (result.students && Array.isArray(result.students)) {
                setValidStudentSet(new Set(result.students));
                setView('preview');
            } else { setUserMsg({ text: "No students found.", type: "error" }); }
        } catch { setUserMsg({ text: "Error fetching students.", type: "error" }); } 
        finally { setIsLoadingData(false); }
    };

    const handleStartScanning = () => { toggleFullScreen('enter'); setSessionStartTime(new Date()); setView('scanner'); };
    const handleExitSession = () => { toggleFullScreen('exit'); navigate(user?.role === 'admin' ? '/admin/dashboard' : '/faculty/dashboard', { replace: true }); };
    const handleCancelExit = () => { setShowExitModal(false); toggleFullScreen('enter'); };
    const handleCancelFinish = () => { setShowFinishConfirm(false); toggleFullScreen('enter'); };

    const handleScan = useCallback((text) => {
        if (processingRef.current || isPaused || cooldown > 0) return;
        processingRef.current = true;
        setIsPaused(true);

        let roll = null;
        let hash = null;

        try {
            const data = JSON.parse(text);
            if (data.rollno) {
                roll = data.rollno.trim().toUpperCase();
                hash = data.hash; 
            } else {
                roll = data.rollno?.trim().toUpperCase();
                hash = data.hash || data.qrData; 
            }
            if (!roll) throw new Error();
        } catch {
            // V1 Fallback logic
            if (text.length > 5 && text.length < 15) { 
                roll = text.trim().toUpperCase(); 
                hash = text; 
            } else {
                setScanResult({ rollNumber: 'INVALID', message: 'Unknown QR', type: 'error' });
                setTimeout(() => { 
                    setScanResult({ rollNumber: null, message: 'Align QR Code', type: 'info' }); 
                    setIsPaused(false); 
                    processingRef.current = false;
                }, 2000);
                return;
            }
        }

        if (roll) {
            if (!validStudentSet.has(roll)) {
                setScanResult({ rollNumber: roll, message: 'Not in Batch', type: 'error' });
                setTimeout(() => { 
                    setScanResult({ rollNumber: null, message: 'Align QR Code', type: 'info' }); 
                    setIsPaused(false); 
                    processingRef.current = false;
                }, 2500);
            } else if (presentMap[roll]) {
                setScanResult({ rollNumber: roll, message: 'Already Scanned', type: 'warning' });
                setTimeout(() => { 
                    setScanResult({ rollNumber: null, message: 'Align QR Code', type: 'info' }); 
                    setIsPaused(false); 
                    processingRef.current = false;
                }, 2500);
            } else {
                setPresentMap(prev => ({ ...prev, [roll]: hash }));
                setScanCount(prev => prev + 1);
                const photoUrl = `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${roll}/${roll}.jpg`;
                setScanResult({ rollNumber: roll, message: 'Verified', type: 'success', photo: photoUrl });
                setLastScanned({ rollNumber: roll, photo: photoUrl, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
                
                // START 3 SECOND TIMER
                setCooldown(3); 
            }
        }
    }, [isPaused, cooldown, presentMap, validStudentSet]);

    scanCallback.current = handleScan;

    const handleFinishClick = () => { if (checkInternetConnection()) setShowFinishConfirm(true); };

    const submitAttendance = async () => {
        if (!checkInternetConnection()) return;
        setShowFinishConfirm(false);
        setIsSubmitting(true);
        const payload = {
            semname: semester, batch, date: new Date().toISOString().split('T')[0], course, presentMap
        };
        try {
            const response = await fetch(`${BACKEND_URL}/api/attendance-mark-qr`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include'
            });
            const result = await response.json(); 
            if (response.ok || result.message?.toLowerCase().includes("already posted")) {
                setAttendanceReport({ ...result, status: response.ok ? 'success' : 'error' });
                setView('summary');
                toggleFullScreen('exit');
            } else throw new Error(result.message);
        } catch (error) { setUserMsg({ text: error.message, type: "error" }); } 
        finally { setIsSubmitting(false); }
    };

    // ========================================================================
    // RENDER FUNCTIONS
    // ========================================================================

    const renderSplash = () => (
        <div className="flex flex-col items-center justify-center text-center px-4 sm:px-6 animate-fade-in min-h-[60vh] sm:min-h-[80vh] relative">
            <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
                <button onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/faculty/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-white transition-all text-sm sm:text-base"><ArrowLeft className="w-4 h-4" /> Dashboard</button>
            </div>
            <div className="mb-8 sm:mb-10 relative mt-10">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                {user?.role === 'admin' ? <ShieldCheck className="w-20 h-20 sm:w-24 sm:h-24 text-blue-600 relative z-10" /> : <BookOpen className="w-20 h-20 sm:w-24 sm:h-24 text-blue-600 relative z-10" />}
            </div>
            <h1 className="text-4xl sm:text-7xl font-black text-slate-900 tracking-tight mb-4">
                Attendance<span className="text-blue-600">Scanner</span>
            </h1>
            <button onClick={() => setView('selection')} className="mt-8 sm:mt-12 bg-slate-900 text-white py-4 sm:py-5 px-10 sm:px-12 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-3 group w-full sm:w-auto justify-center active:scale-95">
                Start Session <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </button>
        </div>
    );

    const renderSelection = () => (
        <div className="w-full max-w-lg mx-auto p-4 animate-fade-in flex flex-col justify-center min-h-[80vh]">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-white/50 relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8 sm:mb-10">
                    <button onClick={() => setView('splash')} className="p-2 sm:p-3 hover:bg-slate-100 rounded-full transition text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
                    <div><h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Setup Session</h2><p className="text-slate-500 font-medium text-xs sm:text-sm">Configure class details</p></div>
                </div>
                <form onSubmit={handleFetchStudents} className="space-y-4 sm:space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Academic Semester</label>
                        <div className="relative"><select value={semester} onChange={e => setSemester(e.target.value)} required className="w-full bg-slate-50 border-2 border-slate-100 hover:border-blue-200 rounded-2xl py-3.5 sm:py-4 px-4 sm:px-5 font-bold text-slate-700 appearance-none outline-none focus:border-blue-500 transition-all cursor-pointer text-sm sm:text-base"><option value="" disabled>Select Semester</option>{SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}</select><ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Student Batch</label>
                        <div className="relative"><select value={batch} onChange={e => setBatch(e.target.value)} required disabled={!semester} className="w-full bg-slate-50 border-2 border-slate-100 hover:border-blue-200 rounded-2xl py-3.5 sm:py-4 px-4 sm:px-5 font-bold text-slate-700 appearance-none outline-none focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 text-sm sm:text-base"><option value="" disabled>Select Batch</option>{availableBatches.map(b => <option key={b} value={b}>{b}</option>)}</select><ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Course Code</label>
                        <div className="relative"><select value={course} onChange={e => setCourse(e.target.value)} required disabled={!batch} className="w-full bg-slate-50 border-2 border-slate-100 hover:border-blue-200 rounded-2xl py-3.5 sm:py-4 px-4 sm:px-5 font-bold text-slate-700 appearance-none outline-none focus:border-blue-500 transition-all cursor-pointer disabled:opacity-50 text-sm sm:text-base"><option value="" disabled>Select Course</option>{availableCourses.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div>
                    </div>
                    <button type="submit" disabled={isLoadingData || !course} className="w-full mt-6 sm:mt-8 bg-slate-900 text-white py-4 sm:py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-200 hover:bg-black">{isLoadingData ? <Loader2 className="animate-spin w-6 h-6"/> : <>Proceed <ArrowRight className="w-5 h-5"/></>}</button>
                </form>
            </div>
        </div>
    );

    const renderPreview = () => (
        <div className="w-full max-w-lg mx-auto p-4 animate-fade-in flex flex-col justify-center h-auto my-auto">
             <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/50">
                <div className="bg-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <h2 className="text-2xl sm:text-3xl font-black relative z-10 mb-1">Pre-Flight</h2>
                    <p className="text-slate-400 relative z-10 text-xs sm:text-sm font-medium">{validStudentSet.size} students loaded successfully</p>
                </div>
                <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"><NetworkIndicator isOnline={isOnline} /><div className="bg-blue-50 border-2 border-blue-100 p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[90px]"><Clock className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6 mb-1" /><span className="text-[9px] sm:text-[10px] font-black text-blue-400 uppercase opacity-70">Local Time</span><span className="text-xs sm:text-sm font-bold text-blue-900">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div></div>
                    <div className="flex flex-col sm:flex-row gap-3"><button onClick={() => setView('selection')} className="flex-1 py-3.5 sm:py-4 bg-white border-2 border-slate-200 font-bold text-slate-600 rounded-2xl hover:bg-slate-50 transition-colors active:scale-95 text-sm">Back</button><button onClick={handleStartScanning} className="flex-[2] py-3.5 sm:py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">Start Scanning <ShieldCheck className="w-5 h-5" /></button></div>
                </div>
            </div>
        </div>
    );

    const renderScanner = () => (
        <div className="w-full h-[100dvh] flex flex-col p-2 md:p-4 animate-fade-in relative max-w-7xl mx-auto touch-none select-none">
            {/* CSS to force hide the library's shaded region if it appears + Fix Video Ratio */}
            <style>{`#qr-shaded-region { display: none !important; } #qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 1.5rem !important; }`}</style>

            {/* Header */}
            <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl border border-white/10 text-white mb-2 sm:mb-4 shadow-2xl z-20 shrink-0">
                <div className="flex flex-col"><h3 className="font-bold text-lg sm:text-xl leading-none">{batch}</h3><p className="text-blue-300 text-[10px] sm:text-xs font-medium tracking-wide uppercase mt-1">{semester}</p></div>
                <div className="flex items-center gap-2 sm:gap-3"><HeaderNetworkStatus isOnline={isOnline} /><SessionTimer startTime={sessionStartTime} /><button onClick={() => setShowExitModal(true)} className="bg-rose-500/20 p-2 sm:p-2.5 rounded-full text-rose-300 hover:bg-rose-500/30 transition-colors active:scale-95"><LogOut className="w-4 h-4 sm:w-5 sm:h-5" /></button></div>
            </div>
            
            {/* Camera Area - Flex Grow to fill space */}
            <div className="flex flex-col items-center justify-start flex-1 gap-2 sm:gap-4 relative z-10 min-h-0">
                {/* MODIFIED: Reduced max-height to 50vh for mobile as requested */}
                <div className="relative w-full flex-1 min-h-0 max-h-[50vh] sm:max-h-none rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-[4px] sm:border-[6px] border-slate-800">
                    <ScannerOverlay cooldown={cooldown} />
                    <div id="qr-reader" className="w-full h-full object-cover"></div>
                    {isPaused && scanResult.message && cooldown === 0 && (
                        <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in zoom-in duration-200">
                             {scanResult.photo && (<div className={`p-1 rounded-full border-4 mb-4 sm:mb-6 ${scanResult.type === 'success' ? 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]' : 'border-rose-500'}`}><img src={scanResult.photo} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover" onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${scanResult.rollNumber}`} /></div>)}
                            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-widest mb-2 sm:mb-3">{scanResult.rollNumber}</h2>
                            <span className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl font-bold text-sm sm:text-lg border ${scanResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-rose-500/20 text-rose-300 border-rose-500/50'}`}>{scanResult.message}</span>
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="w-full max-w-xl shrink-0 space-y-2 sm:space-y-4">
                     {lastScanned ? (
                         <div className="bg-white/90 backdrop-blur-xl p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl shadow-xl flex items-center justify-between border border-white/50 animate-in slide-in-from-bottom duration-500">
                            <div className="flex items-center gap-3 sm:gap-4"><img src={lastScanned.photo} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-slate-100 object-cover border-2 border-white shadow-md" onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${lastScanned.rollNumber}`} /><div><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Verified</p><p className="font-black text-slate-900 text-lg sm:text-2xl">{lastScanned.rollNumber}</p></div></div><span className="text-xs sm:text-sm font-bold text-slate-400 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">#{scanCount}</span></div>
                    ) : <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl border border-white/10 text-white/40 text-center text-xs sm:text-sm font-medium h-[64px] sm:h-[88px] flex items-center justify-center">Waiting for first scan...</div>}
                    
                    <button onClick={handleFinishClick} disabled={scanCount === 0 || isSubmitting} className="w-full bg-blue-600 text-white py-4 sm:py-5 rounded-[1.5rem] sm:rounded-2xl font-bold text-lg sm:text-xl hover:bg-blue-700 shadow-xl shadow-blue-900/30 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-3">{isSubmitting ? <Loader2 className="animate-spin w-6 h-6"/> : <><CheckCircle2 className="w-6 h-6"/> Finish Session ({scanCount})</>}</button>
                </div>
            </div>
        </div>
    );

    const renderSummary = () => {
        if (!attendanceReport) return null;
        const total = validStudentSet.size;
        const present = attendanceReport.presentiesCount || 0;
        const rate = calculatePercentage(present, total);
        const mismatched = (attendanceReport.mismatchedStudents || []).filter(s => s && s.trim() !== "");

        if (attendanceReport.status === 'error' && !attendanceReport.presentiesCount) {
             return (
                <div className="w-full max-w-md mx-auto bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 m-4 text-center border-4 border-rose-50 animate-fade-in">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"><AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500" /></div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">Submission Failed</h2>
                    <p className="text-slate-500 mb-6 sm:mb-8 font-medium">{attendanceReport.message}</p>
                    <button onClick={handleExitSession} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold transition shadow-xl active:scale-95">Return to Dashboard</button>
                </div>
            );
        }

        return (
            <div className="w-full max-w-lg mx-auto bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in m-4 border border-slate-100">
                <div className="bg-slate-50 p-6 sm:p-8 text-center relative border-b border-slate-100">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">Session Complete</h2>
                    <p className="text-slate-400 text-[10px] sm:text-xs mt-1 uppercase font-bold tracking-widest">{course}</p>
                </div>
                <div className="p-6 sm:p-8 flex flex-col items-center">
                    <div className="mb-6 sm:mb-8 scale-110"><CircularProgress percentage={rate} /></div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full mb-6 sm:mb-8">
                        <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl text-center border border-slate-100"><p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Total</p><p className="text-lg sm:text-2xl font-black text-slate-900">{total}</p></div>
                        <div className="bg-emerald-50 p-3 sm:p-4 rounded-2xl text-center border border-emerald-100"><p className="text-[9px] sm:text-[10px] text-emerald-600 font-black uppercase tracking-wider mb-1">Present</p><p className="text-lg sm:text-2xl font-black text-emerald-700">{present}</p></div>
                        <div className="bg-rose-50 p-3 sm:p-4 rounded-2xl text-center border border-rose-100"><p className="text-[9px] sm:text-[10px] text-rose-600 font-black uppercase tracking-wider mb-1">Absent</p><p className="text-lg sm:text-2xl font-black text-rose-700">{attendanceReport.absenteesCount || 0}</p></div>
                    </div>
                    {mismatched.length > 0 && (
                        <div className="w-full mb-6 bg-amber-50 border border-amber-200 rounded-3xl overflow-hidden flex flex-col">
                            <div className="px-5 py-3 border-b border-amber-100 flex justify-between items-center bg-amber-50/50">
                                <p className="text-amber-800 font-black text-xs uppercase flex items-center gap-2"><AlertTriangle size={14}/> Mismatched ({mismatched.length})</p>
                                <span className="text-[10px] font-bold text-amber-600 bg-white px-2 py-0.5 rounded-full border border-amber-100">Scroll to view</span>
                            </div>
                            <div className="p-4 max-h-[140px] overflow-y-auto custom-scrollbar bg-white/50">
                                <div className="flex flex-wrap gap-2">{mismatched.map((r, i) => <span key={i} className="bg-white px-2 py-1 rounded-lg border border-amber-200 text-[10px] font-mono font-bold text-amber-800 shadow-sm">{r}</span>)}</div>
                            </div>
                        </div>
                    )}
                    <button onClick={handleExitSession} className="w-full bg-slate-900 text-white py-4 sm:py-5 rounded-[1.5rem] sm:rounded-3xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Return to Dashboard <LogOut size={20}/></button>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-[100dvh] w-full flex items-center justify-center font-sans relative overflow-hidden transition-colors duration-500 ${view === 'scanner' ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
            <style>{`
                @keyframes fade-in { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } } 
                .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; } 
                @keyframes scan-laser { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } } 
                .animate-scan-laser { animation: scan-laser 2.5s ease-in-out infinite; } 
                .custom-scrollbar::-webkit-scrollbar { width: 4px; } 
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; } 
                #qr-shaded-region { display: none !important; }
            `}</style>
            {view !== 'scanner' && (<><div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-50 -z-10"></div><div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div><div className="absolute top-0 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div></>)}
            <div className="w-full h-full relative z-10 flex items-center justify-center">
                {view === 'splash' && renderSplash()} {view === 'selection' && renderSelection()} {view === 'preview' && renderPreview()} {view === 'scanner' && renderScanner()} {view === 'summary' && renderSummary()}
            </div>
            {showExitModal && (<ConfirmModal message="Unsaved data will be permanently lost." requireTyping={true} onConfirm={handleExitSession} onCancel={handleCancelExit} validationString={user?.username || user?.name} validateNet={checkInternetConnection} />)}
            {showFinishConfirm && (<ConfirmModal message="Finalize and upload attendance list?" requireTyping={false} onConfirm={submitAttendance} onCancel={handleCancelFinish} validationString={user?.username || user?.name} validateNet={checkInternetConnection} />)}
            {showNetworkErrorModal && <NetworkErrorModal onClose={() => setShowNetworkErrorModal(false)} />}
            {userMsg.text && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-2xl shadow-slate-200 z-50 flex items-center gap-3 animate-fade-in border border-slate-100 w-11/12 max-w-sm justify-between sm:w-auto"><div className="flex items-center gap-3">{userMsg.type === 'error' ? <AlertTriangle className="text-rose-500 shrink-0"/> : <Info className="text-blue-500 shrink-0"/>}<p className="font-bold text-slate-700 text-xs sm:text-sm">{userMsg.text}</p></div><button onClick={() => setUserMsg({text: null})}><XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 transition shrink-0"/></button></div>}
        </div>
    );
}