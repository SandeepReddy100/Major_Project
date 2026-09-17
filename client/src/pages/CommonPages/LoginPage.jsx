import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js'; // Import Crypto JS

import {
    LogIn, User, Linkedin, Github,  Lock, Unlock,
    QrCode, Trophy, CheckCircle, 
    Battery, Wifi, Signal, Terminal, ScanLine, Server, Loader2, ChevronDown,
    Handshake, XCircle, X, Info, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import IARELogo from '../../assets/logo.png';
import AzarImg from '../../assets/azaruddin.png';

const API_URL = import.meta.env.VITE_BASE_URL;
const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_KEY; 

const encryptData = (data) => {
  try {
    if (!data) return null;
    const stringData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(stringData, EncDec_SECRET_KEY).toString();
  } catch (err) {
    console.error("Encryption Logic Error:", err.message);
    return null;
  }
};

const decryptData = (ciphertext) => {
  try {
    if (!ciphertext) return null;
    const normalizedCiphertext = ciphertext.replace(/ /g, '+');
    const bytes = CryptoJS.AES.decrypt(normalizedCiphertext, EncDec_SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) return null;

    try {
      return JSON.parse(decryptedString);
    } catch (e) {
      return decryptedString;
    }
  } catch (err) {
    console.error("Decryption Error:", err.message);
    return null;
  }
};

// --- DATA ---
const teamMentor = {
    name: 'Dr. B Padmaja',
    role: 'Advisor',
    image: 'https://iare.irins.org/profile_images/217071.jpg',
};

const teamDevelopers = [
    {
        name: 'Burugu Sai Nitin',
        role: 'Software Engineer',
        image: 'https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/23951A66F6/23951A66F6.jpg',
        linkedin: 'https://www.linkedin.com/in/burugu-sai-nitin/',
        github: 'https://github.com/Immnitin'
    },
    {
        name: 'Shaik Mohammad Azaruddin',
        role: 'Software Engineer',
        image: AzarImg,
        linkedin: 'https://www.linkedin.com/in/mohammadazaruddinshaik/',
        github: 'https://github.com/mohammadazaruddinshaik'
    },
    {
        name: 'Tavva Sandeep Kumar Reddy',
        role: 'Software Engineer',
        image: 'https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/23951A66H0/23951A66H0.jpg',
        linkedin: 'https://www.linkedin.com/in/tavva-sandeep-kumar-rddy-705966355/',
        github: 'https://github.com/SandeepReddy100'
    },
];


// --- SUB-COMPONENTS ---

const DeveloperCard = ({ dev, isMentor = false }) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className={`relative bg-white rounded-[2rem] p-1 z-10 overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-300 w-full max-w-[350px] mx-auto h-full flex flex-col`}
    >
        <div className={`absolute inset-0 bg-gradient-to-br ${isMentor ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-600'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]`}></div>
        <div className="bg-white rounded-[1.8rem] p-6 h-full flex flex-col items-center text-center relative z-10 border border-gray-100 flex-1">
            <div className="relative mb-4">
                <div className={`absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity ${isMentor ? 'bg-amber-500' : 'bg-blue-600'}`}></div>
                <img src={dev.image} alt={dev.name} className="relative w-28 h-28 rounded-full object-cover border-4 border-gray-50 shadow-md group-hover:scale-105 transition-transform duration-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{dev.name}</h3>
            <p className={`text-xs font-bold uppercase tracking-wider mb-6 ${isMentor ? 'text-amber-600' : 'text-blue-600'}`}>{dev.role}</p>
            {!isMentor && (
                <div className="flex gap-4 mt-auto">
                    <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-white hover:bg-[#0077b5] transition-all duration-300"><Linkedin size={16} /></a>
                    <a href={dev.github} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-white hover:bg-[#333] transition-all duration-300"><Github size={16} /></a>
                </div>
            )}
        </div>
    </motion.div>
);

const ForgotPasswordModal = ({ isOpen, onClose }) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-gray-900 p-5 flex justify-between items-center relative">
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Important Notice</h3>
                            <p className="text-gray-400 text-xs mt-0.5">Password Reset Procedure</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/10 rounded-full p-1.5"><X size={16} /></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="flex gap-3">
                            <div className="bg-blue-50 p-2.5 rounded-full h-fit"><Building2 className="text-blue-600 w-5 h-5" /></div>
                            <div className="space-y-1">
                                <h4 className="text-gray-900 font-bold text-sm">Contact Administration</h4>
                                <p className="text-gray-500 text-xs leading-relaxed">For security, please visit the <strong>CDC Administration</strong> or contact your <strong>Faculty Coordinator</strong> in person.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-xs text-amber-800 font-medium flex items-center gap-2"><Info size={14} />Note: Bring your Student ID Card.</p>
                        </div>
                        <button onClick={onClose} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm">Close</button>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

const CyberMascot = ({ mode }) => {
    return (
        <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
            <motion.div className="w-20 h-16 md:w-24 md:h-20 bg-gradient-to-b from-gray-200 to-white rounded-3xl border-4 border-gray-300 shadow-xl relative overflow-hidden z-10 flex items-center justify-center gap-3 md:gap-4" animate={{ y: mode === 'password' ? 5 : 0 }}>
                <div className="flex gap-2 md:gap-3 relative z-0">
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-gray-800 rounded-full relative overflow-hidden"><motion.div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full absolute top-1 left-1" animate={{ x: mode === 'username' ? [0, 2, -2, 0] : 0, y: mode === 'username' ? [0, 1, 0] : 0 }} transition={{ repeat: Infinity, duration: 2 }}/></div>
                    <div className="w-4 h-4 md:w-5 md:h-5 bg-gray-800 rounded-full relative overflow-hidden"><motion.div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full absolute top-1 left-1" animate={{ x: mode === 'username' ? [0, 2, -2, 0] : 0, y: mode === 'username' ? [0, 1, 0] : 0 }} transition={{ repeat: Infinity, duration: 2 }}/></div>
                </div>
                <div className="absolute bottom-3 md:bottom-4 w-4 h-1 bg-gray-300 rounded-full opacity-50"></div>
            </motion.div>
            <motion.div className="absolute w-6 h-8 md:w-8 md:h-10 bg-gray-300 rounded-full border-2 border-white shadow-lg z-20" initial={{ bottom: -20, left: 10, rotate: -20 }} animate={mode === 'password' ? { bottom: 40, left: 20, rotate: 0 } : { bottom: -10, left: 5, rotate: -20 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}/>
            <motion.div className="absolute w-6 h-8 md:w-8 md:h-10 bg-gray-300 rounded-full border-2 border-white shadow-lg z-20" initial={{ bottom: -20, right: 10, rotate: 20 }} animate={mode === 'password' ? { bottom: 40, right: 20, rotate: 0 } : { bottom: -10, right: 5, rotate: 20 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}/>
        </div>
    );
};

const MockPhoneScreen = ({ activeField }) => {
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            setCurrentTime(timeString);
        };
        
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#0a0a0a] to-black font-sans w-full h-full overflow-hidden">
            <div className="px-5 pt-4 flex justify-between items-center z-50 absolute top-0 left-0 right-0">
                <span className="text-[9px] text-white font-semibold tracking-wider">{currentTime}</span>
                <div className="flex gap-1 items-center"><Signal size={9} className="text-white"/><Wifi size={9} className="text-white"/><Battery size={12} className="text-white"/></div>
            </div>

            <div className="flex-1 relative flex flex-col h-full">
                <AnimatePresence mode="wait">
                    {(activeField === 'username' || activeField === 'password') ? (
                        <motion.div key="mascot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10 bg-gray-100">
                            <div className="absolute inset-0 bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                            <CyberMascot mode={activeField} />
                            <div className="mt-8 text-center relative z-10"><h3 className="text-gray-800 font-bold text-lg">{activeField === 'username' ? 'Identifying User' : 'Security Mode'}</h3><p className="text-gray-500 text-xs mt-1">{activeField === 'username' ? 'Please enter your username' : 'Credentials hidden for privacy'}</p></div>
                        </motion.div>
                    ) : activeField === 'loading' ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20 bg-[#0a0a0a]">
                            <div className="relative mb-6"><motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-t-2 border-l-2 border-blue-500 rounded-full"/><div className="absolute inset-0 flex items-center justify-center"><Server className="text-blue-400" size={24} /></div></div>
                            <h3 className="text-white font-bold text-lg">Authenticating</h3>
                            <p className="text-gray-500 text-xs mt-1 animate-pulse">Connecting to server...</p>
                        </motion.div>
                    ) : activeField === 'success' ? (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-30 bg-gradient-to-br from-green-900 to-black">
                            <div className="relative w-32 h-32 mb-6 flex items-center justify-center"><motion.div initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" /><div className="relative z-10 bg-green-500/10 p-6 rounded-full border border-green-500/30"><Handshake className="text-green-400 w-16 h-16" /></div><motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="absolute -top-2 -right-2 bg-white rounded-full p-1"><CheckCircle className="text-green-600 w-6 h-6 fill-green-100" /></motion.div></div><h3 className="text-white font-bold text-xl tracking-tight">Access Granted</h3>
                        </motion.div>
                    ) : activeField === 'error' ? (
                        <motion.div key="error" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-30 bg-gradient-to-br from-red-950 to-black">
                            <div className="relative w-32 h-32 mb-6 flex items-center justify-center animate-shake"><div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl" /><div className="relative z-10 bg-red-500/10 p-6 rounded-full border border-red-500/30 grayscale"><Handshake className="text-red-400 w-16 h-16 opacity-50" /></div><motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }} className="absolute inset-0 flex items-center justify-center z-20"><XCircle className="text-red-500 w-24 h-24 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" /></motion.div></div><h3 className="text-white font-bold text-xl tracking-tight">Access Denied</h3><p className="text-red-400 text-xs mt-2 font-medium">Verification Failed</p>
                        </motion.div>
                    ) : (
                        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col p-4 pt-12 h-full justify-between">
                            <div className="flex justify-between items-center">
                                <div><h2 className="text-white text-lg font-bold tracking-tight">Hi, User</h2><p className="text-gray-400 text-[10px] font-medium mt-0.5">CSE (AI & ML) • Sem 6</p></div>
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-md shadow-lg"><User size={14} className="text-white"/></div>
                            </div>
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-3 flex items-center justify-between shadow-xl shadow-blue-900/30 cursor-pointer hover:scale-[1.02] transition-transform mt-2">
                                <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><QrCode className="text-white" size={18}/></div><div><div className="text-white font-bold text-sm">Scan QR Code</div></div></div><ScanLine className="text-white/50" size={16}/>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="bg-[#1a1f2e]/80 p-2 rounded-xl border border-white/5 backdrop-blur-md flex flex-col justify-between h-16"><span className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Attendance</span><div className="flex justify-between items-end"><div className="text-lg font-bold text-white leading-none">92<span className="text-[10px] text-gray-500 font-medium">%</span></div><div className="bg-green-500/20 text-green-400 p-0.5 rounded"><CheckCircle size={10}/></div></div></div>
                                <div className="bg-[#1a1f2e]/80 p-2 rounded-xl border border-white/5 backdrop-blur-md flex flex-col justify-between h-16"><span className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Rank</span><div className="flex justify-between items-end"><div className="text-lg font-bold text-white leading-none">#05</div><div className="bg-amber-500/20 text-amber-400 p-0.5 rounded"><Trophy size={10}/></div></div></div>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 backdrop-blur-sm flex-1 flex flex-col justify-center mt-2 min-h-[100px]">
                                <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-1"><Trophy size={12} className="text-amber-400" /><span className="text-gray-300 font-bold text-[10px] uppercase">Leaderboard</span></div></div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[8px] font-bold text-black shadow-lg">1</div><div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-amber-400 w-[92%]"></div></div><span className="text-[8px] font-mono text-amber-400">2040</span></div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-[8px] font-bold text-black">2</div><div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-gray-400 w-[85%]"></div></div><span className="text-[8px] font-mono text-gray-400">1850</span></div>
                                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-700 rounded-full flex items-center justify-center text-[8px] font-bold text-white">3</div><div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-orange-700 w-[78%]"></div></div><span className="text-[8px] font-mono text-orange-700">1620</span></div>
                                </div>
                            </div>
                            <div className="mt-2 bg-[#1a1f2e]/60 rounded-xl p-2 border border-white/5 flex items-center gap-2 backdrop-blur-md"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-cyan-300 border border-white/5"><Terminal size={12} /></div><div><div className="text-white text-[10px] font-bold">Competitive Programming</div><div className="text-gray-400 text-[8px]">Active • Sem 6</div></div></div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const LoginPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [activeField, setActiveField] = useState(null); 
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollContainerRef = useRef(null);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            if (scrollContainerRef.current.scrollTop > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!username || !password) {
            setError('Please enter both username and password.');
            return;
        }
        setIsLoading(true);
        setActiveField('loading'); 
        
        try {
            // --- ENCRYPTION LOGIC ---
            const encryptedPayload = encryptData({ username, password });
            
            if (!encryptedPayload) throw new Error("Client-side encryption failed");

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: encryptedPayload }), 
                credentials: "include"
            });
            
            const result = await response.json();
            
            // --- DECRYPTION LOGIC ---
            let data = null;
            if (result.data) {
                data = decryptData(result.data);
            } else if (result.error) {
                const decryptedError = decryptData(result.error);
                throw new Error(decryptedError || result.error || 'Login failed.');
            }

            if (response.ok && data) {
                setActiveField('success');
                
                // REMOVED localStorage.setItem

                setTimeout(() => {
                    let targetPath = '/';
                    switch (data.role) {
                        case 'admin': targetPath = '/admin/dashboard'; break;
                        case 'faculty': targetPath = '/faculty/dashboard'; break;
                        case 'student': targetPath = '/student/dashboard'; break;
                        default: setError("Login Unsuccessful!"); return;
                    }
                    window.location.href = targetPath;
                }, 1500);

            } else {
                throw new Error(data?.message || 'Unauthorized Access');
            }
        } catch (err) {
            console.error('Login Process Error:', err);
            
            let errorMessage = err.message || 'Network error. Please try again.';
            if (errorMessage === 'Failed to fetch' || errorMessage.includes("NetworkError")) {
                errorMessage = "You're currently offline. Please reconnect to continue.";
            }
            
            setError(errorMessage);
            setActiveField('error');
            setIsLoading(false);
            setTimeout(() => { setActiveField(null); }, 2500);
        }
    };

    const scrollToTeam = () => {
        const teamSection = document.getElementById('meet-team');
        if (teamSection && scrollContainerRef.current) {
            teamSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-screen overflow-y-auto bg-[#F8FAFC] lg:bg-[#0B0F19] font-inter text-gray-800 selection:bg-blue-200"
        >
            <style>{`html { scroll-behavior: smooth; }`}</style>
            
            <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />

            {/* SECTION 1: FULL SCREEN LOGIN & HERO */}
            <div className="flex flex-col lg:flex-row min-h-screen w-full relative">
                
                {/* LEFT SIDE: 60% Width - STRICTLY HIDDEN ON MOBILE */}
                <div className="hidden lg:flex lg:w-[60%] relative flex-col justify-center items-center text-white p-6 bg-[#0B0F19]">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-[#0B0F19] to-[#0B0F19] z-0"></div>
                    <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"></div>
                    
                    <div className="relative z-10 w-full max-w-xl flex flex-col items-center justify-center h-full">
                        <div className="mb-8 text-center">
                            <h1 className="text-3xl xl:text-4xl font-semibold mb-2 text-white">
    QR Attendance System
</h1>

<p className="text-sm text-blue-200/80 leading-relaxed max-w-md mx-auto">
    A centralized system for managing classroom attendance using secure, time-bound QR codes.
</p>

                        </div>

                        <div className="relative w-full max-w-[260px] h-[50vh] max-h-[580px] min-h-[380px]" style={{ perspective: '1200px' }}>
                            <motion.div 
                                initial={{ y: 200, opacity: 0, rotateY: -90, scale: 0.8 }} 
                                animate={{ 
                                    y: 0, 
                                    opacity: 1, 
                                    scale: 1,
                                    rotateX: 5,
                                    rotateY: 12,
                                }}
                                transition={{ 
                                    duration: 1.5,
                                    ease: "easeOut",
                                    delay: 0.2
                                }}
                                whileHover={{ 
                                    scale: 1.02, 
                                    rotateY: 10,
                                    transition: { duration: 0.4 } 
                                }}
                                className="w-full h-full bg-[#121212] rounded-[2.5rem] p-2 shadow-[30px_20px_60px_-15px_rgba(0,0,0,0.7)] border-[6px] border-[#1f1f1f] ring-1 ring-white/20 relative cursor-pointer"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-50 pointer-events-none border border-gray-800/50 shadow-md"></div>
                                <div className="w-full h-full rounded-[2.0rem] overflow-hidden relative bg-black shadow-inner"><MockPhoneScreen activeField={activeField} /></div>
                                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none z-50"></div>
                            </motion.div>
                            
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 0.4, scale: 1 }}
                                transition={{ duration: 1.5, delay: 0.2 }}
                                className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-40 h-10 bg-black/40 blur-2xl rounded-full"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: 40% Width - Form Only */}
                <div className={`w-full lg:w-[40%] bg-[#F8FAFC] relative z-20 shadow-2xl flex flex-col justify-center transition-all duration-500 ease-in-out min-h-screen lg:min-h-0 rounded-none ${isScrolled ? 'lg:rounded-none' : 'lg:rounded-l-[4rem]'}`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

                    <div className="flex flex-col justify-center items-center p-6 lg:p-10 w-full h-full">
                        <div className="w-full max-w-xs sm:max-w-sm relative z-10">
                            <div className="mb-8 flex justify-center lg:justify-start">
                                <motion.img 
                                    initial={{ y: -10, opacity: 0 }} 
                                    animate={{ y: 0, opacity: 1 }} 
                                    src={IARELogo} 
                                    alt="IARE" 
                                    className="h-16 md:h-24 w-auto drop-shadow-xl" 
                                />
                            </div>

                            <div className="mb-6 text-center lg:text-left">
                                <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1 tracking-tight">Sign In</h1>
                                <p className="text-xs md:text-sm text-gray-500 font-medium">    Enter your credentials to continue.
</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-3 uppercase tracking-wider">Username</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value.trim())} onFocus={() => setActiveField('username')} onBlur={() => setActiveField(null)} className="w-full bg-white border-2 border-gray-100 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:shadow-lg transition-all outline-none" placeholder="Enter Username" />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-3 uppercase tracking-wider">Password</label>
                                    <div className="relative group">
                                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value.trim())} onFocus={() => setActiveField('password')} onBlur={() => setActiveField(null)} onPaste={(e) => { e.preventDefault(); return false; }} onCopy={(e) => { e.preventDefault(); return false; }} className="w-full bg-white border-2 border-gray-100 rounded-full py-3 pl-4 pr-10 text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:shadow-lg transition-all outline-none" placeholder="••••••••" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors">{showPassword ? <Unlock size={18} /> : <Lock size={18} />}</button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {error && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-red-500 text-xs font-bold bg-red-50 px-4 py-2 rounded-lg text-center border border-red-100">{error}</motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex justify-end px-1">
                                    <button type="button" onClick={() => setShowForgotModal(true)} className="text-xs font-bold text-blue-600 hover:text-indigo-600 transition-colors">Forgot password?</button>
                                </div>

                                <motion.button whileHover={{ scale: 1.01, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-base font-bold py-3 rounded-full shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isLoading ? <><Loader2 className="animate-spin" size={18} /><span>Verifying...</span></> : <><span>Sign In</span><LogIn size={18} /></>}
                                </motion.button>
                            </form>

                            <div className="mt-8 flex justify-center">
    {/* HIGHLIGHTED SECTION */}
    <motion.div 
        onClick={scrollToTeam} 
        className="flex flex-col items-center cursor-pointer group p-2" 
        whileHover={{ y: 5 }}
    >
        {/* CHANGED: Text is now darker (gray-900), slightly larger (text-xs), and says "Developers" */}
        <span className="text-xs font-black text-gray-900 group-hover:text-blue-600 transition-colors tracking-[0.15em] uppercase mb-1">
    View Contributors
        </span>
        
        {/* CHANGED: Icon is now darker (gray-500) so it is visible even without hovering */}
        <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-blue-600 animate-bounce" />
    </motion.div>
</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: MEET THE TEAM */}
            <div id="meet-team" className="w-full bg-[#F8FAFC] py-16 px-6 border-t border-gray-200 flex items-center justify-center min-h-auto lg:min-h-[80vh]">
                <div className="max-w-7xl w-full"> 
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">    Built &amp; Maintained By
</h2>
                        <div className="h-1.5 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full mt-3"></div>
                    </div>

                    <div className="flex flex-col gap-10 items-center">
                        <div className="w-full max-w-[350px]"><DeveloperCard dev={teamMentor} isMentor={true} /></div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full place-items-center items-stretch">
                            {teamDevelopers.map((dev, index) => (
                                <DeveloperCard key={index} dev={dev} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LoginPage;


// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import CryptoJS from 'crypto-js';

// import {
//     LogIn, User, Linkedin, Github, Lock, Unlock,
//     QrCode, Trophy, CheckCircle,
//     Battery, Wifi, Signal, Terminal, ScanLine, Server, Loader2, ChevronDown,
//     Handshake, XCircle, X, Info, Building2, ArrowUp
// } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';

// import IARELogo from '../../assets/logo.png';
// import AzarImg from '../../assets/azaruddin.png';
// import ManCharacter3D from '../../assets/presenter2.png'

// const API_URL = import.meta.env.VITE_BASE_URL;
// const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_KEY;

// const encryptData = (data) => {
//     try {
//         if (!data) return null;
//         const stringData = JSON.stringify(data);
//         return CryptoJS.AES.encrypt(stringData, EncDec_SECRET_KEY).toString();
//     } catch (err) {
//         console.error("Encryption Logic Error:", err.message);
//         return null;
//     }
// };

// const decryptData = (ciphertext) => {
//     try {
//         if (!ciphertext) return null;
//         const normalizedCiphertext = ciphertext.replace(/ /g, '+');
//         const bytes = CryptoJS.AES.decrypt(normalizedCiphertext, EncDec_SECRET_KEY);
//         const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

//         if (!decryptedString) return null;

//         try {
//             return JSON.parse(decryptedString);
//         } catch (e) {
//             return decryptedString;
//         }
//     } catch (err) {
//         console.error("Decryption Error:", err.message);
//         return null;
//     }
// };

// // --- DATA ---
// const teamMentor = {
//     name: 'Dr. B Padmaja',
//     role: 'Advisor',
//     image: 'https://iare.irins.org/profile_images/217071.jpg',
// };

// const teamDevelopers = [
//     {
//         name: 'Burugu Sai Nitin',
//         role: 'Software Engineer',
//         image: 'https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/23951A66F6/23951A66F6.jpg',
//         linkedin: 'https://www.linkedin.com/in/burugu-sai-nitin/',
//         github: 'https://github.com/Immnitin'
//     },
//     {
//         name: 'Shaik Mohammad Azaruddin',
//         role: 'Software Engineer',
//         image: AzarImg,
//         linkedin: 'https://www.linkedin.com/in/mohammadazaruddinshaik/',
//         github: 'https://github.com/mohammadazaruddinshaik'
//     },
//     {
//         name: 'Tavva Sandeep Kumar Reddy',
//         role: 'Software Engineer',
//         image: 'https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/23951A66H0/23951A66H0.jpg',
//         linkedin: 'https://www.linkedin.com/in/tavva-sandeep-kumar-rddy-705966355/',
//         github: 'https://github.com/SandeepReddy100'
//     },
// ];


// // --- SUB-COMPONENTS ---

// const DeveloperCard = ({ dev, isMentor = false }) => (
//     <motion.div
//         whileHover={{ y: -5 }}
//         className={`relative bg-white rounded-[2rem] p-1 z-10 overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-300 w-full max-w-[350px] mx-auto h-full flex flex-col`}
//     >
//         <div className={`absolute inset-0 bg-gradient-to-br ${isMentor ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-600'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem]`}></div>
//         <div className="bg-white rounded-[1.8rem] p-6 h-full flex flex-col items-center text-center relative z-10 border border-gray-100 flex-1">
//             <div className="relative mb-4">
//                 <div className={`absolute inset-0 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity ${isMentor ? 'bg-amber-500' : 'bg-blue-600'}`}></div>
//                 <img src={dev.image} alt={dev.name} className="relative w-28 h-28 rounded-full object-cover border-4 border-gray-50 shadow-md group-hover:scale-105 transition-transform duration-300" />
//             </div>
//             <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{dev.name}</h3>
//             <p className={`text-xs font-bold uppercase tracking-wider mb-6 ${isMentor ? 'text-amber-600' : 'text-blue-600'}`}>{dev.role}</p>
//             {!isMentor && (
//                 <div className="flex gap-4 mt-auto">
//                     <a href={dev.linkedin} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-white hover:bg-[#0077b5] transition-all duration-300"><Linkedin size={16} /></a>
//                     <a href={dev.github} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-50 rounded-xl text-gray-400 hover:text-white hover:bg-[#333] transition-all duration-300"><Github size={16} /></a>
//                 </div>
//             )}
//         </div>
//     </motion.div>
// );

// const ForgotPasswordModal = ({ isOpen, onClose }) => (
//     <AnimatePresence>
//         {isOpen && (
//             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
//                 <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
//                     <div className="bg-gray-900 p-5 flex justify-between items-center relative">
//                         <div>
//                             <h3 className="text-lg font-bold text-white tracking-tight">Important Notice</h3>
//                             <p className="text-gray-400 text-xs mt-0.5">Password Reset Procedure</p>
//                         </div>
//                         <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/10 rounded-full p-1.5"><X size={16} /></button>
//                     </div>
//                     <div className="p-6 space-y-5">
//                         <div className="flex gap-3">
//                             <div className="bg-blue-50 p-2.5 rounded-full h-fit"><Building2 className="text-blue-600 w-5 h-5" /></div>
//                             <div className="space-y-1">
//                                 <h4 className="text-gray-900 font-bold text-sm">Contact Administration</h4>
//                                 <p className="text-gray-500 text-xs leading-relaxed">For security, please visit the <strong>CDC Administration</strong> or contact your <strong>Faculty Coordinator</strong> in person.</p>
//                             </div>
//                         </div>
//                         <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
//                             <p className="text-xs text-amber-800 font-medium flex items-center gap-2"><Info size={14} />Note: Bring your Student ID Card.</p>
//                         </div>
//                         <button onClick={onClose} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm">Close</button>
//                     </div>
//                 </motion.div>
//             </div>
//         )}
//     </AnimatePresence>
// );

// const CyberMascot = ({ mode }) => {
//     return (
//         <div className="relative w-20 h-20 md:w-28 md:h-28 flex items-center justify-center">
//             <motion.div className="w-16 h-12 md:w-20 md:h-16 bg-gradient-to-b from-gray-200 to-white rounded-3xl border-4 border-gray-300 shadow-xl relative overflow-hidden z-10 flex items-center justify-center gap-2 md:gap-3" animate={{ y: mode === 'password' ? 5 : 0 }}>
//                 <div className="flex gap-1.5 md:gap-2 relative z-0">
//                     <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-gray-800 rounded-full relative overflow-hidden"><motion.div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full absolute top-1 left-1" animate={{ x: mode === 'username' ? [0, 2, -2, 0] : 0, y: mode === 'username' ? [0, 1, 0] : 0 }} transition={{ repeat: Infinity, duration: 2 }} /></div>
//                     <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-gray-800 rounded-full relative overflow-hidden"><motion.div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white rounded-full absolute top-1 left-1" animate={{ x: mode === 'username' ? [0, 2, -2, 0] : 0, y: mode === 'username' ? [0, 1, 0] : 0 }} transition={{ repeat: Infinity, duration: 2 }} /></div>
//                 </div>
//                 <div className="absolute bottom-2 md:bottom-3 w-3 h-1 bg-gray-300 rounded-full opacity-50"></div>
//             </motion.div>
//             <motion.div className="absolute w-5 h-7 md:w-7 md:h-9 bg-gray-300 rounded-full border-2 border-white shadow-lg z-20" initial={{ bottom: -15, left: 8, rotate: -20 }} animate={mode === 'password' ? { bottom: 30, left: 15, rotate: 0 } : { bottom: -8, left: 4, rotate: -20 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} />
//             <motion.div className="absolute w-5 h-7 md:w-7 md:h-9 bg-gray-300 rounded-full border-2 border-white shadow-lg z-20" initial={{ bottom: -15, right: 8, rotate: 20 }} animate={mode === 'password' ? { bottom: 30, right: 15, rotate: 0 } : { bottom: -8, right: 4, rotate: 20 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} />
//         </div>
//     );
// };

// const MockPhoneScreen = ({ activeField }) => {
//     const [currentTime, setCurrentTime] = useState('');

//     useEffect(() => {
//         const updateTime = () => {
//             const now = new Date();
//             const timeString = now.toLocaleTimeString('en-IN', {
//                 timeZone: 'Asia/Kolkata',
//                 hour: 'numeric',
//                 minute: '2-digit',
//                 hour12: true
//             });
//             setCurrentTime(timeString);
//         };

//         updateTime();
//         const interval = setInterval(updateTime, 1000);
//         return () => clearInterval(interval);
//     }, []);

//     return (
//         <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-[#0a0a0a] to-black font-sans w-full h-full overflow-hidden">
//             <div className="px-5 pt-4 flex justify-between items-center z-50 absolute top-0 left-0 right-0">
//                 <span className="text-[9px] text-white font-semibold tracking-wider">{currentTime}</span>
//                 <div className="flex gap-1 items-center"><Signal size={9} className="text-white" /><Wifi size={9} className="text-white" /><Battery size={12} className="text-white" /></div>
//             </div>

//             <div className="flex-1 relative flex flex-col h-full">
//                 <AnimatePresence mode="wait">
//                     {(activeField === 'username' || activeField === 'password') ? (
//                         <motion.div key="mascot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10 bg-gray-100">
//                             <div className="absolute inset-0 bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]"></div>
//                             <CyberMascot mode={activeField} />
//                             <div className="mt-8 text-center relative z-10"><h3 className="text-gray-800 font-bold text-lg">{activeField === 'username' ? 'Identifying User' : 'Security Mode'}</h3><p className="text-gray-500 text-xs mt-1">{activeField === 'username' ? 'Please enter your username' : 'Credentials hidden for privacy'}</p></div>
//                         </motion.div>
//                     ) : activeField === 'loading' ? (
//                         <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20 bg-[#0a0a0a]">
//                             <div className="relative mb-6"><motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-t-2 border-l-2 border-blue-500 rounded-full" /><div className="absolute inset-0 flex items-center justify-center"><Server className="text-blue-400" size={24} /></div></div>
//                             <h3 className="text-white font-bold text-lg">Authenticating</h3>
//                             <p className="text-gray-500 text-xs mt-1 animate-pulse">Connecting to server...</p>
//                         </motion.div>
//                     ) : activeField === 'success' ? (
//                         <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-30 bg-gradient-to-br from-green-900 to-black">
//                             <div className="relative w-32 h-32 mb-6 flex items-center justify-center"><motion.div initial={{ scale: 0 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" /><div className="relative z-10 bg-green-500/10 p-6 rounded-full border border-green-500/30"><Handshake className="text-green-400 w-16 h-16" /></div><motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="absolute -top-2 -right-2 bg-white rounded-full p-1"><CheckCircle className="text-green-600 w-6 h-6 fill-green-100" /></motion.div></div><h3 className="text-white font-bold text-xl tracking-tight">Access Granted</h3>
//                         </motion.div>
//                     ) : activeField === 'error' ? (
//                         <motion.div key="error" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center p-6 z-30 bg-gradient-to-br from-red-950 to-black">
//                             <div className="relative w-32 h-32 mb-6 flex items-center justify-center animate-shake"><div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl" /><div className="relative z-10 bg-red-500/10 p-6 rounded-full border border-red-500/30 grayscale"><Handshake className="text-red-400 w-16 h-16 opacity-50" /></div><motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }} className="absolute inset-0 flex items-center justify-center z-20"><XCircle className="text-red-500 w-24 h-24 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" /></motion.div></div><h3 className="text-white font-bold text-xl tracking-tight">Access Denied</h3><p className="text-red-400 text-xs mt-2 font-medium">Verification Failed</p>
//                         </motion.div>
//                     ) : (
//                         <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex-1 flex flex-col p-4 pt-12 h-full justify-between">
//                             <div className="flex justify-between items-center">
//                                 <div><h2 className="text-white text-lg font-bold tracking-tight">Hi, User</h2><p className="text-gray-400 text-[10px] font-medium mt-0.5">CSE (AI & ML) • Sem 6</p></div>
//                                 <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border border-white/10 backdrop-blur-md shadow-lg"><User size={14} className="text-white" /></div>
//                             </div>
//                             <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-3 flex items-center justify-between shadow-xl shadow-blue-900/30 cursor-pointer hover:scale-[1.02] transition-transform mt-2">
//                                 <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl backdrop-blur-md"><QrCode className="text-white" size={18} /></div><div><div className="text-white font-bold text-sm">Scan QR Code</div></div></div><ScanLine className="text-white/50" size={16} />
//                             </div>
//                             <div className="grid grid-cols-2 gap-2 mt-2">
//                                 <div className="bg-[#1a1f2e]/80 p-2 rounded-xl border border-white/5 backdrop-blur-md flex flex-col justify-between h-16"><span className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Attendance</span><div className="flex justify-between items-end"><div className="text-lg font-bold text-white leading-none">92<span className="text-[10px] text-gray-500 font-medium">%</span></div><div className="bg-green-500/20 text-green-400 p-0.5 rounded"><CheckCircle size={10} /></div></div></div>
//                                 <div className="bg-[#1a1f2e]/80 p-2 rounded-xl border border-white/5 backdrop-blur-md flex flex-col justify-between h-16"><span className="text-gray-400 text-[8px] uppercase font-bold tracking-wider">Rank</span><div className="flex justify-between items-end"><div className="text-lg font-bold text-white leading-none">#05</div><div className="bg-amber-500/20 text-amber-400 p-0.5 rounded"><Trophy size={10} /></div></div></div>
//                             </div>
//                             <div className="bg-white/5 border border-white/5 rounded-xl p-3 backdrop-blur-sm flex-1 flex flex-col justify-center mt-2 min-h-[100px]">
//                                 <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-1"><Trophy size={12} className="text-amber-400" /><span className="text-gray-300 font-bold text-[10px] uppercase">Leaderboard</span></div></div>
//                                 <div className="space-y-2">
//                                     <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[8px] font-bold text-black shadow-lg">1</div><div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-amber-400 w-[92%]"></div></div><span className="text-[8px] font-mono text-amber-400">2040</span></div>
//                                     <div className="flex items-center gap-2"><div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-[8px] font-bold text-black">2</div><div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-gray-400 w-[85%]"></div></div><span className="text-[8px] font-mono text-gray-400">1850</span></div>
//                                     <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-700 rounded-full flex items-center justify-center text-[8px] font-bold text-white">3</div><div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-orange-700 w-[78%]"></div></div><span className="text-[8px] font-mono text-orange-700">1620</span></div>
//                                 </div>
//                             </div>
//                             <div className="mt-2 bg-[#1a1f2e]/60 rounded-xl p-2 border border-white/5 flex items-center gap-2 backdrop-blur-md"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center text-cyan-300 border border-white/5"><Terminal size={12} /></div><div><div className="text-white text-[10px] font-bold">Competitive Programming</div><div className="text-gray-400 text-[8px]">Active • Sem 6</div></div></div>
//                         </motion.div>
//                     )}
//                 </AnimatePresence>
//             </div>
//         </div>
//     );
// };

// const LoginPage = () => {
//     const navigate = useNavigate();
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [error, setError] = useState('');
//     const [isLoading, setIsLoading] = useState(false);
//     const [showPassword, setShowPassword] = useState(false);
//     const [activeField, setActiveField] = useState(null);
//     const [showForgotModal, setShowForgotModal] = useState(false);
//     const [isScrolled, setIsScrolled] = useState(false);
//     const scrollContainerRef = useRef(null);

//     const handleScroll = () => {
//         if (scrollContainerRef.current) {
//             // Threshold for triggering layout changes
//             if (scrollContainerRef.current.scrollTop > 50) {
//                 setIsScrolled(true);
//             } else {
//                 setIsScrolled(false);
//             }
//         }
//     };
    
//     // Smooth scroll to top helper
//     const scrollToTop = () => {
//         if (scrollContainerRef.current) {
//             scrollContainerRef.current.scrollTo({
//                 top: 0,
//                 behavior: 'smooth'
//             });
//         }
//     };

//     const handleLogin = async (e) => {
//         e.preventDefault();
//         setError('');
//         if (!username || !password) {
//             setError('Please enter both username and password.');
//             return;
//         }
//         setIsLoading(true);
//         setActiveField('loading');

//         try {
//             const encryptedPayload = encryptData({ username, password });
//             if (!encryptedPayload) throw new Error("Client-side encryption failed");

//             const response = await fetch(`${API_URL}/api/auth/login`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ payload: encryptedPayload }),
//                 credentials: "include"
//             });

//             const result = await response.json();

//             let data = null;
//             if (result.data) {
//                 data = decryptData(result.data);
//             } else if (result.error) {
//                 const decryptedError = decryptData(result.error);
//                 throw new Error(decryptedError || result.error || 'Login failed.');
//             }

//             if (response.ok && data) {
//                 setActiveField('success');

//                 setTimeout(() => {
//                     let targetPath = '/';
//                     switch (data.role) {
//                         case 'admin': targetPath = '/admin/dashboard'; break;
//                         case 'faculty': targetPath = '/faculty/dashboard'; break;
//                         case 'student': targetPath = '/student/dashboard'; break;
//                         default: setError("Login successful, but role is unknown."); return;
//                     }
//                     window.location.href = targetPath;
//                 }, 1500);

//             } else {
//                 throw new Error(data?.message || 'Unauthorized Access');
//             }
//         } catch (err) {
//             console.error('Login Process Error:', err);
            
//             let errorMessage = err.message || 'Network error. Please try again.';
//             if (errorMessage === 'Failed to fetch' || errorMessage.includes("NetworkError")) {
//                 errorMessage = "Something went wrong! Try again later.";
//             }
            
//             setError(errorMessage);
//             setActiveField('error');
//             setIsLoading(false);
//             setTimeout(() => { setActiveField(null); }, 2500);
//         }
//     };

//     const scrollToTeam = () => {
//         const teamSection = document.getElementById('meet-team');
//         if (teamSection && scrollContainerRef.current) {
//             teamSection.scrollIntoView({ behavior: 'smooth' });
//         }
//     };

//     return (
//         <div
//             ref={scrollContainerRef}
//             onScroll={handleScroll}
//             className="h-screen overflow-y-auto bg-[#F8FAFC] lg:bg-[#0B0F19] font-inter text-gray-800 selection:bg-blue-200 relative"
//         >
//             <style>{`html { scroll-behavior: smooth; }`}</style>

//             <ForgotPasswordModal isOpen={showForgotModal} onClose={() => setShowForgotModal(false)} />

//             {/* --- SCROLL TO TOP BUTTON --- */}
//             <AnimatePresence>
//                 {isScrolled && (
//                     <motion.button
//                         initial={{ opacity: 0, scale: 0 }}
//                         animate={{ opacity: 1, scale: 1 }}
//                         exit={{ opacity: 0, scale: 0 }}
//                         onClick={scrollToTop}
//                         className="fixed bottom-8 right-8 z-[100] bg-blue-600 text-white p-3 rounded-full shadow-xl hover:bg-blue-700 transition-colors border-2 border-white/20"
//                         title="Scroll to Top"
//                     >
//                         <ArrowUp size={24} />
//                     </motion.button>
//                 )}
//             </AnimatePresence>

//             {/* SECTION 1: FULL SCREEN LOGIN & HERO */}
//             <div className="flex flex-col lg:flex-row min-h-screen w-full relative">

//                 {/* LEFT SIDE: Hero Content */}
//                 {/* CHANGED: 'hidden lg:flex' ensures it shows at 1024px */}
//                 <div className="hidden lg:flex w-full lg:w-[55%] xl:w-[60%] shrink-0 relative flex-col justify-center items-center text-white p-4 lg:p-8 xl:p-24 bg-[#0B0F19] min-h-screen border-b border-gray-800 lg:border-b-0 lg:border-r">
//                     <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-[#0B0F19] to-[#0B0F19] z-0"></div>
//                     <div className="absolute top-[-20%] left-[-20%] w-[300px] lg:w-[600px] h-[300px] lg:h-[600px] bg-blue-600/10 rounded-full blur-[80px] lg:blur-[120px]"></div>

//                     <div className="relative z-10 w-full max-w-2xl flex flex-col items-center justify-center h-full">
//                         <div className="mb-4 lg:mb-12 text-center mt-6 lg:mt-0">
//                             <h1 className="text-2xl lg:text-3xl xl:text-4xl font-semibold mb-2 text-white">
//                                 QR Attendance System
//                             </h1>
//                             <p className="text-xs lg:text-sm text-blue-200/80 leading-relaxed max-w-xs lg:max-w-md mx-auto hidden sm:block">
//                                 A centralized system for managing classroom attendance using secure, time-bound QR codes.
//                             </p>
//                         </div>

//                         <div className="relative w-full max-w-[550px] lg:max-w-[700px] h-[380px] flex justify-center items-center transition-all duration-300 lg:pr-20">

//                             {/* 1. THE PHONE */}
//                             <div className="relative w-full max-w-[240px] lg:max-w-[260px] h-[50vh] max-h-[580px] min-h-[380px]" style={{ perspective: '1200px' }}>
//                                 <motion.div
//                                     initial={{ y: 200, opacity: 0, rotateY: -90, scale: 0.8 }}
//                                     animate={{
//                                         y: 0,
//                                         opacity: 1,
//                                         scale: 1,
//                                         rotateX: 5,
//                                         rotateY: 12,
//                                     }}
//                                     transition={{
//                                         duration: 1.5,
//                                         ease: "easeOut",
//                                         delay: 0.2
//                                     }}
//                                     whileHover={{
//                                         scale: 1.02,
//                                         rotateY: 10,
//                                         transition: { duration: 0.4 }
//                                     }}
//                                     className="w-full h-full bg-[#121212] rounded-[2.5rem] p-2 shadow-[30px_20px_60px_-15px_rgba(0,0,0,0.7)] border-[6px] border-[#1f1f1f] ring-1 ring-white/20 relative cursor-pointer"
//                                     style={{ transformStyle: 'preserve-3d' }}
//                                 >
//                                     <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-50 pointer-events-none border border-gray-800/50 shadow-md"></div>
//                                     <div className="w-full h-full rounded-[2.0rem] overflow-hidden relative bg-black shadow-inner"><MockPhoneScreen activeField={activeField} /></div>
//                                     <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none z-50"></div>
//                                 </motion.div>

//                                 <motion.div
//                                     initial={{ opacity: 0, scale: 0.5 }}
//                                     animate={{ opacity: 0.4, scale: 1 }}
//                                     transition={{ duration: 1.5, delay: 0.2 }}
//                                     className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-40 h-10 bg-black/40 blur-2xl rounded-full"
//                                 />
//                             </div>

//                             {/* 2. THE 3D CHARACTER */}
//                             <motion.img
//                                 src={ManCharacter3D}
//                                 alt="Presenter"
//                                 initial={{ opacity: 0, x: 50 }}
//                                 animate={{ opacity: 1, x: 0 }}
//                                 transition={{
//                                     opacity: { delay: 0.8, duration: 0.8 },
//                                     x: { delay: 0.8, duration: 0.8, type: "spring", damping: 20 }
//                                 }}
//                                 className="absolute -right-8 lg:-right-16 xl:-right-28 bottom-0 h-[85%] lg:h-[95%] object-contain z-20 pointer-events-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
//                             />

//                             {/* 3. Shadow/Glow at the bottom */}
//                             <motion.div
//                                 initial={{ opacity: 0, scale: 0.5 }}
//                                 animate={{ opacity: 0.4, scale: 1 }}
//                                 transition={{ duration: 1.5, delay: 0.2 }}
//                                 className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-[220px] lg:w-[450px] h-12 lg:h-16 bg-blue-900/30 blur-2xl lg:blur-3xl rounded-full z-0"
//                             />
//                         </div>
//                     </div>
//                 </div>

//                 {/* RIGHT SIDE: Form Only */}
//                 {/* CHANGED: 'lg:w-[45%]' to accommodate the 1024px visibility */}
//                 <div className={`w-full lg:w-[45%] xl:w-[40%] bg-[#F8FAFC] relative z-20 shadow-2xl flex flex-col transition-all duration-500 ease-in-out min-h-screen lg:min-h-0 ${isScrolled ? 'lg:rounded-none' : 'lg:rounded-l-[4rem]'}`}>
//                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

//                     {/* CHANGED: 
//                         1. removed 'justify-center' 
//                         2. added 'justify-start pt-28' for mobile (pushes it down but keeps it top-anchored)
//                         3. added 'lg:justify-center lg:pt-0' for desktop (restores centering) 
//                     */}
//                     <div className="flex flex-col justify-start pt-28 lg:pt-0 lg:justify-center items-center p-6 lg:p-10 w-full h-full">
//                         <div className="w-full max-w-xs sm:max-w-sm relative z-10">
//                             <div className="mb-8 flex justify-center lg:justify-start">
//                                 <motion.img
//                                     initial={{ y: -10, opacity: 0 }}
//                                     animate={{ y: 0, opacity: 1 }}
//                                     src={IARELogo}
//                                     alt="IARE"
//                                     className="h-16 md:h-24 w-auto drop-shadow-xl"
//                                 />
//                             </div>

//                             <div className="mb-6 text-center lg:text-left">
//                                 <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-1 tracking-tight">Sign In</h1>
//                                 <p className="text-xs md:text-sm text-gray-500 font-medium">Enter your credentials to continue.</p>
//                             </div>

//                             <form onSubmit={handleLogin} className="space-y-4">
//                                 <div className="space-y-1">
//                                     <label className="text-xs font-bold text-gray-500 ml-3 uppercase tracking-wider">Username</label>
//                                     <div className="relative group">
//                                         <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
//                                         <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onFocus={() => setActiveField('username')} onBlur={() => setActiveField(null)} className="w-full bg-white border-2 border-gray-100 rounded-full py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:shadow-lg transition-all outline-none" placeholder="Enter Username" />
//                                     </div>
//                                 </div>

//                                 <div className="space-y-1">
//                                     <label className="text-xs font-bold text-gray-500 ml-3 uppercase tracking-wider">Password</label>
//                                     <div className="relative group">
//                                         <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setActiveField('password')} onBlur={() => setActiveField(null)} onPaste={(e) => { e.preventDefault(); return false; }} onCopy={(e) => { e.preventDefault(); return false; }} className="w-full bg-white border-2 border-gray-100 rounded-full py-3 pl-4 pr-10 text-sm font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-600 focus:shadow-lg transition-all outline-none" placeholder="••••••••" />
//                                         <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors">{showPassword ? <Unlock size={18} /> : <Lock size={18} />}</button>
//                                     </div>
//                                 </div>

//                                 <AnimatePresence>
//                                     {error && (
//                                         <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-red-500 text-xs font-bold bg-red-50 px-4 py-2 rounded-lg text-center border border-red-100">{error}</motion.div>
//                                     )}
//                                 </AnimatePresence>

//                                 <div className="flex justify-end px-1">
//                                     <button type="button" onClick={() => setShowForgotModal(true)} className="text-xs font-bold text-blue-600 hover:text-indigo-600 transition-colors">Forgot password?</button>
//                                 </div>

//                                 <motion.button whileHover={{ scale: 1.01, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" }} whileTap={{ scale: 0.98 }} type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-base font-bold py-3 rounded-full shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
//                                     {isLoading ? <><Loader2 className="animate-spin" size={18} /><span>Verifying...</span></> : <><span>Sign In</span><LogIn size={18} /></>}
//                                 </motion.button>
//                             </form>

//                             <div className="mt-8 flex justify-center">
//                                 <motion.div
//                                     onClick={scrollToTeam}
//                                     className="flex flex-col items-center cursor-pointer group p-2"
//                                     whileHover={{ y: 5 }}
//                                 >
//                                     <span className="text-xs font-black text-gray-900 group-hover:text-blue-600 transition-colors tracking-[0.15em] uppercase mb-1">
//                                         View Contributors
//                                     </span>
//                                     <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-blue-600 animate-bounce" />
//                                 </motion.div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* SECTION 2: MEET THE TEAM */}
//             <div id="meet-team" className="w-full bg-[#F8FAFC] py-16 px-6 border-t border-gray-200 flex items-center justify-center min-h-auto lg:min-h-[80vh]">
//                 <div className="max-w-7xl w-full">
//                     <div className="text-center mb-10">
//                         <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Built &amp; Maintained By</h2>
//                         <div className="h-1.5 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full mt-3"></div>
//                     </div>

//                     <div className="flex flex-col gap-10 items-center">
//                         <div className="w-full max-w-[350px]"><DeveloperCard dev={teamMentor} isMentor={true} /></div>

//                         <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full place-items-center items-stretch">
//                             {teamDevelopers.map((dev, index) => (
//                                 <DeveloperCard key={index} dev={dev} />
//                             ))}
//                         </div>
//                     </div>
//                 </div>
//             </div>

//         </div>
//     );
// };

// export default LoginPage;