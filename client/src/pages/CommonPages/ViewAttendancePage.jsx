import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ListOrdered, ChevronLeft, ChevronRight, Filter, 
    Search, ClipboardList, GraduationCap 
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Loader'; // IMPORTED LOADER

const backendUrl = import.meta.env.VITE_BASE_URL;
const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// --- Helper Components ---

const CalendarModal = ({ dailyLogs, position }) => {
    if (!dailyLogs || dailyLogs.length === 0) return null;

    const [currentDate, setCurrentDate] = useState(() => {
        return new Date(dailyLogs.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b).date);
    });

    const logsByDate = useMemo(() => {
        const map = new Map();
        dailyLogs.forEach(log => {
            if (!map.has(log.date)) map.set(log.date, []);
            map.get(log.date).push(log);
        });
        return map;
    }, [dailyLogs]);

    const changeMonth = (offset) => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + offset);
            return d;
        });
    };
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const renderDays = () => {
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-full h-8"></div>);
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const logs = logsByDate.get(dateStr);
            let bgColor = 'bg-white/10';
            let tooltip = 'No data';

            if (logs && logs.length > 0) {
                const isPresent = logs.some(log => log.status === 'present');
                bgColor = isPresent ? 'bg-green-500/80' : 'bg-red-500/80';
                tooltip = logs.map(log => `${log.course}: ${log.status}`).join(' | ');
            }

            days.push(
                <div key={day} className={`w-full h-8 flex items-center justify-center rounded-full ${bgColor} relative group text-xs cursor-default`}>
                    {day}
                    <span className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
                        {tooltip}
                    </span>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="fixed z-[150] bg-black/60 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-white/20 w-72 animate-in fade-in zoom-in-95" style={{ top: position.y, left: position.x }}>
            <div className="flex justify-between items-center mb-3">
                <button onClick={() => changeMonth(-1)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={16}/></button>
                <h3 className="font-bold text-sm">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => changeMonth(1)} className="hover:bg-white/20 p-1 rounded-full"><ChevronRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-2 font-bold text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">{renderDays()}</div>
        </div>
    );
};

// --- Main Component ---

const ViewAttendance = () => {
    const { user, logout } = useAuth(); 
    const navigate = useNavigate();

    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('VI'); 
    const [selectedBatch, setSelectedBatch] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [animate, setAnimate] = useState(false);
    const [modalData, setModalData] = useState({ visible: false, logs: [], position: { x: 0, y: 0 }, key: null });
    
    const itemsPerPage = 25;
    const hideTimerRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Fetch Data on Sem Change
    useEffect(() => {
        if (!user) { navigate('/'); return; }

        const fetchData = async () => {
            setLoading(true);
            setAllStudents([]); 
            try {
                const apiUrl = `${backendUrl}/api/view-students/${selectedSemester}`;
                const response = await fetch(apiUrl, { method: "GET", credentials: "include" });

                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }

                if (!response.ok) throw new Error("Failed to fetch data");
                const data = await response.json();
                const studentList = data.AllStudents || data.students || data || [];
                setAllStudents(studentList);

            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, selectedSemester, navigate, logout]);

    // Derived Data
    const batches = useMemo(() => ['All', ...[...new Set(allStudents.map(s => s.batch))].sort()], [allStudents]);
    
    const filteredStudents = useMemo(() => {
        return allStudents
            .filter(s => 
                (s.rollno.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (selectedBatch === 'All' || s.batch === selectedBatch)
            )
            .sort((a, b) => a.rollno.localeCompare(b.rollno));
    }, [allStudents, searchTerm, selectedBatch]);

    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStudents.slice(start, start + itemsPerPage);
    }, [currentPage, filteredStudents]);

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

    const courseNames = useMemo(() => {
        const courses = new Set();
        allStudents.forEach(s => {
            if (s.courseAttendance) Object.keys(s.courseAttendance).forEach(c => courses.add(c));
        });
        return Array.from(courses).sort();
    }, [allStudents]);

    // Handlers
    const handleMouseEnter = (e, student) => {
        if ('ontouchstart' in window) return;
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

        const modalH = 250;
        let x = e.clientX + 20;
        let y = e.clientY - (modalH / 2);

        if (x + 288 > window.innerWidth) x = e.clientX - 308;
        if (y < 10) y = 10;
        if (y + modalH > window.innerHeight) y = window.innerHeight - modalH - 10;

        setModalData({ visible: true, logs: student.dailyLogs, position: { x, y }, key: student.rollno });
    };

    const handleMouseLeave = () => {
        hideTimerRef.current = setTimeout(() => {
            setModalData(prev => ({ ...prev, visible: false }));
        }, 300);
    };

    const getPercentage = (present, total) => total > 0 ? ((present / total) * 100).toFixed(2) : "0.00";
    
    const getPercentageColor = (perc) => {
        const p = parseFloat(perc);
        if (p < 60) return 'text-red-400';
        if (p < 75) return 'text-amber-400';
        return 'text-emerald-400';
    };

    // --- LOADING CHECK ---
    if (loading) {
        return <Loader />;
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans">
            <div className="px-4 sm:px-6 lg:px-8 relative z-10">
                <Header animate={animate} />
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4"></div>
            </div>
            
            {modalData.visible && (
                <div onMouseEnter={() => clearTimeout(hideTimerRef.current)} onMouseLeave={handleMouseLeave}>
                    <CalendarModal dailyLogs={modalData.logs} position={modalData.position} />
                </div>
            )}

            <main className="px-2 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto pb-32">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    {/* --- UPDATED: White Bold Title --- */}
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                        <ClipboardList className="w-8 h-8 text-blue-400" /> Attendance Board
                    </h1>
                </div>

                {/* FILTERS */}
                <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-8 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 1. Semester Selector */}
                        <div className="relative group">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Semester</label>
                            <div className="relative">
                                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 z-10" />
                                <select 
                                    value={selectedSemester} 
                                    onChange={e => { setSelectedSemester(e.target.value); setCurrentPage(1); }} 
                                    // UPDATED: Blue border styling
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-bold transition-all shadow-sm"
                                >
                                    {SEMESTERS.map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 2. Batch Filter */}
                        <div className="relative group">
                             <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Batch</label>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 z-10" />
                                <select 
                                    value={selectedBatch} 
                                    onChange={e => { setSelectedBatch(e.target.value); setCurrentPage(1); }} 
                                    // UPDATED: Blue border styling
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium transition-all shadow-sm"
                                >
                                    {batches.map(batch => <option key={batch} value={batch}>{batch === 'All' ? 'All Batches' : batch}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 3. Search */}
                        <div className="relative group">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Search Student</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 z-10" />
                                <input 
                                    type="text" 
                                    placeholder="Roll No or Name..." 
                                    value={searchTerm} 
                                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                                    // UPDATED: Blue border styling
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <ListOrdered className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-bold text-white">Students Found: <span className="text-blue-400">{filteredStudents.length}</span></h2>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 font-bold text-xs text-gray-400 uppercase border-b border-white/10 bg-black/20">
                            <div className="col-span-1">#</div>
                            <div className="col-span-3">Student Details</div>
                            {courseNames.slice(0, 6).map(c => <div key={c} className="col-span-1 text-center truncate" title={c}>{c}</div>)}
                            <div className="col-span-2 text-right">Overall %</div>
                        </div>

                        {/* Table Body */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {paginatedStudents.length > 0 ? paginatedStudents.map((student, index) => {
                                const sno = (currentPage - 1) * itemsPerPage + index + 1;
                                const overallPerc = getPercentage(student.overallAttendance?.presentDays, student.overallAttendance?.totalDays);
                                
                                return (
                                    <div 
                                        key={student.rollno}
                                        className="border-b border-white/5 hover:bg-white/10 transition-colors duration-200 group"
                                        onMouseEnter={(e) => handleMouseEnter(e, student)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        {/* Mobile View */}
                                        <div className="md:hidden p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <span className="text-gray-500 text-sm font-mono w-6">{sno}</span>
                                                <div>
                                                    <div className="font-bold text-white text-sm">{student.name}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{student.rollno}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-lg font-bold ${getPercentageColor(overallPerc)}`}>{overallPerc}%</div>
                                                <div className="text-[10px] text-gray-500 uppercase">Overall</div>
                                            </div>
                                        </div>

                                        {/* Desktop View */}
                                        <div className="hidden md:grid grid-cols-12 gap-4 items-center px-6 py-3 text-sm">
                                            <div className="col-span-1 text-gray-500 font-mono">{sno}</div>
                                            <div className="col-span-3">
                                                <div className="font-bold text-white truncate">{student.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{student.rollno}</div>
                                            </div>
                                            {courseNames.slice(0, 6).map(course => {
                                                const att = student.courseAttendance?.[course];
                                                const perc = att ? getPercentage(att.presentDays, att.totalDays) : '0.00';
                                                return (
                                                    <div key={course} className={`col-span-1 text-center font-bold ${getPercentageColor(perc)}`}>
                                                        {perc}%
                                                    </div>
                                                );
                                            })}
                                            <div className={`col-span-2 text-right font-black text-lg ${getPercentageColor(overallPerc)}`}>
                                                {overallPerc}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                                    <ClipboardList size={40} className="mb-2 opacity-50"/>
                                    <p>No students found for Semester {selectedSemester}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center mt-6 gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm font-bold text-gray-400 px-2">Page {currentPage} of {totalPages}</span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </main>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.2); }
            `}</style>
        </div>
    );
};

export default ViewAttendance;

// import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { 
//     ListOrdered, ChevronLeft, ChevronRight, Filter, 
//     Search, ClipboardList, GraduationCap 
// } from 'lucide-react';
// import Header from '../../components/Header';
// import { useAuth } from '../../context/AuthContext';
// import Loader from '../../components/Loader'; 
// import CryptoJS from 'crypto-js'; // Import CryptoJS

// const backendUrl = import.meta.env.VITE_BASE_URL;
// const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_SECRET_KEY; // Get Secret Key
// const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

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

// // --- Helper Components ---

// const CalendarModal = ({ dailyLogs, position }) => {
//     if (!dailyLogs || dailyLogs.length === 0) return null;

//     const [currentDate, setCurrentDate] = useState(() => {
//         return new Date(dailyLogs.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b).date);
//     });

//     const logsByDate = useMemo(() => {
//         const map = new Map();
//         dailyLogs.forEach(log => {
//             if (!map.has(log.date)) map.set(log.date, []);
//             map.get(log.date).push(log);
//         });
//         return map;
//     }, [dailyLogs]);

//     const changeMonth = (offset) => {
//         setCurrentDate(prev => {
//             const d = new Date(prev);
//             d.setMonth(d.getMonth() + offset);
//             return d;
//         });
//     };
    
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth();
//     const firstDay = new Date(year, month, 1).getDay();
//     const daysInMonth = new Date(year, month + 1, 0).getDate();

//     const renderDays = () => {
//         const days = [];
//         for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-full h-8"></div>);
//         for (let day = 1; day <= daysInMonth; day++) {
//             const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//             const logs = logsByDate.get(dateStr);
//             let bgColor = 'bg-white/10';
//             let tooltip = 'No data';

//             if (logs && logs.length > 0) {
//                 const isPresent = logs.some(log => log.status === 'present');
//                 bgColor = isPresent ? 'bg-green-500/80' : 'bg-red-500/80';
//                 tooltip = logs.map(log => `${log.course}: ${log.status}`).join(' | ');
//             }

//             days.push(
//                 <div key={day} className={`w-full h-8 flex items-center justify-center rounded-full ${bgColor} relative group text-xs cursor-default`}>
//                     {day}
//                     <span className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
//                         {tooltip}
//                     </span>
//                 </div>
//             );
//         }
//         return days;
//     };

//     return (
//         <div className="fixed z-[150] bg-black/60 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-white/20 w-72 animate-in fade-in zoom-in-95" style={{ top: position.y, left: position.x }}>
//             <div className="flex justify-between items-center mb-3">
//                 <button onClick={() => changeMonth(-1)} className="hover:bg-white/20 p-1 rounded-full"><ChevronLeft size={16}/></button>
//                 <h3 className="font-bold text-sm">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
//                 <button onClick={() => changeMonth(1)} className="hover:bg-white/20 p-1 rounded-full"><ChevronRight size={16}/></button>
//             </div>
//             <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-2 font-bold text-center">
//                 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
//             </div>
//             <div className="grid grid-cols-7 gap-1 text-xs">{renderDays()}</div>
//         </div>
//     );
// };

// // --- Main Component ---

// const ViewAttendance = () => {
//     const { user, logout } = useAuth(); 
//     const navigate = useNavigate();

//     const [allStudents, setAllStudents] = useState([]);
//     const [loading, setLoading] = useState(false);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [selectedSemester, setSelectedSemester] = useState('VI'); 
//     const [selectedBatch, setSelectedBatch] = useState('All');
//     const [currentPage, setCurrentPage] = useState(1);
//     const [animate, setAnimate] = useState(false);
//     const [modalData, setModalData] = useState({ visible: false, logs: [], position: { x: 0, y: 0 }, key: null });
    
//     const itemsPerPage = 25;
//     const hideTimerRef = useRef(null);

//     useEffect(() => {
//         const timer = setTimeout(() => setAnimate(true), 100);
//         return () => clearTimeout(timer);
//     }, []);

//     // Fetch Data on Sem Change
//     useEffect(() => {
//         if (!user) { navigate('/'); return; }

//         const fetchData = async () => {
//             setLoading(true);
//             setAllStudents([]); 
//             try {
//                 // GET Request: Plain URL params
//                 const apiUrl = `${backendUrl}/api/view-students/${selectedSemester}`;
//                 const response = await fetch(apiUrl, { method: "GET", credentials: "include" });

//                 if (response.status === 401 || response.status === 403) {
//                     logout();
//                     return;
//                 }

//                 if (!response.ok) throw new Error("Failed to fetch data");
                
//                 const rawJson = await response.json();
                
//                 // DECRYPT RESPONSE
//                 const data = rawJson.data ? decryptData(rawJson.data) : rawJson;
                
//                 const studentList = data.AllStudents || data.students || data || [];
//                 setAllStudents(studentList);

//             } catch (err) {
//                 console.error("Fetch Error:", err);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchData();
//     }, [user, selectedSemester, navigate, logout]);

//     // Derived Data
//     const batches = useMemo(() => ['All', ...[...new Set(allStudents.map(s => s.batch))].sort()], [allStudents]);
    
//     const filteredStudents = useMemo(() => {
//         return allStudents
//             .filter(s => 
//                 (s.rollno.toLowerCase().includes(searchTerm.toLowerCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
//                 (selectedBatch === 'All' || s.batch === selectedBatch)
//             )
//             .sort((a, b) => a.rollno.localeCompare(b.rollno));
//     }, [allStudents, searchTerm, selectedBatch]);

//     const paginatedStudents = useMemo(() => {
//         const start = (currentPage - 1) * itemsPerPage;
//         return filteredStudents.slice(start, start + itemsPerPage);
//     }, [currentPage, filteredStudents]);

//     const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

//     const courseNames = useMemo(() => {
//         const courses = new Set();
//         allStudents.forEach(s => {
//             if (s.courseAttendance) Object.keys(s.courseAttendance).forEach(c => courses.add(c));
//         });
//         return Array.from(courses).sort();
//     }, [allStudents]);

//     // Handlers
//     const handleMouseEnter = (e, student) => {
//         if ('ontouchstart' in window) return;
//         if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

//         const modalH = 250;
//         let x = e.clientX + 20;
//         let y = e.clientY - (modalH / 2);

//         if (x + 288 > window.innerWidth) x = e.clientX - 308;
//         if (y < 10) y = 10;
//         if (y + modalH > window.innerHeight) y = window.innerHeight - modalH - 10;

//         setModalData({ visible: true, logs: student.dailyLogs, position: { x, y }, key: student.rollno });
//     };

//     const handleMouseLeave = () => {
//         hideTimerRef.current = setTimeout(() => {
//             setModalData(prev => ({ ...prev, visible: false }));
//         }, 300);
//     };

//     const getPercentage = (present, total) => total > 0 ? ((present / total) * 100).toFixed(2) : "0.00";
    
//     const getPercentageColor = (perc) => {
//         const p = parseFloat(perc);
//         if (p < 60) return 'text-red-400';
//         if (p < 75) return 'text-amber-400';
//         return 'text-emerald-400';
//     };

//     // --- LOADING CHECK ---
//     if (loading) {
//         return <Loader />;
//     }

//     if (!user) return null;

//     return (
//         <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans">
//             <div className="px-4 sm:px-6 lg:px-8 relative z-10">
//                 <Header animate={animate} />
//                 <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4"></div>
//             </div>
            
//             {modalData.visible && (
//                 <div onMouseEnter={() => clearTimeout(hideTimerRef.current)} onMouseLeave={handleMouseLeave}>
//                     <CalendarModal dailyLogs={modalData.logs} position={modalData.position} />
//                 </div>
//             )}

//             <main className="px-2 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto pb-32">
//                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
//                     {/* --- UPDATED: White Bold Title --- */}
//                     <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
//                         <ClipboardList className="w-8 h-8 text-blue-400" /> Attendance Board
//                     </h1>
//                 </div>

//                 {/* FILTERS */}
//                 <div className={`bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-8 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
//                         {/* 1. Semester Selector */}
//                         <div className="relative group">
//                             <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Semester</label>
//                             <div className="relative">
//                                 <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 z-10" />
//                                 <select 
//                                     value={selectedSemester} 
//                                     onChange={e => { setSelectedSemester(e.target.value); setCurrentPage(1); }} 
//                                     // UPDATED: Blue border styling
//                                     className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-bold transition-all shadow-sm"
//                                 >
//                                     {SEMESTERS.map(sem => <option key={sem} value={sem}>Semester {sem}</option>)}
//                                 </select>
//                             </div>
//                         </div>

//                         {/* 2. Batch Filter */}
//                         <div className="relative group">
//                              <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Batch</label>
//                             <div className="relative">
//                                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 z-10" />
//                                 <select 
//                                     value={selectedBatch} 
//                                     onChange={e => { setSelectedBatch(e.target.value); setCurrentPage(1); }} 
//                                     // UPDATED: Blue border styling
//                                     className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white appearance-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium transition-all shadow-sm"
//                                 >
//                                     {batches.map(batch => <option key={batch} value={batch}>{batch === 'All' ? 'All Batches' : batch}</option>)}
//                                 </select>
//                             </div>
//                         </div>

//                         {/* 3. Search */}
//                         <div className="relative group">
//                             <label className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1 block">Search Student</label>
//                             <div className="relative">
//                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 z-10" />
//                                 <input 
//                                     type="text" 
//                                     placeholder="Roll No or Name..." 
//                                     value={searchTerm} 
//                                     onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
//                                     // UPDATED: Blue border styling
//                                     className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-blue-500/30 rounded-xl text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" 
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <div className={`transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
//                     <div className="flex items-center gap-2 mb-4">
//                         <ListOrdered className="w-5 h-5 text-blue-400" />
//                         <h2 className="text-lg font-bold text-white">Students Found: <span className="text-blue-400">{filteredStudents.length}</span></h2>
//                     </div>

//                     <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
//                         {/* Table Header */}
//                         <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 font-bold text-xs text-gray-400 uppercase border-b border-white/10 bg-black/20">
//                             <div className="col-span-1">#</div>
//                             <div className="col-span-3">Student Details</div>
//                             {courseNames.slice(0, 6).map(c => <div key={c} className="col-span-1 text-center truncate" title={c}>{c}</div>)}
//                             <div className="col-span-2 text-right">Overall %</div>
//                         </div>

//                         {/* Table Body */}
//                         <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
//                             {paginatedStudents.length > 0 ? paginatedStudents.map((student, index) => {
//                                 const sno = (currentPage - 1) * itemsPerPage + index + 1;
//                                 const overallPerc = getPercentage(student.overallAttendance?.presentDays, student.overallAttendance?.totalDays);
                                
//                                 return (
//                                     <div 
//                                         key={student.rollno}
//                                         className="border-b border-white/5 hover:bg-white/10 transition-colors duration-200 group"
//                                         onMouseEnter={(e) => handleMouseEnter(e, student)}
//                                         onMouseLeave={handleMouseLeave}
//                                     >
//                                         {/* Mobile View */}
//                                         <div className="md:hidden p-4 flex justify-between items-center">
//                                             <div className="flex items-center gap-4">
//                                                 <span className="text-gray-500 text-sm font-mono w-6">{sno}</span>
//                                                 <div>
//                                                     <div className="font-bold text-white text-sm">{student.name}</div>
//                                                     <div className="text-xs text-gray-400 font-mono">{student.rollno}</div>
//                                                 </div>
//                                             </div>
//                                             <div className="text-right">
//                                                 <div className={`text-lg font-bold ${getPercentageColor(overallPerc)}`}>{overallPerc}%</div>
//                                                 <div className="text-[10px] text-gray-500 uppercase">Overall</div>
//                                             </div>
//                                         </div>

//                                         {/* Desktop View */}
//                                         <div className="hidden md:grid grid-cols-12 gap-4 items-center px-6 py-3 text-sm">
//                                             <div className="col-span-1 text-gray-500 font-mono">{sno}</div>
//                                             <div className="col-span-3">
//                                                 <div className="font-bold text-white truncate">{student.name}</div>
//                                                 <div className="text-xs text-gray-400 font-mono">{student.rollno}</div>
//                                             </div>
//                                             {courseNames.slice(0, 6).map(course => {
//                                                 const att = student.courseAttendance?.[course];
//                                                 const perc = att ? getPercentage(att.presentDays, att.totalDays) : '0.00';
//                                                 return (
//                                                     <div key={course} className={`col-span-1 text-center font-bold ${getPercentageColor(perc)}`}>
//                                                         {perc}%
//                                                     </div>
//                                                 );
//                                             })}
//                                             <div className={`col-span-2 text-right font-black text-lg ${getPercentageColor(overallPerc)}`}>
//                                                 {overallPerc}%
//                                             </div>
//                                         </div>
//                                     </div>
//                                 );
//                             }) : (
//                                 <div className="p-10 text-center text-gray-400 flex flex-col items-center">
//                                     <ClipboardList size={40} className="mb-2 opacity-50"/>
//                                     <p>No students found for Semester {selectedSemester}</p>
//                                 </div>
//                             )}
//                         </div>
//                     </div>

//                     {/* Pagination */}
//                     {totalPages > 1 && (
//                         <div className="flex justify-center items-center mt-6 gap-2">
//                             <button 
//                                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                                 disabled={currentPage === 1}
//                                 className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
//                             >
//                                 <ChevronLeft size={20} />
//                             </button>
//                             <span className="text-sm font-bold text-gray-400 px-2">Page {currentPage} of {totalPages}</span>
//                             <button 
//                                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                                 disabled={currentPage === totalPages}
//                                 className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
//                             >
//                                 <ChevronRight size={20} />
//                             </button>
//                         </div>
//                     )}
//                 </div>
//             </main>
            
//             <style>{`
//                 .custom-scrollbar::-webkit-scrollbar { width: 6px; }
//                 .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
//                 .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
//                 .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.2); }
//             `}</style>
//         </div>
//     );
// };

// export default ViewAttendance;