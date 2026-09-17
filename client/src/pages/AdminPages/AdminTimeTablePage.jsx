import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, Clock, Database, MapPin, 
    ChevronRight, ChevronLeft, Sun, CalendarDays, 
    Terminal, Coffee, Filter, LayoutGrid, Plus, User, Layers, Edit, Cloud, BookOpen
} from 'lucide-react';
import Header from '../../components/Header'; 
import { useAuth } from '../../context/AuthContext'; 
import Loader from '../../components/Loader'; 

// --- API CONFIGURATION ---
const API_URL = import.meta.env.VITE_BASE_URL;

// --- SUBJECT MAPPING ---
const SUBJECT_MAP = {
    'CP': 'Competitive Programming',
    'JFS': 'Java Full Stack',
    'DBS': 'Database Solutions',
    'AWS': 'Amazon Web Services',
    'ADS': 'Advanced Data Structures',
    'PFE': 'Python for Engineers',
    'OR': 'Operations Research'
};

// --- THEME CONFIGURATION ---
const subjectStyles = {
  'CP': { 
      gradient: 'from-blue-600 to-indigo-600',
      glass: 'bg-blue-500/10 border-blue-500/20',
      text: 'text-blue-300',
      icon: <Terminal className="w-full h-full text-white" /> 
  },
  'JFS': { 
      gradient: 'from-orange-500 to-red-600',
      glass: 'bg-orange-500/10 border-orange-500/20',
      text: 'text-orange-300',
      icon: <Coffee className="w-full h-full text-white" /> 
  },
  'DBS': { 
      gradient: 'from-emerald-500 to-teal-600',
      glass: 'bg-emerald-500/10 border-emerald-500/20',
      text: 'text-emerald-300',
      icon: <Database className="w-full h-full text-white" /> 
  },
  'AWS': { 
      gradient: 'from-amber-500 to-yellow-600',
      glass: 'bg-amber-500/10 border-amber-500/20',
      text: 'text-amber-300',
      icon: <Cloud className="w-full h-full text-white" /> 
  },
  'DEFAULT': { 
      gradient: 'from-slate-600 to-slate-700',
      glass: 'bg-slate-500/10 border-slate-500/20',
      text: 'text-slate-300',
      icon: <BookOpen className="w-full h-full text-white" /> 
  }
};

// Helper: Determine style based on subject string
const getSubjectStyle = (subjectString) => {
    const lower = subjectString ? subjectString.toLowerCase() : '';
    if (lower.includes('java') || lower.includes('jfs')) return subjectStyles['JFS'];
    if (lower.includes('competitive') || lower.includes('cp') || lower.includes('cdc001')) return subjectStyles['CP'];
    if (lower.includes('database') || lower.includes('dbs') || lower.includes('cdc002')) return subjectStyles['DBS'];
    if (lower.includes('aws') || lower.includes('cloud')) return subjectStyles['AWS'];
    return subjectStyles['DEFAULT'];
};

// Helper: Smart Parser for Subject Names
const parseSubjectInfo = (rawSubject) => {
    if (!rawSubject) return { title: "Free Period", code: "---" };

    // Case 1: "CDC001 - Competitive Programming" format
    if (rawSubject.includes(' - ')) {
        const parts = rawSubject.split(' - ');
        return {
            code: parts[0], 
            title: parts[1] 
        };
    }

    // Case 2: Short Code Mapping
    if (SUBJECT_MAP[rawSubject]) {
        return {
            code: rawSubject,
            title: SUBJECT_MAP[rawSubject]
        };
    }

    // Case 3: Unknown format
    return {
        code: rawSubject.substring(0, 6).toUpperCase(),
        title: rawSubject
    };
};

const AdminTimetablePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [animate, setAnimate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [timetableData, setTimetableData] = useState({});
  const [batchesBySem, setBatchesBySem] = useState({}); 
  const [selectedBatch, setSelectedBatch] = useState('');

  // Date Selection State
  // Initialize to Monday if today is Sunday (to prevent empty screen on weekends)
  const [selectedDate, setSelectedDate] = useState(() => {
      const d = new Date();
      if (d.getDay() === 0) { // 0 is Sunday
          d.setDate(d.getDate() + 1);
      }
      return d;
  });

  // Render State
  const [todaysGroupedSchedule, setTodaysGroupedSchedule] = useState({});
  const [upcomingSchedule, setUpcomingSchedule] = useState([]);
  const [currentPage, setCurrentPage] = useState(0); 

  // --- 1. Init: Fetch Backend Data ---
  useEffect(() => {
    if (!user) {
        // If user is null but we are not loading, redirect. 
        // If we are just initializing, we wait.
        return; 
    }

    const fetchTimetable = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/get-all-timetables`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // --- DATA PROCESSING LOGIC ---
            const processedData = {};
            const semGrouping = {};
            let firstBatch = '';

            const semesterDataArray = result.success && Array.isArray(result.data) ? result.data : [];

            semesterDataArray.forEach(semGroup => {
                const semKey = semGroup.semester;
                if (!semGrouping[semKey]) semGrouping[semKey] = [];

                if (semGroup.batches && Array.isArray(semGroup.batches)) {
                    semGroup.batches.forEach(batchObj => {
                        const batchDisplayName = `${batchObj.batch} (${batchObj.sem})`;
                        semGrouping[semKey].push(batchDisplayName);
                        if (!firstBatch) firstBatch = batchDisplayName;

                        const scheduleMap = {};
                        if (batchObj.weekSchedule && Array.isArray(batchObj.weekSchedule)) {
                            batchObj.weekSchedule.forEach(dayObj => {
                                // Ensure periods exists
                                const periods = dayObj.periods || [];
                                scheduleMap[dayObj.day] = periods.map(p => ({
                                    time: `${p.startTime} - ${p.endTime}`,
                                    rawSubject: p.subject,
                                    room: p.roomNo,
                                    faculty: p.faculty && Array.isArray(p.faculty) && p.faculty[0] 
                                        ? p.faculty.map(f => f.name).join(', ') 
                                        : 'N/A'
                                }));
                            });
                        }
                        processedData[batchDisplayName] = scheduleMap;
                    });
                }
            });

            setTimetableData(processedData);
            setBatchesBySem(semGrouping);
            if (firstBatch) setSelectedBatch(firstBatch);

        } catch (error) {
            console.error("Error fetching timetable:", error);
        } finally {
            setIsLoading(false);
            setTimeout(() => setAnimate(true), 100);
        }
    };

    fetchTimetable();
  }, [user, logout]); 

  // --- 2. LOGIC: TODAY'S SCHEDULE (Grouped by Sem) ---
  useEffect(() => {
    if (Object.keys(batchesBySem).length === 0) return;

    const targetDayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const groupedResult = {};

    Object.keys(batchesBySem).forEach(sem => {
        const batchesInSem = batchesBySem[sem];
        
        const batchDataList = batchesInSem.map(batchName => {
            const dailyClasses = timetableData[batchName] ? (timetableData[batchName][targetDayName] || []) : [];
            const primaryClass = dailyClasses.length > 0 ? dailyClasses[0] : null;

            let classDetails = null;
            if (primaryClass) {
                const style = getSubjectStyle(primaryClass.rawSubject);
                const { title, code } = parseSubjectInfo(primaryClass.rawSubject);

                classDetails = {
                    ...primaryClass,
                    fullTitle: title,
                    displayCode: code,
                    icon: style.icon,
                    gradient: style.gradient,
                    glass: style.glass,
                    textColor: style.text
                };
            }

            return {
                batchName: batchName,
                hasClass: !!classDetails,
                classInfo: classDetails
            };
        });

        groupedResult[sem] = batchDataList;
    });

    setTodaysGroupedSchedule(groupedResult);
  }, [batchesBySem, selectedDate, timetableData]);

  // --- 3. LOGIC: UPCOMING SCHEDULE (Specific Batch) ---
  useEffect(() => {
    if (!selectedBatch || !timetableData[selectedBatch]) return;

    const batchTimetable = timetableData[selectedBatch];
    const allDates = [];
    let currentDate = new Date(); 
    let safetyCounter = 0;
    
    // Start from tomorrow
    currentDate.setDate(currentDate.getDate() + 1);

    while (allDates.length < 12 && safetyCounter < 30) {
        const dayIndex = currentDate.getDay();
        // Skip Sunday (0)
        if (dayIndex !== 0) { 
            allDates.push(new Date(currentDate)); 
        } 
        currentDate.setDate(currentDate.getDate() + 1);
        safetyCounter++;
    }

    const processedData = allDates.map((date) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const displayDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const displayDay = date.toLocaleDateString('en-US', { weekday: 'short' });

        const dailyClasses = batchTimetable[dayName] || [];
        const primaryClass = dailyClasses.length > 0 ? dailyClasses[0] : null;
        
        let classDetails = null;
        if (primaryClass) {
            const style = getSubjectStyle(primaryClass.rawSubject);
            const { title, code } = parseSubjectInfo(primaryClass.rawSubject);

            classDetails = {
                ...primaryClass,
                fullTitle: title,
                displayCode: code,
                icon: style.icon,
                gradient: style.gradient,
                glass: style.glass,
                textColor: style.text
            };
        }

        return { 
            date: displayDate, 
            day: displayDay, 
            hasClass: !!classDetails,
            classInfo: classDetails,
        };
    });

    setUpcomingSchedule(processedData); 
  }, [selectedBatch, timetableData]);

  const ITEMS_PER_PAGE = 6;
  const currentViewSchedule = upcomingSchedule.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
  };

  if (isLoading) {
    return <Loader />;
  }

  // Fallback if user is null (though useEffect redirects)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans pb-32">
      
      {/* --- HEADER --- */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-4 pb-6 z-20">
         <Header animate={animate} />
         <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4"></div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto space-y-10">
        
        {/* =========================================================
            SECTION 1: MASTER TIMETABLE VIEW (ALL SEMS)
           ========================================================= */}
        <section className={`transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {/* Title & Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                            <LayoutGrid className="text-blue-400 w-5 h-5" />
                        </div>
                        Master Time Table
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-14 font-medium">
                        Showing schedule for: <span className="text-white font-bold">{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 z-30 flex-wrap md:flex-nowrap">
                    <button 
                        onClick={() => navigate('/admin/create-timetable')}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 border border-white/10"
                    >
                        <Plus size={16} /> Create Schedule
                    </button>

                    <button 
                        onClick={() => navigate('/modify-timetable')} 
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-sm backdrop-blur-md border border-white/10 transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Edit size={16} /> Modify
                    </button>

                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-1.5 rounded-xl backdrop-blur-md">
                        <div className="relative">
                            <input 
                                type="date" 
                                value={formatDateForInput(selectedDate)}
                                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                className="bg-[#0F172A] text-white text-sm font-bold px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-blue-500 appearance-none min-w-[140px] cursor-pointer"
                            />
                            <Calendar className="w-4 h-4 text-white absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ITERATE OVER SEMESTERS --- */}
            {Object.keys(todaysGroupedSchedule).length > 0 ? (
                Object.keys(todaysGroupedSchedule).sort().reverse().map((sem) => (
                    <div key={sem} className="mb-10">
                        {/* Semester Header Row */}
                        <div className="flex items-center gap-3 mb-5 pl-1">
                            <div className="h-px w-8 bg-blue-500/50"></div>
                            <h3 className="text-lg font-bold text-blue-200 tracking-wider flex items-center gap-2">
                                <Layers size={18} className="text-blue-400" />
                                {sem} SEMESTER
                            </h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent"></div>
                        </div>

                        {/* Batches Grid for this Semester */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {todaysGroupedSchedule[sem].map((batchData, idx) => (
                                <div 
                                    key={idx}
                                    className={`
                                        relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:shadow-lg
                                        ${batchData.hasClass ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/5 border-white/5 opacity-50'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-sm font-bold text-white truncate w-3/4" title={batchData.batchName}>
                                            {batchData.batchName}
                                        </h3>
                                        {batchData.hasClass ? (
                                            <div className={`p-1.5 rounded-md ${batchData.classInfo.glass} ${batchData.classInfo.textColor}`}>
                                                {React.cloneElement(batchData.classInfo.icon, { className: "w-3 h-3" })}
                                            </div>
                                        ) : (
                                            <div className="p-1.5 rounded-md bg-white/5 text-gray-500">
                                                <Sun size={12} />
                                            </div>
                                        )}
                                    </div>

                                    {batchData.hasClass ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${batchData.classInfo.gradient}`}></div>
                                                <div className="min-w-0">
                                                    {/* Full Name Display */}
                                                    <p className="text-xs text-gray-300 font-medium line-clamp-1" title={batchData.classInfo.fullTitle}>
                                                        {batchData.classInfo.fullTitle}
                                                    </p>
                                                    {/* Short Code Display */}
                                                    <p className={`text-[10px] font-bold ${batchData.classInfo.textColor} tracking-wider`}>
                                                        {batchData.classInfo.displayCode}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
                                                <User size={10} className="shrink-0" />
                                                <span className="truncate" title={batchData.classInfo.faculty}>
                                                    {batchData.classInfo.faculty || 'N/A'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                                                <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-black/20 px-1.5 py-0.5 rounded">
                                                    <Clock size={10} /> {batchData.classInfo.time.split(' - ')[0]}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    <MapPin size={10} /> {batchData.classInfo.room}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4 bg-black/10 rounded-lg">
                                            <span className="text-xs text-gray-500 font-medium">No Class</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center text-gray-500 py-10 bg-white/5 rounded-2xl border border-white/5">
                    No schedule data available for {selectedDate.toLocaleDateString()}.
                </div>
            )}
        </section>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {/* =========================================================
            SECTION 2: SPECIFIC BATCH PLAN (Grouped Dropdown)
           ========================================================= */}
        <section className={`transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                        <CalendarDays className="text-purple-400 w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Specific Batch Plan</h2>
                </div>

                {/* Grouped Dropdown Selector */}
                <div className="relative z-30 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-[#0F172A] border border-white/20 p-1.5 rounded-xl shadow-lg ring-1 ring-white/5">
                        <div className="px-2 text-gray-400">
                            <Filter size={14} />
                        </div>
                        <select
                            value={selectedBatch}
                            onChange={(e) => {
                                setSelectedBatch(e.target.value);
                                setCurrentPage(0);
                            }}
                            className="bg-transparent text-white px-2 py-1.5 pr-8 focus:outline-none cursor-pointer text-sm font-bold appearance-none min-w-[200px]"
                        >
                            {Object.keys(batchesBySem).sort().reverse().map(sem => (
                                <optgroup key={sem} label={`${sem} SEMESTER`} className="bg-[#071225] text-gray-400 font-bold">
                                    {batchesBySem[sem].map(batchName => (
                                        <option key={batchName} value={batchName} className="text-white font-normal">
                                            {batchName}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <ChevronRight className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none rotate-90" />
                    </div>
                </div>
            </div>

            {/* Upcoming Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {currentViewSchedule.map((dayData, index) => (
                    <div 
                        key={index}
                        className={`
                            relative rounded-2xl border transition-all duration-300 overflow-hidden group hover:shadow-xl
                            ${dayData.hasClass 
                                ? `${dayData.classInfo.glass} hover:border-white/20` 
                                : 'bg-white/5 border-white/5 opacity-60'}
                        `}
                    >
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-3">
                                <div className="text-center">
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{dayData.day}</span>
                                    <span className="block text-lg font-bold text-white leading-none mt-0.5">{dayData.date.split(' ')[0]}</span>
                                </div>
                                <div className="h-8 w-px bg-white/10"></div>
                                <span className="text-sm font-medium text-gray-300">{dayData.date.split(' ')[1]}</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 min-h-[120px] flex flex-col justify-center relative">
                            {dayData.hasClass ? (
                                <>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg bg-black/30 backdrop-blur-sm shadow-sm ${dayData.classInfo.textColor}`}>
                                                {React.cloneElement(dayData.classInfo.icon, { className: "w-4 h-4" })}
                                            </div>
                                            {/* DISPLAY CODE (CP, JFS) */}
                                            <span className={`text-xs font-bold uppercase tracking-wider ${dayData.classInfo.textColor}`}>
                                                {dayData.classInfo.displayCode}
                                            </span>
                                        </div>
                                        
                                        {/* FULL TITLE (Competitive Programming) */}
                                        <h3 className="text-sm font-bold text-white leading-tight mb-3 line-clamp-2" title={dayData.classInfo.fullTitle}>
                                            {dayData.classInfo.fullTitle}
                                        </h3>
                                        
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 bg-black/10 p-1.5 rounded-md border border-white/5">
                                            <User size={12} className="text-gray-500 shrink-0" />
                                            <span className="truncate font-medium">
                                                {dayData.classInfo.faculty || 'N/A'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-3">
                                            <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
                                                <Clock size={12} /> {dayData.classInfo.time.split(' - ')[0]}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin size={12} /> {dayData.classInfo.room}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center">
                                    <div className="p-2 rounded-full bg-white/5 mb-2">
                                        <CalendarDays size={18} className="text-gray-500" />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">Free Day</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>

      </main>

      {/* --- BOTTOM CONTROLLERS --- */}
      <div className="fixed bottom-6 left-0 right-0 z-30 px-4 pointer-events-none flex justify-center">
        <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full p-1.5 flex items-center gap-2 pointer-events-auto ring-1 ring-white/5">
            <button 
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className={`
                    flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300
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
                    flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300
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

    </div>
  );
};

export default AdminTimetablePage;

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { 
//     Calendar, Clock, Database, MapPin, 
//     ChevronRight, ChevronLeft, Sun, CalendarDays, 
//     Terminal, Coffee, Filter, LayoutGrid, Plus, User, Layers, Edit, Cloud, BookOpen, 
//     Code2, Server
// } from 'lucide-react';
// import Header from '../../components/Header'; 
// import { useAuth } from '../../context/AuthContext'; 
// import Loader from '../../components/Loader'; 
// import CryptoJS from 'crypto-js'; // Import CryptoJS

// // --- API CONFIGURATION ---
// const API_URL = import.meta.env.VITE_BASE_URL;
// const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_SECRET_KEY; // Get Secret Key

// // --- ENCRYPTION / DECRYPTION UTILS ---

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

// // --- SUBJECT MAPPING (New Feature) ---
// // Maps short codes to Full Names
// const SUBJECT_MAP = {
//     'CP': 'Competitive Programming',
//     'JFS': 'Java Full Stack',
//     'DBS': 'Database Solutions',
//     'AWS': 'Amazon Web Services',
//     'ADS': 'Advanced Data Structures',
//     'PFE': 'Python for Engineers',
//     'OR': 'Operations Research'
// };

// // --- THEME CONFIGURATION ---
// const subjectStyles = {
//   'CP': { 
//       gradient: 'from-blue-600 to-indigo-600',
//       glass: 'bg-blue-500/10 border-blue-500/20',
//       text: 'text-blue-300',
//       icon: <Terminal className="w-full h-full text-white" /> 
//   },
//   'JFS': { 
//       gradient: 'from-orange-500 to-red-600',
//       glass: 'bg-orange-500/10 border-orange-500/20',
//       text: 'text-orange-300',
//       icon: <Coffee className="w-full h-full text-white" /> 
//   },
//   'DBS': { 
//       gradient: 'from-emerald-500 to-teal-600',
//       glass: 'bg-emerald-500/10 border-emerald-500/20',
//       text: 'text-emerald-300',
//       icon: <Database className="w-full h-full text-white" /> 
//   },
//   'AWS': { 
//       gradient: 'from-amber-500 to-yellow-600',
//       glass: 'bg-amber-500/10 border-amber-500/20',
//       text: 'text-amber-300',
//       icon: <Cloud className="w-full h-full text-white" /> 
//   },
//   'DEFAULT': { 
//       gradient: 'from-slate-600 to-slate-700',
//       glass: 'bg-slate-500/10 border-slate-500/20',
//       text: 'text-slate-300',
//       icon: <BookOpen className="w-full h-full text-white" /> 
//   }
// };

// // Helper: Determine style based on subject string
// const getSubjectStyle = (subjectString) => {
//     const lower = subjectString ? subjectString.toLowerCase() : '';
//     if (lower.includes('java') || lower.includes('jfs')) return subjectStyles['JFS'];
//     if (lower.includes('competitive') || lower.includes('cp') || lower.includes('cdc001')) return subjectStyles['CP'];
//     if (lower.includes('database') || lower.includes('dbs') || lower.includes('cdc002')) return subjectStyles['DBS'];
//     if (lower.includes('aws') || lower.includes('cloud')) return subjectStyles['AWS'];
//     return subjectStyles['DEFAULT'];
// };

// // Helper: Smart Parser for Subject Names
// const parseSubjectInfo = (rawSubject) => {
//     if (!rawSubject) return { title: "Free Period", code: "---" };

//     // Case 1: "CDC001 - Competitive Programming" format
//     if (rawSubject.includes(' - ')) {
//         const parts = rawSubject.split(' - ');
//         return {
//             code: parts[0], // CDC001
//             title: parts[1] // Competitive Programming
//         };
//     }

//     // Case 2: Short Code "CP", "JFS", "DBS"
//     // Check if it exists in our Mapping Dictionary
//     if (SUBJECT_MAP[rawSubject]) {
//         return {
//             code: rawSubject, // CP
//             title: SUBJECT_MAP[rawSubject] // Competitive Programming
//         };
//     }

//     // Case 3: Unknown format, return as is
//     return {
//         code: rawSubject.substring(0, 3).toUpperCase(), // First 3 chars as psuedo-code
//         title: rawSubject
//     };
// };

// const AdminTimetablePage = () => {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   const [animate, setAnimate] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
  
//   // Data State
//   const [timetableData, setTimetableData] = useState({});
//   const [batchesBySem, setBatchesBySem] = useState({}); 
//   const [selectedBatch, setSelectedBatch] = useState('');

//   // Date Selection State
//   const [selectedDate, setSelectedDate] = useState(new Date());

//   // Render State
//   const [todaysGroupedSchedule, setTodaysGroupedSchedule] = useState({});
//   const [upcomingSchedule, setUpcomingSchedule] = useState([]);
//   const [currentPage, setCurrentPage] = useState(0); 

//   // --- 1. Init: Fetch Backend Data ---
//   useEffect(() => {
//     if (!user) {
//         navigate('/');
//         return;
//     }

//     const fetchTimetable = async () => {
//         try {
//             // GET Request: Plain URL params, Response Decrypted
//             const response = await fetch(`${API_URL}/api/admin/get-all-timetables`, {
//                 method: 'GET',
//                 credentials: 'include'
//             });
            
//             if (response.status === 401 || response.status === 403) {
//                 logout();
//                 return;
//             }

//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const rawJson = await response.json();
//             // DECRYPT RESPONSE
//             const result = rawJson.data ? decryptData(rawJson.data) : rawJson;
            
//             const processedData = {};
//             const semGrouping = {};
//             let firstBatch = '';

//             const semesterDataArray = result.success && Array.isArray(result.data) ? result.data : [];

//             semesterDataArray.forEach(semGroup => {
//                 const semKey = semGroup.semester;
//                 if (!semGrouping[semKey]) semGrouping[semKey] = [];

//                 if (semGroup.batches && Array.isArray(semGroup.batches)) {
//                     semGroup.batches.forEach(batchObj => {
//                         const batchDisplayName = `${batchObj.batch} (${batchObj.sem})`;
//                         semGrouping[semKey].push(batchDisplayName);
//                         if (!firstBatch) firstBatch = batchDisplayName;

//                         const scheduleMap = {};
//                         if (batchObj.weekSchedule) {
//                             batchObj.weekSchedule.forEach(dayObj => {
//                                 scheduleMap[dayObj.day] = dayObj.periods.map(p => ({
//                                     time: `${p.startTime} - ${p.endTime}`,
//                                     rawSubject: p.subject, // Keep raw for processing
//                                     room: p.roomNo,
//                                     faculty: p.faculty && Array.isArray(p.faculty) 
//                                         ? p.faculty.map(f => f.name).join(', ') 
//                                         : 'N/A'
//                                 }));
//                             });
//                         }
//                         processedData[batchDisplayName] = scheduleMap;
//                     });
//                 }
//             });

//             setTimetableData(processedData);
//             setBatchesBySem(semGrouping);
//             if (firstBatch) setSelectedBatch(firstBatch);

//         } catch (error) {
//             console.error("Error fetching timetable:", error);
//         } finally {
//             setIsLoading(false);
//             setTimeout(() => setAnimate(true), 100);
//         }
//     };

//     fetchTimetable();
//   }, [user, navigate, logout]); 

//   // --- 2. LOGIC: TODAY'S SCHEDULE (Grouped by Sem) ---
//   useEffect(() => {
//     if (Object.keys(batchesBySem).length === 0) return;

//     const targetDayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
//     const groupedResult = {};

//     Object.keys(batchesBySem).forEach(sem => {
//         const batchesInSem = batchesBySem[sem];
        
//         const batchDataList = batchesInSem.map(batchName => {
//             const dailyClasses = timetableData[batchName] ? (timetableData[batchName][targetDayName] || []) : [];
//             const primaryClass = dailyClasses.length > 0 ? dailyClasses[0] : null;

//             let classDetails = null;
//             if (primaryClass) {
//                 const style = getSubjectStyle(primaryClass.rawSubject);
//                 const { title, code } = parseSubjectInfo(primaryClass.rawSubject);

//                 classDetails = {
//                     ...primaryClass,
//                     fullTitle: title, // "Competitive Programming"
//                     displayCode: code, // "CP" or "CDC001"
//                     icon: style.icon,
//                     gradient: style.gradient,
//                     glass: style.glass,
//                     textColor: style.text
//                 };
//             }

//             return {
//                 batchName: batchName,
//                 hasClass: !!classDetails,
//                 classInfo: classDetails
//             };
//         });

//         groupedResult[sem] = batchDataList;
//     });

//     setTodaysGroupedSchedule(groupedResult);
//   }, [batchesBySem, selectedDate, timetableData]);

//   // --- 3. LOGIC: UPCOMING SCHEDULE (Specific Batch) ---
//   useEffect(() => {
//     if (!selectedBatch || !timetableData[selectedBatch]) return;

//     const batchTimetable = timetableData[selectedBatch];
//     const allDates = [];
//     let currentDate = new Date(); 
//     let safetyCounter = 0;
    
//     currentDate.setDate(currentDate.getDate() + 1);

//     while (allDates.length < 12 && safetyCounter < 30) {
//         const dayIndex = currentDate.getDay();
//         if (dayIndex !== 0) { allDates.push(new Date(currentDate)); } 
//         currentDate.setDate(currentDate.getDate() + 1);
//         safetyCounter++;
//     }

//     const processedData = allDates.map((date) => {
//         const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
//         const displayDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
//         const displayDay = date.toLocaleDateString('en-US', { weekday: 'short' });

//         const dailyClasses = batchTimetable[dayName] || [];
//         const primaryClass = dailyClasses.length > 0 ? dailyClasses[0] : null;
        
//         let classDetails = null;
//         if (primaryClass) {
//             const style = getSubjectStyle(primaryClass.rawSubject);
//             const { title, code } = parseSubjectInfo(primaryClass.rawSubject);

//             classDetails = {
//                 ...primaryClass,
//                 fullTitle: title,
//                 displayCode: code,
//                 icon: style.icon,
//                 gradient: style.gradient,
//                 glass: style.glass,
//                 textColor: style.text
//             };
//         }

//         return { 
//             date: displayDate, 
//             day: displayDay, 
//             hasClass: !!classDetails,
//             classInfo: classDetails,
//         };
//     });

//     setUpcomingSchedule(processedData); 
//   }, [selectedBatch, timetableData]);

//   const ITEMS_PER_PAGE = 6;
//   const currentViewSchedule = upcomingSchedule.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

//   const formatDateForInput = (date) => {
//     const d = new Date(date);
//     let month = '' + (d.getMonth() + 1);
//     let day = '' + d.getDate();
//     const year = d.getFullYear();
//     if (month.length < 2) month = '0' + month;
//     if (day.length < 2) day = '0' + day;
//     return [year, month, day].join('-');
//   };

//   if (isLoading) {
//     return <Loader />;
//   }

//   if (!user) return null;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans pb-32">
      
//       {/* --- HEADER --- */}
//       <div className="relative px-4 sm:px-6 lg:px-8 pt-4 pb-6 z-20">
//          <Header animate={animate} />
//          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4"></div>
//       </div>

//       <main className="px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto space-y-10">
        
//         {/* =========================================================
//             SECTION 1: MASTER TIMETABLE VIEW (ALL SEMS)
//            ========================================================= */}
//         <section className={`transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
//             {/* Title & Controls */}
//             <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
//                 <div>
//                     <h1 className="text-2xl font-bold text-white flex items-center gap-3">
//                         <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
//                             <LayoutGrid className="text-blue-400 w-5 h-5" />
//                         </div>
//                         Master Time Table
//                     </h1>
//                     <p className="text-gray-400 text-sm mt-1 ml-14 font-medium">
//                         Showing schedule for: <span className="text-white font-bold">{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
//                     </p>
//                 </div>

//                 {/* Controls */}
//                 <div className="flex items-center gap-3 z-30 flex-wrap md:flex-nowrap">
//                     <button 
//                         onClick={() => navigate('/admin/create-timetable')}
//                         className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 border border-white/10"
//                     >
//                         <Plus size={16} /> Create Schedule
//                     </button>

//                     <button 
//                         onClick={() => navigate('/modify-timetable')} 
//                         className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-sm backdrop-blur-md border border-white/10 transition-all transform hover:scale-105 active:scale-95"
//                     >
//                         <Edit size={16} /> Modify
//                     </button>

//                     <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-1.5 rounded-xl backdrop-blur-md">
//                         <div className="relative">
//                             <input 
//                                 type="date" 
//                                 value={formatDateForInput(selectedDate)}
//                                 onChange={(e) => setSelectedDate(new Date(e.target.value))}
//                                 className="bg-[#0F172A] text-white text-sm font-bold px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-blue-500 appearance-none min-w-[140px] cursor-pointer"
//                             />
//                             <Calendar className="w-4 h-4 text-white absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* --- ITERATE OVER SEMESTERS --- */}
//             {Object.keys(todaysGroupedSchedule).length > 0 ? (
//                 Object.keys(todaysGroupedSchedule).sort().reverse().map((sem) => (
//                     <div key={sem} className="mb-10">
//                         {/* Semester Header Row */}
//                         <div className="flex items-center gap-3 mb-5 pl-1">
//                             <div className="h-px w-8 bg-blue-500/50"></div>
//                             <h3 className="text-lg font-bold text-blue-200 tracking-wider flex items-center gap-2">
//                                 <Layers size={18} className="text-blue-400" />
//                                 {sem} SEMESTER
//                             </h3>
//                             <div className="h-px flex-1 bg-gradient-to-r from-blue-500/20 to-transparent"></div>
//                         </div>

//                         {/* Batches Grid for this Semester */}
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                             {todaysGroupedSchedule[sem].map((batchData, idx) => (
//                                 <div 
//                                     key={idx}
//                                     className={`
//                                         relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:shadow-lg
//                                         ${batchData.hasClass ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white/5 border-white/5 opacity-50'}
//                                     `}
//                                 >
//                                     <div className="flex justify-between items-start mb-3">
//                                         <h3 className="text-sm font-bold text-white truncate w-3/4" title={batchData.batchName}>
//                                             {batchData.batchName}
//                                         </h3>
//                                         {batchData.hasClass ? (
//                                             <div className={`p-1.5 rounded-md ${batchData.classInfo.glass} ${batchData.classInfo.textColor}`}>
//                                                 {React.cloneElement(batchData.classInfo.icon, { className: "w-3 h-3" })}
//                                             </div>
//                                         ) : (
//                                             <div className="p-1.5 rounded-md bg-white/5 text-gray-500">
//                                                 <Sun size={12} />
//                                             </div>
//                                         )}
//                                     </div>

//                                     {batchData.hasClass ? (
//                                         <div className="space-y-2">
//                                             <div className="flex items-center gap-2">
//                                                 <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${batchData.classInfo.gradient}`}></div>
//                                                 <div className="min-w-0">
//                                                     {/* Full Name Display */}
//                                                     <p className="text-xs text-gray-300 font-medium line-clamp-1" title={batchData.classInfo.fullTitle}>
//                                                         {batchData.classInfo.fullTitle}
//                                                     </p>
//                                                     {/* Short Code Display */}
//                                                     <p className={`text-[10px] font-bold ${batchData.classInfo.textColor} tracking-wider`}>
//                                                         {batchData.classInfo.displayCode}
//                                                     </p>
//                                                 </div>
//                                             </div>
                                            
//                                             <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
//                                                 <User size={10} className="shrink-0" />
//                                                 <span className="truncate" title={batchData.classInfo.faculty}>
//                                                     {batchData.classInfo.faculty || 'N/A'}
//                                                 </span>
//                                             </div>

//                                             <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
//                                                 <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-black/20 px-1.5 py-0.5 rounded">
//                                                     <Clock size={10} /> {batchData.classInfo.time.split(' - ')[0]}
//                                                 </span>
//                                                 <span className="flex items-center gap-1 text-[10px] text-gray-400">
//                                                     <MapPin size={10} /> {batchData.classInfo.room}
//                                                 </span>
//                                             </div>
//                                         </div>
//                                     ) : (
//                                         <div className="flex flex-col items-center justify-center py-4 bg-black/10 rounded-lg">
//                                             <span className="text-xs text-gray-500 font-medium">No Class</span>
//                                         </div>
//                                     )}
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 ))
//             ) : (
//                 <div className="text-center text-gray-500 py-10">No schedule available for this date.</div>
//             )}
//         </section>

//         <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

//         {/* =========================================================
//             SECTION 2: SPECIFIC BATCH PLAN (Grouped Dropdown)
//            ========================================================= */}
//         <section className={`transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
//             <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
//                 <div className="flex items-center gap-3">
//                     <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
//                         <CalendarDays className="text-purple-400 w-5 h-5" />
//                     </div>
//                     <h2 className="text-xl font-bold text-white">Specific Batch Plan</h2>
//                 </div>

//                 {/* Grouped Dropdown Selector */}
//                 <div className="relative z-30 w-full md:w-auto">
//                     <div className="flex items-center gap-2 bg-[#0F172A] border border-white/20 p-1.5 rounded-xl shadow-lg ring-1 ring-white/5">
//                         <div className="px-2 text-gray-400">
//                             <Filter size={14} />
//                         </div>
//                         <select
//                             value={selectedBatch}
//                             onChange={(e) => {
//                                 setSelectedBatch(e.target.value);
//                                 setCurrentPage(0);
//                             }}
//                             className="bg-transparent text-white px-2 py-1.5 pr-8 focus:outline-none cursor-pointer text-sm font-bold appearance-none min-w-[200px]"
//                         >
//                             {Object.keys(batchesBySem).sort().reverse().map(sem => (
//                                 <optgroup key={sem} label={`${sem} SEMESTER`} className="bg-[#071225] text-gray-400 font-bold">
//                                     {batchesBySem[sem].map(batchName => (
//                                         <option key={batchName} value={batchName} className="text-white font-normal">
//                                             {batchName}
//                                         </option>
//                                     ))}
//                                 </optgroup>
//                             ))}
//                         </select>
//                         <ChevronRight className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none rotate-90" />
//                     </div>
//                 </div>
//             </div>

//             {/* Upcoming Grid */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
//                 {currentViewSchedule.map((dayData, index) => (
//                     <div 
//                         key={index}
//                         className={`
//                             relative rounded-2xl border transition-all duration-300 overflow-hidden group hover:shadow-xl
//                             ${dayData.hasClass 
//                                 ? `${dayData.classInfo.glass} hover:border-white/20` 
//                                 : 'bg-white/5 border-white/5 opacity-60'}
//                         `}
//                     >
//                         {/* Header */}
//                         <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
//                             <div className="flex items-center gap-3">
//                                 <div className="text-center">
//                                     <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">{dayData.day}</span>
//                                     <span className="block text-lg font-bold text-white leading-none mt-0.5">{dayData.date.split(' ')[0]}</span>
//                                 </div>
//                                 <div className="h-8 w-px bg-white/10"></div>
//                                 <span className="text-sm font-medium text-gray-300">{dayData.date.split(' ')[1]}</span>
//                             </div>
//                         </div>

//                         {/* Content */}
//                         <div className="p-5 min-h-[120px] flex flex-col justify-center relative">
//                             {dayData.hasClass ? (
//                                 <>
//                                     <div className="relative z-10">
//                                         <div className="flex items-center gap-3 mb-3">
//                                             <div className={`p-2 rounded-lg bg-black/30 backdrop-blur-sm shadow-sm ${dayData.classInfo.textColor}`}>
//                                                 {React.cloneElement(dayData.classInfo.icon, { className: "w-4 h-4" })}
//                                             </div>
//                                             {/* DISPLAY CODE (CP, JFS) */}
//                                             <span className={`text-xs font-bold uppercase tracking-wider ${dayData.classInfo.textColor}`}>
//                                                 {dayData.classInfo.displayCode}
//                                             </span>
//                                         </div>
                                        
//                                         {/* FULL TITLE (Competitive Programming) */}
//                                         <h3 className="text-sm font-bold text-white leading-tight mb-3 line-clamp-2" title={dayData.classInfo.fullTitle}>
//                                             {dayData.classInfo.fullTitle}
//                                         </h3>
                                        
//                                         <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 bg-black/10 p-1.5 rounded-md border border-white/5">
//                                             <User size={12} className="text-gray-500 shrink-0" />
//                                             <span className="truncate font-medium">
//                                                 {dayData.classInfo.faculty || 'N/A'}
//                                             </span>
//                                         </div>

//                                         <div className="flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-3">
//                                             <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded">
//                                                 <Clock size={12} /> {dayData.classInfo.time.split(' - ')[0]}
//                                             </span>
//                                             <span className="flex items-center gap-1.5">
//                                                 <MapPin size={12} /> {dayData.classInfo.room}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </>
//                             ) : (
//                                 <div className="flex flex-col items-center justify-center text-center">
//                                     <div className="p-2 rounded-full bg-white/5 mb-2">
//                                         <CalendarDays size={18} className="text-gray-500" />
//                                     </div>
//                                     <span className="text-xs font-medium text-gray-500">Free Day</span>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </section>

//       </main>

//       {/* --- BOTTOM CONTROLLERS --- */}
//       <div className="fixed bottom-6 left-0 right-0 z-30 px-4 pointer-events-none flex justify-center">
//         <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full p-1.5 flex items-center gap-2 pointer-events-auto ring-1 ring-white/5">
//             <button 
//                 onClick={() => setCurrentPage(0)}
//                 disabled={currentPage === 0}
//                 className={`
//                     flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300
//                     ${currentPage === 0 
//                         ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
//                         : 'bg-[#071225] text-white hover:bg-blue-600 border border-white/10 shadow-lg'}
//                 `}
//             >
//                 <ChevronLeft size={16} />
//                 <span className="text-xs font-bold uppercase tracking-wide">This Week</span>
//             </button>

//             <button 
//                 onClick={() => setCurrentPage(1)}
//                 disabled={currentPage === 1}
//                 className={`
//                     flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300
//                     ${currentPage === 1 
//                         ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
//                         : 'bg-white text-[#071225] hover:bg-gray-200 border border-white/20 shadow-lg'}
//                 `}
//             >
//                 <span className="text-xs font-bold uppercase tracking-wide">Next Week</span>
//                 <ChevronRight size={16} />
//             </button>
//         </div>
//       </div>

//     </div>
//   );
// };

// export default AdminTimetablePage;