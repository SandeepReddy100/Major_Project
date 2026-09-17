import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, Save, Plus, Trash2, ArrowLeft, 
    MapPin, ChevronDown, Copy, 
    GraduationCap, LayoutGrid,
    Eye, X, CheckCircle2, ListChecks,
    RotateCcw, Search, User, Loader2, AlertCircle, AlertTriangle
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';

// --- API CONFIGURATION ---
const API_URL = import.meta.env.VITE_BASE_URL;
const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// --- 1. GENERIC UI COMPONENTS ---

const StatusModal = ({ isOpen, onClose, title, message, type }) => {
    if (!isOpen) return null;
    const styles = type === 'error' 
        ? { bg: 'bg-red-50', icon: <AlertCircle className="text-red-600" size={32} />, title: 'text-red-900', btn: 'bg-red-600 hover:bg-red-700' }
        : { bg: 'bg-blue-50', icon: <CheckCircle2 className="text-blue-600" size={32} />, title: 'text-blue-900', btn: 'bg-blue-600 hover:bg-blue-700' };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className={`p-6 flex flex-col items-center text-center ${styles.bg}`}>
                    <div className="mb-4 bg-white p-3 rounded-full shadow-sm">{styles.icon}</div>
                    <h3 className={`text-xl font-bold ${styles.title} mb-2`}>{title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
                </div>
                <div className="p-4 bg-white border-t border-gray-100">
                    <button onClick={onClose} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${styles.btn}`}>
                        Okay, Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 flex gap-4">
                    <div className="flex-shrink-0 bg-amber-100 p-3 rounded-full h-12 w-12 flex items-center justify-center">
                        <AlertTriangle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="text-gray-500 text-sm mt-1 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 transition-all">Cancel</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-black shadow-lg transition-all">Confirm</button>
                </div>
            </div>
        </div>
    );
};

// --- 2. SMART FACULTY SELECT ---
const SmartFacultySelect = ({ options, value, onChange, placeholder, disabled, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    const filteredOptions = options.filter(opt => 
        opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        opt.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.id === value);

    return (
        <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
            {label && <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{label}</label>}
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:border-blue-400 ${isOpen ? 'ring-2 ring-blue-100 border-blue-500' : ''}`}
            >
                <div className="flex items-center gap-2 truncate flex-1">
                    {selectedOption ? (
                        <>
                            <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-1.5 py-0.5 rounded">{selectedOption.id}</span>
                            <span className="text-xs font-bold text-gray-800 truncate">{selectedOption.name}</span>
                        </>
                    ) : (
                        <span className="text-xs text-gray-400 font-medium">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 bottom-full mb-2 lg:bottom-auto lg:mb-0 lg:top-full">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/80">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input 
                                ref={inputRef}
                                type="text" 
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500"
                                placeholder="Search Faculty..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* CHANGED: max-h-28 allows roughly 2 items (each item ~40-50px) to show, forcing scroll for more */}
                    <div className="max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div 
                                    key={opt.id} 
                                    onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }}
                                    className={`px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center group transition-colors mb-1 ${value === opt.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-xs font-bold ${value === opt.id ? 'text-blue-700' : 'text-gray-700'}`}>{opt.name}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">{opt.id}</span>
                                    </div>
                                    {value === opt.id && <CheckCircle2 size={14} className="text-blue-600"/>}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-center text-gray-400 text-xs">No faculty found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 3. TIMETABLE SUCCESS VISUAL MODAL ---
const TimetableSuccessModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data || !data.timetable) return null;

    const { sem, batch, weekSchedule } = data.timetable;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shadow-sm"><CheckCircle2 size={28} /></div>
                        <div>
                            <h3 className="text-xl font-bold text-emerald-900">Timetable Created!</h3>
                            <p className="text-sm text-emerald-600 font-medium">The schedule is now live.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-emerald-100 hover:bg-emerald-200 rounded-full text-emerald-700 transition-colors"><X size={20}/></button>
                </div>

                {/* Grid View */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-8 custom-scrollbar">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-6xl mx-auto">
                        <div className="text-center mb-8 border-b border-gray-100 pb-6">
                            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2">Class Schedule</h1>
                            <div className="flex justify-center gap-4 text-sm font-bold text-slate-500">
                                <span className="bg-slate-100 px-3 py-1 rounded-lg">Batch: <span className="text-slate-900">{batch}</span></span>
                                <span className="bg-slate-100 px-3 py-1 rounded-lg">Semester: <span className="text-slate-900">{sem}</span></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {weekSchedule.map((dayData, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-slate-50/50">
                                    <div className="bg-slate-900 text-white py-2 px-4 text-center font-bold uppercase tracking-wider text-sm flex justify-between items-center">
                                        <span>{dayData.day}</span>
                                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white/80">{dayData.periods.length} Sessions</span>
                                    </div>
                                    <div className="p-3 space-y-3">
                                        {dayData.periods.map((p, pIdx) => {
                                            const isFN = p.session === 'FN';
                                            return (
                                                <div key={pIdx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative pl-3 overflow-hidden">
                                                    <div className={`absolute top-0 left-0 w-1 h-full ${isFN ? 'bg-teal-400' : 'bg-purple-400'}`}></div>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[10px] font-mono font-bold text-gray-400">{p.startTime} - {p.endTime}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isFN ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'}`}>{p.session}</span>
                                                    </div>
                                                    <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">{p.subject}</h4>
                                                    <div className="flex flex-col gap-0.5">
                                                        {p.faculty && p.faculty.map((fac, fIdx) => (
                                                            <div key={fIdx} className="flex items-center gap-1 text-[10px] text-gray-500">
                                                                <User size={8} /> <span className="truncate">{fac.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                                        <MapPin size={10} /> {p.roomNo}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {dayData.periods.length === 0 && (
                                            <div className="text-center py-6 text-xs text-gray-400 italic">No classes scheduled</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 4. PREVIEW MODAL ---
const PreviewModal = ({ isOpen, onClose, onConfirm, schedule, config, facultyMapping, isSubmitting, dynamicOptions }) => {
    if (!isOpen) return null;

    const totalSessions = schedule.reduce((acc, day) => acc + day.periods.length, 0);
    const assignedCourses = Object.keys(facultyMapping).length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                            <CheckCircle2 className="text-blue-500 fill-blue-100" size={28}/> 
                            Verify Schedule
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 ml-10">Review faculty allocation and timing.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400 hover:text-gray-700" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F8FAFC]">
                    {schedule.map((day) => day.periods.length > 0 && (
                        <div key={day.day} className="flex gap-6">
                            <div className="w-16 flex flex-col items-center pt-2">
                                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{day.day.substring(0,3)}</span>
                                <div className="h-full w-0.5 bg-slate-200 mt-3 rounded-full"></div>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                                {day.periods.map((p, idx) => {
                                    const mapping = facultyMapping[p.data?.subject] || { primary: '', secondary: '' };
                                    const fac1 = dynamicOptions.faculty.find(f => f.id === mapping.primary);
                                    const fac2 = dynamicOptions.faculty.find(f => f.id === mapping.secondary);
                                    
                                    const isFN = p.data?.session === 'FN';
                                    return (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-all">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${isFN ? 'bg-teal-400' : 'bg-violet-400'}`}></div>
                                            <div className="flex justify-between items-start">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isFN ? 'bg-teal-50 text-teal-700' : 'bg-violet-50 text-violet-700'}`}>{p.data?.session}</span>
                                                <span className="font-mono text-xs font-bold text-gray-500">{p.data?.startTime} - {p.data?.endTime}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-1">{p.data?.subject || "Not Selected"}</h4>
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <User size={10} className="text-blue-500"/> <span className="truncate">{fac1 ? fac1.name : "Unassigned"}</span>
                                                    </div>
                                                    {fac2 && (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                            <User size={10} className="text-purple-500"/> <span className="truncate">{fac2.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto">
                                                <div className="flex items-center gap-1 text-gray-400"><MapPin size={12}/><span className="text-xs font-bold">{p.data?.roomNo}</span></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-white">
                    <button onClick={onClose} disabled={isSubmitting} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Back to Edit</button>
                    <button onClick={onConfirm} disabled={isSubmitting} className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" size={18}/> Publishing...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Publish Schedule
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- NATIVE SELECT ---
const NativeSelect = ({ options, value, onChange, placeholder, disabled }) => (
    <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
        <select 
            value={value || ""} 
            onChange={(e) => onChange(e.target.value)} 
            disabled={disabled}
            className="w-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl py-3 px-4 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer hover:border-blue-300 transition-colors shadow-sm"
        >
            <option value="" disabled>{placeholder}</option>
            {options.map((opt) => (
                <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                    {typeof opt === 'string' ? opt : opt.label}
                </option>
            ))}
        </select>
        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
);

// --- MAIN PAGE ---
const CreateTimetablePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [animate, setAnimate] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [backendResponse, setBackendResponse] = useState(null); 

    // Modal States for Alerts
    const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    // --- DYNAMIC DATA ---
    const [facultyList, setFacultyList] = useState([]);
    const [batchOptions, setBatchOptions] = useState([]);
    const [courseOptions, setCourseOptions] = useState([]);
    const [loadingResources, setLoadingResources] = useState(false);

    const INITIAL_SCHEDULE = [
        { day: 'Monday', periods: [{ id: 1, type: 'FN' }] },
        { day: 'Tuesday', periods: [{ id: 2, type: 'FN' }] },
        { day: 'Wednesday', periods: [{ id: 3, type: 'FN' }] },
        { day: 'Thursday', periods: [{ id: 4, type: 'FN' }] },
        { day: 'Friday', periods: [{ id: 5, type: 'FN' }] },
        { day: 'Saturday', periods: [{ id: 6, type: 'FN' }] }
    ];

    const [config, setConfig] = useState({ 
        sem: '', batch: '', defaultRoom: '5101', 
        morning: { start: '09:30', end: '12:15' }, 
        afternoon: { start: '13:05', end: '15:50' } 
    });
    
    const [weekSchedule, setWeekSchedule] = useState(INITIAL_SCHEDULE);
    const [slotData, setSlotData] = useState({});
    const [facultyMapping, setFacultyMapping] = useState({});
    const [uniqueCourses, setUniqueCourses] = useState([]);
    const [isDirty, setIsDirty] = useState(false);

    // 1. Initial Load
    useEffect(() => { 
        if (!user) { navigate('/'); return; }
        const fetchFaculty = async () => {
            setLoadingResources(true);
            try {
                const res = await fetch(`${API_URL}/api/admin/view-faculty`, { credentials: "include" });
                if (res.status === 401 || res.status === 403) { logout(); return; }
                const data = await res.json();
                const mappedFaculty = Array.isArray(data) ? data.map(f => ({ id: f.facultyid, name: f.name })) : [];
                setFacultyList(mappedFaculty);
            } catch (err) { console.error(err); } 
            finally { setLoadingResources(false); setTimeout(() => setAnimate(true), 100); }
        };
        fetchFaculty();
    }, [user, navigate, logout]);

    // 2. Fetch Batches/Courses
    useEffect(() => {
        if (!config.sem) return;
        const fetchSemInfo = async () => {
            setLoadingResources(true);
            try {
                const res = await fetch(`${API_URL}/api/get-sem-info/${config.sem}`, { credentials: "include" });
                if (res.status === 401 || res.status === 403) { logout(); return; }
                const json = await res.json();
                if (json.success && json.data) {
                    setBatchOptions(json.data.batches || []);
                    setCourseOptions(json.data.courses || []);
                    if (!json.data.batches.includes(config.batch)) setConfig(prev => ({ ...prev, batch: '' }));
                }
            } catch (err) { console.error(err); } 
            finally { setLoadingResources(false); }
        };
        fetchSemInfo();
    }, [config.sem, logout]);
    
    // Prevent unload
    useEffect(() => {
        const handleBeforeUnload = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        const courses = new Set();
        Object.values(slotData).forEach(slot => { if (slot.subject) courses.add(slot.subject); });
        setUniqueCourses(Array.from(courses));
    }, [slotData]);

    // Helpers
    const getSlot = (dayIdx, pIdx, type) => {
        const key = `${dayIdx}-${pIdx}`;
        if (slotData[key]) return slotData[key];
        const timing = type === 'FN' ? config.morning : config.afternoon;
        return { startTime: timing.start, endTime: timing.end, session: type, subject: '', roomNo: config.defaultRoom };
    };

    const updateSlot = (dayIdx, pIdx, field, value) => {
        setIsDirty(true);
        const key = `${dayIdx}-${pIdx}`;
        const current = getSlot(dayIdx, pIdx, weekSchedule[dayIdx].periods[pIdx].type); 
        let updated = { ...current, [field]: value };
        if (field === 'session') {
            const newTiming = value === 'FN' ? config.morning : config.afternoon;
            updated.startTime = newTiming.start;
            updated.endTime = newTiming.end;
            const newSchedule = [...weekSchedule];
            newSchedule[dayIdx].periods[pIdx].type = value;
            setWeekSchedule(newSchedule);
        }
        setSlotData(prev => ({ ...prev, [key]: updated }));
    };

    const updateFacultyChoice = (courseId, role, facultyId) => {
        setIsDirty(true);
        setFacultyMapping(prev => ({ ...prev, [courseId]: { ...prev[courseId], [role]: facultyId } }));
    };

    const addSession = (dayIdx) => { setIsDirty(true); const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.push({ id: Date.now(), type: 'AN' }); setWeekSchedule(newSchedule); };
    const removeSession = (dayIdx, pIdx) => { setIsDirty(true); const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.splice(pIdx, 1); setWeekSchedule(newSchedule); };
    
    // --- ACTIONS ---
    const confirmReplicate = () => {
        setConfirmModal({
            isOpen: true,
            title: "Replicate Schedule?",
            message: "This will overwrite all other days with Monday's schedule structure. Existing data on other days will be lost.",
            onConfirm: () => {
                setIsDirty(true);
                const mondayStructure = weekSchedule[0].periods;
                const newSchedule = weekSchedule.map((day, dIdx) => { if (dIdx === 0) return day; return { ...day, periods: mondayStructure.map(p => ({ ...p, id: Date.now() + Math.random() })) }; });
                const newSlotData = { ...slotData };
                newSchedule.forEach((day, dIdx) => {
                    if (dIdx === 0) return;
                    day.periods.forEach((p, pIdx) => {
                        const sourceKey = `0-${pIdx}`;
                        const targetKey = `${dIdx}-${pIdx}`;
                        if (slotData[sourceKey]) newSlotData[targetKey] = { ...slotData[sourceKey] };
                    });
                });
                setWeekSchedule(newSchedule);
                setSlotData(newSlotData);
            }
        });
    };

    const confirmReset = () => {
        setConfirmModal({
            isOpen: true,
            title: "Reset Planner?",
            message: "Are you sure you want to clear the entire timetable? All unsaved progress will be lost.",
            onConfirm: () => {
                setWeekSchedule(INITIAL_SCHEDULE); setSlotData({}); setFacultyMapping({}); setIsDirty(false);
            }
        });
    };

    const getHydratedSchedule = () => weekSchedule.map((day, dIdx) => ({ day: day.day, periods: day.periods.map((p, pIdx) => ({ ...p, data: getSlot(dIdx, pIdx, p.type) })) }));

    // --- API PUBLISH ---
    const handlePublish = async () => {
        setIsSubmitting(true);
        const payload = {
            sem: config.sem,
            batch: config.batch,
            weekSchedule: weekSchedule.map((dayObj, dayIdx) => {
                const validPeriods = dayObj.periods.map((p, pIdx) => {
                    const slot = getSlot(dayIdx, pIdx, p.type);
                    if (!slot.subject) return null;
                    const mapping = facultyMapping[slot.subject] || {};
                    const facultyArray = [];
                    if (mapping.primary) { const f = facultyList.find(i => i.id === mapping.primary); if (f) facultyArray.push({ id: f.id, name: f.name }); }
                    if (mapping.secondary) { const f = facultyList.find(i => i.id === mapping.secondary); if (f) facultyArray.push({ id: f.id, name: f.name }); }
                    return { startTime: slot.startTime, endTime: slot.endTime, session: slot.session, subject: slot.subject, faculty: facultyArray, roomNo: slot.roomNo };
                }).filter(Boolean);
                return { day: dayObj.day, periods: validPeriods };
            })
        };

        try {
            const response = await fetch(`${API_URL}/api/admin/createtimetable`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include"
            });
            if (response.status === 401 || response.status === 403) { logout(); return; }
            const result = await response.json();
            if (response.ok) {
                setIsDirty(false);
                setShowPreview(false);
                setBackendResponse(result);
            } else {
                setStatusModal({ isOpen: true, title: "Save Failed", message: result.message || "Unknown error", type: "error" });
            }
        } catch (error) {
            setStatusModal({ isOpen: true, title: "Connection Error", message: "Could not reach the server. Please check your connection.", type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen text-gray-800 font-sans bg-[#F8F9FA] overflow-x-hidden pb-32">
            
            {/* MODALS */}
            <PreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} onConfirm={handlePublish} schedule={getHydratedSchedule()} config={config} facultyMapping={facultyMapping} isSubmitting={isSubmitting} dynamicOptions={{ faculty: facultyList }} />
            <TimetableSuccessModal isOpen={!!backendResponse} onClose={() => { setBackendResponse(null); confirmReset(); }} data={backendResponse} />
            <StatusModal isOpen={statusModal.isOpen} onClose={() => setStatusModal({ ...statusModal, isOpen: false })} title={statusModal.title} message={statusModal.message} type={statusModal.type} />
            <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} />

            <header className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-bl-[2.5rem] rounded-br-[2.5rem] shadow-2xl relative z-20 pb-10 pt-6 px-4 sm:px-6 lg:px-8">
                <Header animate={animate} />
                <div className="w-full h-px bg-white/10 my-6"></div>
                <div className={`flex justify-between items-end transition-all duration-1000 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                    <div>
                        <div className="flex items-center gap-2 text-blue-300 mb-2"><button onClick={() => navigate(-1)} className="hover:text-white transition-colors flex items-center gap-1"><ArrowLeft size={14} /> Back</button><span className="text-xs font-semibold uppercase tracking-wider opacity-60">/ Admin / Create</span></div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3"><LayoutGrid className="text-blue-400" size={32} /> Master Timetable</h2>
                    </div>
                    <button onClick={confirmReset} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm border border-white/10"><RotateCcw size={18} /> <span className="hidden sm:inline">Reset</span></button>
                </div>
            </header>

            <main className="px-4 sm:px-6 lg:px-8 py-10 relative z-10 max-w-7xl mx-auto space-y-10">
                {/* 1. CONFIGURATION */}
                <section className={`bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 transition-all duration-700 delay-500 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center mb-6"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Academic & Session Configuration</h2></div>
                    <div className="flex flex-col lg:flex-row gap-10">
                        <div className="w-full lg:w-1/3 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-gray-100 pb-8 lg:pb-0 lg:pr-10">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">Academic Details {loadingResources && <Loader2 className="animate-spin text-blue-500" size={14}/>}</h4>
                            <div className="space-y-6">
                                <div><label className="text-xs font-bold text-gray-600 mb-1.5 block">Semester</label><NativeSelect options={SEMESTERS} value={config.sem} onChange={(val) => setConfig({...config, sem: val})} placeholder="Select Semester" /></div>
                                <div><label className="text-xs font-bold text-gray-600 mb-1.5 block">Batch Code</label><NativeSelect options={batchOptions} value={config.batch} onChange={(val) => setConfig({...config, batch: val})} placeholder={config.sem ? "Select Batch" : "Select Sem First"} disabled={!config.sem} /></div>
                                <div><label className="text-xs font-bold text-gray-600 mb-1.5 block">Default Room</label><input type="text" value={config.defaultRoom} onChange={e => setConfig({...config, defaultRoom: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all" /></div>
                            </div>
                        </div>
                        <div className="w-full lg:w-2/3 flex flex-col gap-6">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Session Defaults</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center mb-4"><div><span className="block text-2xl font-black text-teal-900 tracking-tight">FN</span><span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Morning</span></div></div>
                                    <div className="flex items-center justify-center gap-4 bg-white border border-teal-200 p-3 rounded-xl shadow-sm"><input type="time" value={config.morning.start} onChange={e => setConfig({...config, morning: {...config.morning, start: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /><span className="text-gray-300 font-light text-2xl">—</span><input type="time" value={config.morning.end} onChange={e => setConfig({...config, morning: {...config.morning, end: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /></div>
                                </div>
                                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center mb-4"><div><span className="block text-2xl font-black text-violet-900 tracking-tight">AN</span><span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Afternoon</span></div></div>
                                    <div className="flex items-center justify-center gap-4 bg-white border border-violet-200 p-3 rounded-xl shadow-sm"><input type="time" value={config.afternoon.start} onChange={e => setConfig({...config, afternoon: {...config.afternoon, start: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /><span className="text-gray-300 font-light text-2xl">—</span><input type="time" value={config.afternoon.end} onChange={e => setConfig({...config, afternoon: {...config.afternoon, end: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- 2. WEEKLY PLANNER --- */}
                <section className={`space-y-6 transition-all duration-700 delay-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${!config.sem || !config.batch ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex justify-between items-end px-2">
                        <div className="flex items-center mb-0"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Weekly Schedule Planner</h2></div>
                        <button onClick={confirmReplicate} className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl border border-blue-100 hover:border-blue-500 shadow-sm transition-all"><Copy size={14}/> Replicate MON</button>
                    </div>
                    <div className="flex flex-col gap-6">
                        {weekSchedule.map((day, dIdx) => (
                            <div key={day.day} className="flex flex-col lg:flex-row items-stretch gap-4">
                                <div className="w-full lg:w-28 bg-black rounded-2xl flex flex-col items-center justify-center p-4 shadow-lg shrink-0 border border-gray-800">
                                    <span className="text-white font-black text-3xl tracking-widest">{day.day.substring(0,3).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 flex flex-row overflow-x-auto gap-4 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent items-stretch">
                                    {day.periods.map((period, pIdx) => {
                                        const data = getSlot(dIdx, pIdx, period.type);
                                        const isFN = data.session === 'FN';
                                        return (
                                            <div key={period.id} className={`min-w-[320px] relative rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden bg-white shadow-sm hover:shadow-md ${isFN ? 'border-teal-100 hover:border-teal-300' : 'border-violet-100 hover:border-violet-300'}`}>
                                                <div className={`px-4 py-2 border-b flex justify-between items-center ${isFN ? 'bg-teal-50/40 border-teal-50' : 'bg-violet-50/40 border-violet-50'}`}>
                                                    <select value={data.session} onChange={(e) => updateSlot(dIdx, pIdx, 'session', e.target.value)} className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer border-none outline-none shadow-sm ${isFN ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-violet-600 text-white hover:bg-violet-700'}`}><option value="FN">FN (Morning)</option><option value="AN">AN (Afternoon)</option></select>
                                                    <button onClick={() => removeSession(dIdx, pIdx)} className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-all"><Trash2 size={16} /></button>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    <div><label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Skill Course</label><NativeSelect options={courseOptions} value={data.subject} onChange={(val) => updateSlot(dIdx, pIdx, 'subject', val)} placeholder="Select Course" /></div>
                                                    <div className={`mt-auto pt-3 border-t flex items-center justify-between gap-2 ${isFN ? 'border-teal-50' : 'border-violet-50'}`}>
                                                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 w-full"><input type="time" value={data.startTime} onChange={(e) => updateSlot(dIdx, pIdx, 'startTime', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 font-mono w-24 outline-none text-center" /><span className="text-gray-300 text-[10px] font-bold">-</span><input type="time" value={data.endTime} onChange={(e) => updateSlot(dIdx, pIdx, 'endTime', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 font-mono w-24 outline-none text-center" /></div>
                                                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200"><input type="text" value={data.roomNo} onChange={(e) => updateSlot(dIdx, pIdx, 'roomNo', e.target.value)} className="w-12 bg-transparent text-xs font-bold text-gray-700 outline-none text-center" /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button onClick={() => addSession(dIdx)} className="min-w-[120px] rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-3 transition-all group"><div className="w-12 h-12 rounded-full bg-white border border-gray-200 group-hover:border-blue-200 flex items-center justify-center shadow-sm"><Plus size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors" /></div><span className="text-xs font-bold text-gray-400 group-hover:text-blue-600">Add Session</span></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- 3. FACULTY ALLOCATION --- */}
                <section className={`bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 transition-all duration-700 delay-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${!config.sem || !config.batch ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center mb-6"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Faculty Allocation</h2></div>
                    {uniqueCourses.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50"><p className="text-gray-500 font-medium">Select courses above to assign faculty.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {uniqueCourses.map(courseCode => (
                                <div key={courseCode} className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all flex flex-col gap-4">
                                    <div className="flex items-center gap-3 mb-1"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ListChecks size={18} /></div><h4 className="font-bold text-gray-800 text-sm truncate" title={courseCode}>{courseCode}</h4></div>
                                    <SmartFacultySelect label="Primary Faculty" options={facultyList} value={facultyMapping[courseCode]?.primary} onChange={(val) => updateFacultyChoice(courseCode, 'primary', val)} placeholder="Assign Primary..." />
                                    <SmartFacultySelect label="Secondary Faculty (Optional)" options={facultyList} value={facultyMapping[courseCode]?.secondary} onChange={(val) => updateFacultyChoice(courseCode, 'secondary', val)} placeholder="Assign Secondary..." />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* --- BOTTOM ACTION BAR --- */}
                <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 transition-transform duration-500 ${animate ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="text-sm font-bold text-gray-500 hidden sm:block">
                            {config.sem && config.batch ? `${config.batch} • Semester ${config.sem}` : 'Configuration Incomplete'}
                        </div>
                        <button 
                            onClick={() => setShowPreview(true)} 
                            disabled={!config.batch || !config.sem} 
                            className="bg-slate-900 text-white hover:bg-black font-bold py-3 px-10 rounded-xl text-sm shadow-xl active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                        >
                            <Eye size={18} /> Review & Publish
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default CreateTimetablePage;

// import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { 
//     Clock, Save, Plus, Trash2, ArrowLeft, 
//     MapPin, ChevronDown, Copy, 
//     GraduationCap, LayoutGrid,
//     Eye, X, CheckCircle2, ListChecks,
//     RotateCcw, Search, User, Loader2, AlertCircle, AlertTriangle
// } from 'lucide-react';
// import Header from '../../components/Header';
// import { useAuth } from '../../context/AuthContext';
// import Loader from '../../components/Loader'; 
// import CryptoJS from 'crypto-js'; // Import CryptoJS

// // --- API CONFIGURATION ---
// const API_URL = import.meta.env.VITE_BASE_URL;
// const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_SECRET_KEY; // Get Secret Key
// const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

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

// // --- 1. GENERIC UI COMPONENTS ---

// const StatusModal = ({ isOpen, onClose, title, message, type }) => {
//     if (!isOpen) return null;
//     const styles = type === 'error' 
//         ? { bg: 'bg-red-50', icon: <AlertCircle className="text-red-600" size={32} />, title: 'text-red-900', btn: 'bg-red-600 hover:bg-red-700' }
//         : { bg: 'bg-blue-50', icon: <CheckCircle2 className="text-blue-600" size={32} />, title: 'text-blue-900', btn: 'bg-blue-600 hover:bg-blue-700' };

//     return (
//         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
//                 <div className={`p-6 flex flex-col items-center text-center ${styles.bg}`}>
//                     <div className="mb-4 bg-white p-3 rounded-full shadow-sm">{styles.icon}</div>
//                     <h3 className={`text-xl font-bold ${styles.title} mb-2`}>{title}</h3>
//                     <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
//                 </div>
//                 <div className="p-4 bg-white border-t border-gray-100">
//                     <button onClick={onClose} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${styles.btn}`}>
//                         Okay, Got it
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
//     if (!isOpen) return null;
//     return (
//         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
//                 <div className="p-6 flex gap-4">
//                     <div className="flex-shrink-0 bg-amber-100 p-3 rounded-full h-12 w-12 flex items-center justify-center">
//                         <AlertTriangle className="text-amber-600" size={24} />
//                     </div>
//                     <div>
//                         <h3 className="text-lg font-bold text-gray-900">{title}</h3>
//                         <p className="text-gray-500 text-sm mt-1 leading-relaxed">{message}</p>
//                     </div>
//                 </div>
//                 <div className="bg-gray-50 p-4 flex justify-end gap-3">
//                     <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 transition-all">Cancel</button>
//                     <button onClick={() => { onConfirm(); onClose(); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-black shadow-lg transition-all">Confirm</button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- 2. SMART FACULTY SELECT ---
// const SmartFacultySelect = ({ options, value, onChange, placeholder, disabled, label }) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const [searchTerm, setSearchTerm] = useState('');
//     const containerRef = useRef(null);
//     const inputRef = useRef(null);

//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
//         };
//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, []);

//     useEffect(() => {
//         if (isOpen && inputRef.current) inputRef.current.focus();
//     }, [isOpen]);

//     const filteredOptions = options.filter(opt => 
//         opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
//         opt.id.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     const selectedOption = options.find(opt => opt.id === value);

//     return (
//         <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
//             {label && <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{label}</label>}
//             <div 
//                 onClick={() => !disabled && setIsOpen(!isOpen)}
//                 className={`w-full p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:border-blue-400 ${isOpen ? 'ring-2 ring-blue-100 border-blue-500' : ''}`}
//             >
//                 <div className="flex items-center gap-2 truncate flex-1">
//                     {selectedOption ? (
//                         <>
//                             <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold px-1.5 py-0.5 rounded">{selectedOption.id}</span>
//                             <span className="text-xs font-bold text-gray-800 truncate">{selectedOption.name}</span>
//                         </>
//                     ) : (
//                         <span className="text-xs text-gray-400 font-medium">{placeholder}</span>
//                     )}
//                 </div>
//                 <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
//             </div>

//             {isOpen && (
//                 <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 bottom-full mb-2 lg:bottom-auto lg:mb-0 lg:top-full">
//                     <div className="p-2 border-b border-gray-100 bg-gray-50/80">
//                         <div className="relative">
//                             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
//                             <input 
//                                 ref={inputRef}
//                                 type="text" 
//                                 className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-500"
//                                 placeholder="Search Faculty..." 
//                                 value={searchTerm}
//                                 onChange={(e) => setSearchTerm(e.target.value)}
//                             />
//                         </div>
//                     </div>
//                     {/* CHANGED: max-h-28 allows roughly 2 items (each item ~40-50px) to show, forcing scroll for more */}
//                     <div className="max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 p-1">
//                         {filteredOptions.length > 0 ? (
//                             filteredOptions.map((opt) => (
//                                 <div 
//                                     key={opt.id} 
//                                     onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }}
//                                     className={`px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center group transition-colors mb-1 ${value === opt.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}
//                                 >
//                                     <div className="flex flex-col">
//                                         <span className={`text-xs font-bold ${value === opt.id ? 'text-blue-700' : 'text-gray-700'}`}>{opt.name}</span>
//                                         <span className="text-[10px] text-gray-400 font-mono">{opt.id}</span>
//                                     </div>
//                                     {value === opt.id && <CheckCircle2 size={14} className="text-blue-600"/>}
//                                 </div>
//                             ))
//                         ) : (
//                             <div className="px-4 py-6 text-center text-gray-400 text-xs">No faculty found</div>
//                         )}
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// // --- 3. TIMETABLE SUCCESS VISUAL MODAL ---
// const TimetableSuccessModal = ({ isOpen, onClose, data }) => {
//     if (!isOpen || !data || !data.timetable) return null;

//     const { sem, batch, weekSchedule } = data.timetable;

//     return (
//         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
//             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
//                 {/* Header */}
//                 <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex justify-between items-center flex-shrink-0">
//                     <div className="flex items-center gap-4">
//                         <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shadow-sm"><CheckCircle2 size={28} /></div>
//                         <div>
//                             <h3 className="text-xl font-bold text-emerald-900">Timetable Created!</h3>
//                             <p className="text-sm text-emerald-600 font-medium">The schedule is now live.</p>
//                         </div>
//                     </div>
//                     <button onClick={onClose} className="p-2.5 bg-emerald-100 hover:bg-emerald-200 rounded-full text-emerald-700 transition-colors"><X size={20}/></button>
//                 </div>

//                 {/* Grid View */}
//                 <div className="flex-1 overflow-y-auto bg-slate-100 p-8 custom-scrollbar">
//                     <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-6xl mx-auto">
//                         <div className="text-center mb-8 border-b border-gray-100 pb-6">
//                             <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2">Class Schedule</h1>
//                             <div className="flex justify-center gap-4 text-sm font-bold text-slate-500">
//                                 <span className="bg-slate-100 px-3 py-1 rounded-lg">Batch: <span className="text-slate-900">{batch}</span></span>
//                                 <span className="bg-slate-100 px-3 py-1 rounded-lg">Semester: <span className="text-slate-900">{sem}</span></span>
//                             </div>
//                         </div>

//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                             {weekSchedule.map((dayData, idx) => (
//                                 <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-slate-50/50">
//                                     <div className="bg-slate-900 text-white py-2 px-4 text-center font-bold uppercase tracking-wider text-sm flex justify-between items-center">
//                                         <span>{dayData.day}</span>
//                                         <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white/80">{dayData.periods.length} Sessions</span>
//                                     </div>
//                                     <div className="p-3 space-y-3">
//                                         {dayData.periods.map((p, pIdx) => {
//                                             const isFN = p.session === 'FN';
//                                             return (
//                                                 <div key={pIdx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative pl-3 overflow-hidden">
//                                                     <div className={`absolute top-0 left-0 w-1 h-full ${isFN ? 'bg-teal-400' : 'bg-purple-400'}`}></div>
//                                                     <div className="flex justify-between items-start mb-1">
//                                                         <span className="text-[10px] font-mono font-bold text-gray-400">{p.startTime} - {p.endTime}</span>
//                                                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${isFN ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'}`}>{p.session}</span>
//                                                     </div>
//                                                     <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">{p.subject}</h4>
//                                                     <div className="flex flex-col gap-0.5">
//                                                         {p.faculty && p.faculty.map((fac, fIdx) => (
//                                                             <div key={fIdx} className="flex items-center gap-1 text-[10px] text-gray-500">
//                                                                 <User size={8} /> <span className="truncate">{fac.name}</span>
//                                                             </div>
//                                                         ))}
//                                                     </div>
//                                                     <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1 text-[10px] font-bold text-gray-400">
//                                                         <MapPin size={10} /> {p.roomNo}
//                                                     </div>
//                                                 </div>
//                                             )
//                                         })}
//                                         {dayData.periods.length === 0 && (
//                                             <div className="text-center py-6 text-xs text-gray-400 italic">No classes scheduled</div>
//                                         )}
//                                     </div>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- 4. PREVIEW MODAL ---
// const PreviewModal = ({ isOpen, onClose, onConfirm, schedule, config, facultyMapping, isSubmitting, dynamicOptions }) => {
//     if (!isOpen) return null;

//     const totalSessions = schedule.reduce((acc, day) => acc + day.periods.length, 0);
//     const assignedCourses = Object.keys(facultyMapping).length;

//     return (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
//                 <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
//                     <div>
//                         <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
//                             <CheckCircle2 className="text-blue-500 fill-blue-100" size={28}/> 
//                             Verify Schedule
//                         </h2>
//                         <p className="text-sm text-gray-500 mt-1 ml-10">Review faculty allocation and timing.</p>
//                     </div>
//                     <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400 hover:text-gray-700" /></button>
//                 </div>

//                 <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F8FAFC]">
//                     {schedule.map((day) => day.periods.length > 0 && (
//                         <div key={day.day} className="flex gap-6">
//                             <div className="w-16 flex flex-col items-center pt-2">
//                                 <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{day.day.substring(0,3)}</span>
//                                 <div className="h-full w-0.5 bg-slate-200 mt-3 rounded-full"></div>
//                             </div>
//                             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
//                                 {day.periods.map((p, idx) => {
//                                     const mapping = facultyMapping[p.data?.subject] || { primary: '', secondary: '' };
//                                     const fac1 = dynamicOptions.faculty.find(f => f.id === mapping.primary);
//                                     const fac2 = dynamicOptions.faculty.find(f => f.id === mapping.secondary);
                                    
//                                     const isFN = p.data?.session === 'FN';
//                                     return (
//                                         <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-all">
//                                             <div className={`absolute top-0 left-0 w-1 h-full ${isFN ? 'bg-teal-400' : 'bg-violet-400'}`}></div>
//                                             <div className="flex justify-between items-start">
//                                                 <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isFN ? 'bg-teal-50 text-teal-700' : 'bg-violet-50 text-violet-700'}`}>{p.data?.session}</span>
//                                                 <span className="font-mono text-xs font-bold text-gray-500">{p.data?.startTime} - {p.data?.endTime}</span>
//                                             </div>
//                                             <div>
//                                                 <h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-1">{p.data?.subject || "Not Selected"}</h4>
//                                                 <div className="mt-2 space-y-1">
//                                                     <div className="flex items-center gap-1.5 text-xs text-gray-500">
//                                                         <User size={10} className="text-blue-500"/> <span className="truncate">{fac1 ? fac1.name : "Unassigned"}</span>
//                                                     </div>
//                                                     {fac2 && (
//                                                         <div className="flex items-center gap-1.5 text-xs text-gray-400">
//                                                             <User size={10} className="text-purple-500"/> <span className="truncate">{fac2.name}</span>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>
//                                             <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto">
//                                                 <div className="flex items-center gap-1 text-gray-400"><MapPin size={12}/><span className="text-xs font-bold">{p.data?.roomNo}</span></div>
//                                             </div>
//                                         </div>
//                                     );
//                                 })}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//                 <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-white">
//                     <button onClick={onClose} disabled={isSubmitting} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Back to Edit</button>
//                     <button onClick={onConfirm} disabled={isSubmitting} className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed">
//                         {isSubmitting ? (
//                             <>
//                                 <Loader2 className="animate-spin" size={18}/> Publishing...
//                             </>
//                         ) : (
//                             <>
//                                 <Save size={18} /> Publish Schedule
//                             </>
//                         )}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- NATIVE SELECT ---
// const NativeSelect = ({ options, value, onChange, placeholder, disabled }) => (
//     <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
//         <select 
//             value={value || ""} 
//             onChange={(e) => onChange(e.target.value)} 
//             disabled={disabled}
//             className="w-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl py-3 px-4 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer hover:border-blue-300 transition-colors shadow-sm"
//         >
//             <option value="" disabled>{placeholder}</option>
//             {options.map((opt) => (
//                 <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
//                     {typeof opt === 'string' ? opt : opt.label}
//                 </option>
//             ))}
//         </select>
//         <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//     </div>
// );

// // --- MAIN PAGE ---
// const CreateTimetablePage = () => {
//     const { user, logout } = useAuth();
//     const navigate = useNavigate();
    
//     const [animate, setAnimate] = useState(false);
//     const [showPreview, setShowPreview] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [backendResponse, setBackendResponse] = useState(null); 

//     // Modal States for Alerts
//     const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: '' });
//     const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

//     // --- DYNAMIC DATA ---
//     const [facultyList, setFacultyList] = useState([]);
//     const [batchOptions, setBatchOptions] = useState([]);
//     const [courseOptions, setCourseOptions] = useState([]);
//     const [loadingResources, setLoadingResources] = useState(false);

//     const INITIAL_SCHEDULE = [
//         { day: 'Monday', periods: [{ id: 1, type: 'FN' }] },
//         { day: 'Tuesday', periods: [{ id: 2, type: 'FN' }] },
//         { day: 'Wednesday', periods: [{ id: 3, type: 'FN' }] },
//         { day: 'Thursday', periods: [{ id: 4, type: 'FN' }] },
//         { day: 'Friday', periods: [{ id: 5, type: 'FN' }] },
//         { day: 'Saturday', periods: [{ id: 6, type: 'FN' }] }
//     ];

//     const [config, setConfig] = useState({ 
//         sem: '', batch: '', defaultRoom: '5101', 
//         morning: { start: '09:30', end: '12:15' }, 
//         afternoon: { start: '13:05', end: '15:50' } 
//     });
    
//     const [weekSchedule, setWeekSchedule] = useState(INITIAL_SCHEDULE);
//     const [slotData, setSlotData] = useState({});
//     const [facultyMapping, setFacultyMapping] = useState({});
//     const [uniqueCourses, setUniqueCourses] = useState([]);
//     const [isDirty, setIsDirty] = useState(false);

//     // 1. Initial Load
//     useEffect(() => { 
//         if (!user) { navigate('/'); return; }
//         const fetchFaculty = async () => {
//             setLoadingResources(true);
//             try {
//                 // GET Request: Plain Params, Decrypted Response
//                 const res = await fetch(`${API_URL}/api/admin/view-faculty`, { credentials: "include" });
//                 if (res.status === 401 || res.status === 403) { logout(); return; }
//                 const rawJson = await res.json();
//                 // DECRYPT RESPONSE
//                 const data = rawJson.data ? decryptData(rawJson.data) : rawJson;

//                 const mappedFaculty = Array.isArray(data) ? data.map(f => ({ id: f.facultyid, name: f.name })) : [];
//                 setFacultyList(mappedFaculty);
//             } catch (err) { console.error(err); } 
//             finally { setLoadingResources(false); setTimeout(() => setAnimate(true), 100); }
//         };
//         fetchFaculty();
//     }, [user, navigate, logout]);

//     // 2. Fetch Batches/Courses
//     useEffect(() => {
//         if (!config.sem) return;
//         const fetchSemInfo = async () => {
//             setLoadingResources(true);
//             try {
//                 // GET Request: Plain Params, Decrypted Response
//                 const res = await fetch(`${API_URL}/api/get-sem-info/${config.sem}`, { credentials: "include" });
//                 if (res.status === 401 || res.status === 403) { logout(); return; }
//                 const rawJson = await res.json();
//                 // DECRYPT RESPONSE
//                 const json = rawJson.data ? decryptData(rawJson.data) : rawJson;

//                 if (json.success && json.data) {
//                     setBatchOptions(json.data.batches || []);
//                     setCourseOptions(json.data.courses || []);
//                     if (!json.data.batches.includes(config.batch)) setConfig(prev => ({ ...prev, batch: '' }));
//                 }
//             } catch (err) { console.error(err); } 
//             finally { setLoadingResources(false); }
//         };
//         fetchSemInfo();
//     }, [config.sem, logout]);
    
//     // Prevent unload
//     useEffect(() => {
//         const handleBeforeUnload = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
//         window.addEventListener('beforeunload', handleBeforeUnload);
//         return () => window.removeEventListener('beforeunload', handleBeforeUnload);
//     }, [isDirty]);

//     useEffect(() => {
//         const courses = new Set();
//         Object.values(slotData).forEach(slot => { if (slot.subject) courses.add(slot.subject); });
//         setUniqueCourses(Array.from(courses));
//     }, [slotData]);

//     // Helpers
//     const getSlot = (dayIdx, pIdx, type) => {
//         const key = `${dayIdx}-${pIdx}`;
//         if (slotData[key]) return slotData[key];
//         const timing = type === 'FN' ? config.morning : config.afternoon;
//         return { startTime: timing.start, endTime: timing.end, session: type, subject: '', roomNo: config.defaultRoom };
//     };

//     const updateSlot = (dayIdx, pIdx, field, value) => {
//         setIsDirty(true);
//         const key = `${dayIdx}-${pIdx}`;
//         const current = getSlot(dayIdx, pIdx, weekSchedule[dayIdx].periods[pIdx].type); 
//         let updated = { ...current, [field]: value };
//         if (field === 'session') {
//             const newTiming = value === 'FN' ? config.morning : config.afternoon;
//             updated.startTime = newTiming.start;
//             updated.endTime = newTiming.end;
//             const newSchedule = [...weekSchedule];
//             newSchedule[dayIdx].periods[pIdx].type = value;
//             setWeekSchedule(newSchedule);
//         }
//         setSlotData(prev => ({ ...prev, [key]: updated }));
//     };

//     const updateFacultyChoice = (courseId, role, facultyId) => {
//         setIsDirty(true);
//         setFacultyMapping(prev => ({ ...prev, [courseId]: { ...prev[courseId], [role]: facultyId } }));
//     };

//     const addSession = (dayIdx) => { setIsDirty(true); const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.push({ id: Date.now(), type: 'AN' }); setWeekSchedule(newSchedule); };
//     const removeSession = (dayIdx, pIdx) => { setIsDirty(true); const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.splice(pIdx, 1); setWeekSchedule(newSchedule); };
    
//     // --- ACTIONS ---
//     const confirmReplicate = () => {
//         setConfirmModal({
//             isOpen: true,
//             title: "Replicate Schedule?",
//             message: "This will overwrite all other days with Monday's schedule structure. Existing data on other days will be lost.",
//             onConfirm: () => {
//                 setIsDirty(true);
//                 const mondayStructure = weekSchedule[0].periods;
//                 const newSchedule = weekSchedule.map((day, dIdx) => { if (dIdx === 0) return day; return { ...day, periods: mondayStructure.map(p => ({ ...p, id: Date.now() + Math.random() })) }; });
//                 const newSlotData = { ...slotData };
//                 newSchedule.forEach((day, dIdx) => {
//                     if (dIdx === 0) return;
//                     day.periods.forEach((p, pIdx) => {
//                         const sourceKey = `0-${pIdx}`;
//                         const targetKey = `${dIdx}-${pIdx}`;
//                         if (slotData[sourceKey]) newSlotData[targetKey] = { ...slotData[sourceKey] };
//                     });
//                 });
//                 setWeekSchedule(newSchedule);
//                 setSlotData(newSlotData);
//             }
//         });
//     };

//     const confirmReset = () => {
//         setConfirmModal({
//             isOpen: true,
//             title: "Reset Planner?",
//             message: "Are you sure you want to clear the entire timetable? All unsaved progress will be lost.",
//             onConfirm: () => {
//                 setWeekSchedule(INITIAL_SCHEDULE); setSlotData({}); setFacultyMapping({}); setIsDirty(false);
//             }
//         });
//     };

//     const getHydratedSchedule = () => weekSchedule.map((day, dIdx) => ({ day: day.day, periods: day.periods.map((p, pIdx) => ({ ...p, data: getSlot(dIdx, pIdx, p.type) })) }));

//     // --- API PUBLISH ---
//     const handlePublish = async () => {
//         setIsSubmitting(true);
//         const payload = {
//             sem: config.sem,
//             batch: config.batch,
//             weekSchedule: weekSchedule.map((dayObj, dayIdx) => {
//                 const validPeriods = dayObj.periods.map((p, pIdx) => {
//                     const slot = getSlot(dayIdx, pIdx, p.type);
//                     if (!slot.subject) return null;
//                     const mapping = facultyMapping[slot.subject] || {};
//                     const facultyArray = [];
//                     if (mapping.primary) { const f = facultyList.find(i => i.id === mapping.primary); if (f) facultyArray.push({ id: f.id, name: f.name }); }
//                     if (mapping.secondary) { const f = facultyList.find(i => i.id === mapping.secondary); if (f) facultyArray.push({ id: f.id, name: f.name }); }
//                     return { startTime: slot.startTime, endTime: slot.endTime, session: slot.session, subject: slot.subject, faculty: facultyArray, roomNo: slot.roomNo };
//                 }).filter(Boolean);
//                 return { day: dayObj.day, periods: validPeriods };
//             })
//         };

//         try {
//             // POST: Encrypt Body
//             const encryptedBody = encryptData(payload);

//             const response = await fetch(`${API_URL}/api/admin/createtimetable`, {
//                 method: "POST", headers: { "Content-Type": "application/json" }, 
//                 body: JSON.stringify({ payload: encryptedBody }), 
//                 credentials: "include"
//             });
//             if (response.status === 401 || response.status === 403) { logout(); return; }
            
//             const rawJson = await response.json();
//             // POST: Decrypt Response
//             const result = rawJson.data ? decryptData(rawJson.data) : rawJson;

//             if (response.ok) {
//                 setIsDirty(false);
//                 setShowPreview(false);
//                 setBackendResponse(result);
//             } else {
//                 setStatusModal({ isOpen: true, title: "Save Failed", message: result.message || "Unknown error", type: "error" });
//             }
//         } catch (error) {
//             setStatusModal({ isOpen: true, title: "Connection Error", message: "Could not reach the server. Please check your connection.", type: "error" });
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     if (!user) return null;

//     return (
//         <div className="min-h-screen text-gray-800 font-sans bg-[#F8F9FA] overflow-x-hidden pb-32">
            
//             {/* MODALS */}
//             <PreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} onConfirm={handlePublish} schedule={getHydratedSchedule()} config={config} facultyMapping={facultyMapping} isSubmitting={isSubmitting} dynamicOptions={{ faculty: facultyList }} />
//             <TimetableSuccessModal isOpen={!!backendResponse} onClose={() => { setBackendResponse(null); confirmReset(); }} data={backendResponse} />
//             <StatusModal isOpen={statusModal.isOpen} onClose={() => setStatusModal({ ...statusModal, isOpen: false })} title={statusModal.title} message={statusModal.message} type={statusModal.type} />
//             <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} />

//             <header className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-bl-[2.5rem] rounded-br-[2.5rem] shadow-2xl relative z-20 pb-10 pt-6 px-4 sm:px-6 lg:px-8">
//                 <Header animate={animate} />
//                 <div className="w-full h-px bg-white/10 my-6"></div>
//                 <div className={`flex justify-between items-end transition-all duration-1000 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
//                     <div>
//                         <div className="flex items-center gap-2 text-blue-300 mb-2"><button onClick={() => navigate(-1)} className="hover:text-white transition-colors flex items-center gap-1"><ArrowLeft size={14} /> Back</button><span className="text-xs font-semibold uppercase tracking-wider opacity-60">/ Admin / Create</span></div>
//                         <h2 className="text-3xl font-black text-white flex items-center gap-3"><LayoutGrid className="text-blue-400" size={32} /> Master Timetable</h2>
//                     </div>
//                     <button onClick={confirmReset} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm border border-white/10"><RotateCcw size={18} /> <span className="hidden sm:inline">Reset</span></button>
//                 </div>
//             </header>

//             <main className="px-4 sm:px-6 lg:px-8 py-10 relative z-10 max-w-7xl mx-auto space-y-10">
//                 {/* 1. CONFIGURATION */}
//                 <section className={`bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 transition-all duration-700 delay-500 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
//                     <div className="flex items-center mb-6"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Academic & Session Configuration</h2></div>
//                     <div className="flex flex-col lg:flex-row gap-10">
//                         <div className="w-full lg:w-1/3 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-gray-100 pb-8 lg:pb-0 lg:pr-10">
//                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">Academic Details {loadingResources && <Loader2 className="animate-spin text-blue-500" size={14}/>}</h4>
//                             <div className="space-y-6">
//                                 <div><label className="text-xs font-bold text-gray-600 mb-1.5 block">Semester</label><NativeSelect options={SEMESTERS} value={config.sem} onChange={(val) => setConfig({...config, sem: val})} placeholder="Select Semester" /></div>
//                                 <div><label className="text-xs font-bold text-gray-600 mb-1.5 block">Batch Code</label><NativeSelect options={batchOptions} value={config.batch} onChange={(val) => setConfig({...config, batch: val})} placeholder={config.sem ? "Select Batch" : "Select Sem First"} disabled={!config.sem} /></div>
//                                 <div><label className="text-xs font-bold text-gray-600 mb-1.5 block">Default Room</label><input type="text" value={config.defaultRoom} onChange={e => setConfig({...config, defaultRoom: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all" /></div>
//                             </div>
//                         </div>
//                         <div className="w-full lg:w-2/3 flex flex-col gap-6">
//                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Session Defaults</h4>
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
//                                 <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 hover:shadow-md transition-all">
//                                     <div className="flex justify-between items-center mb-4"><div><span className="block text-2xl font-black text-teal-900 tracking-tight">FN</span><span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Morning</span></div></div>
//                                     <div className="flex items-center justify-center gap-4 bg-white border border-teal-200 p-3 rounded-xl shadow-sm"><input type="time" value={config.morning.start} onChange={e => setConfig({...config, morning: {...config.morning, start: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /><span className="text-gray-300 font-light text-2xl">—</span><input type="time" value={config.morning.end} onChange={e => setConfig({...config, morning: {...config.morning, end: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /></div>
//                                 </div>
//                                 <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 hover:shadow-md transition-all">
//                                     <div className="flex justify-between items-center mb-4"><div><span className="block text-2xl font-black text-violet-900 tracking-tight">AN</span><span className="text-xs font-bold text-violet-600 uppercase tracking-widest">Afternoon</span></div></div>
//                                     <div className="flex items-center justify-center gap-4 bg-white border border-violet-200 p-3 rounded-xl shadow-sm"><input type="time" value={config.afternoon.start} onChange={e => setConfig({...config, afternoon: {...config.afternoon, start: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /><span className="text-gray-300 font-light text-2xl">—</span><input type="time" value={config.afternoon.end} onChange={e => setConfig({...config, afternoon: {...config.afternoon, end: e.target.value}})} className="bg-transparent text-lg font-bold text-gray-800 outline-none text-center w-full" /></div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </section>

//                 {/* --- 2. WEEKLY PLANNER --- */}
//                 <section className={`space-y-6 transition-all duration-700 delay-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${!config.sem || !config.batch ? 'opacity-50 pointer-events-none' : ''}`}>
//                     <div className="flex justify-between items-end px-2">
//                         <div className="flex items-center mb-0"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Weekly Schedule Planner</h2></div>
//                         <button onClick={confirmReplicate} className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 flex items-center gap-2 bg-white px-5 py-2.5 rounded-xl border border-blue-100 hover:border-blue-500 shadow-sm transition-all"><Copy size={14}/> Replicate MON</button>
//                     </div>
//                     <div className="flex flex-col gap-6">
//                         {weekSchedule.map((day, dIdx) => (
//                             <div key={day.day} className="flex flex-col lg:flex-row items-stretch gap-4">
//                                 <div className="w-full lg:w-28 bg-black rounded-2xl flex flex-col items-center justify-center p-4 shadow-lg shrink-0 border border-gray-800">
//                                     <span className="text-white font-black text-3xl tracking-widest">{day.day.substring(0,3).toUpperCase()}</span>
//                                 </div>
//                                 <div className="flex-1 flex flex-row overflow-x-auto gap-4 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent items-stretch">
//                                     {day.periods.map((period, pIdx) => {
//                                         const data = getSlot(dIdx, pIdx, period.type);
//                                         const isFN = data.session === 'FN';
//                                         return (
//                                             <div key={period.id} className={`min-w-[320px] relative rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden bg-white shadow-sm hover:shadow-md ${isFN ? 'border-teal-100 hover:border-teal-300' : 'border-violet-100 hover:border-violet-300'}`}>
//                                                 <div className={`px-4 py-2 border-b flex justify-between items-center ${isFN ? 'bg-teal-50/40 border-teal-50' : 'bg-violet-50/40 border-violet-50'}`}>
//                                                     <select value={data.session} onChange={(e) => updateSlot(dIdx, pIdx, 'session', e.target.value)} className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer border-none outline-none shadow-sm ${isFN ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-violet-600 text-white hover:bg-violet-700'}`}><option value="FN">FN (Morning)</option><option value="AN">AN (Afternoon)</option></select>
//                                                     <button onClick={() => removeSession(dIdx, pIdx)} className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-all"><Trash2 size={16} /></button>
//                                                 </div>
//                                                 <div className="p-4 space-y-4">
//                                                     <div><label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Skill Course</label><NativeSelect options={courseOptions} value={data.subject} onChange={(val) => updateSlot(dIdx, pIdx, 'subject', val)} placeholder="Select Course" /></div>
//                                                     <div className={`mt-auto pt-3 border-t flex items-center justify-between gap-2 ${isFN ? 'border-teal-50' : 'border-violet-50'}`}>
//                                                         <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 w-full"><input type="time" value={data.startTime} onChange={(e) => updateSlot(dIdx, pIdx, 'startTime', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 font-mono w-24 outline-none text-center" /><span className="text-gray-300 text-[10px] font-bold">-</span><input type="time" value={data.endTime} onChange={(e) => updateSlot(dIdx, pIdx, 'endTime', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 font-mono w-24 outline-none text-center" /></div>
//                                                         <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200"><input type="text" value={data.roomNo} onChange={(e) => updateSlot(dIdx, pIdx, 'roomNo', e.target.value)} className="w-12 bg-transparent text-xs font-bold text-gray-700 outline-none text-center" /></div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         );
//                                     })}
//                                     <button onClick={() => addSession(dIdx)} className="min-w-[120px] rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-3 transition-all group"><div className="w-12 h-12 rounded-full bg-white border border-gray-200 group-hover:border-blue-200 flex items-center justify-center shadow-sm"><Plus size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors" /></div><span className="text-xs font-bold text-gray-400 group-hover:text-blue-600">Add Session</span></button>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </section>

//                 {/* --- 3. FACULTY ALLOCATION --- */}
//                 <section className={`bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 transition-all duration-700 delay-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${!config.sem || !config.batch ? 'opacity-50 pointer-events-none' : ''}`}>
//                     <div className="flex items-center mb-6"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Faculty Allocation</h2></div>
//                     {uniqueCourses.length === 0 ? (
//                         <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50"><p className="text-gray-500 font-medium">Select courses above to assign faculty.</p></div>
//                     ) : (
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                             {uniqueCourses.map(courseCode => (
//                                 <div key={courseCode} className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all flex flex-col gap-4">
//                                     <div className="flex items-center gap-3 mb-1"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ListChecks size={18} /></div><h4 className="font-bold text-gray-800 text-sm truncate" title={courseCode}>{courseCode}</h4></div>
//                                     <SmartFacultySelect label="Primary Faculty" options={facultyList} value={facultyMapping[courseCode]?.primary} onChange={(val) => updateFacultyChoice(courseCode, 'primary', val)} placeholder="Assign Primary..." />
//                                     <SmartFacultySelect label="Secondary Faculty (Optional)" options={facultyList} value={facultyMapping[courseCode]?.secondary} onChange={(val) => updateFacultyChoice(courseCode, 'secondary', val)} placeholder="Assign Secondary..." />
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </section>

//                 {/* --- BOTTOM ACTION BAR --- */}
//                 <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 transition-transform duration-500 ${animate ? 'translate-y-0' : 'translate-y-full'}`}>
//                     <div className="max-w-7xl mx-auto flex justify-between items-center">
//                         <div className="text-sm font-bold text-gray-500 hidden sm:block">
//                             {config.sem && config.batch ? `${config.batch} • Semester ${config.sem}` : 'Configuration Incomplete'}
//                         </div>
//                         <button 
//                             onClick={() => setShowPreview(true)} 
//                             disabled={!config.batch || !config.sem} 
//                             className="bg-slate-900 text-white hover:bg-black font-bold py-3 px-10 rounded-xl text-sm shadow-xl active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
//                         >
//                             <Eye size={18} /> Review & Publish
//                         </button>
//                     </div>
//                 </div>

//             </main>
//         </div>
//     );
// };

// export default CreateTimetablePage;