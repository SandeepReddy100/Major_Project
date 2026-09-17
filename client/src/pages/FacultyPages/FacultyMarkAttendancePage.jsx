import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, CheckSquare, Loader2, Check, AlertCircle, RefreshCw, 
    Users, ChevronDown, UserX, ClipboardCheck, Trash2, 
    BookOpen, Calendar, BarChart3, Filter, QrCode, Edit, GraduationCap,
    AlertTriangle, XCircle, Lock, ArrowRight, Pencil, ChevronUp
} from 'lucide-react';
import Header from '../../components/Header'; // Ensure this path is correct for your project
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

// --- UI COMPONENTS ---

const SectionHeader = ({ title, animate, delay }) => (
    <div className={`flex items-center mb-6 transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{ transitionDelay: `${delay}ms` }}>
        <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3 shadow-lg shadow-blue-500/30"></div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
    </div>
);

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

// --- MODALS ---

const StatusModal = ({ isOpen, onClose, type, title, message }) => {
    if (!isOpen) return null;
    const isSuccess = type === 'success';

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className={`${isSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} p-8 text-center border-b`}>
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm ${isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {isSuccess ? <Check size={32} strokeWidth={3} /> : <AlertTriangle size={32} strokeWidth={3} />}
                    </div>
                    <h3 className={`text-xl font-bold ${isSuccess ? 'text-emerald-800' : 'text-red-800'}`}>{title}</h3>
                </div>
                <div className="p-6">
                    <p className="text-center text-gray-600 text-sm mb-6 font-medium leading-relaxed">{message}</p>
                    <button onClick={onClose} className={`w-full py-3.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isSuccess ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
                        {isSuccess ? 'Done' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, confirmText, isSubmitting, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl transform transition-all scale-100 border border-gray-100 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-3xl flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-100 text-blue-600"><ClipboardCheck size={24} /></div>
                        <div><h3 className="text-xl font-bold text-gray-900">{title}</h3><p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Final Verification</p></div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors"><XCircle size={24}/></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar flex-grow bg-white flex flex-col">{children}</div>
                <div className="flex justify-end gap-3 p-6 bg-gray-50 rounded-b-3xl border-t border-gray-100 flex-shrink-0">
                    <button onClick={onClose} className="py-3 px-6 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-sm">Cancel</button>
                    <button onClick={onConfirm} disabled={isSubmitting} className="py-3 px-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95">
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StudentListColumn = ({ title, count, list, color, icon: Icon }) => (
    <div className={`border border-${color}-200 bg-${color}-50/30 rounded-3xl flex flex-col overflow-hidden h-full`}>
        <div className={`p-4 bg-${color}-100/50 border-b border-${color}-200 flex justify-between items-center`}>
            <div className={`flex items-center gap-2 text-${color}-800 font-bold`}><Icon size={18} strokeWidth={2.5}/> {title}</div>
            <span className={`bg-white text-${color}-700 px-3 py-1 rounded-lg text-xs font-extrabold shadow-sm border border-${color}-100`}>{count}</span>
        </div>
        <div className="p-4 overflow-y-auto flex-grow custom-scrollbar">
            <div className="flex flex-wrap gap-2">
                {list.length > 0 ? list.map(roll => (
                    <span key={roll} className={`px-3 py-1.5 bg-white border border-${color}-200 text-${color}-800 text-xs font-mono font-bold rounded-lg shadow-sm`}>{roll}</span>
                )) : (
                    <div className="w-full text-center text-gray-400 text-sm py-16 italic flex flex-col items-center gap-2 opacity-50"><Icon size={24} />No students here</div>
                )}
            </div>
        </div>
    </div>
);

// --- MAIN PAGE LOGIC ---

const FacultyMarkAttendancePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [animate, setAnimate] = useState(false);
    
    // --- STATE ---
    const [formData, setFormData] = useState({ semester: '', batch: '', course: '', date: new Date().toISOString().substring(0, 10) });
    const [fetchedData, setFetchedData] = useState({ batches: [], courses: [] });
    const [semesterConfig, setSemesterConfig] = useState([]);
    
    const [students, setStudents] = useState([]);
    const [selection, setSelection] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // UI State
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [mode, setMode] = useState('present'); // 'present' (default) or 'absent'
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPosted, setIsPosted] = useState(false);

    // Scroll Ref
    const resultsRef = useRef(null);

    useEffect(() => {
        if (!user) navigate('/');
        setTimeout(() => setAnimate(true), 100);
    }, [user, navigate]);

    // Auto-Scroll to results
    useEffect(() => {
        if (students.length > 0 && resultsRef.current) {
            setTimeout(() => {
                resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [students.length]);

    // --- HANDLERS ---

    const resetForm = () => {
        setFormData({ semester: '', batch: '', course: '', date: new Date().toISOString().substring(0, 10) });
        setFetchedData({ batches: [], courses: [] });
        setSemesterConfig([]);
        setStudents([]); setSelection([]); setSearchTerm(''); setMessage({ type: '', text: '' });
        setIsPosted(false);
        setIsConfigOpen(true);
        setMode('present');
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
            const url = `${backendUrl}/api/students-by-batch?semname=${formData.semester}&batch=${formData.batch}`;
            const res = await fetch(url, { method: "GET", credentials: "include" });
            if (res.status === 401 || res.status === 403) { logout(); return; }

            const data = await res.json();
            
            if (data.message && data.message.toLowerCase().includes("already posted")) {
                setIsPosted(true); setMessage({ type: 'warning', text: data.message }); return;
            }

            const sorted = (data.students || []).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            setStudents(sorted);
            if(sorted.length > 0) {
                setIsConfigOpen(false); // Auto Collapse
            } else {
                setMessage({type:'info', text: "No students registered in this batch."});
            }
            
        } catch (err) { setMessage({ type: 'error', text: "Failed to fetch student list." }); } finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const payload = { semname: formData.semester, course: formData.course, batch: formData.batch, date: formData.date, status: mode, students: selection };
        try {
            const res = await fetch(`${backendUrl}/api/attendance-session-post`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: "include"
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
                setMessage({ type: 'success', text: data.message });
                setStudents([]); setSelection([]); setIsPreviewOpen(false); setTimeout(resetForm, 3000);
            } else { setMessage({ type: 'error', text: data.message || "Operation failed." }); }
        } catch (err) { setMessage({ type: 'error', text: "Server error." }); } finally { setSubmitting(false); }
    };

    // Filter Logic
    const filteredStudents = students.filter(r => r.toLowerCase().includes(searchTerm.toLowerCase()));
    const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(s => selection.includes(s));
    const toggleSelectAll = () => setSelection(prev => isAllSelected ? prev.filter(s => !filteredStudents.includes(s)) : [...new Set([...prev, ...filteredStudents])]);

    // Derived Lists for Modal
    const presentList = mode === 'present' ? selection : students.filter(s => !selection.includes(s));
    const absentList = mode === 'present' ? students.filter(s => !selection.includes(s)) : selection;

    const getMessageStyle = (type) => {
        if(type === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if(type === 'error') return 'bg-red-50 text-red-700 border-red-100';
        if(type === 'warning') return 'bg-amber-50 text-amber-800 border-amber-100';
        return 'bg-blue-50 text-blue-700 border-blue-100';
    };

    if (!user) return null;

    return (
        <div className="min-h-screen font-sans bg-[#F3F4F6] pb-10">
            {/* HEADER */}
            <div className="bg-[#0F172A] pb-32 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                <div className="px-6 pt-6 relative z-10 max-w-[1400px] mx-auto">
                    <div className="flex justify-between items-center">
                        <Header animate={animate} />
                    </div>
                    <div className="mt-12 mb-6">
                        <SectionHeader title="Mark Attendance" animate={animate} delay={200} />
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="px-6 -mt-24 relative z-20 max-w-[1400px] mx-auto">
                <div className={`bg-white rounded-3xl p-8 lg:p-12 shadow-xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    
                    {/* Top Bar */}
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                        <div><h3 className="text-3xl font-bold text-gray-800 tracking-tight">Session Details</h3></div>
                        <button onClick={resetForm} className="group flex items-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl transition-all border border-gray-200 hover:border-blue-200 text-sm font-bold"><RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> Reset</button>
                    </div>

                    {/* ALREADY POSTED STATE */}
                    {isPosted ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 bg-amber-50/50 rounded-3xl border border-amber-100 text-center">
                            <div className="w-24 h-24 bg-white text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-md border border-amber-100"><AlertTriangle size={48}/></div>
                            <h4 className="text-2xl font-bold text-gray-900 mb-3">Attendance Recorded</h4>
                            <p className="text-gray-600 max-w-lg mx-auto mb-8 font-medium leading-relaxed">{message.text}</p>
                            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 font-bold bg-white px-8 py-4 rounded-2xl border border-gray-200 shadow-sm">
                                <span className="flex items-center gap-2"><BookOpen size={16} className="text-blue-500"/> {formData.course}</span>
                                <span className="w-px h-5 bg-gray-300 hidden sm:block"></span>
                                <span className="flex items-center gap-2"><Users size={16} className="text-purple-500"/> {formData.batch}</span>
                                <span className="w-px h-5 bg-gray-300 hidden sm:block"></span>
                                <span className="flex items-center gap-2"><Calendar size={16} className="text-emerald-500"/> {formatDate(formData.date)}</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* CONFIGURATION STEP */}
                            <div className={`transition-all duration-500 ease-in-out`}>
                                {isConfigOpen ? (
                                    <div className="mb-8 bg-gray-50 rounded-3xl border border-gray-200 p-8 relative overflow-visible animate-in fade-in slide-in-from-top-4">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-2 text-xs font-extrabold text-gray-400 uppercase tracking-widest"><Filter size={14}/> Step 1: Configuration</div>
                                            {students.length > 0 && <button onClick={() => setIsConfigOpen(false)} className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1"><ChevronUp size={16}/> Hide</button>}
                                        </div>
                                        
                                        <div className="mb-6">
                                            <div className="flex items-center gap-2 mb-3 text-xs font-extrabold text-gray-400 uppercase tracking-widest"><GraduationCap size={14}/> Select Semester</div>
                                            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                                {semesters.map((sem) => (
                                                    <button key={sem.value} onClick={() => handleSemesterChange(formData.semester === sem.value ? null : sem.value)} className={`snap-start flex-shrink-0 min-w-[120px] py-3.5 px-6 rounded-2xl border-2 transition-all duration-300 font-bold text-sm relative overflow-hidden group ${formData.semester === sem.value ? 'border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-500/30 scale-105' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-blue-200 hover:bg-white'}`}>
                                                        {formData.semester === sem.value && <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8 blur-xl"></div>}{sem.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={`transition-all duration-300 ${formData.semester ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}>
                                            <form onSubmit={handleFetchStudents} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Batch</label><NativeSelect options={fetchedData.batches} value={formData.batch} onChange={(v)=>setFormData(p=>({...p, batch:v}))} placeholder={fetchingInfo ? "Loading..." : "Select Batch"} icon={Users} disabled={!formData.semester || fetchingInfo} /></div>
                                                <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Course</label><NativeSelect options={fetchedData.courses} value={formData.course} onChange={(v)=>setFormData(p=>({...p, course:v}))} placeholder={fetchingInfo ? "Loading..." : "Select Course"} icon={BookOpen} disabled={!formData.semester || fetchingInfo || !formData.batch} /></div>
                                                <div className="space-y-2"><label className="text-xs font-bold text-gray-500 ml-1 uppercase">Date</label><input type="date" value={formData.date} onChange={(e)=>setFormData(p=>({...p, date:e.target.value}))} className="w-full p-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm" /></div>
                                                <div className="md:col-span-3 mt-2 flex justify-end">
                                                     <button type="submit" disabled={loading || !formData.batch || !formData.course} className="bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-10 rounded-xl text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:bg-gray-300 disabled:shadow-none transform active:scale-95">
                                                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} {loading ? 'Fetching Roster...' : 'Get Student List'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 font-medium">
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-blue-500 uppercase">Sem</span> <span className="font-bold text-gray-900">{formData.semester}</span></div>
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-purple-500 uppercase">Batch</span> <span className="font-bold text-gray-900">{formData.batch}</span></div>
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-emerald-500 uppercase">Date</span> <span className="font-bold text-gray-900">{formatDate(formData.date)}</span></div>
                                            <div className="hidden lg:flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm"><span className="text-xs font-bold text-orange-500 uppercase">Course</span> <span className="font-bold text-gray-900 truncate max-w-[200px]">{formData.course}</span></div>
                                        </div>
                                        <button onClick={() => setIsConfigOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider rounded-xl border border-blue-200 hover:border-blue-300 shadow-sm transition-all">
                                            <Pencil size={14}/> Change
                                        </button>
                                    </div>
                                )}
                            </div>

                            {message.text && !isPreviewOpen && (<div className={`mt-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm border ${message.type==='success'?'bg-emerald-50 text-emerald-700 border-emerald-100':message.type==='error'?'bg-red-50 text-red-700 border-red-100':'bg-blue-50 text-blue-700 border-blue-100'}`}>{message.text}</div>)}

                            {/* SELECTION GRID */}
                            {students.length > 0 && !loading && (
                                <div ref={resultsRef} className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                    <div className="bg-white border border-gray-200 rounded-3xl shadow-lg flex flex-col h-[700px]">
                                        {/* Toolbar */}
                                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center bg-gray-50 rounded-t-3xl">
                                            <div className="relative flex-1 w-full">
                                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input type="text" placeholder="Search Roll Number..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none transition-all shadow-sm" />
                                            </div>
                                            
                                            <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                                                <button onClick={() => setMode('present')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${mode === 'present' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><Check size={14}/> Present</button>
                                                <button onClick={() => setMode('absent')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${mode === 'absent' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}><UserX size={14}/> Absent</button>
                                            </div>

                                            <button onClick={toggleSelectAll} className={`px-5 py-3 text-xs font-bold rounded-xl border-2 transition-all flex items-center gap-2 ${isAllSelected ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}>
                                                {isAllSelected ? <CheckSquare size={16}/> : <CheckSquare size={16} className="opacity-40"/>}{isAllSelected ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>
                                        
                                        {/* Grid */}
                                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                                {filteredStudents.map(rollNo => {
                                                    const isSelected = selection.includes(rollNo);
                                                    const matchIndex = rollNo.toLowerCase().indexOf(searchTerm.toLowerCase());
                                                    const highlight = searchTerm && matchIndex >= 0 ? (<>{rollNo.substring(0, matchIndex)}<span className="bg-yellow-200 text-gray-900">{rollNo.substring(matchIndex, matchIndex + searchTerm.length)}</span>{rollNo.substring(matchIndex + searchTerm.length)}</>) : rollNo;
                                                    
                                                    let statusClass = "border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-white hover:shadow-md";
                                                    let iconClass = "w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-400 transition-colors";
                                                    
                                                    if (isSelected) {
                                                        if (mode === 'present') {
                                                            statusClass = "border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/20 transform scale-105";
                                                            iconClass = "w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500 text-white";
                                                        } else {
                                                            statusClass = "border-red-500 bg-red-50 shadow-md shadow-red-500/20 transform scale-105";
                                                            iconClass = "w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white";
                                                        }
                                                    }

                                                    return (
                                                        <div key={rollNo} onClick={() => setSelection(prev => prev.includes(rollNo) ? prev.filter(r => r !== rollNo) : [...prev, rollNo])} className={`relative p-3 rounded-2xl cursor-pointer border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 group ${statusClass}`}>
                                                            <div className={iconClass}>{isSelected ? <Check size={14} strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>}</div>
                                                            <span className={`font-mono text-xs font-bold ${isSelected ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-800'}`}>{highlight}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        
                                        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-between items-center">
                                            <div className="text-sm text-gray-500 font-medium pl-2">Selected: <span className="text-gray-900 font-bold">{selection.length}</span> students</div>
                                            <button onClick={() => setIsPreviewOpen(true)} className="bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-8 rounded-xl text-sm shadow-xl shadow-slate-300 hover:-translate-y-1 transition-all flex items-center gap-2">Review & Submit <ArrowRight size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* CONFIRMATION MODAL */}
            <ConfirmationModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} onConfirm={handleSubmit} title="Confirm Attendance Sheet" confirmText="Submit Attendance" isSubmitting={submitting}>
                <div className="flex flex-col gap-6 h-full">
                    {/* Summary Header */}
                    <div className="flex flex-wrap gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-3 pr-6 border-r border-gray-200"><div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm"><BookOpen size={18} className="text-blue-500"/></div><div><p className="text-[10px] uppercase text-gray-400 font-extrabold tracking-widest">Course</p><p className="text-sm font-bold text-gray-800">{formData.course}</p></div></div>
                        <div className="flex items-center gap-3"><div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm"><Users size={18} className="text-purple-500"/></div><div><p className="text-[10px] uppercase text-gray-400 font-extrabold tracking-widest">Batch</p><p className="text-sm font-bold text-gray-800">{formData.batch}</p></div></div>
                    </div>

                    {/* 2-Column Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
                        <StudentListColumn title="Present Students" count={presentList.length} list={presentList} color="emerald" icon={Check} />
                        <StudentListColumn title="Absent Students" count={absentList.length} list={absentList} color="red" icon={UserX} />
                    </div>
                </div>
            </ConfirmationModal>

            {/* STATUS MODAL (Success/Error) */}
            <StatusModal isOpen={!!message.text && !isPreviewOpen} onClose={() => setMessage({ type: '', text: '' })} type={message.type} title={message.type === 'success' ? 'Success' : 'Notice'} message={message.text} />
        </div>
    );
};

export default FacultyMarkAttendancePage;