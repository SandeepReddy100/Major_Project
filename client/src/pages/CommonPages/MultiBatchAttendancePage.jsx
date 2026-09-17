import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode'; 
import { useAuth } from '../../context/AuthContext';
import { 
    Check, LogOut, ScanLine, ArrowRight, BookOpen, ChevronDown, 
    Users, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, 
    Loader2, ShieldCheck, CameraOff, Info, Clock, Wifi, 
    WifiOff, Signal, Lock, Layers, Calendar, Filter,
    FileWarning, AlertCircle, Unlock, ChevronUp
} from 'lucide-react';

// Environment Variable
const BACKEND_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

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
// 1. VISUAL SUB-COMPONENTS (V1 Visuals)
// ============================================================================

const CircularProgress = ({ percentage, size = 140, strokeWidth = 10, label = "Total" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90 drop-shadow-xl">
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="transparent" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#gradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-800 tracking-tighter">{percentage}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{label}</span>
            </div>
        </div>
    );
};

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

const StepWizardHeader = ({ currentStep }) => {
    const steps = [ { id: 1, label: "Sem" }, { id: 2, label: "Batch" }, { id: 3, label: "Map" }, { id: 4, label: "Check" } ];
    return (
        <div className="w-full mb-6 px-2">
            <div className="flex justify-between items-center relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
                <div className="absolute left-0 top-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
                {steps.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isActive = step.id === currentStep;
                    return (
                        <div key={step.id} className="flex flex-col items-center bg-white px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${isActive ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-md' : isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                                {isCompleted ? <Check size={14} strokeWidth={3} /> : step.id}
                            </div>
                            <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider hidden sm:block ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const HeaderNetworkStatus = ({ isOnline }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border backdrop-blur-md text-xs font-bold transition-all duration-300 shadow-sm ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
        {isOnline ? <Signal className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
        <span className="hidden sm:inline tracking-wider">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
    </div>
);

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

const NetworkIndicator = ({ isOnline }) => {
    const style = isOnline 
        ? { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'Strong' }
        : { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600', label: 'Offline' };
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
const ConfirmModal = ({ message, onConfirm, onCancel, textToType, isUsernameCheck, validateNet }) => {
    const [confirmInput, setConfirmInput] = useState('');
    const validationTarget = isUsernameCheck ? textToType : (textToType || "CONFIRM");
    const displayHint = isUsernameCheck ? "YOUR USERNAME" : (textToType || "CONFIRM");
    
    const isMatch = confirmInput.trim().toUpperCase() === (validationTarget || "").toUpperCase();
    const isDestructive = !isUsernameCheck;
    const activeColor = isDestructive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700';
    const shadowColor = isDestructive ? 'shadow-rose-500/30' : 'shadow-blue-500/30';

    const handleConfirmClick = () => {
         if (validateNet && !validateNet()) return;
         onConfirm();
    };

    return (
        // KEY FIX: items-start + pt-20 moves modal to top
        <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 overflow-y-auto pt-20 sm:items-center sm:pt-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onCancel}></div>
            <div className="bg-white relative z-10 w-full max-w-sm rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200 p-6 sm:p-8 border border-white/20 max-h-[85dvh] overflow-y-auto">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${isDestructive ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
                    {isDestructive ? <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8" /> : <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-center text-slate-900 mb-2 leading-tight">Confirmation</h3>
                <p className="text-slate-500 text-center mb-6 sm:mb-8 text-sm font-medium leading-relaxed px-1">{message}</p>
                <div className="mb-6 sm:mb-8 relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5 pointer-events-none">
                        {isMatch ? <Unlock className={`w-5 h-5 ${isDestructive ? 'text-rose-500' : 'text-blue-500'} transition-colors`} /> : <Lock className="w-5 h-5 text-slate-300 transition-colors" />}
                    </div>
                    <input 
                        type="text" 
                        className={`w-full bg-slate-50 border-2 rounded-2xl py-4 sm:py-5 pl-12 sm:pl-14 pr-4 text-center font-black tracking-[0.15em] text-lg sm:text-xl uppercase outline-none transition-all duration-300 ${isMatch ? (isDestructive ? 'border-rose-500 text-rose-600 bg-rose-50/10' : 'border-blue-500 text-blue-600 bg-blue-50/10') : 'border-slate-200 text-slate-400 focus:border-slate-400 focus:bg-white'}`} 
                        placeholder={displayHint} 
                        value={confirmInput} 
                        onChange={(e) => setConfirmInput(e.target.value)} 
                        autoFocus 
                        autoComplete="off"
                    />
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
export default function MultiBatchAttendancePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // State
    const [view, setView] = useState('splash');
    const [semester, setSemester] = useState('');
    const [semesterConfig, setSemesterConfig] = useState([]); 
    const [selectedBatches, setSelectedBatches] = useState([]); 
    const [batchCourseMap, setBatchCourseMap] = useState({});
    const [globalCourse, setGlobalCourse] = useState('');
    const [validStudentMap, setValidStudentMap] = useState(new Map()); 
    const [scannedData, setScannedData] = useState(new Map()); 
    
    // UI State
    const [scanCount, setScanCount] = useState(0);
    const [attendanceReport, setAttendanceReport] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [userMsg, setUserMsg] = useState({ text: null, type: 'info' });
    
    // Scanner
    const [scanResult, setScanResult] = useState({ rollNumber: null, message: 'Align QR Code', type: 'info' });
    const [isPaused, setIsPaused] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastScanned, setLastScanned] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [showNetworkErrorModal, setShowNetworkErrorModal] = useState(false);

    const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    const scanCallback = useRef(null);
    const processingRef = useRef(false);

    // --- Effects & Logic ---

    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', update); window.addEventListener('offline', update);
        return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
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

    useEffect(() => {
        if (view === 'scanner') {
            document.body.style.overscrollBehavior = 'none';
            document.body.style.touchAction = 'none'; // Lock pinch zoom
            document.body.style.overflow = 'hidden';
            window.history.pushState({ page: 'scanner' }, document.title, window.location.href);
            
            const handlePopState = (e) => { 
                e.preventDefault();
                window.history.pushState({ page: 'scanner' }, document.title, window.location.href); 
                setShowExitModal(true); 
            };
            const handleFS = () => { if (!document.fullscreenElement && view === 'scanner') setShowExitModal(true); };

            window.addEventListener('popstate', handlePopState);
            document.addEventListener('fullscreenchange', handleFS);
            
            return () => { 
                document.body.style.overscrollBehavior = '';
                document.body.style.touchAction = '';
                document.body.style.overflow = '';
                window.removeEventListener('popstate', handlePopState);
                document.removeEventListener('fullscreenchange', handleFS);
            };
        }
    }, [view]);

    // UPDATED: Robust Cooldown Logic
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

    // SCANNING LOGIC V1
    useEffect(() => {
        if (view !== 'scanner') return;
        setCameraError(null);
        let mounted = true;
        const scanner = new Html5Qrcode('qr-reader');
        const startScanner = async () => {
            try {
                // V1 LOGIC: Specific aspect ratios for mobile vs desktop
                const isMobile = window.innerWidth < 768;
                const config = { 
                    fps: 30, 
                    aspectRatio: isMobile ? 0.75 : 1.777,
                    qrbox: { width: 250, height: 250 } 
                }; 
                await scanner.start({ facingMode: 'environment' }, config, (decoded) => scanCallback.current?.(decoded), () => {});
            } catch (err) { if (mounted) setCameraError("Camera permission denied."); }
        };
        startScanner();
        return () => { mounted = false; if(scanner.isScanning) scanner.stop().catch(console.error); };
    }, [view]);

    const handleSemesterSelect = async (sem) => {
        setSemester(sem);
        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/get-sem-config/${sem}`, { method: 'GET', credentials: 'include' });
            const result = await response.json();
            if (result.success && result.data?.config) {
                setSemesterConfig(result.data.config);
                setView('batches');
            } else { setUserMsg({ text: "No config found.", type: "error" }); }
        } catch { setUserMsg({ text: "Fetch failed.", type: "error" }); } 
        finally { setIsLoading(false); }
    };

    const toggleBatch = (batchName) => setSelectedBatches(prev => prev.includes(batchName) ? prev.filter(b => b !== batchName) : [...prev, batchName]);

    const handleBatchesNext = () => {
        if(selectedBatches.length === 0) return setUserMsg({ text: "Select batches.", type: "error" });
        const initialMap = {};
        selectedBatches.forEach(b => initialMap[b] = batchCourseMap[b] || ""); 
        setBatchCourseMap(initialMap);
        setView('courses');
    };

    const updateBatchCourse = (batchName, courseName) => setBatchCourseMap(prev => ({ ...prev, [batchName]: courseName }));
    
    const applyGlobalCourse = (courseName) => {
        setGlobalCourse(courseName);
        const newMap = {};
        selectedBatches.forEach(b => {
            const config = semesterConfig.find(c => c.name === b);
            if (config && config.availableCourses.includes(courseName)) {
                newMap[b] = courseName;
            } else {
                newMap[b] = batchCourseMap[b]; 
            }
        });
        setBatchCourseMap(newMap);
    };

    const handleCoursesNext = async () => {
        const missing = selectedBatches.some(b => !batchCourseMap[b]);
        if (missing) return setUserMsg({ text: "Map all courses.", type: "error" });

        setIsLoading(true);
        try {
            const newValidMap = new Map();
            await Promise.all(selectedBatches.map(async (b) => {
                const res = await fetch(`${BACKEND_URL}/api/students-by-batch/?semname=${semester}&batch=${b}`, { method: 'GET', credentials: 'include' });
                const data = await res.json();
                if (data.students) data.students.forEach(roll => newValidMap.set(roll, b));
            }));
            if (newValidMap.size === 0) throw new Error("No students found.");
            setValidStudentMap(newValidMap);
            setView('preview');
        } catch { setUserMsg({ text: "Error loading students.", type: "error" }); } 
        finally { setIsLoading(false); }
    };

    const handleStartScanning = () => {
        toggleFullScreen('enter');
        setSessionStartTime(new Date());
        setView('scanner');
    };

    const handleExitSession = () => {
        toggleFullScreen('exit');
        navigate(user?.role === 'admin' ? '/admin/dashboard' : '/faculty/dashboard', { replace: true });
    };

    const handleScan = useCallback((text) => {
        if (processingRef.current || isPaused || cooldown > 0) return;
        processingRef.current = true;
        setIsPaused(true);

        let roll = null;
        let qrDataHash = null;

        try {
            const data = JSON.parse(text);
            if (data.rollno && (data.hash || data.qrData)) {
                roll = data.rollno.trim().toUpperCase();
                qrDataHash = data.hash || data.qrData;
            } else throw new Error();
        } catch (error) {
            setScanResult({ rollNumber: 'INVALID', message: 'Unknown QR Format', type: 'error' });
            setTimeout(() => { setScanResult({ rollNumber: null, message: 'Align QR Code', type: 'info' }); setIsPaused(false); processingRef.current = false; }, 2000);
            return;
        }

        if (roll) {
            if (scannedData.has(roll)) {
                setScanResult({ rollNumber: roll, message: 'Already Scanned', type: 'warning' });
                setTimeout(() => { setScanResult({ rollNumber: null, message: 'Align QR Code', type: 'info' }); setIsPaused(false); processingRef.current = false; }, 2500);
            } 
            else if (validStudentMap.has(roll)) {
                const studentBatch = validStudentMap.get(roll);
                setScannedData(prev => new Map(prev).set(roll, qrDataHash)); 
                setScanCount(prev => prev + 1);
                const photoUrl = `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${roll}/${roll}.jpg`;
                setScanResult({ rollNumber: roll, message: `Verified (${studentBatch})`, type: 'success', photo: photoUrl });
                setLastScanned({ rollNumber: roll, photo: photoUrl, batch: studentBatch, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
                
                // START 3 SECOND TIMER
                setCooldown(3); 
            } 
            else {
                setScanResult({ rollNumber: roll, message: 'Not in selected batches', type: 'error' });
                setTimeout(() => { setScanResult({ rollNumber: null, message: 'Align QR Code', type: 'info' }); setIsPaused(false); processingRef.current = false; }, 3000);
            }
        }
    }, [isPaused, cooldown, scannedData, validStudentMap]);

    scanCallback.current = handleScan;

    const handleFinishClick = () => {
        if (checkInternetConnection()) setShowFinishConfirm(true);
    };

    const submitAttendance = async () => {
        if (!checkInternetConnection()) return;
        setShowFinishConfirm(false);
        setIsSubmitting(true);
        const batchesPayload = {};
        selectedBatches.forEach(batchKey => { batchesPayload[batchKey] = { course: batchCourseMap[batchKey], presentMap: {} }; });
        scannedData.forEach((hash, roll) => {
            const batchKey = validStudentMap.get(roll);
            if (batchesPayload[batchKey]) batchesPayload[batchKey].presentMap[roll] = hash;
        });

        try {
            const response = await fetch(`${BACKEND_URL}/api/attendance-mark-multiple-qr`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ semname: semester, date: new Date().toISOString().split('T')[0], batches: batchesPayload }), credentials: 'include'
            });
            const result = await response.json(); 
            if (response.ok) { 
                setAttendanceReport(result);
                setView('summary');
                toggleFullScreen('exit'); 
            } else {
                throw new Error(result.message || "Failed to submit attendance");
            }
        } catch (error) { setUserMsg({ text: error.message, type: "error" }); } 
        finally { setIsSubmitting(false); }
    };

    // ========================================================================
    // RENDER HELPER FUNCTIONS
    // ========================================================================

    const renderSplash = () => (
        <div className="flex flex-col items-center justify-center text-center px-4 sm:px-6 animate-fade-in min-h-[60vh] sm:min-h-[80vh] relative">
            <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
                <button onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/faculty/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-white transition-all text-sm sm:text-base"><ArrowLeft className="w-4 h-4" /> Dashboard</button>
            </div>
            <div className="mb-8 sm:mb-10 relative mt-10">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                <Layers className="w-20 h-20 sm:w-24 sm:h-24 text-blue-600 relative z-10" />
            </div>
            <h1 className="text-4xl sm:text-7xl font-black text-slate-900 tracking-tight mb-4">Multi-Batch</h1>
            <p className="text-slate-500 text-sm sm:text-lg font-medium max-w-md">Simultaneous high-speed scanning for multiple sections.</p>
            <button onClick={() => setView('sem-select')} className="mt-8 sm:mt-12 bg-slate-900 text-white py-4 sm:py-5 px-10 sm:px-12 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-3 active:scale-95 group w-full sm:w-auto justify-center">
                Configure Session <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </button>
        </div>
    );

    const renderSemSelection = () => (
        <div className="w-full max-w-lg mx-auto p-4 h-[calc(100dvh-2rem)] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col overflow-hidden max-h-full">
                <div className="p-6 pb-2 shrink-0 z-10 bg-white/50">
                    <StepWizardHeader currentStep={1} />
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={() => setView('splash')} className="p-2 -ml-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <div><h1 className="text-2xl font-bold text-slate-900 leading-none">Select Semester</h1><p className="text-xs text-slate-500 mt-1 font-medium">Choose academic session</p></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {SEMESTERS.map(sem => (
                            <button key={sem} onClick={() => handleSemesterSelect(sem)} disabled={isLoading} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 group h-24 active:scale-95 ${semester === sem ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
                                {isLoading && semester === sem ? <Loader2 className="animate-spin text-blue-600 w-5 h-5"/> : <Calendar className={`w-5 h-5 ${semester === sem ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`}/>}
                                <span className={`font-bold text-lg ${semester === sem ? 'text-blue-700' : 'text-slate-600'}`}>{sem}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBatchSelection = () => (
        <div className="w-full max-w-lg mx-auto p-4 h-[calc(100dvh-2rem)] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col overflow-hidden max-h-full">
                <div className="p-6 pb-2 shrink-0 z-10 bg-white/50">
                    <StepWizardHeader currentStep={2} />
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={() => setView('sem-select')} className="p-2 -ml-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <div><h1 className="text-2xl font-bold text-slate-900 leading-none">Select Batches</h1><p className="text-xs text-slate-500 mt-1 font-medium">{selectedBatches.length} batches selected</p></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                    <div className="flex justify-end mb-4 sticky top-0 bg-white/95 backdrop-blur z-10 py-2 border-b border-slate-50">
                        <button onClick={() => setSelectedBatches(selectedBatches.length === semesterConfig.length ? [] : semesterConfig.map(c => c.name))} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">{selectedBatches.length === semesterConfig.length ? "Deselect All" : "Select All"}</button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {semesterConfig.map(configItem => {
                            const isSelected = selectedBatches.includes(configItem.name);
                            return (
                                <button key={configItem.name} onClick={() => toggleBatch(configItem.name)} className={`py-2 px-1 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center h-16 active:scale-95 ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-md transform scale-105' : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200'}`}>
                                    <span className="font-bold text-sm">{configItem.name}</span>
                                    <span className={`text-[9px] uppercase font-bold mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{configItem.totalCourses} Sub</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button onClick={handleBatchesNext} disabled={selectedBatches.length === 0} className="w-full bg-blue-600 text-white py-3.5 sm:py-4 rounded-2xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-200 active:scale-95">Next Step <ArrowRight className="w-4 h-4"/></button>
                </div>
            </div>
        </div>
    );

    const renderCourseMapping = () => {
        const allCourses = [...new Set(semesterConfig.flatMap(c => c.availableCourses || []))];
        return (
            <div className="w-full max-w-lg mx-auto p-4 h-[calc(100dvh-2rem)] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col overflow-hidden max-h-full">
                    <div className="p-6 pb-2 shrink-0 z-10 bg-white/50">
                        <StepWizardHeader currentStep={3} />
                        <div className="flex items-center gap-3 mt-4">
                            <button onClick={() => setView('batches')} className="p-2 -ml-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                            <div><h1 className="text-2xl font-bold text-slate-900 leading-none">Map Courses</h1><p className="text-xs text-slate-500 mt-1 font-medium">Assign subject to each batch</p></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 flex flex-col sm:flex-row gap-2 items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs whitespace-nowrap"><Filter size={14}/> Set All To:</div>
                            <div className="relative w-full">
                                <select value={globalCourse} onChange={(e) => applyGlobalCourse(e.target.value)} className="w-full p-2 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-400 outline-none">
                                    <option value="">Select Course...</option>
                                    {allCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {selectedBatches.map(batchName => (
                                <div key={batchName} className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-100 rounded-lg shadow-sm">
                                    <div className="w-10 h-8 bg-blue-50 rounded-md flex items-center justify-center font-black text-blue-700 text-xs shrink-0">{batchName}</div>
                                    <div className="flex-grow relative">
                                        <select value={batchCourseMap[batchName]} onChange={(e) => updateBatchCourse(batchName, e.target.value)} className="w-full py-1.5 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 appearance-none cursor-pointer outline-none focus:border-blue-400">
                                            <option value="">Select...</option>
                                            {semesterConfig.find(c => c.name === batchName)?.availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                        <button onClick={handleCoursesNext} disabled={isLoading} className="w-full bg-blue-600 text-white py-3.5 sm:py-4 rounded-2xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-blue-200 active:scale-95">
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <>Load Students <ArrowRight className="w-4 h-4"/></>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderPreview = () => (
        <div className="w-full max-w-lg mx-auto p-4 h-[calc(100dvh-2rem)] flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col overflow-hidden max-h-full">
                <div className="p-6 pb-2 shrink-0 z-10 bg-white/50">
                    <StepWizardHeader currentStep={4} />
                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={() => setView('courses')} className="p-2 -ml-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <div><h1 className="text-2xl font-bold text-slate-900 leading-none">Pre-Flight</h1><p className="text-xs text-slate-500 mt-1 font-medium">Ready to scan</p></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                    <div className="bg-slate-900 text-white p-5 rounded-2xl mb-4 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="relative z-10 flex justify-between items-end">
                            <div><h3 className="text-3xl font-black">{validStudentMap.size}</h3><p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Students Loaded</p></div>
                            <div className="text-right"><h3 className="text-xl font-bold text-blue-400">{selectedBatches.length}</h3><p className="text-slate-500 text-xs font-medium uppercase">Batches</p></div>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex-grow flex flex-col mb-2">
                        <div className="px-4 py-2 border-b border-slate-200 bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between"><span>Batch</span><span>Course</span></div>
                        <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {selectedBatches.map(b => (
                                <div key={b} className="flex justify-between px-3 py-2 bg-white rounded-lg border border-slate-100 text-xs">
                                    <span className="font-bold text-slate-700">{b}</span>
                                    <span className="font-mono text-slate-500 bg-slate-50 px-1.5 rounded">{batchCourseMap[b]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button onClick={handleStartScanning} className="w-full bg-blue-600 text-white py-3.5 sm:py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition active:scale-95 text-lg">
                        <ShieldCheck className="w-5 h-5" /> Start Safe Mode
                    </button>
                </div>
            </div>
        </div>
    );

    const renderScanner = () => (
        <div className="w-full h-[100dvh] flex flex-col p-2 md:p-4 animate-fade-in relative max-w-7xl mx-auto touch-none select-none">
            {/* CSS to force hide the library's shaded region if it appears */}
            <style>{`#qr-shaded-region { display: none !important; }`}</style>

            {/* Header */}
            <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur-md p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl border border-white/10 text-white mb-2 sm:mb-4 shadow-2xl z-20 shrink-0">
                <div className="flex flex-col"><h3 className="font-bold text-lg sm:text-xl leading-tight text-white">Multi-Batch</h3><p className="text-blue-300 text-[10px] sm:text-xs font-medium tracking-wide uppercase">{selectedBatches.length} Batches Active</p></div>
                <div className="flex items-center gap-2 sm:gap-3"><HeaderNetworkStatus isOnline={isOnline} /><SessionTimer startTime={sessionStartTime} /><button onClick={() => setShowExitModal(true)} className="bg-rose-500/20 p-2 sm:p-2.5 rounded-full hover:bg-rose-500/30 text-rose-300 transition-colors active:scale-95"><LogOut className="w-4 h-4 sm:w-5 sm:h-5" /></button></div>
            </div>
            
            {/* Camera Area - Flex Grow to fill space */}
            <div className="flex flex-col items-center justify-start flex-1 gap-2 sm:gap-4 relative z-10 min-h-0">
                {/* MODIFIED: Reduced max-height to 50vh for mobile (better visibility of controls), auto height for desktop */}
                <div className="relative w-full flex-1 min-h-0 max-h-[50vh] sm:max-h-none rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-[4px] sm:border-[6px] border-slate-800">
                    <ScannerOverlay cooldown={cooldown} />
                    <style>{`#qr-reader { border: none !important; width: 100% !important; height: 100% !important; background: transparent !important; } #qr-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important; border-radius: 1.5rem !important; } #qr-reader__scan_region { background: transparent !important; }`}</style>
                    <div id="qr-reader" className="w-full h-full object-cover"></div>
                    {isPaused && scanResult.message && cooldown === 0 && (
                        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in zoom-in duration-200 text-center">
                             {scanResult.photo && (<div className={`p-1 rounded-full border-4 mb-4 sm:mb-6 ${scanResult.type === 'success' ? 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]' : 'border-rose-500'}`}><img src={scanResult.photo} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover" onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${scanResult.rollNumber}&background=random`}/></div>)}
                            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-widest mb-2 sm:mb-3">{scanResult.rollNumber}</h2>
                            <span className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl font-bold text-sm sm:text-lg border ${scanResult.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-rose-500/20 text-rose-300 border-rose-500/50'}`}>{scanResult.message}</span>
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="w-full max-w-xl shrink-0 space-y-2 sm:space-y-4 pb-2">
                     {lastScanned ? (
                         <div className="bg-white/90 backdrop-blur-xl p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl shadow-xl flex items-center justify-between border border-white/50 animate-in slide-in-from-bottom duration-500">
                            <div className="flex items-center gap-3 sm:gap-4"><img src={lastScanned.photo} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-slate-100 object-cover border-2 border-white shadow-md" onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${lastScanned.rollNumber}`} /><div><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Verified</p><p className="font-black text-slate-900 text-lg sm:text-2xl">{lastScanned.rollNumber}</p></div></div><span className="text-xs sm:text-sm font-bold text-slate-400 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">#{scanCount}</span></div>
                    ) : <div className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-[1.5rem] sm:rounded-3xl border border-white/10 text-white/40 text-center text-xs sm:text-sm font-medium h-[64px] sm:h-[88px] flex items-center justify-center">Waiting for first scan...</div>}
                    
                    <button onClick={handleFinishClick} disabled={scanCount === 0 || isSubmitting} className="w-full bg-blue-600 text-white py-4 sm:py-5 rounded-[1.5rem] sm:rounded-2xl font-bold text-lg sm:text-xl hover:bg-blue-700 shadow-xl shadow-blue-900/30 flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100">{isSubmitting ? <Loader2 className="animate-spin w-6 h-6"/> : <><CheckCircle2 className="w-6 h-6"/> Finish Session ({scanCount})</>}</button>
                </div>
            </div>
        </div>
    );

    const renderSummary = () => {
        if (!attendanceReport || !attendanceReport.results) return null;
        const { message, results } = attendanceReport;
        
        // Calculate aggregate stats for the Circular Progress
        let totalPresent = 0;
        let totalAbsent = 0;
        results.forEach(r => {
            if (r.status !== 'skipped') {
                totalPresent += r.presentiesCount;
                totalAbsent += r.absenteesCount;
            }
        });
        const totalStudents = totalPresent + totalAbsent;
        const overallRate = calculatePercentage(totalPresent, totalStudents);

        return (
             <div className="w-full max-w-2xl mx-auto bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in text-center p-4 sm:p-6 m-4 max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100">
                <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 border border-slate-100">
                    <h2 className="text-2xl font-black text-slate-900 mb-1">Session Complete</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-6">{message}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                        <CircularProgress percentage={overallRate} label="Overall" />
                        <div className="text-center sm:text-left space-y-3 w-full sm:w-auto flex flex-row sm:flex-col justify-around">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Scanned</p><p className="text-2xl font-black text-slate-900">{totalPresent}</p></div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Batches</p><p className="text-xl font-black text-blue-600">{results.length}</p></div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 text-left mb-6">
                    {results.map((res, idx) => {
                        const cleanBatchName = res.batch.replace(/.*-attendance-/, '');
                        if (res.status === 'skipped') {
                            return <div key={idx} className="bg-amber-50 rounded-2xl p-5 border border-amber-200"><div className="flex items-start gap-3"><FileWarning className="w-5 h-5 text-amber-500 mt-1 shrink-0" /><div><h3 className="font-bold text-slate-800 text-lg">{cleanBatchName} <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full ml-2 uppercase tracking-wide">Skipped</span></h3><p className="text-xs text-slate-600 mt-1 font-medium">{res.message}</p></div></div></div>;
                        }
                        const batchTotal = res.presentiesCount + res.absenteesCount;
                        const batchRate = calculatePercentage(res.presentiesCount, batchTotal);
                        const hasMismatched = res.mismatchedStudents && res.mismatchedStudents.length > 0;

                        return (
                            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-900 text-lg">{cleanBatchName}</h3><span className="text-2xl font-black text-blue-600">{batchRate}%</span></div>
                                <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden"><div className="bg-emerald-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${batchRate}%` }}></div></div>
                                <div className="grid grid-cols-2 gap-4 mb-2"><div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100"><span className="block text-lg font-bold text-emerald-600">{res.presentiesCount}</span><span className="text-[9px] uppercase font-black text-slate-400">Present</span></div><div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100"><span className="block text-lg font-bold text-rose-500">{res.absenteesCount}</span><span className="text-[9px] uppercase font-black text-slate-400">Absent</span></div></div>
                                {hasMismatched && (
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 mt-3 overflow-hidden">
                                        <div className="flex items-center gap-2 text-rose-600 mb-2 border-b border-rose-100 pb-2"><AlertCircle size={14} /><span className="text-[10px] font-black uppercase">Mismatched ({res.mismatchedStudents.length})</span></div>
                                        <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto custom-scrollbar">{res.mismatchedStudents.map(s => <span key={s} className="text-[10px] font-mono font-bold bg-white text-rose-500 px-2 py-1 rounded border border-rose-100 shadow-sm">{s}</span>)}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <button onClick={handleExitSession} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center justify-center gap-2">Return to Dashboard <LogOut size={20}/></button>
             </div>
        );
    };

    // --- MAIN RENDER (FIXED) ---
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
            
            {view !== 'scanner' && (
                <>
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-50 -z-10"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                    <div className="absolute top-0 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse animation-delay-2000"></div>
                </>
            )}

            <div className="w-full h-full relative z-10 flex items-center justify-center">
                {view === 'splash' && renderSplash()} 
                {view === 'sem-select' && renderSemSelection()} 
                {view === 'batches' && renderBatchSelection()} 
                {view === 'courses' && renderCourseMapping()} 
                {view === 'preview' && renderPreview()} 
                {view === 'scanner' && renderScanner()} 
                {view === 'summary' && renderSummary()}
            </div>

            {showExitModal && (<ConfirmModal message="Are you sure you want to end this session? All unsaved data will be lost." textToType="EXIT" isUsernameCheck={false} onConfirm={handleExitSession} onCancel={() => setShowExitModal(false)} validateNet={checkInternetConnection} />)}
            {showFinishConfirm && (<ConfirmModal message={`Submit attendance for ${scanCount} students across ${selectedBatches.length} batches?`} textToType={user?.username || "CONFIRM"} isUsernameCheck={true} onConfirm={submitAttendance} onCancel={() => setShowFinishConfirm(false)} validateNet={checkInternetConnection} />)}
            {showNetworkErrorModal && <NetworkErrorModal onClose={() => setShowNetworkErrorModal(false)} />}
            {userMsg.text && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-full shadow-2xl shadow-slate-200 z-50 flex items-center gap-3 animate-fade-in border border-slate-100 w-11/12 max-w-sm justify-between sm:w-auto"><div className="flex items-center gap-3">{userMsg.type === 'error' ? <AlertTriangle className="text-rose-500 shrink-0"/> : <Info className="text-blue-500 shrink-0"/>}<p className="font-bold text-slate-700 text-xs sm:text-sm">{userMsg.text}</p></div><button onClick={() => setUserMsg({text: null})}><XCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 transition shrink-0"/></button></div>}
        </div>
    );
}