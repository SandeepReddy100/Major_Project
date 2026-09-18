import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Trophy, Code, Database, Clock, Calendar,
    ClipboardCheck, UserCog, BookOpen, Download, AlertTriangle, Sparkles
} from 'lucide-react';
import Header from '../../components/Header';
import Loader from '../../components/Loader'; // Import the custom Loader
import { useAuth } from '../../context/AuthContext'; 

// --- ASSET IMPORTS ---
// Fixed paths and filenames
import leetcodeLogo from '../../assets/leetcode.webp';
import gfgLogo from '../../assets/gfg.png';       
import codechefLogo from '../../assets/codechef.png'; 
import githubLogo from '../../assets/github.png';     

// Fallback helper
const getLogo = (importName, fallbackUrl) => importName || fallbackUrl;

// --- CONFIGURATION ---
const backendUrl = import.meta.env.VITE_BASE_URL;

const platformLogos = {
    LeetCode: getLogo(leetcodeLogo, "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png"),
    GeeksforGeeks: getLogo(gfgLogo, "https://upload.wikimedia.org/wikipedia/commons/4/43/GeeksforGeeks.svg"),
    CodeChef: getLogo(codechefLogo, "https://cdn.iconscout.com/icon/free/png-256/free-codechef-3628685-3029910.png"),
    GitHub: getLogo(githubLogo, "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png")
};

// --- UTILITY HELPERS ---

const getCourseIcon = (subject) => {
    const sub = subject ? subject.toUpperCase() : "";
    if (sub.includes("JFS") || sub.includes("JAVA")) return <Code className="w-5 h-5 text-orange-400" />;
    if (sub.includes("CP") || sub.includes("COMPETITIVE") || sub.includes("MACHINE")) return <Code className="w-5 h-5 text-blue-400" />;
    if (sub.includes("DBMS") || sub.includes("SQL") || sub.includes("DATA")) return <Database className="w-5 h-5 text-green-400" />;
    return <BookOpen className="w-5 h-5 text-gray-400" />;
};

// --- LEADERBOARD HELPERS ---

const getRankBadge = (rank) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-300 to-amber-400 border-yellow-500 shadow-yellow-200/50";
    if (rank === 2) return "bg-gradient-to-br from-gray-300 to-slate-400 border-gray-500 shadow-gray-200/50";
    if (rank === 3) return "bg-gradient-to-br from-orange-300 to-amber-400 border-orange-500 shadow-orange-200/50";
    return "bg-gray-100 border-gray-300";
};

const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-700" />;
    if (rank === 2) return <Trophy className="w-6 h-6 text-slate-700" />;
    if (rank === 3) return <Trophy className="w-6 h-6 text-orange-800" />;
    return null;
};

const AnimatedNumber = ({ value, duration = 1500 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime = null;
        const animation = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const nextValue = Math.floor(progress * value);
            setDisplayValue(nextValue);
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };
        requestAnimationFrame(animation);
    }, [value, duration]);

    return <span>{displayValue}</span>;
};

// --- TOP CODER CARD COMPONENT ---
const TopCoderCard = ({ coder, index, animate }) => (
    <div key={index} 
         className={`${getRankBadge(coder.rank)} relative overflow-hidden rounded-3xl p-6 flex flex-col justify-between transition-all duration-700 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 min-h-[180px] ${animate ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`} 
         style={{ transitionDelay: `${index * 150}ms` }}>
        
        {/* Shine Effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex-1 pr-2">
                <h3 className="font-bold text-lg text-gray-900 flex items-center tracking-wide">
                    {coder.name} 
                </h3>
            </div>
            {/* Rank Circle */}
            <div className="flex items-center justify-center w-10 h-10 bg-white/40 backdrop-blur-md rounded-full shadow-lg border border-white/30">
                <span className="font-black text-gray-800 text-lg">
                   #{coder.rank}
                </span>
            </div>
        </div>

        {/* Scores Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
            {coder.scores.leetcode > 0 && (
                <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-xl border border-white/20 shadow-sm transition-transform hover:scale-105">
                    <img src={platformLogos.LeetCode} alt="LC" className="w-5 h-5 object-contain" />
                    <span className="text-xs font-bold text-gray-800">{coder.scores.leetcode}</span>
                </div>
            )}
            {coder.scores.gfg > 0 && (
                <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-xl border border-white/20 shadow-sm transition-transform hover:scale-105">
                    <img src={platformLogos.GeeksforGeeks} alt="GFG" className="w-5 h-5 object-contain" />
                    <span className="text-xs font-bold text-gray-800">{coder.scores.gfg}</span>
                </div>
            )}
            {coder.scores.codechef > 0 && (
                 <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-xl border border-white/20 shadow-sm transition-transform hover:scale-105">
                    <img src={platformLogos.CodeChef} alt="CC" className="w-5 h-5 object-contain" />
                    <span className="text-xs font-bold text-gray-800">{coder.scores.codechef}</span>
                </div>
            )}
            {coder.scores.github > 0 && (
                 <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-xl border border-white/20 shadow-sm transition-transform hover:scale-105">
                    <img src={platformLogos.GitHub} alt="GH" className="w-5 h-5 object-contain opacity-80" />
                    <span className="text-xs font-bold text-gray-800">{coder.scores.github}</span>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-black/5 flex justify-between items-center relative z-10">
             <div className="flex items-center space-x-2 text-gray-700">
                {getRankIcon(coder.rank)}
                <span className="text-xs font-bold uppercase tracking-widest text-gray-800/70">Total Score</span>
             </div>
             <span className="font-black text-2xl text-gray-900">
                {animate ? <AnimatedNumber value={coder.totalScore} /> : 0}
            </span>
        </div>
    </div>
);

// --- FACULTY DASHBOARD COMPONENT ---
const FacultyDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        const fetchDashboardData = async () => {
            try {
                const response = await fetch(`${backendUrl}/api/faculty/get-dashboard-data`, {
                    method: "GET",
                    credentials: "include"
                });

                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }

                if (!response.ok) throw new Error("Failed to fetch dashboard data");

                const data = await response.json();
                setDashboardData(data);

                setTimeout(() => {
                    setLoading(false);
                    setAnimate(true);
                }, 800); // Slight delay to show off the loader animation

            } catch (err) {
                console.error("Dashboard fetch error:", err);
                setLoading(false); 
            }
        };

        fetchDashboardData();
    }, [user, navigate, logout]);

    const getTopCoders = useMemo(() => {
        if (!dashboardData?.topCoders) return [];
        return dashboardData.topCoders.map((student, index) => ({
            rank: index + 1,
            name: student.rollno, 
            totalScore: student.totalScore,
            scores: {
                gfg: student.scores?.gfg || 0,
                leetcode: student.scores?.leetcode || 0,
                codechef: student.scores?.codechef || 0,
                github: student.scores?.github || 0
            }
        }));
    }, [dashboardData]);

    const todaysSchedule = useMemo(() => {
        if (!dashboardData?.todayClasses) return [];
        const classes = dashboardData.todayClasses.map(cls => ({
            time: `${cls.startTime} - ${cls.endTime}`,
            subject: cls.subject,
            room: cls.roomNo,
            batch: cls.batch,
            sem: cls.sem,
            session: cls.session,
            icon: getCourseIcon(cls.subject)
        }));
        return classes.sort((a, b) => a.time.localeCompare(b.time));
    }, [dashboardData]);

    if (!user) return null;

    // Use Custom Loader Here
    if (loading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen text-gray-800 font-sans bg-gradient-to-br from-[#F0F2F5] to-[#E5E7EB] overflow-x-hidden">
            
            {/* Header Section */}
            <div className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-b-[3rem] relative overflow-hidden pb-8">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
                </div>
                <div className="px-4 sm:px-6 lg:px-8 relative z-10">
                    <Header animate={animate} />
                    
                    <div className="space-y-8 mt-6">
                        
                        {/* Today's Schedule */}
                        <div className={`transform transition-all duration-1000 delay-300 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center"><Calendar className="w-5 h-5 mr-3" />Today's Schedule</h2>
                            
                            {todaysSchedule.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {todaysSchedule.map((classInfo, idx) => (
                                        <div key={idx} className="bg-white/5 backdrop-blur-xl rounded-xl p-5 shadow-2xl border border-white/10 cursor-pointer transform transition-all duration-300 hover:shadow-lg hover:bg-black/30 hover:-translate-y-1">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="font-bold text-base mb-1 text-white truncate max-w-[180px]" title={classInfo.subject}>
                                                        {classInfo.subject}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-mono">
                                                            {classInfo.batch}
                                                        </span>
                                                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                                                            SEM {classInfo.sem}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 border border-white/5">
                                                    {classInfo.icon}
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-300 space-y-2 mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                                                <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-md">
                                                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                                                    <span className="text-xs font-mono">{classInfo.time}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span className="text-xs font-bold">{classInfo.room}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center text-gray-400 bg-white/5 backdrop-blur-xl rounded-2xl p-10 shadow-lg border border-white/10 border-dashed">
                                    <Clock className="w-10 h-10 mb-2 opacity-50" />
                                    <p>No classes scheduled for today.</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Options */}
                        <div className={`transform transition-all duration-1000 delay-500 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                            <h2 className="text-xl font-bold text-white mb-4">Quick Options</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                <div onClick={() => navigate('/faculty/action')} className="bg-gradient-to-br from-blue-100 via-blue-50 to-purple-50 rounded-2xl p-5 text-gray-800 shadow-lg transition-all hover:-translate-y-1 hover:scale-105 flex flex-col border border-white/20 relative cursor-pointer overflow-hidden group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-sm leading-tight pr-2">Post Attendance</h3>
                                        <div className="w-9 h-9 bg-white/30 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transform group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"><ClipboardCheck className="w-5 h-5 text-blue-600" /></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-auto">Mark student attendance for classes.</p>
                                </div>
                                <div onClick={() => navigate('/batch-report')} className="bg-gradient-to-br from-green-100 via-green-50 to-teal-50 rounded-2xl p-5 text-gray-800 shadow-lg transition-all hover:-translate-y-1 hover:scale-105 flex flex-col border border-white/20 relative cursor-pointer overflow-hidden group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-sm leading-tight pr-2">Download Reports</h3>
                                        <div className="w-9 h-9 bg-white/30 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transform group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"><Download className="w-5 h-5 text-green-600" /></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-auto">Download performance reports.</p>
                                </div>
                                <div onClick={() => navigate('/faculty/update-student')} className="bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-50 rounded-2xl p-5 text-gray-800 shadow-lg transition-all hover:-translate-y-1 hover:scale-105 flex flex-col border border-white/20 relative cursor-pointer overflow-hidden group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-sm leading-tight pr-2">Update Student</h3>
                                        <div className="w-9 h-9 bg-white/30 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transform group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"><UserCog className="w-5 h-5 text-purple-600" /></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-auto">Modify student details or scores.</p>
                                </div>
                                <div onClick={() => navigate('/at-risk-students')} className="bg-gradient-to-br from-red-100 via-red-50 to-orange-50 rounded-2xl p-5 text-gray-800 shadow-lg transition-all hover:-translate-y-1 hover:scale-105 flex flex-col border border-white/20 relative cursor-pointer overflow-hidden group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-sm leading-tight pr-2">At-Risk Students</h3>
                                        <div className="w-9 h-9 bg-white/30 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transform group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-auto">Identify students requiring attendance intervention.</p>
                                </div>
                                <div onClick={() => navigate('/ai-assistant')} className="bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-50 rounded-2xl p-5 text-gray-800 shadow-lg transition-all hover:-translate-y-1 hover:scale-105 flex flex-col border border-white/20 relative cursor-pointer overflow-hidden group">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-sm leading-tight pr-2">AI Faculty Assistant</h3>
                                        <div className="w-9 h-9 bg-white/30 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transform group-hover:rotate-12 transition-transform duration-300 flex-shrink-0"><Sparkles className="w-5 h-5 text-emerald-600" /></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-auto">Ask questions about attendance, risk, and trends.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content: Leaderboard */}
            <main className="px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                <div className={`transform transition-all duration-1000 delay-700 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/50 h-full relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 via-transparent to-purple-50/50"></div>
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-10 relative z-10 gap-4">
                            <h2 className="text-2xl sm:text-3xl font-bold text-[#071225] flex items-center">
                                <Trophy className="w-7 h-7 sm:w-8 sm-h-8 mr-3 text-yellow-600" />
                                Top Coders
                            </h2>
                            <div className="text-sm text-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 rounded-full shadow-lg font-semibold flex-shrink-0 border border-gray-200">
                                🏆 Leaderboard
                            </div>
                        </div>

                        {getTopCoders.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                {getTopCoders.map((coder, index) => (
                                    <TopCoderCard key={index} coder={coder} index={index} animate={animate} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 flex flex-col items-center justify-center text-gray-500">
                                <Trophy className="w-12 h-12 text-gray-300 mb-2" />
                                <p className="text-lg">No coding data available for the leaderboard.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FacultyDashboard;

