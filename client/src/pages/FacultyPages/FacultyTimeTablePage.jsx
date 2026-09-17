/**
 * @file FacultyTimetablePage.jsx
 * @description Faculty Timetable with Batch-focused view and minimalist dark theme.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, Clock, Terminal, Cloud, Database, Coffee, MapPin, 
    ChevronRight, ChevronLeft, CalendarDays, Zap,
    BookOpen, Users, Layers
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Loader';

const API_URL = import.meta.env.VITE_BASE_URL;

// --- 1. SUBJECT THEME MAPPING ---
const SUBJECT_THEMES = {
  'CP': { 
      borderColor: 'border-cyan-500/40 group-hover:border-cyan-500/80',
      textColor: 'text-cyan-400',
      icon: Terminal 
  },
  'JFS': { 
      borderColor: 'border-orange-500/40 group-hover:border-orange-500/80',
      textColor: 'text-orange-400',
      icon: Coffee 
  },
  'DBS': { 
      borderColor: 'border-emerald-500/40 group-hover:border-emerald-500/80',
      textColor: 'text-emerald-400',
      icon: Database 
  },
  'AWS': { 
      borderColor: 'border-violet-500/40 group-hover:border-violet-500/80',
      textColor: 'text-violet-400',
      icon: Cloud 
  },
  'DEFAULT': {
      borderColor: 'border-slate-700 group-hover:border-slate-500',
      textColor: 'text-slate-400',
      icon: BookOpen 
  }
};

// Helper to map API Subject Strings to Style Keys
const getSubjectTheme = (subjectString) => {
    if (!subjectString) return SUBJECT_THEMES['DEFAULT'];
    const upper = subjectString.toUpperCase();
    
    // logic to map specific course names/codes to keys
    if (upper.includes('COMPETITIVE') || upper.includes('CDC001')) return SUBJECT_THEMES['CP'];
    if (upper.includes('JAVA') || upper.includes('CDC005')) return SUBJECT_THEMES['JFS'];
    if (upper.includes('DATABASE') || upper.includes('CDC002')) return SUBJECT_THEMES['DBS'];
    if (upper.includes('CLOUD') || upper.includes('AWS')) return SUBJECT_THEMES['AWS'];
    
    return SUBJECT_THEMES['DEFAULT'];
};

const FacultyTimetablePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [scheduleMap, setScheduleMap] = useState({});
  const [facultyId, setFacultyId] = useState('');

  // UI State
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [currentPage, setCurrentPage] = useState(0); 

  // --- Fetch Data ---
  useEffect(() => {
    if (!user) { navigate('/'); return; }

    const fetchTimetableData = async () => {
        try {
            const response = await fetch(`${API_URL}/api/faculty/get-timetable-data`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.status === 401 || response.status === 403) {
                // handle logout
                return;
            }

            if (!response.ok) throw new Error("Failed to fetch timetable");

            const data = await response.json();

            if (data) {
                setFacultyId(data.facultyid);
                // The API returns weekSchedule as an object { "Monday": [], "Tuesday": [] }
                setScheduleMap(data.weekSchedule || {});
            }
        } catch (error) {
            console.error("Timetable fetch error:", error);
        } finally {
            setIsLoading(false);
            setTimeout(() => setAnimate(true), 100);
        }
    };

    fetchTimetableData();
  }, [user, navigate]);

  // --- Generate Schedule Logic ---
  useEffect(() => {
    const allDates = [];
    let currentDate = new Date();
    
    // Generate Next 14 days
    for(let i=0; i<14; i++) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const processedData = allDates.map((date, index) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const isToday = index === 0;

        // Access the array for the specific day from the object
        const dailyClasses = scheduleMap[dayName] || [];
        
        // For the view, we take the first class of the day as the "Highlight"
        // In a real app, you might want to show the 'next upcoming' class based on current time
        const primaryClass = dailyClasses.length > 0 ? dailyClasses[0] : null;
        
        let theme = SUBJECT_THEMES['DEFAULT'];
        let cleanSubjectName = "No Class";
        let batchInfo = "";

        if (primaryClass) {
            theme = getSubjectTheme(primaryClass.subject);
            
            // Clean Subject Name (Remove code if present)
            const parts = primaryClass.subject.split(' - ');
            cleanSubjectName = parts.length > 1 ? parts[1] : primaryClass.subject;

            // Format Batch Info (e.g., "SN1 (VI)")
            batchInfo = `${primaryClass.batch} (${primaryClass.sem})`;
        }

        return { 
            dateObj: date,
            dayName: dayName,
            hasClass: !!primaryClass,
            classInfo: primaryClass ? {
                ...primaryClass,
                cleanSubject: cleanSubjectName,
                batchDisplay: batchInfo,
                ...theme
            } : null,
            isToday 
        };
    });

    setTodaySchedule(processedData[0]); 
    setUpcomingSchedule(processedData.slice(1)); 
  }, [scheduleMap, isLoading]);

  const ITEMS_PER_PAGE = 6; 
  const currentViewSchedule = upcomingSchedule.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  if (isLoading) return <Loader />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans pb-32 relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Header */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-4 pb-6 z-20">
         <Header animate={animate} />
         <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4"></div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 relative z-10">
        
        {/* --- TITLE & CONTROLS --- */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400 pb-2">
                        Faculty Schedule
                    </span>
                </h1>
            </div>

            {/* Faculty ID Badge */}
            {facultyId && (
                <div className="flex items-center gap-3">
                    <div className="bg-[#0F172A] border border-white/10 px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Faculty ID</span>
                        <span className="text-sm font-bold text-blue-200">{facultyId}</span>
                    </div>
                </div>
            )}
        </div>

        {/* --- SECTION 1: TODAY'S SESSION (Hero) --- */}
        <section className={`mb-10 transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-blue-400 fill-blue-400/20" size={18} /> Today's Focus
            </h2>
            
            {todaySchedule?.hasClass ? (
                <div className={`
                    relative rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden
                    bg-[#0F172A]/80 backdrop-blur-xl border border-blue-500/40
                `}>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            {/* Date Box */}
                            <div className="flex flex-col items-center justify-center w-20 h-20 rounded-3xl bg-white/5 border border-white/10 shadow-inner backdrop-blur-md">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {todaySchedule.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span className="text-3xl font-black text-white leading-none mt-1">
                                    {todaySchedule.dateObj.getDate()}
                                </span>
                            </div>

                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold text-[10px] uppercase tracking-widest border border-blue-500/20 mb-2 shadow-sm">
                                    {todaySchedule.classInfo.session === 'FN' ? 'Morning Session' : 'Afternoon Session'}
                                </span>
                                <h3 className="text-3xl md:text-5xl font-black text-white leading-tight">
                                    {todaySchedule.classInfo.cleanSubject}
                                </h3>
                                {/* BATCH INFO DISPLAY */}
                                <p className="text-blue-200/80 text-lg mt-2 font-medium flex items-center gap-2">
                                    <Users size={18} className="text-blue-400"/>
                                    Batch: {todaySchedule.classInfo.batchDisplay}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-start md:items-end gap-3 bg-black/20 p-5 rounded-2xl border border-white/5 backdrop-blur-md w-full md:w-auto">
                            <div className="flex items-center gap-3">
                                <Clock className="text-blue-400 w-6 h-6" />
                                <span className="text-3xl font-bold text-white tracking-tight">
                                    {todaySchedule.classInfo.startTime}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300 text-sm font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                <MapPin size={14} />
                                <span>Room {todaySchedule.classInfo.roomNo}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-[#0F172A]/40 backdrop-blur-md border border-white/5 p-8 rounded-[2rem] text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <CalendarDays className="text-slate-500" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">No classes today</h3>
                    <p className="text-slate-500 text-sm mt-1">Enjoy your day off!</p>
                </div>
            )}
        </section>

        {/* --- SECTION 2: UPCOMING SESSIONS (Grid View) --- */}
        <section className={`transition-all duration-700 delay-200 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="text-slate-400" size={18} /> Upcoming Schedule
                </h2>
                
                {/* Pagination Controls */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="p-2 bg-[#0F172A] border border-white/10 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button 
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={(currentPage + 1) * ITEMS_PER_PAGE >= upcomingSchedule.length}
                        className="p-2 bg-[#0F172A] border border-white/10 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* GRID LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentViewSchedule.map((item, idx) => (
                    <div 
                        key={idx}
                        className={`
                            relative rounded-[2rem] p-6 border transition-all duration-300 overflow-hidden group h-full flex flex-col justify-between
                            bg-[#0F172A]/40 backdrop-blur-md
                            ${item.hasClass 
                                ? `${item.classInfo.borderColor} hover:shadow-[0_0_20px_-10px_rgba(255,255,255,0.1)]` 
                                : 'border-white/5 opacity-50'}
                        `}
                    >
                        {/* Header: Date Box & Subject Icon */}
                        <div className="flex items-start justify-between mb-6">
                             {/* Date Box */}
                             <div className={`
                                flex flex-col items-center justify-center w-14 h-14 rounded-2xl border shadow-sm transition-all
                                bg-white/5 border-white/5 group-hover:border-white/10
                            `}>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {item.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                                <span className="text-xl font-black text-white leading-none mt-0.5">
                                    {item.dateObj.getDate()}
                                </span>
                            </div>

                            {/* Icon */}
                            {item.hasClass && (
                                <div className={`p-2 rounded-xl border border-white/5 bg-white/5 ${item.classInfo.textColor}`}>
                                    <item.classInfo.icon size={20} />
                                </div>
                            )}
                        </div>

                        {/* Body Info */}
                        <div>
                            {item.hasClass ? (
                                <>
                                    <h4 className="text-xl font-black text-white leading-tight mb-2 group-hover:text-white transition-colors line-clamp-2">
                                        {item.classInfo.cleanSubject}
                                    </h4>
                                    
                                    {/* Batch Info in Grid */}
                                    <div className="flex items-center gap-2 mb-5">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-white/5 ${item.classInfo.textColor}`}>
                                            Batch {item.classInfo.batch}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                            <Clock size={12} strokeWidth={2.5}/>
                                            {item.classInfo.startTime}
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 border border-white/5 text-xs font-bold text-slate-400">
                                            <MapPin size={12} strokeWidth={2.5}/> {item.classInfo.roomNo}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                                    <CalendarDays size={24} className="mb-2 text-slate-500"/>
                                    <span className="text-sm font-bold text-slate-500">No Class</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>

      </main>
    </div>
  );
};

export default FacultyTimetablePage;

// /**
//  * @file FacultyTimetablePage.jsx
//  * @description Faculty Timetable with Batch-focused view, minimalist dark theme, and secure data handling.
//  */

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { 
//     Calendar, Clock, Terminal, Cloud, Database, Coffee, MapPin, 
//     ChevronRight, ChevronLeft, CalendarDays, Zap,
//     BookOpen, Users, Layers
// } from 'lucide-react';
// import Header from '../../components/Header';
// import { useAuth } from '../../context/AuthContext';
// import Loader from '../../components/Loader';
// import CryptoJS from 'crypto-js'; // Import CryptoJS

// const API_URL = import.meta.env.VITE_BASE_URL;
// const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_SECRET_KEY; // Get Secret Key

// // --- ENCRYPTION / DECRYPTION UTILS ---

// const encryptData = (data) => {
//     try {
//         if (!data) return null;
//         const strData = typeof data === 'object' ? JSON.stringify(data) : String(data);
//         return CryptoJS.AES.encrypt(strData, EncDec_SECRET_KEY).toString();
//     } catch (err) {
//         console.error("Encryption Error:", err);
//         return null;
//     }
// };

// const decryptData = (ciphertext) => {
//     try {
//         if (!ciphertext) return null;
//         const bytes = CryptoJS.AES.decrypt(ciphertext, EncDec_SECRET_KEY);
//         const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
//         if (!decryptedString) return null;
//         try {
//             return JSON.parse(decryptedString);
//         } catch (e) {
//             return decryptedString;
//         }
//     } catch (err) {
//         console.error("Decryption Error:", err);
//         return null;
//     }
// };

// // --- 1. SUBJECT THEME MAPPING ---
// const SUBJECT_THEMES = {
//   'CP': { 
//       borderColor: 'border-cyan-500/40 group-hover:border-cyan-500/80',
//       textColor: 'text-cyan-400',
//       icon: Terminal 
//   },
//   'JFS': { 
//       borderColor: 'border-orange-500/40 group-hover:border-orange-500/80',
//       textColor: 'text-orange-400',
//       icon: Coffee 
//   },
//   'DBS': { 
//       borderColor: 'border-emerald-500/40 group-hover:border-emerald-500/80',
//       textColor: 'text-emerald-400',
//       icon: Database 
//   },
//   'AWS': { 
//       borderColor: 'border-violet-500/40 group-hover:border-violet-500/80',
//       textColor: 'text-violet-400',
//       icon: Cloud 
//   },
//   'DEFAULT': {
//       borderColor: 'border-slate-700 group-hover:border-slate-500',
//       textColor: 'text-slate-400',
//       icon: BookOpen 
//   }
// };

// // Helper to map API Subject Strings to Style Keys
// const getSubjectTheme = (subjectString) => {
//     if (!subjectString) return SUBJECT_THEMES['DEFAULT'];
//     const upper = subjectString.toUpperCase();
    
//     // logic to map specific course names/codes to keys
//     if (upper.includes('COMPETITIVE') || upper.includes('CDC001')) return SUBJECT_THEMES['CP'];
//     if (upper.includes('JAVA') || upper.includes('CDC005')) return SUBJECT_THEMES['JFS'];
//     if (upper.includes('DATABASE') || upper.includes('CDC002')) return SUBJECT_THEMES['DBS'];
//     if (upper.includes('CLOUD') || upper.includes('AWS')) return SUBJECT_THEMES['AWS'];
    
//     return SUBJECT_THEMES['DEFAULT'];
// };

// const FacultyTimetablePage = () => {
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   const [animate, setAnimate] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
  
//   // Data State
//   const [scheduleMap, setScheduleMap] = useState({});
//   const [facultyId, setFacultyId] = useState('');

//   // UI State
//   const [todaySchedule, setTodaySchedule] = useState(null);
//   const [upcomingSchedule, setUpcomingSchedule] = useState([]);
//   const [currentPage, setCurrentPage] = useState(0); 

//   // --- Fetch Data ---
//   useEffect(() => {
//     if (!user) { navigate('/'); return; }

//     const fetchTimetableData = async () => {
//         try {
//             // GET REQUEST: Plain Params, Response Decrypted
//             const response = await fetch(`${API_URL}/api/faculty/get-timetable-data`, {
//                 method: 'GET',
//                 headers: { 'Content-Type': 'application/json' },
//                 credentials: 'include'
//             });

//             if (response.status === 401 || response.status === 403) {
//                 // handle logout
//                 return;
//             }

//             if (!response.ok) throw new Error("Failed to fetch timetable");

//             const rawJson = await response.json();
//             // DECRYPTION LOGIC
//             const data = rawJson.data ? decryptData(rawJson.data) : rawJson;

//             if (data) {
//                 setFacultyId(data.facultyid);
//                 // The API returns weekSchedule as an object { "Monday": [], "Tuesday": [] }
//                 setScheduleMap(data.weekSchedule || {});
//             }
//         } catch (error) {
//             console.error("Timetable fetch error:", error);
//         } finally {
//             setIsLoading(false);
//             setTimeout(() => setAnimate(true), 100);
//         }
//     };

//     fetchTimetableData();
//   }, [user, navigate]);

//   // --- Generate Schedule Logic ---
//   useEffect(() => {
//     const allDates = [];
//     let currentDate = new Date();
    
//     // Generate Next 14 days
//     for(let i=0; i<14; i++) {
//         allDates.push(new Date(currentDate));
//         currentDate.setDate(currentDate.getDate() + 1);
//     }

//     const processedData = allDates.map((date, index) => {
//         const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
//         const isToday = index === 0;

//         // Access the array for the specific day from the object
//         const dailyClasses = scheduleMap[dayName] || [];
        
//         // For the view, we take the first class of the day as the "Highlight"
//         // In a real app, you might want to show the 'next upcoming' class based on current time
//         const primaryClass = dailyClasses.length > 0 ? dailyClasses[0] : null;
        
//         let theme = SUBJECT_THEMES['DEFAULT'];
//         let cleanSubjectName = "No Class";
//         let batchInfo = "";

//         if (primaryClass) {
//             theme = getSubjectTheme(primaryClass.subject);
            
//             // Clean Subject Name (Remove code if present)
//             const parts = primaryClass.subject.split(' - ');
//             cleanSubjectName = parts.length > 1 ? parts[1] : primaryClass.subject;

//             // Format Batch Info (e.g., "SN1 (VI)")
//             batchInfo = `${primaryClass.batch} (${primaryClass.sem})`;
//         }

//         return { 
//             dateObj: date,
//             dayName: dayName,
//             hasClass: !!primaryClass,
//             classInfo: primaryClass ? {
//                 ...primaryClass,
//                 cleanSubject: cleanSubjectName,
//                 batchDisplay: batchInfo,
//                 ...theme
//             } : null,
//             isToday 
//         };
//     });

//     setTodaySchedule(processedData[0]); 
//     setUpcomingSchedule(processedData.slice(1)); 
//   }, [scheduleMap, isLoading]);

//   const ITEMS_PER_PAGE = 6; 
//   const currentViewSchedule = upcomingSchedule.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

//   if (isLoading) return <Loader />;
//   if (!user) return null;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans pb-32 relative overflow-hidden selection:bg-blue-500/30">
      
//       {/* Header */}
//       <div className="relative px-4 sm:px-6 lg:px-8 pt-4 pb-6 z-20">
//          <Header animate={animate} />
//          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4"></div>
//       </div>

//       <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 relative z-10">
        
//         {/* --- TITLE & CONTROLS --- */}
//         <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
//             <div>
//                 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
//                     <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400 pb-2">
//                         Faculty Schedule
//                     </span>
//                 </h1>
//             </div>

//             {/* Faculty ID Badge */}
//             {facultyId && (
//                 <div className="flex items-center gap-3">
//                     <div className="bg-[#0F172A] border border-white/10 px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-3">
//                         <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Faculty ID</span>
//                         <span className="text-sm font-bold text-blue-200">{facultyId}</span>
//                     </div>
//                 </div>
//             )}
//         </div>

//         {/* --- SECTION 1: TODAY'S SESSION (Hero) --- */}
//         <section className={`mb-10 transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
//             <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
//                 <Zap className="text-blue-400 fill-blue-400/20" size={18} /> Today's Focus
//             </h2>
            
//             {todaySchedule?.hasClass ? (
//                 <div className={`
//                     relative rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden
//                     bg-[#0F172A]/80 backdrop-blur-xl border border-blue-500/40
//                 `}>
//                     <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
                    
//                     <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
//                         <div className="flex items-center gap-6">
//                             {/* Date Box */}
//                             <div className="flex flex-col items-center justify-center w-20 h-20 rounded-3xl bg-white/5 border border-white/10 shadow-inner backdrop-blur-md">
//                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//                                     {todaySchedule.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
//                                 </span>
//                                 <span className="text-3xl font-black text-white leading-none mt-1">
//                                     {todaySchedule.dateObj.getDate()}
//                                 </span>
//                             </div>

//                             <div>
//                                 <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-bold text-[10px] uppercase tracking-widest border border-blue-500/20 mb-2 shadow-sm">
//                                     {todaySchedule.classInfo.session === 'FN' ? 'Morning Session' : 'Afternoon Session'}
//                                 </span>
//                                 <h3 className="text-3xl md:text-5xl font-black text-white leading-tight">
//                                     {todaySchedule.classInfo.cleanSubject}
//                                 </h3>
//                                 {/* BATCH INFO DISPLAY */}
//                                 <p className="text-blue-200/80 text-lg mt-2 font-medium flex items-center gap-2">
//                                     <Users size={18} className="text-blue-400"/>
//                                     Batch: {todaySchedule.classInfo.batchDisplay}
//                                 </p>
//                             </div>
//                         </div>

//                         <div className="flex flex-col items-start md:items-end gap-3 bg-black/20 p-5 rounded-2xl border border-white/5 backdrop-blur-md w-full md:w-auto">
//                             <div className="flex items-center gap-3">
//                                 <Clock className="text-blue-400 w-6 h-6" />
//                                 <span className="text-3xl font-bold text-white tracking-tight">
//                                     {todaySchedule.classInfo.startTime}
//                                 </span>
//                             </div>
//                             <div className="flex items-center gap-2 text-slate-300 text-sm font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
//                                 <MapPin size={14} />
//                                 <span>Room {todaySchedule.classInfo.roomNo}</span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             ) : (
//                 <div className="bg-[#0F172A]/40 backdrop-blur-md border border-white/5 p-8 rounded-[2rem] text-center">
//                     <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
//                         <CalendarDays className="text-slate-500" size={24} />
//                     </div>
//                     <h3 className="text-xl font-bold text-white">No classes today</h3>
//                     <p className="text-slate-500 text-sm mt-1">Enjoy your day off!</p>
//                 </div>
//             )}
//         </section>

//         {/* --- SECTION 2: UPCOMING SESSIONS (Grid View) --- */}
//         <section className={`transition-all duration-700 delay-200 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
//              <div className="flex items-center justify-between mb-6">
//                 <h2 className="text-lg font-bold text-white flex items-center gap-2">
//                     <Calendar className="text-slate-400" size={18} /> Upcoming Schedule
//                 </h2>
                
//                 {/* Pagination Controls */}
//                 <div className="flex gap-2">
//                     <button 
//                         onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
//                         disabled={currentPage === 0}
//                         className="p-2 bg-[#0F172A] border border-white/10 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
//                     >
//                         <ChevronLeft size={18} />
//                     </button>
//                     <button 
//                         onClick={() => setCurrentPage(currentPage + 1)}
//                         disabled={(currentPage + 1) * ITEMS_PER_PAGE >= upcomingSchedule.length}
//                         className="p-2 bg-[#0F172A] border border-white/10 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
//                     >
//                         <ChevronRight size={18} />
//                     </button>
//                 </div>
//             </div>

//             {/* GRID LAYOUT */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                 {currentViewSchedule.map((item, idx) => (
//                     <div 
//                         key={idx}
//                         className={`
//                             relative rounded-[2rem] p-6 border transition-all duration-300 overflow-hidden group h-full flex flex-col justify-between
//                             bg-[#0F172A]/40 backdrop-blur-md
//                             ${item.hasClass 
//                                 ? `${item.classInfo.borderColor} hover:shadow-[0_0_20px_-10px_rgba(255,255,255,0.1)]` 
//                                 : 'border-white/5 opacity-50'}
//                         `}
//                     >
//                         {/* Header: Date Box & Subject Icon */}
//                         <div className="flex items-start justify-between mb-6">
//                              {/* Date Box */}
//                              <div className={`
//                                 flex flex-col items-center justify-center w-14 h-14 rounded-2xl border shadow-sm transition-all
//                                 bg-white/5 border-white/5 group-hover:border-white/10
//                             `}>
//                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
//                                     {item.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
//                                 </span>
//                                 <span className="text-xl font-black text-white leading-none mt-0.5">
//                                     {item.dateObj.getDate()}
//                                 </span>
//                             </div>

//                             {/* Icon */}
//                             {item.hasClass && (
//                                 <div className={`p-2 rounded-xl border border-white/5 bg-white/5 ${item.classInfo.textColor}`}>
//                                     <item.classInfo.icon size={20} />
//                                 </div>
//                             )}
//                         </div>

//                         {/* Body Info */}
//                         <div>
//                             {item.hasClass ? (
//                                 <>
//                                     <h4 className="text-xl font-black text-white leading-tight mb-2 group-hover:text-white transition-colors line-clamp-2">
//                                         {item.classInfo.cleanSubject}
//                                     </h4>
                                    
//                                     {/* Batch Info in Grid */}
//                                     <div className="flex items-center gap-2 mb-5">
//                                         <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-white/5 ${item.classInfo.textColor}`}>
//                                             Batch {item.classInfo.batch}
//                                         </span>
//                                     </div>
                                    
//                                     <div className="flex items-center justify-between pt-4 border-t border-white/5">
//                                         <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
//                                             <Clock size={12} strokeWidth={2.5}/>
//                                             {item.classInfo.startTime}
//                                         </div>
//                                         <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 border border-white/5 text-xs font-bold text-slate-400">
//                                             <MapPin size={12} strokeWidth={2.5}/> {item.classInfo.roomNo}
//                                         </div>
//                                     </div>
//                                 </>
//                             ) : (
//                                 <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
//                                     <CalendarDays size={24} className="mb-2 text-slate-500"/>
//                                     <span className="text-sm font-bold text-slate-500">No Class</span>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </section>

//       </main>
//     </div>
//   );
// };

// export default FacultyTimetablePage;