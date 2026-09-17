import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, Clock, Terminal, Cloud, Database, Coffee, MapPin, 
    ChevronRight, ChevronLeft, CalendarDays, Zap,
    BookOpen, User, AlertCircle
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 
import Loader from '../../components/Loader';

const API_URL = import.meta.env.VITE_BASE_URL;

// --- 1. THEMES (Unified Blue/Slate) ---
const UNIFIED_STYLE = {
    borderColor: 'border-blue-500/30 hover:border-blue-400',
    textColor: 'text-blue-300',
    iconColor: 'text-blue-400',
    glow: 'hover:shadow-[0_0_20px_-10px_rgba(59,130,246,0.3)]',
};

const SUBJECT_STYLES = {
  'CP': { 
      fullTitle: 'Competitive Programming',
      ...UNIFIED_STYLE,
      icon: Terminal 
  },
  'AWS': { 
      fullTitle: 'Cloud Computing (AWS)',
      ...UNIFIED_STYLE,
      icon: Cloud 
  },
  'DBS': { 
      fullTitle: 'Database Solutions',
      ...UNIFIED_STYLE,
      icon: Database 
  },
  'JFS': { 
      fullTitle: 'Java Full Stack',
      ...UNIFIED_STYLE,
      icon: Coffee 
  },
  'DEFAULT': {
      fullTitle: 'Course Session',
      borderColor: 'border-slate-600/50 hover:border-slate-400',
      textColor: 'text-slate-400',
      iconColor: 'text-slate-400',
      glow: 'hover:shadow-[0_0_20px_-10px_rgba(148,163,184,0.1)]',
      icon: BookOpen 
  }
};

// Helper to determine subject theme
const getSubjectTheme = (subjectName) => {
    if (!subjectName) return SUBJECT_STYLES['DEFAULT'];
    const lower = subjectName.toLowerCase();
    
    if (lower.includes('competitive') || lower.includes('cdc001')) return SUBJECT_STYLES['CP'];
    if (lower.includes('cloud') || lower.includes('aws')) return SUBJECT_STYLES['AWS'];
    if (lower.includes('database') || lower.includes('cdc002')) return SUBJECT_STYLES['DBS'];
    if (lower.includes('java') || lower.includes('cdc005')) return SUBJECT_STYLES['JFS'];

    return SUBJECT_STYLES['DEFAULT'];
};

const TimetablePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [scheduleMap, setScheduleMap] = useState({});
  const [userBatch, setUserBatch] = useState('');
  const [semester, setSemester] = useState('');
  const [apiMessage, setApiMessage] = useState(''); 

  // UI State
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [currentPage, setCurrentPage] = useState(0); 

  // --- Fetch Data ---
  useEffect(() => {
    if (!user) { navigate('/'); return; }

    const fetchTimetableData = async () => {
        try {
            // Modified: Wait for both the API call AND a 2.5 second timer
            const [_, response] = await Promise.all([
                new Promise(resolve => setTimeout(resolve, 1000)), // Minimum 2.5s delay
                fetch(`${API_URL}/api/student/get-timetable-data`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                })
            ]);

            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }

            const rawData = await response.json();
            
            if (rawData.message) {
                setApiMessage(rawData.message);
                setScheduleMap({}); 
                return; 
            }

            // Handle both Array response and Object response
            const data = Array.isArray(rawData) ? rawData[0] : rawData;

            if (data && data.weekSchedule) {
                setUserBatch(data.batch || 'N/A');
                setSemester(data.sem || 'N/A');

                const map = {};
                if (Array.isArray(data.weekSchedule)) {
                    data.weekSchedule.forEach(dayObj => {
                        map[dayObj.day] = dayObj.periods.map(p => ({
                            time: `${p.startTime} - ${p.endTime}`,
                            subject: p.subject,
                            room: p.roomNo,
                            // FIX: Filter out null values from faculty array before mapping
                            faculty: (p.faculty && Array.isArray(p.faculty))
                                ? p.faculty.filter(f => f !== null).map(f => f.name).join(', ') 
                                : 'N/A'
                        }));
                    });
                }
                setScheduleMap(map);
            } else {
                setScheduleMap({});
            }

        } catch (error) {
            console.error("Timetable fetch error:", error);
            setApiMessage("Failed to load timetable.");
        } finally {
            setIsLoading(false);
            setTimeout(() => setAnimate(true), 100);
        }
    };

    fetchTimetableData();
  }, [user, navigate, logout]);

  // --- Generate Schedule Logic ---
  useEffect(() => {
    const allDates = [];
    let currentDate = new Date();
    
    // Add Today + Next 12 days
    for(let i=0; i<13; i++) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    const processedData = allDates.map((date, index) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const isToday = index === 0;

        const dailyClasses = scheduleMap[dayName] || [];
        const primaryClass = dailyClasses.length > 0 ? dailyClasses[0] : null;
        
        let theme = SUBJECT_STYLES['DEFAULT'];
        let displayTitle = primaryClass?.subject || 'Free';

        if (primaryClass) {
            theme = getSubjectTheme(primaryClass.subject);
            // Use the theme's full title if available, otherwise fallback to subject code
            displayTitle = theme.fullTitle === 'Course Session' ? primaryClass.subject : theme.fullTitle;
        }

        return { 
            dateObj: date,
            dayName: dayName,
            hasClass: !!primaryClass,
            classInfo: primaryClass ? {
                ...primaryClass,
                ...theme,
                displayTitle: displayTitle
            } : null,
            isToday 
        };
    });

    setTodaySchedule(processedData[0]); 
    setUpcomingSchedule(processedData.slice(1)); 
  }, [scheduleMap, isLoading]);

  const ITEMS_PER_PAGE = 6; 
  const currentViewSchedule = upcomingSchedule.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  const isTimetableEmpty = Object.keys(scheduleMap).length === 0;

  if (isLoading) return <Loader />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans pb-32 relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Header Container */}
      <div className="relative px-6 sm:px-8 pt-4 pb-6 z-50">
         <Header animate={animate} />
         <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4"></div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-4 relative z-10">
        
        {/* --- TITLE & METADATA --- */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400 pb-2">
                        Course Schedule
                    </span>
                </h1>
            </div>

            {!isTimetableEmpty && (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="bg-[#0F172A] border border-white/10 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Sem</span>
                        <span className="text-xs md:text-sm font-bold text-white">{semester}</span>
                    </div>
                    <div className="bg-[#0F172A] border border-white/10 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Batch</span>
                        <span className="text-xs md:text-sm font-bold text-white">{userBatch}</span>
                    </div>
                </div>
            )}
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        {isTimetableEmpty ? (
            
            <div className={`flex flex-col items-center justify-center min-h-[50vh] transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="bg-[#0F172A]/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 text-center max-w-lg shadow-2xl relative overflow-hidden">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/5 ring-1 ring-white/10">
                        <AlertCircle size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-3">No Schedule Found</h3>
                    <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed">
                        {apiMessage || "We couldn't find any timetable data for your current session."}
                    </p>
                </div>
            </div>

        ) : (
            <>
                {/* Section 1: Today */}
                <section className={`mb-10 transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Zap className="text-blue-400 fill-blue-400/20" size={18} /> Today's Session
                    </h2>
                    
                    {todaySchedule?.hasClass ? (
                        <div className={`
                            relative rounded-[2.5rem] shadow-2xl overflow-hidden border transition-all duration-300
                            p-6 md:p-10
                            bg-[#0F172A]/80 backdrop-blur-xl ${todaySchedule.classInfo.borderColor} ${todaySchedule.classInfo.glow}
                        `}>
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
                            
                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8">
                                <div className="flex items-center gap-5 md:gap-6">
                                    <div className="flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/5 border border-white/10 shadow-inner backdrop-blur-md shrink-0">
                                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            {todaySchedule.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                        <span className="text-2xl md:text-3xl font-black text-white leading-none mt-1">
                                            {todaySchedule.dateObj.getDate()}
                                        </span>
                                    </div>

                                    <div>
                                        <span className={`inline-block px-3 py-1 rounded-full bg-white/5 font-bold text-[10px] uppercase tracking-widest border border-white/10 mb-2 shadow-sm ${todaySchedule.classInfo.textColor}`}>
                                            Happening Now
                                        </span>
                                        <h3 className="text-2xl md:text-4xl font-black text-white leading-tight break-words">
                                            {todaySchedule.classInfo.displayTitle}
                                        </h3>
                                        <p className="text-sm md:text-lg mt-2 font-medium flex items-center gap-2 text-slate-300">
                                            <User size={16} className="text-slate-400" />
                                            {todaySchedule.classInfo.faculty || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-start md:items-end gap-3 bg-black/20 p-4 md:p-5 rounded-2xl border border-white/5 backdrop-blur-md w-full md:w-auto">
                                    <div className="flex items-center gap-3">
                                        <Clock className={`w-5 h-5 md:w-6 md:h-6 ${todaySchedule.classInfo.textColor}`} />
                                        <span className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                            {todaySchedule.classInfo.time.split(' - ')[0]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300 text-xs md:text-sm font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                                        <MapPin size={14} />
                                        <span>Room {todaySchedule.classInfo.room}</span>
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
                            <p className="text-slate-500 text-sm mt-1">Take a break and recharge!</p>
                        </div>
                    )}
                </section>

                {/* Section 2: Upcoming (Grid) */}
                <section className={`transition-all duration-700 delay-200 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar className="text-slate-400" size={18} /> Upcoming Schedule
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentViewSchedule.map((item, idx) => (
                            <div 
                                key={idx}
                                className={`
                                    relative rounded-[2rem] border transition-all duration-300 overflow-hidden group h-full flex flex-col justify-between
                                    bg-[#0F172A]/40 backdrop-blur-md
                                    p-5 md:p-6
                                    ${item.hasClass 
                                        ? `${item.classInfo.borderColor} ${item.classInfo.glow}` 
                                        : 'border-white/5 opacity-50'}
                                `}
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`
                                        flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl border shadow-sm transition-all
                                        bg-white/5 border-white/5 group-hover:border-white/10
                                    `}>
                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {item.dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                        </span>
                                        <span className="text-lg md:text-xl font-black text-white leading-none mt-0.5">
                                            {item.dateObj.getDate()}
                                        </span>
                                    </div>

                                    {item.hasClass && (
                                        <div className={`p-2.5 md:p-3 rounded-2xl border bg-white/5 ${item.classInfo.borderColor} ${item.classInfo.textColor}`}>
                                            <item.classInfo.icon size={18} className="md:w-5 md:h-5" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {item.hasClass ? (
                                        <>
                                            <h4 className="text-lg md:text-xl font-black text-white leading-tight mb-2 group-hover:text-blue-200 transition-colors line-clamp-2">
                                                {item.classInfo.displayTitle}
                                            </h4>
                                            
                                            <p className="text-xs font-bold mb-5 flex items-center gap-2 text-slate-400">
                                                <User size={12} />
                                                {item.classInfo.faculty || 'N/A'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                                    <Clock size={12} strokeWidth={2.5}/>
                                                    {item.classInfo.time.split(' - ')[0]}
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 border border-white/5 text-xs font-bold text-slate-400">
                                                    <MapPin size={12} strokeWidth={2.5}/> {item.classInfo.room}
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
            </>
        )}

      </main>

      {/* --- PAGINATION (Floating) --- */}
      {!isTimetableEmpty && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-6 pointer-events-none flex justify-center">
            <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full p-1.5 flex items-center gap-2 pointer-events-auto ring-1 ring-white/5">
                <button 
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                    className={`
                        flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full transition-all duration-300
                        ${currentPage === 0 
                            ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                            : 'bg-[#071225] text-white hover:bg-blue-600 border border-white/10 shadow-lg'}
                    `}
                >
                    <ChevronLeft size={16} />
                    <span className="text-xs font-bold uppercase tracking-wide">This Week</span>
                </button>

                <button 
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`
                        flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-full transition-all duration-300
                        ${currentPage === 1 
                            ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                            : 'bg-white text-[#071225] hover:bg-gray-200 border border-white/20 shadow-lg'}
                    `}
                >
                    <span className="text-xs font-bold uppercase tracking-wide">Next Week</span>
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default TimetablePage;