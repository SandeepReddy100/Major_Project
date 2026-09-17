import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, CheckSquare, Loader2, Check, AlertCircle, RefreshCw, 
    Users, ChevronDown, UserX, ClipboardCheck, Trash2, 
    BookOpen, Calendar, BarChart3, Filter, QrCode, Edit, GraduationCap,
    AlertTriangle, XCircle, Lock, ArrowRight, Pencil, ChevronUp
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 

// --- CONFIGURATION ---
const backendUrl = import.meta.env.VITE_BASE_URL;

// --- CONSTANTS ---
const semesters = [
    { value: "I", label: "Semester I" }, { value: "II", label: "Semester II" },
    { value: "III", label: "Semester III" }, { value: "IV", label: "Semester IV" },
    { value: "V", label: "Semester V" }, { value: "VI", label: "Semester VI" },
    { value: "VII", label: "Semester VII" }, { value: "VIII", label: "Semester VIII" }
];

// --- UTILS ---
const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// --- COMPONENTS ---

const SectionHeader = ({ title, animate, delay }) => (
    <div className={`flex items-center mb-6 transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{ transitionDelay: `${delay}ms` }}>
        <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3 shadow-lg shadow-blue-500/30"></div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
    </div>
);

// --- NATIVE SELECT ---
const NativeSelect = ({ options, value, onChange, placeholder, disabled, icon: Icon }) => {
    return (
        <div className={`relative w-full ${disabled ? 'opacity-50' : ''}`}>
            {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"><Icon size={18} /></div>}
            <div className="relative">
                <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`w-full p-3.5 ${Icon ? 'pl-10' : 'pl-3'} pr-10 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 block appearance-none outline-none transition-all disabled:cursor-not-allowed cursor-pointer font-bold`}>
                    <option value="" disabled hidden>{placeholder}</option>
                    {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"><ChevronDown size={16} /></div>
            </div>
        </div>
    );
};

// --- STATUS MODAL ---
const StatusModal = ({ isOpen, onClose, type, title, message }) => {
    if (!isOpen) return null;
    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 z-[200] bg-gray-900/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className={`${isSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} p-8 text-center border-b`}>
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {isSuccess ? <Check size={32} strokeWidth={3} /> : <AlertTriangle size={32} strokeWidth={3} />}
                    </div>
                    <h3 className={`text-xl font-bold ${isSuccess ? 'text-emerald-800' : 'text-red-800'}`}>{title}</h3>
                </div>
                <div className="p-6">
                    <p className="text-center text-gray-600 text-sm mb-6 font-medium leading-relaxed">
                        {message}
                    </p>
                    <button 
                        onClick={onClose} 
                        className={`w-full py-3.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                    >
                        {isSuccess ? 'Done' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- CONFIRMATION MODAL ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, confirmText, isSubmitting, isConfirmDisabled = false, children, confirmButtonColor = "blue" }) => {
    if (!isOpen) return null;
    
    const getColors = () => {
        if(confirmButtonColor === 'red') return "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/30";
        if(confirmButtonColor === 'green') return "from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-500/30";
        return "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/30";
    }

    return (
        // FIXED: Z-Index 200 to cover header, Solid Dark Background (No Blur)
        <div className="fixed inset-0 z-[200] bg-gray-900/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            {/* Modal Container: Fixed Height with Scroll */}
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${confirmButtonColor === 'red' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}><ClipboardCheck size={24} /></div>
                        <div><h3 className="text-xl font-bold text-gray-900">{title}</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Final Verification</p></div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"><XCircle size={24}/></button>
                </div>
                
                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow bg-white">
                     {children}
                </div>
                
                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100 flex-shrink-0">
                    <button onClick={onClose} className="py-3 px-6 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-sm">Cancel</button>
                    <button onClick={onConfirm} disabled={isSubmitting || isConfirmDisabled} className={`py-3 px-10 bg-gradient-to-r ${getColors()} text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95`}>
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- LOGIC HOOK ---
const useAttendanceForm = (endpoint, method, isUpdate = false) => {
    const { logout } = useAuth();
    const [formData, setFormData] = useState({ semester: '', batch: '', course: '', date: new Date().toISOString().substring(0, 10) });
    const [fetchedData, setFetchedData] = useState({ batches: [], courses: [] });
    const [semesterConfig, setSemesterConfig] = useState([]);
    
    const [students, setStudents] = useState([]);
    const [selection, setSelection] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [mode, setMode] = useState(isUpdate ? 'absent' : 'present'); 
    const [fetchStatus, setFetchStatus] = useState('present'); 
    
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPosted, setIsPosted] = useState(false);

    const resetForm = () => {
        setFormData({ semester: '', batch: '', course: '', date: new Date().toISOString().substring(0, 10) });
        setFetchedData({ batches: [], courses: [] });
        setSemesterConfig([]);
        setStudents([]); setSelection([]); setSearchTerm(''); setMessage({ type: '', text: '' });
        setIsPosted(false);
        setIsConfigOpen(true);
        if(isUpdate) {
            setFetchStatus('present');
            setMode('absent'); 
        } else {
            setMode('present');
        }
    };

    const handleSemesterChange = async (semValue) => {
        setFormData(prev => ({ ...prev, semester: semValue || '', batch: '', course: '' }));
        setFetchedData({ batches: [], courses: [] });
        setSemesterConfig([]);
        setStudents([]); setSelection([]); setMessage({ type: '', text: '' }); setIsPosted(false);

        if (!semValue) return;

        setFetchingInfo(true); 
        try {
            const res = await fetch(`${backendUrl}/api/get-sem-config/${semValue}`, { method: "GET", credentials: "include" });
            if (res.status === 401 || res.status === 403) { logout(); return; }
            const data = await res.json();
            if (data.success && data.data && data.data.config) {
                const config = data.data.config;
                setSemesterConfig(config);
                setFetchedData({
                    batches: config.map(item => ({ value: item.name, label: item.name })),
                    courses: []
                });
            }
        } catch (err) { setMessage({ type: 'error', text: "Unable to load details." }); } finally { setFetchingInfo(false); }
    };

    useEffect(() => {
        if (formData.batch && semesterConfig.length > 0) {
            const batchItem = semesterConfig.find(item => item.name === formData.batch);
            const courses = batchItem ? batchItem.availableCourses : [];
            setFetchedData(prev => ({ ...prev, courses: courses.map(c => ({ value: c, label: c })) }));
            if (formData.course && !courses.includes(formData.course)) { setFormData(prev => ({ ...prev, course: '' })); }
        } else { setFetchedData(prev => ({ ...prev, courses: [] })); }
    }, [formData.batch, semesterConfig]);

    const handleFetchStudents = async (e) => {
        e.preventDefault();
        setLoading(true); setMessage({ type: '', text: '' }); setStudents([]); setSelection([]); setIsPosted(false);
        try {
            let url;
            if (isUpdate) {
                const params = new URLSearchParams({ semname: formData.semester, batch: formData.batch, date: formData.date, course: formData.course, status: fetchStatus });
                url = `${backendUrl}/api/admin/get-students-for-attendance-updation?${params.toString()}`;
            } else {
                url = `${backendUrl}/api/students-by-batch?semname=${formData.semester}&batch=${formData.batch}`;
            }

            const res = await fetch(url, { method: "GET", credentials: "include" });
            if (res.status === 401 || res.status === 403) { logout(); return; }

            const data = await res.json();
            
            if (data.message && data.message.toLowerCase().includes("already posted")) {
                setIsPosted(true); setMessage({ type: 'warning', text: data.message }); return;
            }
            if (data.message && data.message.toLowerCase().includes("no attendance logs found")) {
                setMessage({ type: 'error', text: data.message }); return;
            }

            const sorted = (data.students || []).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            setStudents(sorted);
            if(sorted.length > 0) {
                setIsConfigOpen(false); 
            } else {
                setMessage({type:'info', text: isUpdate ? `No students found with status '${fetchStatus}'.` : "No students registered in this batch."});
            }
            
        } catch (err) { setMessage({ type: 'error', text: "Failed to fetch student list." }); } finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        if (isUpdate && selection.length === 0) return setMessage({type: 'error', text: 'Select students to update.'});
        setSubmitting(true);
        const payload = { semname: formData.semester, course: formData.course, batch: formData.batch, date: formData.date, status: mode, students: selection };
        try {
            const res = await fetch(`${backendUrl}${endpoint}`, {
                method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: "include"
            });
            if (res.status === 401 || res.status === 403) { logout(); return; }

            const data = await res.json();
            
            if (data.message && data.message.toLowerCase().includes("attendance already posted")) {
                setIsPosted(true);
                setMessage({ type: 'warning', text: data.message });
                setIsPreviewOpen(false);
                setSubmitting(false);
                return; 
            }

            if (res.ok) {
                setMessage({ type: 'success', text: isUpdate ? `${data.message} (${data.updatedCount} updated)` : data.message });
                setStudents([]); setSelection([]); setIsPreviewOpen(false); setTimeout(resetForm, 3000);
            } else { setMessage({ type: 'error', text: data.message || "Operation failed." }); }
        } catch (err) { setMessage({ type: 'error', text: "Server error." }); } finally { setSubmitting(false); }
    };

    return {
        formData, setFormData, fetchedData, students, selection, setSelection,
        loading, fetchingInfo, submitting, message, setMessage, mode, setMode,
        isPreviewOpen, setIsPreviewOpen, searchTerm, setSearchTerm, fetchStatus, setFetchStatus,
        handleSemesterChange, handleFetchStudents, handleSubmit, resetForm,
        isPosted, isConfigOpen, setIsConfigOpen
    };
};

// --- STAT CARD COMPONENT FOR CONFIRMATION (REFINED) ---
const StatCard = ({ title, count, color, list }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className={`rounded-2xl border ${color === 'emerald' ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'} overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md`}>
            {/* Header: Always visible */}
            <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${color === 'emerald' ? 'text-emerald-600' : 'text-red-600'}`}>{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-4xl font-extrabold ${color === 'emerald' ? 'text-emerald-900' : 'text-red-900'}`}>{count}</h3>
                        <span className={`text-sm font-bold ${color === 'emerald' ? 'text-emerald-700' : 'text-red-700'}`}>Students</span>
                    </div>
                </div>
                <div className={`p-3 rounded-xl transition-all ${color === 'emerald' ? 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200' : 'bg-red-100 text-red-600 group-hover:bg-red-200'}`}>
                    {color === 'emerald' ? <Check size={28} strokeWidth={2.5} /> : <UserX size={28} strokeWidth={2.5} />}
                </div>
            </div>
            
            {/* Toggle Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className={`w-full py-2.5 px-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider border-t transition-colors ${color === 'emerald' ? 'border-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'border-red-100 text-red-700 hover:bg-red-100'}`}
            >
                {isExpanded ? 'Collapse List' : 'View Roll Numbers'}
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {/* Collapsible Content */}
            {isExpanded && (
                <div className="p-6 bg-white border-t border-gray-100 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-1">
                    <div className="flex flex-wrap gap-2">
                        {list.length > 0 ? list.map(roll => (
                            <span key={roll} className={`px-3 py-1.5 border ${color === 'emerald' ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-red-100 bg-red-50 text-red-800'} text-xs font-mono font-bold rounded-lg`}>
                                {roll}
                            </span>
                        )) : (
                            <span className="text-gray-400 text-xs italic w-full text-center py-2">No students in this category</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- REUSABLE UI WRAPPER ---
const AttendanceUIWrapper = ({ animate, title, logic, filteredStudents, isAllSelected, toggleSelectAll, children, confirmTitle, confirmButtonText, isUpdateMode = false, confirmButtonColor }) => {
    
    // SCROLL REFERENCE
    const resultsRef = useRef(null);

    // AUTO SCROLL EFFECT
    useEffect(() => {
        if (logic.students.length > 0 && resultsRef.current) {
            setTimeout(() => {
                resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [logic.students.length]);

    const getMessageStyle = (type) => {
        if(type === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if(type === 'error') return 'bg-red-50 text-red-700 border-red-100';
        if(type === 'warning') return 'bg-amber-50 text-amber-800 border-amber-100';
        return 'bg-blue-50 text-blue-700 border-blue-100';
    };
    
    // IF POSTED, SHOW SUMMARY SCREEN
    if (logic.isPosted) {
        return (
            <div className={`bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                    <button onClick={logic.resetForm} className="group flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl transition-all border border-gray-200 hover:border-blue-200 text-sm font-bold"><RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> Start Over</button>
                </div>
                
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-amber-50/50 rounded-3xl border border-amber-100 text-center">
                    <div className="w-24 h-24 bg-white text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-md border border-amber-100"><AlertTriangle size={48}/></div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-3">Attendance Recorded</h4>
                    <p className="text-gray-600 max-w-lg mx-auto mb-8 font-medium leading-relaxed">{logic.message.text}</p>
                    <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 font-bold bg-white px-8 py-4 rounded-2xl border border-gray-200 shadow-sm">
                        <span className="flex items-center gap-2"><BookOpen size={16} className="text-blue-500"/> {logic.formData.course}</span>
                        <span className="w-px h-5 bg-gray-300 hidden sm:block"></span>
                        <span className="flex items-center gap-2"><Users size={16} className="text-purple-500"/> {logic.formData.batch}</span>
                        <span className="w-px h-5 bg-gray-300 hidden sm:block"></span>
                        <span className="flex items-center gap-2"><Calendar size={16} className="text-emerald-500"/> {formatDate(logic.formData.date)}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                <div><h3 className="text-3xl font-bold text-gray-800 tracking-tight">{title}</h3></div>
                <button onClick={logic.resetForm} className="group flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl transition-all border border-gray-200 hover:border-blue-200 text-sm font-bold"><RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> Reset</button>
            </div>

            {/* STEP 1: CONFIGURATION (Collapsible) */}
            <div className={`transition-all duration-500 ease-in-out`}>
                {logic.isConfigOpen ? (
                    <div className="mb-8 bg-gray-50 rounded-3xl border border-gray-200 p-8 relative overflow-visible animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-gray-400 uppercase tracking-widest"><Filter size={14}/> Step 1: Configuration</div>
                            {logic.students.length > 0 && <button onClick={() => logic.setIsConfigOpen(false)} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1"><ChevronUp size={16}/> Hide</button>}
                        </div>
                        
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-gray-400 uppercase tracking-widest"><GraduationCap size={14}/> Select Semester</div>
                            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                {semesters.map((sem) => (
                                    <button key={sem.value} onClick={() => logic.handleSemesterChange(logic.formData.semester === sem.value ? null : sem.value)} className={`snap-start flex-shrink-0 min-w-[120px] py-3.5 px-6 rounded-2xl border-2 transition-all duration-300 font-bold text-sm relative overflow-hidden group ${logic.formData.semester === sem.value ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-500/30 scale-105' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-blue-200 hover:bg-white'}`}>
                                        {logic.formData.semester === sem.value && <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8 blur-xl"></div>}{sem.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={`transition-all duration-300 ${logic.formData.semester ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}>
                            <form onSubmit={logic.handleFetchStudents} className={`grid grid-cols-1 ${isUpdateMode ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6`}>
                                <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Batch</label><NativeSelect options={logic.fetchedData.batches} value={logic.formData.batch} onChange={(v)=>logic.setFormData(p=>({...p, batch:v}))} placeholder={logic.fetchingInfo ? "Loading..." : "Select Batch"} icon={Users} disabled={!logic.formData.semester || logic.fetchingInfo} /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Course</label><NativeSelect options={logic.fetchedData.courses} value={logic.formData.course} onChange={(v)=>logic.setFormData(p=>({...p, course:v}))} placeholder={logic.fetchingInfo ? "Loading..." : "Select Course"} icon={BookOpen} disabled={!logic.formData.semester || logic.fetchingInfo || !logic.formData.batch} /></div>
                                <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Date</label><input type="date" value={logic.formData.date} onChange={(e)=>logic.setFormData(p=>({...p, date:e.target.value}))} className="w-full p-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm" /></div>
                                
                                {isUpdateMode && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 ml-1 uppercase">Fetch Status</label>
                                        <div className="relative">
                                            <select 
                                                value={logic.fetchStatus} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    logic.setFetchStatus(val);
                                                    logic.setMode(val === 'present' ? 'absent' : 'present');
                                                }} 
                                                className="w-full p-3.5 pl-3 pr-10 bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 block appearance-none outline-none cursor-pointer font-bold"
                                            >
                                                <option value="present">Fetch Present</option>
                                                <option value="absent">Fetch Absent</option>
                                            </select>
                                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                                        </div>
                                    </div>
                                )}

                                <div className={`${isUpdateMode ? 'md:col-span-4' : 'md:col-span-3'} mt-2 flex justify-end`}>
                                     <button type="submit" disabled={logic.loading || !logic.formData.batch || !logic.formData.course} className="bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-10 rounded-xl text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:bg-gray-300 disabled:shadow-none transform active:scale-95">
                                        {logic.loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} {logic.loading ? 'Fetching Roster...' : 'Get Student List'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 font-medium">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-blue-500 uppercase">Sem</span> <span className="font-bold text-gray-900">{logic.formData.semester}</span></div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-purple-500 uppercase">Batch</span> <span className="font-bold text-gray-900">{logic.formData.batch}</span></div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-emerald-500 uppercase">Date</span> <span className="font-bold text-gray-900">{formatDate(logic.formData.date)}</span></div>
                            <div className="hidden lg:flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-orange-500 uppercase">Course</span> <span className="font-bold text-gray-900 truncate max-w-[200px]">{logic.formData.course}</span></div>
                        </div>
                        <button onClick={() => logic.setIsConfigOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider rounded-xl border border-blue-200 hover:border-blue-300 shadow-sm transition-all">
                            <Pencil size={14}/> Change
                        </button>
                    </div>
                )}
            </div>

            {logic.message.text && !logic.isPreviewOpen && (<div className={`mt-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm border ${getMessageStyle(logic.message.type)}`}><div className={`p-1.5 rounded-full ${logic.message.type==='success'?'bg-emerald-200':logic.message.type==='warning'?'bg-amber-200':logic.message.type==='error'?'bg-red-200':'bg-blue-200'}`}>{logic.message.type==='success'?<Check size={14} className="text-emerald-800"/>:logic.message.type==='warning'?<AlertTriangle size={14} className="text-amber-800"/>:<AlertCircle size={14} className={logic.message.type==='error'?'text-red-800':'text-blue-800'}/>}</div>{logic.message.text}</div>)}

            {/* STEP 2: STUDENT SELECTION GRID (FULL WIDTH) - ATTACH REF HERE */}
            {logic.students.length > 0 && !logic.loading && (
                <div ref={resultsRef} className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-white border border-gray-200 rounded-3xl shadow-lg flex flex-col h-[700px]">
                        {/* Toolbar */}
                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center bg-gray-50 rounded-t-3xl">
                            <div className="relative flex-1 w-full">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search Roll Number..." value={logic.searchTerm} onChange={e=>logic.setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none transition-all shadow-sm" />
                            </div>
                            
                            {!isUpdateMode && (
                                <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                                    <button 
                                        onClick={() => logic.setMode('present')} 
                                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${logic.mode === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Check size={14}/> Present
                                    </button>
                                    <button 
                                        onClick={() => logic.setMode('absent')} 
                                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${logic.mode === 'absent' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <UserX size={14}/> Absent
                                    </button>
                                </div>
                            )}

                            <button onClick={toggleSelectAll} className={`px-5 py-3 text-xs font-bold rounded-xl border-2 transition-all flex items-center gap-2 ${isAllSelected ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}>
                                {isAllSelected ? <CheckSquare size={16}/> : <CheckSquare size={16} className="opacity-40"/>}
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        
                        {/* Scrollable Grid */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                {filteredStudents.map(rollNo => {
                                    const isSelected = logic.selection.includes(rollNo);
                                    const matchIndex = rollNo.toLowerCase().indexOf(logic.searchTerm.toLowerCase());
                                    const highlight = logic.searchTerm && matchIndex >= 0 ? (<>{rollNo.substring(0, matchIndex)}<span className="bg-yellow-200 text-gray-900">{rollNo.substring(matchIndex, matchIndex + logic.searchTerm.length)}</span>{rollNo.substring(matchIndex + logic.searchTerm.length)}</>) : rollNo;
                                    
                                    // Visual Logic
                                    let baseClass = "relative p-3 rounded-2xl cursor-pointer border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group";
                                    let statusClass = "border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-white hover:shadow-md";
                                    let iconClass = "w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-400 transition-colors";
                                    
                                    if (isSelected) {
                                        if (logic.mode === 'present') {
                                            statusClass = "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/20 transform scale-105";
                                            iconClass = "w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500 text-white";
                                        } else {
                                            statusClass = "border-red-500 bg-red-50 shadow-md shadow-red-500/20 transform scale-105";
                                            iconClass = "w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white";
                                        }
                                    }

                                    return (
                                        <div key={rollNo} onClick={() => {
                                            logic.setSelection(prev => prev.includes(rollNo) ? prev.filter(r => r !== rollNo) : [...prev, rollNo]);
                                        }} className={`${baseClass} ${statusClass}`}>
                                            <div className={iconClass}>
                                                {isSelected ? <Check size={14} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>}
                                            </div>
                                            <span className={`font-mono text-xs font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-800'}`}>{highlight}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Bottom Bar */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-between items-center">
                            <div className="text-sm text-gray-500 font-medium pl-2">
                                Selected: <span className="text-gray-900 font-bold">{logic.selection.length}</span> students
                            </div>
                            <button onClick={(e) => { e.preventDefault(); if(logic.selection.length===0 && isUpdateMode){ logic.setMessage({type:'error', text:'Select at least one student.'}); return;} logic.setIsPreviewOpen(true); }} className="bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-8 rounded-xl text-sm shadow-xl shadow-slate-300 hover:-translate-y-1 transition-all flex items-center gap-2">
                                {isUpdateMode ? 'Review Changes' : 'Review & Submit'} <ArrowRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal 
                isOpen={logic.isPreviewOpen} 
                onClose={() => logic.setIsPreviewOpen(false)} 
                onConfirm={logic.handleSubmit} 
                title={confirmTitle} 
                confirmText={confirmButtonText} 
                isSubmitting={logic.submitting}
                confirmButtonColor={confirmButtonColor}
            >
                {children}
            </ConfirmationModal>
        </div>
    );
};

// --- MARK ATTENDANCE FORM ---
const MarkAttendanceForm = ({ animate }) => {
    const logic = useAttendanceForm('/api/attendance-session-post', 'POST', false);
    
    const presentList = logic.mode === 'present' ? logic.selection : logic.students.filter(s => !logic.selection.includes(s));
    const absentList = logic.mode === 'present' ? logic.students.filter(s => !logic.selection.includes(s)) : logic.selection;

    const filteredStudents = logic.students.filter(r => r.toLowerCase().includes(logic.searchTerm.toLowerCase()));
    const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => logic.selection.includes(s));
    const toggleSelectAll = () => logic.setSelection(prev => isAllSelected ? prev.filter(s => !filteredStudents.includes(s)) : [...new Set([...prev, ...filteredStudents])]);

    return (
        <AttendanceUIWrapper 
            animate={animate} 
            title="Mark Attendance" 
            logic={logic} 
            filteredStudents={filteredStudents} 
            isAllSelected={isAllSelected} 
            toggleSelectAll={toggleSelectAll}
            confirmTitle="Confirm Attendance Sheet" 
            confirmButtonText="Submit Attendance"
            confirmButtonColor={logic.mode === 'present' ? 'blue' : 'red'}
        >
             <div className="flex flex-col gap-8">
                {/* Summary Info */}
                <div className="flex flex-wrap justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex gap-6 text-sm text-gray-600 font-bold">
                        <span className="flex items-center gap-2"><BookOpen size={16} className="text-blue-500"/> {logic.formData.course}</span>
                        <span className="w-px h-5 bg-gray-300"></span>
                        <span className="flex items-center gap-2"><Users size={16} className="text-purple-500"/> {logic.formData.batch}</span>
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 sm:mt-0">
                        Total Students: <span className="text-gray-900 text-sm">{logic.students.length}</span>
                    </div>
                </div>

                {/* Big Stats with Expandable Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StatCard title="Present" count={presentList.length} color="emerald" list={presentList} />
                    <StatCard title="Absent" count={absentList.length} color="red" list={absentList} />
                </div>
            </div>
        </AttendanceUIWrapper>
    );
};

// --- UPDATE ATTENDANCE FORM ---
const UpdateAttendanceForm = ({ animate }) => {
    const logic = useAttendanceForm('/api/admin/handle-update-attendance', 'PATCH', true);
    const filteredStudents = logic.students.filter(r => r.toLowerCase().includes(logic.searchTerm.toLowerCase()));
    const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => logic.selection.includes(s));
    const toggleSelectAll = () => logic.setSelection(prev => isAllSelected ? prev.filter(s => !filteredStudents.includes(s)) : [...new Set([...prev, ...filteredStudents])]);
    
    const targetStatus = logic.mode === 'present' ? 'Present' : 'Absent';

    return (
        <AttendanceUIWrapper 
            animate={animate} 
            title="Update Records" 
            logic={logic} 
            filteredStudents={filteredStudents} 
            isAllSelected={isAllSelected} 
            toggleSelectAll={toggleSelectAll}
            confirmTitle="Confirm Status Update" 
            confirmButtonText={`Update to ${targetStatus}`} 
            confirmButtonColor={logic.mode === 'present' ? 'green' : 'red'}
            isUpdateMode={true}
        >
            <div className="flex flex-col gap-6">
                 <div className={`p-6 rounded-2xl border flex items-center gap-5 ${logic.mode === 'present' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                    <div className={`p-3 rounded-full ${logic.mode === 'present' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                         <RefreshCw size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-xl">Update Action</h4>
                        <p className="text-sm opacity-90 mt-1 font-medium">Changing status of <strong>{logic.selection.length}</strong> student(s) from <strong>{logic.fetchStatus.toUpperCase()}</strong> to <strong>{targetStatus.toUpperCase()}</strong>.</p>
                    </div>
                </div>

                {/* Collapsible List for Updates */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                        <h5 className="font-bold text-gray-700 text-sm flex items-center gap-2"><Users size={16}/> Selected Students</h5>
                    </div>
                    <div className="p-6 bg-white max-h-60 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-wrap gap-2">
                            {logic.selection.length > 0 ? logic.selection.map(roll => (
                                <span key={roll} className={`px-3 py-1.5 border text-xs font-mono font-bold rounded-lg shadow-sm ${logic.mode === 'present' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    {roll}
                                </span>
                            )) : (
                                <div className="w-full text-center text-gray-400 text-sm italic">No students selected</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AttendanceUIWrapper>
    );
};

// --- DELETE ATTENDANCE FORM (FIXED UI & LOGIC) ---
const DeleteAttendanceForm = ({ animate }) => {
    const { logout } = useAuth();
    const [formData, setFormData] = useState({ semname: '', course: '', batch: '', date: new Date().toISOString().substring(0, 10) });
    const [fetchedData, setFetchedData] = useState({ batches: [], courses: [] });
    // Config state
    const [semesterConfig, setSemesterConfig] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Modal States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmInput, setConfirmInput] = useState('');
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: '', title: '', message: '' });

    const resetForm = () => {
        setFormData(prev => ({...prev, semname: '', batch: '', course: '', date: new Date().toISOString().substring(0, 10)}));
        setFetchedData({ batches: [], courses: [] });
        setSemesterConfig([]);
        setMessage({ type: '', text: '' });
    };

    const handleSemesterChange = async (semValue) => {
        setFormData(prev => ({ ...prev, semname: semValue, batch: '', course: '' }));
        setFetchedData({ batches: [], courses: [] });
        setSemesterConfig([]);
        
        if (!semValue) return;

        try {
            const res = await fetch(`${backendUrl}/api/get-sem-config/${semValue}`, { method: "GET", credentials: "include" });
            
            if (res.status === 401 || res.status === 403) { logout(); return; }

            const data = await res.json();
            if (data.success && data.data && data.data.config) {
                const config = data.data.config;
                setSemesterConfig(config);
                setFetchedData({
                    batches: config.map(item => ({ value: item.name, label: item.name })),
                    courses: [] 
                });
            }
        } catch (err) { setMessage({ type: 'error', text: "Unable to load semester details." }); }
    };

    useEffect(() => {
        if (formData.batch && semesterConfig.length > 0) {
            const batchItem = semesterConfig.find(item => item.name === formData.batch);
            const courses = batchItem ? batchItem.availableCourses : [];
            setFetchedData(prev => ({
                ...prev,
                courses: courses.map(c => ({ value: c, label: c }))
            }));
            
            if (formData.course && !courses.includes(formData.course)) {
                 setFormData(prev => ({ ...prev, course: '' }));
            }
        } else {
             setFetchedData(prev => ({ ...prev, courses: [] }));
        }
    }, [formData.batch, semesterConfig]);

    const initiateDelete = (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        if (!formData.semname || !formData.course || !formData.batch || !formData.date) {
            setMessage({ type: 'error', text: 'All fields are required.' });
            return;
        }
        setIsDeleteModalOpen(true);
        setConfirmInput('');
    };

    const confirmDelete = async () => {
        setLoading(true); setMessage({ type: '', text: '' });
        try {
            const res = await fetch(`${backendUrl}/api/admin/delete-attendance-log`, {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData), credentials: "include"
            });
            
            if (res.status === 401 || res.status === 403) { logout(); return; }

            const data = await res.json();
            
            // --- CLOSE CONFIRM MODAL REGARDLESS OF OUTCOME ---
            setIsDeleteModalOpen(false);

            if (res.ok) {
                setStatusModal({ isOpen: true, type: 'success', title: 'Deleted!', message: data.message });
                setTimeout(() => resetForm(), 3000);
            } else { 
                // --- OPEN ERROR STATUS MODAL ---
                setStatusModal({ isOpen: true, type: 'error', title: 'Deletion Failed', message: data.message || 'Failed to delete.' });
            }
        } catch (err) { 
            setIsDeleteModalOpen(false);
            setStatusModal({ isOpen: true, type: 'error', title: 'System Error', message: 'Server error occurred.' });
        } finally { setLoading(false); }
    };

    return (
        <div className={`bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex gap-4 mb-8 items-center text-red-600"><div className="bg-red-50 p-3 rounded-2xl"><Trash2 size={32}/></div><h3 className="text-3xl font-bold text-gray-900">Delete Records</h3></div>
            <div className="mb-10 bg-red-50 border border-red-100 rounded-3xl p-6 flex gap-4 items-start shadow-sm">
                <div className="bg-white p-3 rounded-full text-red-600 mt-1 shadow-sm"><AlertTriangle size={20} /></div>
                <div><h4 className="text-lg font-bold text-red-900">Irreversible Action</h4><p className="text-sm text-red-700 mt-1 font-medium">Attendance records deleted here cannot be recovered. Please verify details carefully.</p></div>
            </div>

            <form onSubmit={initiateDelete}>
                <div className="bg-gray-50 rounded-3xl border border-gray-200 p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Semester</label><div className="relative"><select name="semname" value={formData.semname} onChange={(e) => handleSemesterChange(e.target.value)} className="w-full p-3.5 bg-white border border-gray-200 text-gray-900 text-sm rounded-xl outline-none font-bold focus:ring-4 focus:ring-red-100 focus:border-red-300"><option value="" disabled hidden>Select Sem</option>{semesters.map((sem) => (<option key={sem.value} value={sem.value}>{sem.label}</option>))}</select></div></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Batch</label><NativeSelect options={fetchedData.batches} value={formData.batch} onChange={(val) => setFormData(prev => ({...prev, batch: val}))} placeholder="Select Batch" icon={Users} disabled={!formData.semname} /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Course</label><NativeSelect options={fetchedData.courses} value={formData.course} onChange={(val) => setFormData(prev => ({...prev, course: val}))} placeholder="Select Course" icon={BookOpen} disabled={!formData.semname || !formData.batch} /></div>
                        <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Date</label><input type="date" name="date" value={formData.date} onChange={(e)=>setFormData(p=>({...p, date:e.target.value}))} className="w-full p-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-red-100 focus:border-red-300" /></div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-10 rounded-xl text-sm transition-all shadow-lg shadow-red-500/30 hover:shadow-xl flex items-center gap-2 transform active:scale-95">
                        <Trash2 size={18} /> Delete Permanently
                    </button>
                </div>
            </form>
            
            {message.text && !isDeleteModalOpen && (<div className={`mt-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}><div className={`p-1.5 rounded-full ${message.type === 'success' ? 'bg-emerald-200' : 'bg-red-200'}`}>{message.type === 'success' ? <Check size={14} className="text-emerald-800"/> : <AlertCircle size={14} className="text-red-800"/>}</div>{message.text}</div>)}
            
            {/* Delete Confirmation Modal */}
            <ConfirmationModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={confirmDelete} 
                title="Confirm Deletion" 
                confirmText="Permanently Delete" 
                isSubmitting={loading}
                isConfirmDisabled={confirmInput !== 'confirm'}
                confirmButtonColor="red"
            >
                <div className="space-y-6">
                    <div className="p-5 bg-red-50 rounded-2xl border border-red-100 text-red-800 text-sm font-medium leading-relaxed">
                        You are about to delete attendance records for <strong>{formData.batch}</strong> on <strong>{formData.date}</strong>. This action cannot be undone.
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 tracking-wider mb-2 uppercase">Type "confirm" to proceed</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="confirm" 
                                value={confirmInput} 
                                onChange={(e) => setConfirmInput(e.target.value)} 
                                className="w-full p-3.5 pl-11 border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all font-mono font-bold"
                            />
                        </div>
                    </div>
                </div>
            </ConfirmationModal>

            {/* Status Modal for Success/Error */}
            <StatusModal 
                isOpen={statusModal.isOpen} 
                onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))} 
                type={statusModal.type} 
                title={statusModal.title} 
                message={statusModal.message} 
            />
        </div>
    );
};

// --- Main Page Wrapper ---
const AttendancePage = () => {
    const { user } = useAuth();
    const [animate, setAnimate] = useState(false);
    const [activeTab, setActiveTab] = useState('mark');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) navigate('/');
        setTimeout(() => setAnimate(true), 100); 
    }, [user, navigate]);
    
    const tabs = [
        { id: 'mark', label: 'Mark Attendance', icon: CheckSquare },
        { id: 'update', label: 'Update Records', icon: Edit },
        { id: 'delete', label: 'Delete Records', icon: Trash2 }, 
        { id: 'scan', label: 'Scan QR', icon: QrCode },
    ];

    if (!user) return null;

    return (
        <div className="min-h-screen font-sans bg-[#F3F4F6] pb-10">
            {/* HEADER CONTAINER */}
            <div className="bg-[#0F172A] pb-32 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                {/* CONTENT WRAPPER - Reduced Width */}
                <div className="px-6 pt-6 relative z-10 max-w-[1400px] mx-auto">
                    <div className="flex justify-between items-center">
                        <Header animate={animate} />
                    </div>
                    
                    <div className="mt-12 mb-6">
                        <SectionHeader title="Attendance Portal" animate={animate} delay={200} />
                        <div className={`flex flex-wrap gap-4 transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => tab.id === 'scan' ? navigate('/faculty/action') : setActiveTab(tab.id)}
                                    className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2.5 transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-xl scale-105' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}>
                                    <tab.icon size={18} /> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT - Reduced Width */}
            <main className="px-6 -mt-24 relative z-20 max-w-[1400px] mx-auto">
                {activeTab === 'mark' && <MarkAttendanceForm animate={animate} />}
                {activeTab === 'update' && <UpdateAttendanceForm animate={animate} />}
                {activeTab === 'delete' && <DeleteAttendanceForm animate={animate} />}
            </main>
        </div>
    );
};

export default AttendancePage;