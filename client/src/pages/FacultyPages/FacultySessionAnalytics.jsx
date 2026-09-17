import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Users, UserX, CheckCircle, Trophy, Layers, 
    Clock, RefreshCw, Copy, Zap, Search, 
    TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight,
    Activity, Signal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/Header'; 

const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const FacultySessionAnalytics = () => {
    const { sessionCode } = useParams();
    const navigate = useNavigate();
    
    // UI & Data State
    const [animate, setAnimate] = useState(false);
    const [activeTab, setActiveTab] = useState('leaderboard'); 
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Position Tracking for Live Movement
    const prevLeaderboardRef = useRef([]);

    useEffect(() => {
        setAnimate(true);
        fetchAnalytics();
        
        // Strict 25-second polling interval
        const interval = setInterval(() => {
            fetchAnalytics(true);
        }, 25000); 
        
        return () => clearInterval(interval);
    }, [sessionCode]);

    const fetchAnalytics = async (silent = false) => {
        if (!silent) setLoading(true);
        else setIsRefreshing(true);

        try {
            const res = await fetch(`${API_URL}/api/faculty/quiz/session/${sessionCode}/analytics`, { 
                credentials: 'include' 
            });
            const result = await res.json();
            
            if (result.success) {
                // Save current order to calculate movements on the next refresh
                prevLeaderboardRef.current = data?.liveLeaderboard || [];
                setData(result);
            } else {
                setError(result.message || "Assessment telemetry offline.");
            }
        } catch (e) {
            setError("Failed to establish a secure link to the analytics engine.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(sessionCode);
    };

    // Derived Statistics with Safety Fallbacks
    const stats = {
        joined: data?.countJoined || 0,
        expected: data?.totalExpected || 0,
        finished: data?.countFinished || 0,
        absentCount: data?.countNotJoined || 0,
        percentage: data?.totalExpected > 0 ? Math.round((data.countJoined / data.totalExpected) * 100) : 0,
        leaderboard: data?.liveLeaderboard || [],
        participants: data?.participants || [],
        absentList: data?.absentStudents || []
    };

    if (loading && !data) return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <RefreshCw size={32} className="text-blue-500" />
            </motion.div>
            <p className="text-slate-500 font-bold tracking-[0.3em] uppercase text-[10px] mt-6 animate-pulse">Syncing Insights...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
            
            {/* --- TOP HEADER & HERO --- */}
            <div className="bg-[#0F172A] pb-40 pt-6 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -mr-40 -mt-40"></div>
                
                <div className="max-w-[95rem] mx-auto px-6 relative z-10">
                    {/* Your Existing Header Component */}
                    <Header animate={animate} />

                    <div className="mt-12 flex flex-col xl:flex-row items-end justify-between gap-10">
                        <div className="w-full xl:w-auto">
                            <button onClick={() => navigate('/faculty/sessions')} className="flex items-center gap-2 text-slate-500 hover:text-white mb-6 transition-colors font-black text-[10px] uppercase tracking-widest">
                                <ArrowLeft size={14}/> Back to sessions
                            </button>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-4">
                                Session <span className="text-blue-500">Insights.</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <div onClick={copyToClipboard} className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all">
                                    <Zap size={14} className="text-amber-500" />
                                    <span className="text-white font-mono text-xs font-bold tracking-widest">{sessionCode}</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
                                    <Layers size={14} className="text-blue-500" />
                                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{data?.targetBatches || "All Batches"}</span>
                                </div>
                            </div>
                        </div>

                        {/* LIVE METRIC CARDS */}
                        <div className="flex gap-4 w-full xl:w-auto">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] flex-1 xl:flex-none min-w-[180px]">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Participation</p>
                                    <Activity size={14} className="text-blue-500" />
                                </div>
                                <div className="flex items-end gap-2 mb-3">
                                    <h3 className="text-3xl font-black text-white">{stats.joined}</h3>
                                    <span className="text-xs font-bold text-slate-600 mb-1">/ {stats.expected}</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${stats.percentage}%` }} className="h-full bg-blue-500" />
                                </div>
                            </div>
                            
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] flex-1 xl:flex-none min-w-[180px]">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completed</p>
                                    <CheckCircle size={14} className="text-emerald-500" />
                                </div>
                                <h3 className="text-3xl font-black text-white">{stats.finished}</h3>
                                <p className="text-[10px] text-slate-600 font-bold mt-2 uppercase tracking-widest">Evaluations Ready</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DATA CORE --- */}
            <main className="max-w-[95rem] mx-auto px-6 -mt-20 relative z-20">
                <div className="bg-white rounded-[3.5rem] p-8 lg:p-12 shadow-2xl border border-slate-200">
                    
                    {/* TAB NAVIGATION & SEARCH */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
                        <div className="flex p-1.5 bg-slate-100 rounded-3xl w-full sm:w-auto">
                            {[
                                { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, color: 'text-amber-500' },
                                { id: 'participants', label: 'All Participants', icon: Users, color: 'text-blue-500' },
                                { id: 'absent', label: 'Absent', icon: UserX, color: 'text-rose-500' }
                            ].map((tab) => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)} 
                                    className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 flex-1 sm:flex-none
                                        ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    <tab.icon size={16} className={activeTab === tab.id ? tab.color : 'text-gray-400'}/>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="relative w-full sm:w-72 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="Filter results..." 
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500/10 transition-all" 
                            />
                        </div>
                    </div>

                    {/* STRUCTURED TABLE ENGINE */}
                    <div className="min-h-[500px]">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="overflow-x-auto"
                            >
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-8">
                                            {activeTab === 'leaderboard' && (
                                                <>
                                                    <th className="px-8 py-4">Rank</th>
                                                    <th className="px-8 py-4">Student ID</th>
                                                    <th className="px-8 py-4">Momentum</th>
                                                    <th className="px-8 py-4 text-right">Points</th>
                                                </>
                                            )}
                                            {activeTab === 'participants' && (
                                                <>
                                                    <th className="px-8 py-4">Participant</th>
                                                    <th className="px-8 py-4">Session State</th>
                                                    <th className="px-8 py-4">Join Time</th>
                                                    <th className="px-8 py-4 text-right">Score</th>
                                                </>
                                            )}
                                            {activeTab === 'absent' && (
                                                <>
                                                    <th className="px-8 py-4">Candidate Name</th>
                                                    <th className="px-8 py-4">Roll Number</th>
                                                    <th className="px-8 py-4 text-right">Assigned Batch</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* --- 1. LEADERBOARD (UPDATED FOR SORTING & SLIDING) --- */}
                                        {activeTab === 'leaderboard' && [...stats.leaderboard]
                                            .sort((a, b) => b.score - a.score) // Sort highest to lowest
                                            .map((entry, idx) => {
                                                const prevIdx = prevLeaderboardRef.current.findIndex(p => p.value === entry.value);
                                                const delta = prevIdx === -1 ? 0 : prevIdx - idx;
                                                return (
                                                    <motion.tr 
                                                        layout // <--- Enables Slide Up/Down Animation
                                                        transition={{ type: "spring", stiffness: 45, damping: 15 }} // Smooth movement
                                                        key={entry.value} 
                                                        className="bg-slate-50/50 hover:bg-blue-50/50 transition-colors group"
                                                    >
                                                        <td className="px-8 py-6 rounded-l-3xl">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm 
                                                                ${idx === 0 ? 'bg-amber-100 text-amber-600 shadow-sm border border-amber-200' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                                                {idx + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 font-black text-slate-800 tracking-tight uppercase">{entry.value}</td>
                                                        <td className="px-8 py-6">
                                                            {delta > 0 ? (
                                                                <span className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase">
                                                                    <ArrowUpRight size={14}/> +{delta} ranks
                                                                </span>
                                                            ) : delta < 0 ? (
                                                                <span className="flex items-center gap-1.5 text-rose-500 font-black text-[10px] uppercase">
                                                                    <ArrowDownRight size={14}/> {Math.abs(delta)} ranks
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1.5 text-slate-300 font-black text-[10px] uppercase">
                                                                    <Minus size={14}/> Steady
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-right rounded-r-3xl">
                                                            <span className="text-2xl font-black text-blue-600 tabular-nums">{entry.score}</span>
                                                        </td>
                                                    </motion.tr>
                                                );
                                        })}

                                        {/* --- 2. PARTICIPANTS --- */}
                                        {activeTab === 'participants' && stats.participants.map((p, idx) => (
                                            <tr key={idx} className="bg-slate-50/50 hover:bg-slate-100 transition-colors group">
                                                <td className="px-8 py-6 rounded-l-3xl">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">{p.name?.charAt(0)}</div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 leading-tight">{p.name}</p>
                                                            <p className="text-[10px] font-black font-mono text-slate-400 mt-1 uppercase">{p.rollno}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex w-fit items-center gap-2 
                                                        ${p.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-xs font-bold font-mono text-slate-400 uppercase">
                                                    {p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </td>
                                                <td className="px-8 py-6 text-right rounded-r-3xl font-black text-slate-900 text-lg">{p.score}</td>
                                            </tr>
                                        ))}

                                        {/* --- 3. ABSENT --- */}
                                        {activeTab === 'absent' && stats.absentList.map((st, idx) => (
                                            <tr key={idx} className="bg-rose-50/30 hover:bg-rose-50/60 transition-colors group">
                                                <td className="px-8 py-6 rounded-l-3xl">
                                                    <p className="font-bold text-slate-900 leading-tight">{st.name}</p>
                                                </td>
                                                <td className="px-8 py-6 font-mono text-xs text-rose-500 font-bold tracking-widest uppercase">{st.rollno}</td>
                                                <td className="px-8 py-6 text-right rounded-r-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest">{st.batch}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                {/* EMPTY STATE LOGIC */}
                                {((activeTab === 'leaderboard' && stats.leaderboard.length === 0) || 
                                  (activeTab === 'absent' && stats.absentList.length === 0)) && (
                                    <div className="py-32 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 mt-4">
                                        <Signal size={48} className="text-slate-200 mx-auto mb-6" />
                                        <h3 className="text-slate-400 font-black text-sm uppercase tracking-[0.2em]">No Data Transmission Recorded</h3>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* SYNC NOTIFICATION (FLOATING) */}
            <AnimatePresence>
                {isRefreshing && (
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-10 right-10 bg-[#0F172A] text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10 z-[100]">
                        <RefreshCw size={14} className="animate-spin text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Telemetry Link Synchronizing</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FacultySessionAnalytics;