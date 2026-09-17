import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, Save, ArrowLeft, MapPin, ChevronDown, 
    LayoutGrid, Calendar, Eye, X, CheckCircle2, ListChecks,
    RotateCcw, Search, User, Loader2, AlertCircle, AlertTriangle, 
    Layers, CalendarCheck, Trash2, Plus
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 

// --- API CONFIGURATION ---
const API_URL = import.meta.env.VITE_BASE_URL;

// --- 1. REUSABLE UI COMPONENTS ---

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

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDangerous = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 flex gap-4">
                    <div className={`flex-shrink-0 p-3 rounded-full h-12 w-12 flex items-center justify-center ${isDangerous ? 'bg-red-100' : 'bg-amber-100'}`}>
                        <AlertTriangle className={isDangerous ? "text-red-600" : "text-amber-600"} size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="text-gray-500 text-sm mt-1 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 transition-all">Cancel</button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }} 
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-black'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

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

    useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

    const filteredOptions = options.filter(opt => 
        opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        opt.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.id === value);

    return (
        <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
            {label && <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{label}</label>}
            <div onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:border-blue-400 ${isOpen ? 'ring-2 ring-blue-100 border-blue-500' : ''}`}>
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
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-48 overflow-y-auto p-1">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/80 sticky top-0"><input ref={inputRef} type="text" className="w-full pl-3 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
                    {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
                        <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }} className={`px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center group transition-colors mb-1 ${value === opt.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
                            <div className="flex flex-col"><span className={`text-xs font-bold ${value === opt.id ? 'text-blue-700' : 'text-gray-700'}`}>{opt.name}</span><span className="text-[10px] text-gray-400 font-mono">{opt.id}</span></div>
                            {value === opt.id && <CheckCircle2 size={14} className="text-blue-600"/>}
                        </div>
                    )) : <div className="px-4 py-6 text-center text-gray-400 text-xs">No faculty found</div>}
                </div>
            )}
        </div>
    );
};

const PreviewModal = ({ isOpen, onClose, onConfirm, schedule, config, facultyMapping, isSubmitting, dynamicOptions }) => {
    if (!isOpen) return null;
    const totalSessions = schedule.reduce((acc, day) => acc + day.periods.length, 0);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><CheckCircle2 className="text-blue-500 fill-blue-100" size={28}/> Verify Changes</h2><p className="text-sm text-gray-500 mt-1 ml-10">Review modification before updating.</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400 hover:text-gray-700" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F8FAFC]">
                    {schedule.map((day) => day.periods.length > 0 && (
                        <div key={day.day} className="flex gap-6">
                            <div className="w-16 flex flex-col items-center pt-2"><span className="text-sm font-black text-slate-400 uppercase tracking-widest">{day.day.substring(0,3)}</span><div className="h-full w-0.5 bg-slate-200 mt-3 rounded-full"></div></div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                                {day.periods.map((p, idx) => {
                                    const mapping = facultyMapping[p.data?.subject] || { primary: '', secondary: '' };
                                    const fac1 = dynamicOptions.faculty.find(f => f.id === mapping.primary);
                                    const fac2 = dynamicOptions.faculty.find(f => f.id === mapping.secondary);
                                    const isFN = p.data?.session === 'FN';
                                    return (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-all">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${isFN ? 'bg-teal-400' : 'bg-violet-400'}`}></div>
                                            <div className="flex justify-between items-start"><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isFN ? 'bg-teal-50 text-teal-700' : 'bg-violet-50 text-violet-700'}`}>{p.data?.session}</span><span className="font-mono text-xs font-bold text-gray-500">{p.data?.startTime} - {p.data?.endTime}</span></div>
                                            <div><h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-1">{p.data?.subject || "Not Selected"}</h4><div className="mt-2 space-y-1"><div className="flex items-center gap-1.5 text-xs text-gray-500"><User size={10} className="text-blue-500"/> <span className="truncate">{fac1 ? fac1.name : "Unassigned"}</span></div>{fac2 && (<div className="flex items-center gap-1.5 text-xs text-gray-400"><User size={10} className="text-purple-500"/> <span className="truncate">{fac2.name}</span></div>)}</div></div>
                                            <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto"><div className="flex items-center gap-1 text-gray-400"><MapPin size={12}/><span className="text-xs font-bold">{p.data?.roomNo}</span></div></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-white">
                    <button onClick={onClose} disabled={isSubmitting} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Back to Edit</button>
                    <button onClick={onConfirm} disabled={isSubmitting} className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-black shadow-xl transition-all active:scale-95 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {isSubmitting ? <><Loader2 className="animate-spin" size={18}/> Updating...</> : <><Save size={18} /> Update Timetable</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TimetableSuccessModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data || !data.timetable) return null;
    const { sem, batch, weekSchedule } = data.timetable;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-4"><div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shadow-sm"><CheckCircle2 size={28} /></div><div><h3 className="text-xl font-bold text-emerald-900">Modification Successful!</h3><p className="text-sm text-emerald-600 font-medium">The schedule for {batch} has been updated.</p></div></div>
                    <button onClick={onClose} className="p-2.5 bg-emerald-100 hover:bg-emerald-200 rounded-full text-emerald-700 transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-100 p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {weekSchedule.map((dayData, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="bg-slate-900 text-white py-2 px-4 text-center font-bold uppercase tracking-wider text-sm flex justify-between items-center">
                                    <span>{dayData.day}</span><span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white/80">{dayData.periods.length} Sessions</span>
                                </div>
                                <div className="p-3 space-y-3">
                                    {dayData.periods.map((p, pIdx) => (
                                        <div key={pIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative pl-3 overflow-hidden">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${p.session === 'FN' ? 'bg-teal-400' : 'bg-purple-400'}`}></div>
                                            <div className="flex justify-between items-start mb-1"><span className="text-[10px] font-mono font-bold text-gray-400">{p.startTime} - {p.endTime}</span><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${p.session === 'FN' ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'}`}>{p.session}</span></div>
                                            <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">{p.subject}</h4>
                                            {p.faculty && p.faculty.map((fac, fIdx) => (<div key={fIdx} className="flex items-center gap-1 text-[10px] text-gray-500"><User size={8} /> <span className="truncate">{fac.name}</span></div>))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NATIVE SELECT ---
const NativeSelect = ({ options, value, onChange, placeholder, disabled }) => (
    <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
        <select value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl py-3 px-4 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer hover:border-blue-300 transition-colors shadow-sm">
            <option value="" disabled>{placeholder}</option>
            {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
        </select>
        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
);


// --- MAIN PAGE COMPONENT ---
const ModifyTimetablePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    // UI State
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'edit'
    const [animate, setAnimate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: '' });
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, sem: '', batch: '' });

    // Data State (List View)
    const [semGroups, setSemGroups] = useState([]); // [{ semester: "VI", batches: [...] }]
    const [semestersList, setSemestersList] = useState([]);
    
    // Data State (Editor)
    const [config, setConfig] = useState({ sem: '', batch: '', defaultRoom: '5101', morning: { start: '09:30', end: '12:15' }, afternoon: { start: '13:05', end: '15:50' } });
    const [weekSchedule, setWeekSchedule] = useState([]);
    const [slotData, setSlotData] = useState({});
    const [facultyMapping, setFacultyMapping] = useState({}); // { "Course": { primary: "ID", secondary: "ID" } }
    const [uniqueCourses, setUniqueCourses] = useState([]);
    
    // Resources
    const [facultyList, setFacultyList] = useState([]);
    const [courseOptions, setCourseOptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [backendResponse, setBackendResponse] = useState(null);

    // --- 1. INITIAL LOAD (Fetch Faculty & Timetables) ---
    useEffect(() => {
        if (!user) { navigate('/'); return; }
        
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                // A. Fetch Faculty List
                const facRes = await fetch(`${API_URL}/api/admin/view-faculty`, { credentials: "include" });
                const facData = await facRes.json();
                if (Array.isArray(facData)) setFacultyList(facData.map(f => ({ id: f.facultyid, name: f.name })));

                // B. Fetch All Timetables
                const ttRes = await fetch(`${API_URL}/api/admin/get-all-timetables`, { credentials: "include" });
                if (ttRes.status === 401) { logout(); return; }
                const ttData = await ttRes.json();
                
                if (ttData.success && Array.isArray(ttData.data)) {
                    setSemGroups(ttData.data);
                    setSemestersList(ttData.data.map(g => g.semester).sort());
                }
            } catch (error) {
                console.error("Load Error:", error);
                setStatusModal({ isOpen: true, title: "Connection Error", message: "Failed to load data.", type: "error" });
            } finally {
                setIsLoading(false);
                setTimeout(() => setAnimate(true), 100);
            }
        };
        loadInitialData();
    }, [user, navigate, logout]);


    // --- 2. DELETE TIMETABLE ---
    const handleDeleteClick = (sem, batch) => {
        setConfirmDeleteModal({ isOpen: true, sem, batch });
    };

    const confirmDelete = async () => {
        const { sem, batch } = confirmDeleteModal;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/admin/delete-timetable`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sem, batch }),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok) {
                // Remove from local state to update UI
                setSemGroups(prevGroups => prevGroups.map(group => {
                    if (group.semester === sem) {
                        return {
                            ...group,
                            batches: group.batches.filter(b => b.batch !== batch)
                        };
                    }
                    return group;
                }).filter(group => group.batches.length > 0)); // Remove semester group if empty

                setStatusModal({ isOpen: true, title: "Deleted", message: result.message, type: "success" });
            } else {
                setStatusModal({ isOpen: true, title: "Delete Failed", message: result.message || "Unknown error", type: "error" });
            }
        } catch (error) {
            setStatusModal({ isOpen: true, title: "Error", message: "Network error occurred.", type: "error" });
        } finally {
            setIsLoading(false);
            setConfirmDeleteModal({ isOpen: false, sem: '', batch: '' });
        }
    };


    // --- 3. LOAD BATCH INTO EDITOR ---
    const handleModifyClick = async (sem, batchData) => {
        setIsLoading(true);
        try {
            // A. Fetch Courses for this Semester (to populate dropdowns)
            const semRes = await fetch(`${API_URL}/api/get-sem-info/${sem}`, { credentials: "include" });
            const semInfo = await semRes.json();
            if (semInfo.success && semInfo.data) setCourseOptions(semInfo.data.courses || []);

            // B. Initialize Editor State
            setConfig(prev => ({ ...prev, sem: sem, batch: batchData.batch }));

            // C. Parse Week Schedule from Backend Format
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const newSlotData = {};
            const newFacultyMapping = {};
            
            const newSchedule = days.map((dayName, dIdx) => {
                const dayObj = batchData.weekSchedule.find(d => d.day === dayName) || { periods: [] };
                return {
                    day: dayName,
                    periods: dayObj.periods.map((p, pIdx) => {
                        const slotId = `${dIdx}-${pIdx}`;
                        
                        // 1. Populate Slot Data
                        newSlotData[slotId] = {
                            startTime: p.startTime,
                            endTime: p.endTime,
                            session: p.session,
                            subject: p.subject, // String like "CSM601 - Machine Learning"
                            roomNo: p.roomNo
                        };

                        // 2. Populate Faculty Mapping
                        if (p.faculty && p.faculty.length > 0) {
                            if (!newFacultyMapping[p.subject]) newFacultyMapping[p.subject] = {};
                            
                            // Assign Primary
                            if(p.faculty[0]) newFacultyMapping[p.subject].primary = p.faculty[0].id;
                            // Assign Secondary (if exists)
                            if(p.faculty[1]) newFacultyMapping[p.subject].secondary = p.faculty[1].id;
                        }

                        return { id: `${slotId}-${Date.now()}`, type: p.session };
                    })
                };
            });

            setWeekSchedule(newSchedule);
            setSlotData(newSlotData);
            setFacultyMapping(newFacultyMapping);
            
            // Switch View
            setViewMode('edit');
            window.scrollTo(0, 0);

        } catch (error) {
            console.error(error);
            setStatusModal({ isOpen: true, title: "Error", message: "Failed to load timetable details.", type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    // --- 4. EDITOR HELPERS (Same as Create Page) ---
    useEffect(() => {
        const courses = new Set();
        Object.values(slotData).forEach(slot => { if (slot.subject) courses.add(slot.subject); });
        setUniqueCourses(Array.from(courses));
    }, [slotData]);

    const getSlot = (dayIdx, pIdx, type) => {
        const key = `${dayIdx}-${pIdx}`;
        if (slotData[key]) return slotData[key];
        const timing = type === 'FN' ? config.morning : config.afternoon;
        return { startTime: timing.start, endTime: timing.end, session: type, subject: '', roomNo: config.defaultRoom };
    };

    const updateSlot = (dayIdx, pIdx, field, value) => {
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
        setFacultyMapping(prev => ({ ...prev, [courseId]: { ...prev[courseId], [role]: facultyId } }));
    };

    const addSession = (dayIdx) => { const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.push({ id: Date.now(), type: 'AN' }); setWeekSchedule(newSchedule); };
    const removeSession = (dayIdx, pIdx) => { const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.splice(pIdx, 1); setWeekSchedule(newSchedule); };
    
    // --- IMPORTANT: DEFINE HELPER BEFORE USAGE ---
    const getHydratedSchedule = () => weekSchedule.map((day, dIdx) => ({ day: day.day, periods: day.periods.map((p, pIdx) => ({ ...p, data: getSlot(dIdx, pIdx, p.type) })) }));

    // --- 5. API UPDATE (POST) ---
    const handleUpdateSubmit = async () => {
        setIsSubmitting(true);
        const payload = {
            sem: config.sem,
            batch: config.batch,
            weekSchedule: weekSchedule.map((dayObj, dayIdx) => {
                const validPeriods = dayObj.periods.map((p, pIdx) => {
                    const slot = getSlot(dayIdx, pIdx, p.type);
                    if (!slot.subject) return null; // Skip empty slots
                    
                    const mapping = facultyMapping[slot.subject] || {};
                    const facultyArray = [];
                    
                    // Reconstruct Faculty Array [{id, name}, ...]
                    if (mapping.primary) { 
                        const f = facultyList.find(i => i.id === mapping.primary); 
                        if (f) facultyArray.push({ id: f.id, name: f.name }); 
                    }
                    if (mapping.secondary) { 
                        const f = facultyList.find(i => i.id === mapping.secondary); 
                        if (f) facultyArray.push({ id: f.id, name: f.name }); 
                    }
                    
                    return { 
                        startTime: slot.startTime, 
                        endTime: slot.endTime, 
                        session: slot.session, 
                        subject: slot.subject, 
                        faculty: facultyArray, 
                        roomNo: slot.roomNo 
                    };
                }).filter(Boolean);

                return { day: dayObj.day, periods: validPeriods };
            })
        };

        try {
            const response = await fetch(`${API_URL}/api/admin/modifytimetable`, {
                method: "PATCH", 
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify(payload), 
                credentials: "include"
            });
            
            if (response.status === 401 || response.status === 403) { logout(); return; }
            const result = await response.json();
            
            if (response.ok) {
                setStatusModal({ isOpen: true, title: "Success", message: "Timetable updated successfully.", type: "success" });
                setBackendResponse(result);
                setShowPreview(false);
            } else {
                setStatusModal({ isOpen: true, title: "Update Failed", message: result.message || "Unknown error", type: "error" });
            }
        } catch (error) {
            setStatusModal({ isOpen: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen text-gray-800 font-sans bg-[#F8F9FA] overflow-x-hidden">
            <StatusModal isOpen={statusModal.isOpen} onClose={() => { setStatusModal({ ...statusModal, isOpen: false }); if(statusModal.type==='success') setViewMode('list'); }} title={statusModal.title} message={statusModal.message} type={statusModal.type} />
            <TimetableSuccessModal isOpen={!!backendResponse} onClose={() => { setBackendResponse(null); setViewMode('list'); }} data={backendResponse} />
            <ConfirmationModal isOpen={confirmDeleteModal.isOpen} onClose={() => setConfirmDeleteModal({isOpen:false})} onConfirm={confirmDelete} title="Delete Timetable?" message={`Permanently delete timetable for Sem ${confirmDeleteModal.sem} - Batch ${confirmDeleteModal.batch}?`} confirmText="Delete" isDangerous={true} />

            {viewMode === 'edit' && (
                <PreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} onConfirm={handleUpdateSubmit} schedule={getHydratedSchedule()} config={config} facultyMapping={facultyMapping} isSubmitting={isSubmitting} dynamicOptions={{ faculty: facultyList }} />
            )}

            <header className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-bl-[2.5rem] rounded-br-[2.5rem] shadow-2xl relative z-20 pb-10 pt-6 px-4 sm:px-6 lg:px-8">
                <Header animate={animate} />
                <div className="w-full h-px bg-white/10 my-6"></div>
                <div className={`flex justify-between items-end transition-all duration-1000 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                    <div>
                        <div className="flex items-center gap-2 text-blue-300 mb-2"><button onClick={() => navigate(-1)} className="hover:text-white transition-colors flex items-center gap-1"><ArrowLeft size={14} /> Back</button><span className="text-xs font-semibold uppercase tracking-wider opacity-60">/ Admin / Modify</span></div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3"><Clock className="text-blue-400" size={32} /> Modify Timetable</h2>
                    </div>
                    {viewMode === 'edit' && (
                        <button onClick={() => setViewMode('list')} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm border border-white/10"><RotateCcw size={18} /> Cancel Editing</button>
                    )}
                </div>
            </header>

            <main className="px-4 sm:px-6 lg:px-8 py-10 pb-48 relative z-10 max-w-7xl mx-auto space-y-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-blue-600 mb-4" size={40} /><p className="text-gray-500 font-medium">Loading data...</p></div>
                ) : viewMode === 'list' ? (
                    
                    /* --- LIST VIEW: ALL TIMETABLES --- */
                    <div className={`space-y-8 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        {semGroups.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300"><Layers size={48} className="mx-auto text-gray-300 mb-4"/><h3 className="text-lg font-bold text-gray-500">No Timetables Found</h3></div>
                        ) : (
                            semGroups.map(group => (
                                <div key={group.semester} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black text-lg">SEM {group.semester}</div>
                                        <span className="text-sm text-gray-400 font-bold">{group.batches.length} Batches</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {group.batches.map(batchData => (
                                            <div key={batchData._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all group bg-gray-50 hover:bg-white hover:border-blue-200 flex flex-col">
                                                
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="text-xl font-black text-gray-800">{batchData.batch}</h4>
                                                        <p className="text-xs text-gray-500 font-medium mt-1">Existing Schedule</p>
                                                    </div>
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><CalendarCheck size={20}/></div>
                                                </div>

                                                {/* Button Row */}
                                                <div className="flex items-center gap-2 mt-auto">
                                                    <button 
                                                        onClick={() => handleModifyClick(group.semester, batchData)} 
                                                        className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        Modify
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteClick(group.semester, batchData.batch)}
                                                        className="px-4 py-2.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                                                        title="Delete Timetable"
                                                    >
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                
                ) : (
                    
                    /* --- EDIT VIEW: TIMETABLE EDITOR (Same as before) --- */
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-10">
                        {/* 1. WEEKLY PLANNER */}
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
                            <div className="flex justify-between items-end px-2 mb-6">
                                <div className="flex items-center mb-0"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Modify Weekly Schedule ({config.batch})</h2></div>
                            </div>
                            <div className="flex flex-col gap-6">
                                {weekSchedule.map((day, dIdx) => (
                                    <div key={day.day} className="flex flex-col lg:flex-row items-stretch gap-4">
                                        <div className="w-full lg:w-28 bg-black rounded-2xl flex flex-col items-center justify-center p-4 shadow-lg shrink-0 border border-gray-800"><span className="text-white font-black text-3xl tracking-widest">{day.day.substring(0,3).toUpperCase()}</span></div>
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
                                                            <div>
                                                                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Skill Course</label>
                                                                <NativeSelect options={courseOptions} value={data.subject} onChange={(val) => updateSlot(dIdx, pIdx, 'subject', val)} placeholder="Select Course" />
                                                            </div>
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

                        {/* 2. FACULTY ALLOCATION */}
                        <section className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
                            <div className="flex items-center mb-6"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Faculty Allocation</h2></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {uniqueCourses.map(courseCode => (
                                    <div key={courseCode} className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all flex flex-col gap-4">
                                        <div className="flex items-center gap-3 mb-1"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ListChecks size={18} /></div><h4 className="font-bold text-gray-800 text-sm truncate" title={courseCode}>{courseCode}</h4></div>
                                        <SmartFacultySelect label="Primary Faculty" options={facultyList} value={facultyMapping[courseCode]?.primary} onChange={(val) => updateFacultyChoice(courseCode, 'primary', val)} placeholder="Assign Primary..." />
                                        <SmartFacultySelect label="Secondary Faculty (Optional)" options={facultyList} value={facultyMapping[courseCode]?.secondary} onChange={(val) => updateFacultyChoice(courseCode, 'secondary', val)} placeholder="Assign Secondary..." />
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. ACTION BAR */}
                        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
                            <div className="max-w-7xl mx-auto flex justify-end items-center gap-4">
                                <span className="text-sm font-bold text-gray-400 mr-auto hidden sm:block">Modifying: {config.batch} (Sem {config.sem})</span>
                                <button onClick={() => setShowPreview(true)} className="bg-slate-900 text-white hover:bg-black font-bold py-3 px-10 rounded-xl text-sm shadow-xl active:scale-95 flex items-center gap-3"><Eye size={18} /> Review & Publish</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ModifyTimetablePage;


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

// const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDangerous = false }) => {
//     if (!isOpen) return null;
//     return (
//         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
//                 <div className="p-6 flex gap-4">
//                     <div className={`flex-shrink-0 p-3 rounded-full h-12 w-12 flex items-center justify-center ${isDangerous ? 'bg-red-100' : 'bg-amber-100'}`}>
//                         <AlertTriangle className={isDangerous ? "text-red-600" : "text-amber-600"} size={24} />
//                     </div>
//                     <div>
//                         <h3 className="text-lg font-bold text-gray-900">{title}</h3>
//                         <p className="text-gray-500 text-sm mt-1 leading-relaxed">{message}</p>
//                     </div>
//                 </div>
//                 <div className="bg-gray-50 p-4 flex justify-end gap-3">
//                     <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 transition-all">Cancel</button>
//                     <button 
//                         onClick={() => { onConfirm(); onClose(); }} 
//                         className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-black'}`}
//                     >
//                         {confirmText}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

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

//     useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus(); }, [isOpen]);

//     const filteredOptions = options.filter(opt => 
//         opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
//         opt.id.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     const selectedOption = options.find(opt => opt.id === value);

//     return (
//         <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={containerRef}>
//             {label && <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{label}</label>}
//             <div onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center cursor-pointer transition-all hover:border-blue-400 ${isOpen ? 'ring-2 ring-blue-100 border-blue-500' : ''}`}>
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
//                 <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-48 overflow-y-auto p-1">
//                     <div className="p-2 border-b border-gray-100 bg-gray-50/80 sticky top-0"><input ref={inputRef} type="text" className="w-full pl-3 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div>
//                     {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
//                         <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); setSearchTerm(''); }} className={`px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center group transition-colors mb-1 ${value === opt.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}`}>
//                             <div className="flex flex-col"><span className={`text-xs font-bold ${value === opt.id ? 'text-blue-700' : 'text-gray-700'}`}>{opt.name}</span><span className="text-[10px] text-gray-400 font-mono">{opt.id}</span></div>
//                             {value === opt.id && <CheckCircle2 size={14} className="text-blue-600"/>}
//                         </div>
//                     )) : <div className="px-4 py-6 text-center text-gray-400 text-xs">No faculty found</div>}
//                 </div>
//             )}
//         </div>
//     );
// };

// const PreviewModal = ({ isOpen, onClose, onConfirm, schedule, config, facultyMapping, isSubmitting, dynamicOptions }) => {
//     if (!isOpen) return null;
//     const totalSessions = schedule.reduce((acc, day) => acc + day.periods.length, 0);
//     return (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
//                 <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
//                     <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3"><CheckCircle2 className="text-blue-500 fill-blue-100" size={28}/> Verify Changes</h2><p className="text-sm text-gray-500 mt-1 ml-10">Review modification before updating.</p></div>
//                     <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400 hover:text-gray-700" /></button>
//                 </div>
//                 <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F8FAFC]">
//                     {schedule.map((day) => day.periods.length > 0 && (
//                         <div key={day.day} className="flex gap-6">
//                             <div className="w-16 flex flex-col items-center pt-2"><span className="text-sm font-black text-slate-400 uppercase tracking-widest">{day.day.substring(0,3)}</span><div className="h-full w-0.5 bg-slate-200 mt-3 rounded-full"></div></div>
//                             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
//                                 {day.periods.map((p, idx) => {
//                                     const mapping = facultyMapping[p.data?.subject] || { primary: '', secondary: '' };
//                                     const fac1 = dynamicOptions.faculty.find(f => f.id === mapping.primary);
//                                     const fac2 = dynamicOptions.faculty.find(f => f.id === mapping.secondary);
//                                     const isFN = p.data?.session === 'FN';
//                                     return (
//                                         <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-all">
//                                             <div className={`absolute top-0 left-0 w-1 h-full ${isFN ? 'bg-teal-400' : 'bg-violet-400'}`}></div>
//                                             <div className="flex justify-between items-start"><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isFN ? 'bg-teal-50 text-teal-700' : 'bg-violet-50 text-violet-700'}`}>{p.data?.session}</span><span className="font-mono text-xs font-bold text-gray-500">{p.data?.startTime} - {p.data?.endTime}</span></div>
//                                             <div><h4 className="font-bold text-gray-800 text-sm leading-tight line-clamp-1">{p.data?.subject || "Not Selected"}</h4><div className="mt-2 space-y-1"><div className="flex items-center gap-1.5 text-xs text-gray-500"><User size={10} className="text-blue-500"/> <span className="truncate">{fac1 ? fac1.name : "Unassigned"}</span></div>{fac2 && (<div className="flex items-center gap-1.5 text-xs text-gray-400"><User size={10} className="text-purple-500"/> <span className="truncate">{fac2.name}</span></div>)}</div></div>
//                                             <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto"><div className="flex items-center gap-1 text-gray-400"><MapPin size={12}/><span className="text-xs font-bold">{p.data?.roomNo}</span></div></div>
//                                         </div>
//                                     );
//                                 })}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//                 <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-white">
//                     <button onClick={onClose} disabled={isSubmitting} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50">Back to Edit</button>
//                     <button onClick={onConfirm} disabled={isSubmitting} className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-black shadow-xl transition-all active:scale-95 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
//                         {isSubmitting ? <><Loader2 className="animate-spin" size={18}/> Updating...</> : <><Save size={18} /> Update Timetable</>}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const TimetableSuccessModal = ({ isOpen, onClose, data }) => {
//     if (!isOpen || !data || !data.timetable) return null;
//     const { sem, batch, weekSchedule } = data.timetable;
//     return (
//         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
//             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
//                 <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex justify-between items-center flex-shrink-0">
//                     <div className="flex items-center gap-4"><div className="p-3 bg-emerald-100 rounded-full text-emerald-600 shadow-sm"><CheckCircle2 size={28} /></div><div><h3 className="text-xl font-bold text-emerald-900">Modification Successful!</h3><p className="text-sm text-emerald-600 font-medium">The schedule for {batch} has been updated.</p></div></div>
//                     <button onClick={onClose} className="p-2.5 bg-emerald-100 hover:bg-emerald-200 rounded-full text-emerald-700 transition-colors"><X size={20}/></button>
//                 </div>
//                 <div className="flex-1 overflow-y-auto bg-slate-100 p-8 custom-scrollbar">
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                         {weekSchedule.map((dayData, idx) => (
//                             <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
//                                 <div className="bg-slate-900 text-white py-2 px-4 text-center font-bold uppercase tracking-wider text-sm flex justify-between items-center">
//                                     <span>{dayData.day}</span><span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white/80">{dayData.periods.length} Sessions</span>
//                                 </div>
//                                 <div className="p-3 space-y-3">
//                                     {dayData.periods.map((p, pIdx) => (
//                                         <div key={pIdx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative pl-3 overflow-hidden">
//                                             <div className={`absolute top-0 left-0 w-1 h-full ${p.session === 'FN' ? 'bg-teal-400' : 'bg-purple-400'}`}></div>
//                                             <div className="flex justify-between items-start mb-1"><span className="text-[10px] font-mono font-bold text-gray-400">{p.startTime} - {p.endTime}</span><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${p.session === 'FN' ? 'bg-teal-50 text-teal-700' : 'bg-purple-50 text-purple-700'}`}>{p.session}</span></div>
//                                             <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">{p.subject}</h4>
//                                             {p.faculty && p.faculty.map((fac, fIdx) => (<div key={fIdx} className="flex items-center gap-1 text-[10px] text-gray-500"><User size={8} /> <span className="truncate">{fac.name}</span></div>))}
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- NATIVE SELECT ---
// const NativeSelect = ({ options, value, onChange, placeholder, disabled }) => (
//     <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
//         <select value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl py-3 px-4 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer hover:border-blue-300 transition-colors shadow-sm">
//             <option value="" disabled>{placeholder}</option>
//             {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
//         </select>
//         <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//     </div>
// );


// // --- MAIN PAGE COMPONENT ---
// const ModifyTimetablePage = () => {
//     const { user, logout } = useAuth();
//     const navigate = useNavigate();
    
//     // UI State
//     const [viewMode, setViewMode] = useState('list'); // 'list' or 'edit'
//     const [animate, setAnimate] = useState(false);
//     const [isLoading, setIsLoading] = useState(false);
//     const [statusModal, setStatusModal] = useState({ isOpen: false, title: '', message: '', type: '' });
//     const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, sem: '', batch: '' });

//     // Data State (List View)
//     const [semGroups, setSemGroups] = useState([]); // [{ semester: "VI", batches: [...] }]
//     const [semestersList, setSemestersList] = useState([]);
    
//     // Data State (Editor)
//     const [config, setConfig] = useState({ sem: '', batch: '', defaultRoom: '5101', morning: { start: '09:30', end: '12:15' }, afternoon: { start: '13:05', end: '15:50' } });
//     const [weekSchedule, setWeekSchedule] = useState([]);
//     const [slotData, setSlotData] = useState({});
//     const [facultyMapping, setFacultyMapping] = useState({}); // { "Course": { primary: "ID", secondary: "ID" } }
//     const [uniqueCourses, setUniqueCourses] = useState([]);
    
//     // Resources
//     const [facultyList, setFacultyList] = useState([]);
//     const [courseOptions, setCourseOptions] = useState([]);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [showPreview, setShowPreview] = useState(false);
//     const [backendResponse, setBackendResponse] = useState(null);

//     // --- 1. INITIAL LOAD (Fetch Faculty & Timetables) ---
//     useEffect(() => {
//         if (!user) { navigate('/'); return; }
        
//         const loadInitialData = async () => {
//             setIsLoading(true);
//             try {
//                 // A. Fetch Faculty List (GET: Plain URL params, Decrypted Response)
//                 const facRes = await fetch(`${API_URL}/api/admin/view-faculty`, { credentials: "include" });
//                 const facRaw = await facRes.json();
//                 const facData = facRaw.data ? decryptData(facRaw.data) : facRaw;

//                 if (Array.isArray(facData)) setFacultyList(facData.map(f => ({ id: f.facultyid, name: f.name })));

//                 // B. Fetch All Timetables (GET: Plain URL params, Decrypted Response)
//                 const ttRes = await fetch(`${API_URL}/api/admin/get-all-timetables`, { credentials: "include" });
//                 if (ttRes.status === 401) { logout(); return; }
//                 const ttRaw = await ttRes.json();
//                 const ttData = ttRaw.data ? decryptData(ttRaw.data) : ttRaw;

//                 if (ttData.success && Array.isArray(ttData.data)) {
//                     setSemGroups(ttData.data);
//                     setSemestersList(ttData.data.map(g => g.semester).sort());
//                 }
//             } catch (error) {
//                 console.error("Load Error:", error);
//                 setStatusModal({ isOpen: true, title: "Connection Error", message: "Failed to load data.", type: "error" });
//             } finally {
//                 setIsLoading(false);
//                 setTimeout(() => setAnimate(true), 100);
//             }
//         };
//         loadInitialData();
//     }, [user, navigate, logout]);


//     // --- 2. DELETE TIMETABLE ---
//     const handleDeleteClick = (sem, batch) => {
//         setConfirmDeleteModal({ isOpen: true, sem, batch });
//     };

//     const confirmDelete = async () => {
//         const { sem, batch } = confirmDeleteModal;
//         setIsLoading(true);
//         try {
//             // DELETE: Encrypt Body
//             const encryptedBody = encryptData({ sem, batch });

//             const response = await fetch(`${API_URL}/api/admin/delete-timetable`, {
//                 method: 'DELETE',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ payload: encryptedBody }),
//                 credentials: 'include'
//             });

//             const rawJson = await response.json();
//             // DELETE: Decrypt Response
//             const result = rawJson.data ? decryptData(rawJson.data) : rawJson;

//             if (response.ok) {
//                 // Remove from local state to update UI
//                 setSemGroups(prevGroups => prevGroups.map(group => {
//                     if (group.semester === sem) {
//                         return {
//                             ...group,
//                             batches: group.batches.filter(b => b.batch !== batch)
//                         };
//                     }
//                     return group;
//                 }).filter(group => group.batches.length > 0)); // Remove semester group if empty

//                 setStatusModal({ isOpen: true, title: "Deleted", message: result.message, type: "success" });
//             } else {
//                 setStatusModal({ isOpen: true, title: "Delete Failed", message: result.message || "Unknown error", type: "error" });
//             }
//         } catch (error) {
//             setStatusModal({ isOpen: true, title: "Error", message: "Network error occurred.", type: "error" });
//         } finally {
//             setIsLoading(false);
//             setConfirmDeleteModal({ isOpen: false, sem: '', batch: '' });
//         }
//     };


//     // --- 3. LOAD BATCH INTO EDITOR ---
//     const handleModifyClick = async (sem, batchData) => {
//         setIsLoading(true);
//         try {
//             // A. Fetch Courses for this Semester (GET: Plain URL params, Decrypted Response)
//             const semRes = await fetch(`${API_URL}/api/get-sem-info/${sem}`, { credentials: "include" });
//             const semRaw = await semRes.json();
//             const semInfo = semRaw.data ? decryptData(semRaw.data) : semRaw;

//             if (semInfo.success && semInfo.data) setCourseOptions(semInfo.data.courses || []);

//             // B. Initialize Editor State
//             setConfig(prev => ({ ...prev, sem: sem, batch: batchData.batch }));

//             // C. Parse Week Schedule from Backend Format
//             const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//             const newSlotData = {};
//             const newFacultyMapping = {};
            
//             const newSchedule = days.map((dayName, dIdx) => {
//                 const dayObj = batchData.weekSchedule.find(d => d.day === dayName) || { periods: [] };
//                 return {
//                     day: dayName,
//                     periods: dayObj.periods.map((p, pIdx) => {
//                         const slotId = `${dIdx}-${pIdx}`;
                        
//                         // 1. Populate Slot Data
//                         newSlotData[slotId] = {
//                             startTime: p.startTime,
//                             endTime: p.endTime,
//                             session: p.session,
//                             subject: p.subject, // String like "CSM601 - Machine Learning"
//                             roomNo: p.roomNo
//                         };

//                         // 2. Populate Faculty Mapping
//                         if (p.faculty && p.faculty.length > 0) {
//                             if (!newFacultyMapping[p.subject]) newFacultyMapping[p.subject] = {};
                            
//                             // Assign Primary
//                             if(p.faculty[0]) newFacultyMapping[p.subject].primary = p.faculty[0].id;
//                             // Assign Secondary (if exists)
//                             if(p.faculty[1]) newFacultyMapping[p.subject].secondary = p.faculty[1].id;
//                         }

//                         return { id: `${slotId}-${Date.now()}`, type: p.session };
//                     })
//                 };
//             });

//             setWeekSchedule(newSchedule);
//             setSlotData(newSlotData);
//             setFacultyMapping(newFacultyMapping);
            
//             // Switch View
//             setViewMode('edit');
//             window.scrollTo(0, 0);

//         } catch (error) {
//             console.error(error);
//             setStatusModal({ isOpen: true, title: "Error", message: "Failed to load timetable details.", type: "error" });
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     // --- 4. EDITOR HELPERS (Same as Create Page) ---
//     useEffect(() => {
//         const courses = new Set();
//         Object.values(slotData).forEach(slot => { if (slot.subject) courses.add(slot.subject); });
//         setUniqueCourses(Array.from(courses));
//     }, [slotData]);

//     const getSlot = (dayIdx, pIdx, type) => {
//         const key = `${dayIdx}-${pIdx}`;
//         if (slotData[key]) return slotData[key];
//         const timing = type === 'FN' ? config.morning : config.afternoon;
//         return { startTime: timing.start, endTime: timing.end, session: type, subject: '', roomNo: config.defaultRoom };
//     };

//     const updateSlot = (dayIdx, pIdx, field, value) => {
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
//         setFacultyMapping(prev => ({ ...prev, [courseId]: { ...prev[courseId], [role]: facultyId } }));
//     };

//     const addSession = (dayIdx) => { const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.push({ id: Date.now(), type: 'AN' }); setWeekSchedule(newSchedule); };
//     const removeSession = (dayIdx, pIdx) => { const newSchedule = [...weekSchedule]; newSchedule[dayIdx].periods.splice(pIdx, 1); setWeekSchedule(newSchedule); };
    
//     // --- IMPORTANT: DEFINE HELPER BEFORE USAGE ---
//     const getHydratedSchedule = () => weekSchedule.map((day, dIdx) => ({ day: day.day, periods: day.periods.map((p, pIdx) => ({ ...p, data: getSlot(dIdx, pIdx, p.type) })) }));

//     // --- 5. API UPDATE (POST) ---
//     const handleUpdateSubmit = async () => {
//         setIsSubmitting(true);
//         const payload = {
//             sem: config.sem,
//             batch: config.batch,
//             weekSchedule: weekSchedule.map((dayObj, dayIdx) => {
//                 const validPeriods = dayObj.periods.map((p, pIdx) => {
//                     const slot = getSlot(dayIdx, pIdx, p.type);
//                     if (!slot.subject) return null; // Skip empty slots
                    
//                     const mapping = facultyMapping[slot.subject] || {};
//                     const facultyArray = [];
                    
//                     // Reconstruct Faculty Array [{id, name}, ...]
//                     if (mapping.primary) { 
//                         const f = facultyList.find(i => i.id === mapping.primary); 
//                         if (f) facultyArray.push({ id: f.id, name: f.name }); 
//                     }
//                     if (mapping.secondary) { 
//                         const f = facultyList.find(i => i.id === mapping.secondary); 
//                         if (f) facultyArray.push({ id: f.id, name: f.name }); 
//                     }
                    
//                     return { 
//                         startTime: slot.startTime, 
//                         endTime: slot.endTime, 
//                         session: slot.session, 
//                         subject: slot.subject, 
//                         faculty: facultyArray, 
//                         roomNo: slot.roomNo 
//                     };
//                 }).filter(Boolean);

//                 return { day: dayObj.day, periods: validPeriods };
//             })
//         };

//         try {
//             // PATCH Request: Encrypt Body
//             const encryptedBody = encryptData(payload);

//             const response = await fetch(`${API_URL}/api/admin/modifytimetable`, {
//                 method: "PATCH", 
//                 headers: { "Content-Type": "application/json" }, 
//                 body: JSON.stringify({ payload: encryptedBody }), 
//                 credentials: "include"
//             });
            
//             if (response.status === 401 || response.status === 403) { logout(); return; }
            
//             const rawJson = await response.json();
//             // PATCH Request: Decrypt Response
//             const result = rawJson.data ? decryptData(rawJson.data) : rawJson;
            
//             if (response.ok) {
//                 setStatusModal({ isOpen: true, title: "Success", message: "Timetable updated successfully.", type: "success" });
//                 setBackendResponse(result);
//                 setShowPreview(false);
//             } else {
//                 setStatusModal({ isOpen: true, title: "Update Failed", message: result.message || "Unknown error", type: "error" });
//             }
//         } catch (error) {
//             setStatusModal({ isOpen: true, title: "Network Error", message: "Could not connect to server.", type: "error" });
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     if (!user) return null;

//     return (
//         <div className="min-h-screen text-gray-800 font-sans bg-[#F8F9FA] overflow-x-hidden">
//             <StatusModal isOpen={statusModal.isOpen} onClose={() => { setStatusModal({ ...statusModal, isOpen: false }); if(statusModal.type==='success') setViewMode('list'); }} title={statusModal.title} message={statusModal.message} type={statusModal.type} />
//             <TimetableSuccessModal isOpen={!!backendResponse} onClose={() => { setBackendResponse(null); setViewMode('list'); }} data={backendResponse} />
//             <ConfirmationModal isOpen={confirmDeleteModal.isOpen} onClose={() => setConfirmDeleteModal({isOpen:false})} onConfirm={confirmDelete} title="Delete Timetable?" message={`Permanently delete timetable for Sem ${confirmDeleteModal.sem} - Batch ${confirmDeleteModal.batch}?`} confirmText="Delete" isDangerous={true} />

//             {viewMode === 'edit' && (
//                 <PreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} onConfirm={handleUpdateSubmit} schedule={getHydratedSchedule()} config={config} facultyMapping={facultyMapping} isSubmitting={isSubmitting} dynamicOptions={{ faculty: facultyList }} />
//             )}

//             <header className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-bl-[2.5rem] rounded-br-[2.5rem] shadow-2xl relative z-20 pb-10 pt-6 px-4 sm:px-6 lg:px-8">
//                 <Header animate={animate} />
//                 <div className="w-full h-px bg-white/10 my-6"></div>
//                 <div className={`flex justify-between items-end transition-all duration-1000 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
//                     <div>
//                         <div className="flex items-center gap-2 text-blue-300 mb-2"><button onClick={() => navigate(-1)} className="hover:text-white transition-colors flex items-center gap-1"><ArrowLeft size={14} /> Back</button><span className="text-xs font-semibold uppercase tracking-wider opacity-60">/ Admin / Modify</span></div>
//                         <h2 className="text-3xl font-black text-white flex items-center gap-3"><Clock className="text-blue-400" size={32} /> Modify Timetable</h2>
//                     </div>
//                     {viewMode === 'edit' && (
//                         <button onClick={() => setViewMode('list')} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm border border-white/10"><RotateCcw size={18} /> Cancel Editing</button>
//                     )}
//                 </div>
//             </header>

//             <main className="px-4 sm:px-6 lg:px-8 py-10 pb-48 relative z-10 max-w-7xl mx-auto space-y-10">
//                 {isLoading ? (
//                     <div className="flex flex-col items-center justify-center py-20"><Loader2 className="animate-spin text-blue-600 mb-4" size={40} /><p className="text-gray-500 font-medium">Loading data...</p></div>
//                 ) : viewMode === 'list' ? (
                    
//                     /* --- LIST VIEW: ALL TIMETABLES --- */
//                     <div className={`space-y-8 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
//                         {semGroups.length === 0 ? (
//                             <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-300"><Layers size={48} className="mx-auto text-gray-300 mb-4"/><h3 className="text-lg font-bold text-gray-500">No Timetables Found</h3></div>
//                         ) : (
//                             semGroups.map(group => (
//                                 <div key={group.semester} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
//                                     <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
//                                         <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black text-lg">SEM {group.semester}</div>
//                                         <span className="text-sm text-gray-400 font-bold">{group.batches.length} Batches</span>
//                                     </div>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                                         {group.batches.map(batchData => (
//                                             <div key={batchData._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all group bg-gray-50 hover:bg-white hover:border-blue-200 flex flex-col">
                                                
//                                                 <div className="flex justify-between items-start mb-4">
//                                                     <div>
//                                                         <h4 className="text-xl font-black text-gray-800">{batchData.batch}</h4>
//                                                         <p className="text-xs text-gray-500 font-medium mt-1">Existing Schedule</p>
//                                                     </div>
//                                                     <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><Calendar size={20}/></div>
//                                                 </div>

//                                                 {/* Button Row */}
//                                                 <div className="flex items-center gap-2 mt-auto">
//                                                     <button 
//                                                         onClick={() => handleModifyClick(group.semester, batchData)} 
//                                                         className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
//                                                     >
//                                                         Modify
//                                                     </button>
//                                                     <button 
//                                                         onClick={() => handleDeleteClick(group.semester, batchData.batch)}
//                                                         className="px-4 py-2.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
//                                                         title="Delete Timetable"
//                                                     >
//                                                         <Trash2 size={16} /> Delete
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 </div>
//                             ))
//                         )}
//                     </div>
                
//                 ) : (
                    
//                     /* --- EDIT VIEW: TIMETABLE EDITOR (Same as before) --- */
//                     <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-10">
//                         {/* 1. WEEKLY PLANNER */}
//                         <section className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
//                             <div className="flex justify-between items-end px-2 mb-6">
//                                 <div className="flex items-center mb-0"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Modify Weekly Schedule ({config.batch})</h2></div>
//                             </div>
//                             <div className="flex flex-col gap-6">
//                                 {weekSchedule.map((day, dIdx) => (
//                                     <div key={day.day} className="flex flex-col lg:flex-row items-stretch gap-4">
//                                         <div className="w-full lg:w-28 bg-black rounded-2xl flex flex-col items-center justify-center p-4 shadow-lg shrink-0 border border-gray-800"><span className="text-white font-black text-3xl tracking-widest">{day.day.substring(0,3).toUpperCase()}</span></div>
//                                         <div className="flex-1 flex flex-row overflow-x-auto gap-4 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent items-stretch">
//                                             {day.periods.map((period, pIdx) => {
//                                                 const data = getSlot(dIdx, pIdx, period.type);
//                                                 const isFN = data.session === 'FN';
//                                                 return (
//                                                     <div key={period.id} className={`min-w-[320px] relative rounded-2xl border-2 transition-all duration-300 flex flex-col overflow-hidden bg-white shadow-sm hover:shadow-md ${isFN ? 'border-teal-100 hover:border-teal-300' : 'border-violet-100 hover:border-violet-300'}`}>
//                                                         <div className={`px-4 py-2 border-b flex justify-between items-center ${isFN ? 'bg-teal-50/40 border-teal-50' : 'bg-violet-50/40 border-violet-50'}`}>
//                                                             <select value={data.session} onChange={(e) => updateSlot(dIdx, pIdx, 'session', e.target.value)} className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer border-none outline-none shadow-sm ${isFN ? 'bg-teal-600 text-white hover:bg-teal-700' : 'bg-violet-600 text-white hover:bg-violet-700'}`}><option value="FN">FN (Morning)</option><option value="AN">AN (Afternoon)</option></select>
//                                                             <button onClick={() => removeSession(dIdx, pIdx)} className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-all"><Trash2 size={16} /></button>
//                                                         </div>
//                                                         <div className="p-4 space-y-4">
//                                                             <div>
//                                                                 <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Skill Course</label>
//                                                                 <NativeSelect options={courseOptions} value={data.subject} onChange={(val) => updateSlot(dIdx, pIdx, 'subject', val)} placeholder="Select Course" />
//                                                             </div>
//                                                             <div className={`mt-auto pt-3 border-t flex items-center justify-between gap-2 ${isFN ? 'border-teal-50' : 'border-violet-50'}`}>
//                                                                 <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 w-full"><input type="time" value={data.startTime} onChange={(e) => updateSlot(dIdx, pIdx, 'startTime', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 font-mono w-24 outline-none text-center" /><span className="text-gray-300 text-[10px] font-bold">-</span><input type="time" value={data.endTime} onChange={(e) => updateSlot(dIdx, pIdx, 'endTime', e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 font-mono w-24 outline-none text-center" /></div>
//                                                                 <div className="flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200"><input type="text" value={data.roomNo} onChange={(e) => updateSlot(dIdx, pIdx, 'roomNo', e.target.value)} className="w-12 bg-transparent text-xs font-bold text-gray-700 outline-none text-center" /></div>
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                 );
//                                             })}
//                                             <button onClick={() => addSession(dIdx)} className="min-w-[120px] rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-3 transition-all group"><div className="w-12 h-12 rounded-full bg-white border border-gray-200 group-hover:border-blue-200 flex items-center justify-center shadow-sm"><Plus size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors" /></div><span className="text-xs font-bold text-gray-400 group-hover:text-blue-600">Add Session</span></button>
//                                         </div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </section>

//                         {/* 2. FACULTY ALLOCATION */}
//                         <section className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
//                             <div className="flex items-center mb-6"><div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3 shadow-md"></div><h2 className="text-lg font-bold text-gray-800 tracking-tight">Faculty Allocation</h2></div>
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                                 {uniqueCourses.map(courseCode => (
//                                     <div key={courseCode} className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md transition-all flex flex-col gap-4">
//                                         <div className="flex items-center gap-3 mb-1"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ListChecks size={18} /></div><h4 className="font-bold text-gray-800 text-sm truncate" title={courseCode}>{courseCode}</h4></div>
//                                         <SmartFacultySelect label="Primary Faculty" options={facultyList} value={facultyMapping[courseCode]?.primary} onChange={(val) => updateFacultyChoice(courseCode, 'primary', val)} placeholder="Assign Primary..." />
//                                         <SmartFacultySelect label="Secondary Faculty (Optional)" options={facultyList} value={facultyMapping[courseCode]?.secondary} onChange={(val) => updateFacultyChoice(courseCode, 'secondary', val)} placeholder="Assign Secondary..." />
//                                     </div>
//                                 ))}
//                             </div>
//                         </section>

//                         {/* 3. ACTION BAR */}
//                         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
//                             <div className="max-w-7xl mx-auto flex justify-end items-center gap-4">
//                                 <span className="text-sm font-bold text-gray-400 mr-auto hidden sm:block">Modifying: {config.batch} (Sem {config.sem})</span>
//                                 <button onClick={() => setShowPreview(true)} className="bg-slate-900 text-white hover:bg-black font-bold py-3 px-10 rounded-xl text-sm shadow-xl active:scale-95 flex items-center gap-3"><Eye size={18} /> Review & Publish</button>
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </main>
//         </div>
//     );
// };

// export default ModifyTimetablePage;