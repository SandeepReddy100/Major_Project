import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { BookOpen, Database, Cloud, Code, Coffee, AlertCircle, User, Clock, CalendarDays } from 'lucide-react';
import api from '../../api/axiosConfig'; 
import BarChart from '../../components/BarChart';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 
import Loader from '../../components/Loader';

// --- ASSET IMPORTS ---
import leetcodeLogo from '../../assets/leetcode.webp';
import gfgLogo from '../../assets/gfg.png'; 
import codechefLogo from '../../assets/codechef.png'; 
import githubLogo from '../../assets/github.png'; 

const getLogo = (importName, fallbackUrl) => importName || fallbackUrl;

// --- CONFIGURATION ---
const platformLogos = {
    LeetCode: getLogo(leetcodeLogo, "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png"),
    GeeksforGeeks: getLogo(gfgLogo, "https://upload.wikimedia.org/wikipedia/commons/4/43/GeeksforGeeks.svg"),
    CodeChef: getLogo(codechefLogo, "https://cdn.iconscout.com/icon/free/png-256/free-codechef-3628685-3029910.png"),
    GitHub: getLogo(githubLogo, "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png")
};

const defaultThemes = [
    { bg: "bg-gradient-to-br from-indigo-100 via-indigo-50 to-purple-50", progress: "bg-gradient-to-r from-indigo-600 to-purple-600" },
    { bg: "bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-50", progress: "bg-gradient-to-r from-emerald-600 to-teal-600" },
    { bg: "bg-gradient-to-br from-rose-100 via-rose-50 to-pink-50", progress: "bg-gradient-to-r from-rose-600 to-pink-600" },
    { bg: "bg-gradient-to-br from-amber-100 via-amber-50 to-orange-50", progress: "bg-gradient-to-r from-amber-600 to-orange-600" },
];

const knownCourses = {
    'CP': {
        title: "Competitive Programming",
        icon: <Code className="w-6 h-6 text-blue-700" />,
        bgColor: "bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-50",
        progressColor: "bg-gradient-to-r from-blue-600 to-indigo-600"
    },
    'JFS': {
        title: "Java Full Stack",
        icon: <Coffee className="w-6 h-6 text-orange-700" />,
        bgColor: "bg-gradient-to-br from-orange-100 via-orange-50 to-red-50",
        progressColor: "bg-gradient-to-r from-orange-600 to-red-600"
    },
    'DBS': {
        title: "Database Solutions",
        icon: <Database className="w-6 h-6 text-emerald-700" />,
        bgColor: "bg-gradient-to-br from-emerald-100 via-emerald-50 to-green-50",
        progressColor: "bg-gradient-to-r from-emerald-600 to-green-600"
    },
     'DBMS': {
        title: "Database Management System",
        icon: <Database className="w-6 h-6 text-emerald-700" />,
        bgColor: "bg-gradient-to-br from-emerald-100 via-emerald-50 to-green-50",
        progressColor: "bg-gradient-to-r from-emerald-600 to-green-600"
    },
    'AWS': {
        title: "Amazon Web Services",
        icon: <Cloud className="w-6 h-6 text-yellow-700" />,
        bgColor: "bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-50",
        progressColor: "bg-gradient-to-r from-yellow-500 to-orange-500"
    }
};

const maxCodingScores = { LeetCode: 6000, CodeChef: 2500, GeeksforGeeks: 3000, GitHub: 1500 };

// --- HELPER FUNCTIONS ---
const getRankBadge = (rank) => {
    if (rank === 1) return "bg-gradient-to-br from-yellow-300 to-amber-400 shadow-yellow-200/50";
    if (rank === 2) return "bg-gradient-to-br from-gray-300 to-slate-400 shadow-gray-200/50";
    if (rank === 3) return "bg-gradient-to-br from-orange-300 to-amber-400 shadow-orange-200/50";
    return "bg-gray-100";
};

// --- SUB-COMPONENTS ---

const DonutChart = memo(({ percentage, presentColor, absentColor }) => {
    const size = 90; 
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const validPercentage = isNaN(percentage) ? 0 : percentage;
    const strokeDashoffset = circumference - (validPercentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
            <svg className="transform -rotate-90 relative z-10" width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={radius} stroke={absentColor} strokeWidth={strokeWidth} fill="transparent" className="opacity-40" />
                <circle cx={size / 2} cy={size / 2} r={radius} stroke={presentColor} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <span className="text-lg font-black text-white drop-shadow-lg">{validPercentage}%</span>
            </div>
        </div>
    );
});

const CourseCard = memo(({ course }) => {
    return (
        <div className={`${course.bgColor} rounded-[2rem] p-5 text-gray-800 shadow-xl flex flex-col border border-white/20 relative overflow-hidden group hover:shadow-2xl transition-shadow duration-300 min-h-[140px] justify-between w-full`}>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-1000"></div>
            
            <div className="w-full min-w-0">
                <div className="flex items-start justify-between mb-2 relative z-10">
                    <div className="min-w-0 pr-2 flex-1">
                        <h3 className="font-bold text-lg leading-tight line-clamp-2 break-words" title={course.title}>
                            {course.title}
                        </h3>
                    </div>
                    <div className="w-10 h-10 bg-white/40 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm flex-shrink-0 ml-1">
                        {course.icon}
                    </div>
                </div>
                <div className="mb-2 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                        <span>Present: {course.present}</span>
                        <span>Absent: {course.totalDays - course.present}</span>
                    </div>
                </div>
            </div>
            
            <div className="mt-1 w-full">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 bg-black/10 rounded-full h-2.5 shadow-inner">
                        <div className={`h-2.5 rounded-full ${course.progressColor} shadow-md relative overflow-hidden`} style={{ width: `${course.progress}%` }}></div>
                    </div>
                    <p className="text-base font-bold bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent min-w-[30px] text-right flex-shrink-0">
                        {course.progress}%
                    </p>
                </div>
            </div>
        </div>
    );
});

const TopCoderCard = memo(({ coder }) => (
    <div className={`${getRankBadge(coder.rank)} relative overflow-hidden rounded-[2rem] p-6 flex flex-col justify-between hover:shadow-2xl transition-shadow duration-300 min-h-[180px]`}>
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="flex-1 pr-4 min-w-0">
                <h3 className="font-bold text-lg text-gray-900 flex items-center tracking-wide truncate">{coder.name}</h3>
            </div>
            <div className="flex items-center justify-center w-8 h-8 bg-white/40 backdrop-blur-md rounded-full shadow-lg border border-white/30 flex-shrink-0">
                <span className="font-black text-gray-800 text-base">#{coder.rank}</span>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
            {[
                { img: platformLogos.LeetCode, val: coder.scores?.leetcode },
                { img: platformLogos.GeeksforGeeks, val: coder.scores?.gfg },
                { img: platformLogos.CodeChef, val: coder.scores?.codechef },
                { img: platformLogos.GitHub, val: coder.scores?.github }
            ].map((item, i) => (
                <div key={i} className="flex items-center space-x-2 bg-white/50 px-2 py-1 rounded-lg border border-white/20 shadow-sm">
                    <img src={item.img} alt="Platform" className="w-4 h-4 object-contain flex-shrink-0" />
                    <span className="text-xs font-bold text-gray-800 truncate">
                        {item.val ?? 0}
                    </span>
                </div>
            ))}
        </div>

        <div className="mt-auto pt-2 border-t border-black/5 flex justify-between items-center relative z-10">
             <div className="flex items-center space-x-2 text-gray-700">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-800/70">Score</span>
            </div>
             <span className="font-black text-xl text-gray-900">{coder.totalScore}</span>
        </div>
    </div>
));

const EmptyState = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <div className="bg-gray-100 p-3 rounded-full mb-3"><AlertCircle className="w-6 h-6 text-gray-400" /></div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">{title} Unavailable</h3>
        <p className="text-gray-500 text-xs max-w-xs mx-auto">Metrics will appear here once you participate.</p>
    </div>
);

const ErrorDisplay = ({ message, onRetry }) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0F2F5] to-[#E5E7EB]">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <div className="bg-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button 
                onClick={onRetry}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
                Try Again
            </button>
        </div>
    </div>
);

// --- MAIN PAGE COMPONENT ---
const StudentDashboardPage = () => {
    const { logout } = useAuth();
    
    // State Management
    const [studentData, setStudentData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- API FETCHING LOGIC (UPDATED WITH 2.5s DELAY) ---
    const fetchStudentData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // 1. Minimum loading time promise (2500ms)
            const minLoadTime = new Promise(resolve => setTimeout(resolve, 1000));

            // 2. Data fetching promise
            const dataFetch = api.get('/api/student/get-dashboard-data');

            // 3. Wait for BOTH to complete
            const [_, response] = await Promise.all([minLoadTime, dataFetch]);

            setStudentData(response.data);

        } catch (err) {
            console.error('Dashboard Error:', err.message);
            // Check for critical auth errors
            if (err.response?.status === 401 || err.response?.status === 403) {
                logout(); 
            } else {
                setError(err.response?.data?.message || "Failed to connect to the server.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [logout]); 

    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    // --- MEMOIZED DATA CALCULATIONS ---

    const overallAttendance = useMemo(() => {
        if (!studentData?.attendance?.overallAttendance) return 0;
        const { totalDays, presentDays } = studentData.attendance.overallAttendance;
        return totalDays === 0 ? 0 : Math.round((presentDays / totalDays) * 100);
    }, [studentData]);

    const getCourseData = useMemo(() => {
        if (!studentData?.attendance?.courseAttendance) return [];
        return Object.entries(studentData.attendance.courseAttendance).slice(0, 4).map(([courseCode, attendance], index) => {
            const safeCode = courseCode ? courseCode.trim() : "Unknown";
            let courseDetails;

            if (knownCourses[safeCode]) {
                const kc = knownCourses[safeCode];
                courseDetails = {
                    title: kc.title,
                    icon: kc.icon,
                    theme: { bg: kc.bgColor, progress: kc.progressColor }
                };
            } else {
                const themeIndex = index % defaultThemes.length;
                courseDetails = {
                    title: safeCode,
                    icon: <BookOpen className="w-6 h-6 text-gray-700" />,
                    theme: defaultThemes[themeIndex]
                };
            }

            return {
                id: courseCode, 
                title: courseDetails.title,
                icon: courseDetails.icon,
                progress: attendance.totalDays > 0 ? Math.round((attendance.presentDays / attendance.totalDays) * 100) : 0,
                present: attendance.presentDays,
                totalDays: attendance.totalDays,
                bgColor: courseDetails.theme.bg,
                progressColor: courseDetails.theme.progress
            };
        });
    }, [studentData]);

    const getCodingScores = useMemo(() => {
        if (!studentData?.codingPerformance?.scores) return [];
        const { scores } = studentData.codingPerformance;
        return [
            { platform: "LeetCode", logo: platformLogos.LeetCode, score: scores.leetcode || 0, maxScore: maxCodingScores.LeetCode },
            { platform: "CodeChef", logo: platformLogos.CodeChef, score: scores.codechef || 0, maxScore: maxCodingScores.CodeChef },
            { platform: "GeeksforGeeks", logo: platformLogos.GeeksforGeeks, score: scores.gfg || 0, maxScore: maxCodingScores.GeeksforGeeks },
            { platform: "GitHub", logo: platformLogos.GitHub, score: scores.github || 0, maxScore: maxCodingScores.GitHub },
        ];
    }, [studentData]);

    const getTopCoders = useMemo(() => {
        if (!studentData?.topCoders) return [];
        return studentData.topCoders.map((student, index) => ({
            rank: index + 1,
            name: student.rollno, 
            id: student.rollno, 
            totalScore: student.totalScore,
            scores: { ...student.scores }
        }));
    }, [studentData]);

   const formattedTodaySchedule = useMemo(() => {
        const rawSchedule = studentData?.todaySchedule || [];
        if (rawSchedule.length === 0) return { hasClass: false };
        const currentSession = rawSchedule[0];
        
        // --- FIX HERE ---
        // Access index 0 safely. If index 0 is null, it stops before trying to read .name
        const facultyName = currentSession.faculty?.[0]?.name || "Unknown Faculty";

        return {
            hasClass: true,
            dateObj: new Date(), 
            classInfo: {
                fullTitle: currentSession.subject || "No Subject",
                faculty: facultyName,
                room: currentSession.roomNo || "N/A",
                time: `${currentSession.startTime} - ${currentSession.endTime}`,
                borderColor: "border-blue-500/30",
                glow: "shadow-blue-500/20",
                textColor: "text-blue-400"
            }
        };
    }, [studentData]);

    const isCodingDataAvailable = useMemo(() => getCodingScores.some(item => item.score >= 0), [getCodingScores]);
    const isLeaderboardAvailable = useMemo(() => getTopCoders.some(student => student.totalScore >= 0), [getTopCoders]);

    // --- RENDER ---

    if (isLoading) return <Loader />;
    if (error) return <ErrorDisplay message={error} onRetry={fetchStudentData} />;
    if (!studentData) return null;

    const qrLink = studentData?.student?.qrLink;

    return (
        <div className="min-h-screen text-gray-800 font-sans bg-gradient-to-br from-[#F0F2F5] to-[#E5E7EB] overflow-x-hidden pb-12">
            {/* --- HEADER WRAPPER --- */}
            <div className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-bl-[2rem] rounded-br-[2rem] sm:rounded-bl-[3rem] sm:rounded-br-[3rem] relative overflow-hidden pb-12 shadow-2xl">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10"></div>
                </div>
                
                <div className="px-6 sm:px-8 lg:px-8 xl:px-12 relative z-50 max-w-[1600px] mx-auto">
                    <Header animate={true} qrCode={qrLink} />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-6"></div>
                    
                    {/* --- ROW 1: Session & Attendance --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
                        {/* Session (9 cols) */}
                        <div className="lg:col-span-9 flex flex-col justify-center">
                            <section className="mb-0 transition-all duration-700">
                                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    Today's Session
                                </h2>
                                
                                {formattedTodaySchedule?.hasClass ? (
                                    <div className={`
                                        relative rounded-[2rem] 
                                        p-6 md:p-6 lg:p-6 
                                        shadow-2xl overflow-hidden border transition-all duration-300
                                        bg-[#0F172A]/80 backdrop-blur-xl ${formattedTodaySchedule.classInfo.borderColor} ${formattedTodaySchedule.classInfo.glow}
                                    `}>
                                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
                                        
                                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                                            <div className="flex items-center gap-5 min-w-0 flex-1">
                                                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 shadow-inner backdrop-blur-md flex-shrink-0">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {formattedTodaySchedule.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </span>
                                                    <span className="text-2xl font-black text-white leading-none mt-0.5">
                                                        {formattedTodaySchedule.dateObj.getDate()}
                                                    </span>
                                                </div>

                                                <div className="min-w-0">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full bg-white/5 font-bold text-[9px] uppercase tracking-widest border border-white/10 mb-1.5 shadow-sm ${formattedTodaySchedule.classInfo.textColor}`}>
                                                        Happening Now
                                                    </span>
                                                    <h3 className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl font-black text-white leading-tight break-words line-clamp-2">
                                                        {formattedTodaySchedule.classInfo.fullTitle}
                                                    </h3>
                                                    <p className={`text-sm sm:text-base mt-1.5 font-medium flex items-center gap-1.5 ${formattedTodaySchedule.classInfo.textColor}`}>
                                                        <User size={16} />
                                                        {formattedTodaySchedule.classInfo.faculty}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-start md:items-end gap-2 bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-md w-full md:w-auto flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <Clock className={`w-5 h-5 ${formattedTodaySchedule.classInfo.textColor}`} />
                                                    <span className="text-xl sm:text-2xl font-bold text-white tracking-tight whitespace-nowrap">
                                                        {formattedTodaySchedule.classInfo.time.split(' - ')[0]}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-300 text-xs font-bold bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                                                    <span>Room {formattedTodaySchedule.classInfo.room}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#0F172A]/40 backdrop-blur-md border border-white/5 p-6 rounded-[2rem] text-center min-h-[160px] flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10">
                                            <CalendarDays className="text-slate-500" size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">No classes today</h3>
                                        <p className="text-slate-500 text-xs mt-1">Take a break and recharge!</p>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Attendance (3 cols) */}
                        <div className="lg:col-span-3 flex flex-col">
                            <div className="h-full mt-8 lg:mt-0 flex flex-col justify-end">
                                <div className="min-h-[160px] bg-[#0F172A]/80 backdrop-blur-xl rounded-[2rem] p-4 shadow-2xl shadow-blue-500/20 border border-blue-500/30 relative overflow-hidden flex flex-col items-center justify-center group h-full">
                                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-blue-600/10 rounded-full blur-[60px] -mr-10 -mt-10 pointer-events-none"></div>
                                    
                                    <div className="relative z-10 mb-2 transition-transform duration-300">
                                        <DonutChart 
                                            percentage={overallAttendance} 
                                            presentColor="#3b82f6" 
                                            absentColor="#1e293b"
                                        />
                                    </div>
                                    <p className="text-blue-200 font-medium text-xs tracking-wide bg-blue-950/40 px-3 py-0.5 rounded-full border border-blue-500/20">Overall Attendance</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- ROW 2: Courses --- */}
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4 text-white">Your Courses</h2>
                        {getCourseData.length > 0 ? (
                            <div className="max-w-md mx-auto sm:max-w-none grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-4 xl:gap-6">
                                {getCourseData.map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="w-full bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-6 flex items-center justify-center border border-white/10 gap-4">
                                <BookOpen className="w-6 h-6 text-white/70" />
                                <p className="text-white text-base font-medium">No active course enrollments found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- BODY SECTION --- */}
            <div className="px-6 sm:px-8 lg:px-8 xl:px-12 py-8 relative z-10 max-w-[1600px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Coding Performance (1 col) */}
                    <div className="lg:col-span-1">
                         <div className="h-full">
                            <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 shadow-2xl border border-white/50 relative overflow-hidden group h-full">
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent group-hover:translate-x-full transition-transform duration-1000"></div>
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <h2 className="text-lg font-bold text-[#071225] flex items-center">Coding Performance</h2>
                                </div>
                                <div className="relative z-10 h-full">
                                    {isCodingDataAvailable ? (
                                        <BarChart data={getCodingScores} />
                                    ) : (
                                        <EmptyState title="Performance" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Coders Leaderboard (2 cols) */}
                    <div className="lg:col-span-2">
                         <div className="h-full">
                            <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 shadow-2xl border border-white/50 h-full relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 via-transparent to-purple-50/50"></div>
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-2xl"></div>
                                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
                                
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 relative z-10 gap-4">
                                    <h2 className="text-lg font-bold text-[#071225] flex items-center">Top Coders</h2>
                                </div>
                                
                                {isLeaderboardAvailable ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10">
                                        {getTopCoders.map((coder) => (
                                            <TopCoderCard key={coder.id} coder={coder} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="relative z-10">
                                        <EmptyState title="Leaderboard" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboardPage;