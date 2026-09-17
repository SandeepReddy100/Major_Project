import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    User, Search, Edit, Loader2, Check, AlertCircle, Users, 
    ChevronDown, UserPlus, Trash2, Briefcase, Building, 
    XCircle, Filter, BookOpen, KeyRound, ChevronLeft, ChevronRight,
    LayoutGrid, ServerCrash, ShieldCheck, Save, Mail, GraduationCap,
    Eye, EyeOff, Copy, Fingerprint
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 


// --- CONFIGURATION ---
const API_BASE_URL = import.meta.env.VITE_BASE_URL;

const DESIGNATIONS = ["Professor", "Associate Professor", "Assistant Professor", "Lab Instructor", "HOD - CSE", "HOD - ECE", "Lecturer"];
const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// --- UI COMPONENTS ---

const SectionHeader = ({ title, animate, delay }) => (
    <div className={`flex items-center mb-6 transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{ transitionDelay: `${delay}ms` }}>
        <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3 shadow-lg shadow-blue-500/30"></div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
    </div>
);

// NATIVE SELECT
const NativeSelect = ({ options, value, onChange, placeholder, disabled, icon: Icon }) => {
    return (
        <div className={`relative w-full ${disabled ? 'opacity-50' : ''}`}>
            {Icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
                    <Icon size={18} />
                </div>
            )}
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`w-full p-3 ${Icon ? 'pl-10' : 'pl-3'} pr-10 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 block appearance-none outline-none transition-all disabled:cursor-not-allowed cursor-pointer font-medium`}
                >
                    <option value="" disabled hidden>{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <ChevronDown size={16} />
                </div>
            </div>
        </div>
    );
};

const InfoTag = ({ icon, text, color }) => (
    <div className={`flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-md border ${color}`}>
        {icon}
        <span className="uppercase text-[10px] tracking-wide truncate">{text}</span>
    </div>
);

// SKELETON LOADER
const SkeletonCard = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col h-[200px] animate-pulse">
        <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
        </div>
        <div className="space-y-3 mt-2">
             <div className="h-6 bg-gray-100 rounded w-1/3"></div>
             <div className="h-16 bg-gray-50 rounded w-full"></div>
        </div>
    </div>
);

// --- FACULTY ONBOARD SUCCESS MODAL ---
const FacultyOnboardModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;
    
    const { faculty, message } = data;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-gray-100" onClick={e => e.stopPropagation()}>
                
                {/* Light Background Header */}
                <div className="bg-emerald-50 p-8 text-center border-b border-emerald-100">
                    <div className="mx-auto bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <Check size={40} className="text-emerald-600" strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-bold text-emerald-800">Faculty Added!</h3>
                </div>
                
                <div className="p-6">
                    <p className="text-center text-gray-600 text-sm mb-6 font-medium">
                        {message}
                    </p>
                    
                    {faculty && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 space-y-4 shadow-inner">
                             <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                                <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xl shadow-sm">
                                    {faculty.name ? faculty.name.charAt(0) : 'F'}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900 text-lg truncate">{faculty.name}</h4>
                                    <p className="text-xs text-gray-500 font-mono font-medium">{faculty.id}</p>
                                </div>
                             </div>
                             
                             <div className="space-y-3">
                                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase">
                                        <Fingerprint size={14}/> Faculty ID
                                    </div>
                                    <span className="font-mono font-bold text-gray-800 text-sm">{faculty.facultyid}</span>
                                </div>
                                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase">
                                        <Mail size={14}/> Email
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm truncate max-w-[150px]">{faculty.email}</span>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={onClose} 
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
                    >
                        Add Another Faculty
                    </button>
                </div>
            </div>
        </div>
    );
};

const ModalTemplate = ({ isOpen, onClose, onConfirm, title, message, icon: Icon, colorClass, confirmText, isLoading, showPassword }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) { setIsPasswordVisible(false); setCopied(false); }
    }, [isOpen]);

    if (!isOpen) return null;
    
    const styles = {
        red: { bg: 'bg-red-50', iconBg: 'bg-red-100', icon: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' },
        amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', icon: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' },
        blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', icon: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
        green: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', icon: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
    }[colorClass] || { bg: 'bg-gray-50', iconBg: 'bg-gray-100', icon: 'text-gray-600', btn: 'bg-gray-800' };

    const handleCopy = () => {
        navigator.clipboard.writeText(showPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300" onClick={!isLoading ? onClose : undefined}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex items-start gap-5">
                    <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl ${styles.iconBg}`}>
                        <Icon className={`h-6 w-6 ${styles.icon}`} />
                    </div>
                    <div className="w-full">
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
                        
                        {showPassword && (
                            <div className="mt-5 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in zoom-in-95">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Generated Password</p>
                                    <button onClick={handleCopy} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                                        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="w-full p-3 bg-white border border-gray-200 rounded-lg font-mono text-lg font-bold text-gray-800 tracking-wider flex items-center justify-between">
                                        <span>{isPasswordVisible ? showPassword : '•'.repeat(showPassword.length)}</span>
                                        <button onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors">
                                            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-amber-600 mt-2 font-medium flex items-center gap-1">
                                    <AlertCircle size={10} /> Share this securely. It will not be shown again.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                    <button onClick={onClose} disabled={isLoading} className="py-2.5 px-5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 text-sm transition-all shadow-sm">
                        {showPassword ? 'Close' : 'Cancel'}
                    </button>
                    {!showPassword && (
                        <button onClick={onConfirm} disabled={isLoading} className={`py-2.5 px-5 text-white rounded-xl font-bold shadow-md text-sm transition-all flex items-center gap-2 ${styles.btn}`}>
                            {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const Toast = ({ message, type, onDismiss }) => {
    if (!message) return null;
    const styles = type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white';
    useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
    return (
        <div className={`fixed bottom-6 right-6 flex items-center gap-4 p-4 pr-12 rounded-xl shadow-2xl z-[150] animate-in slide-in-from-right-10 ${styles}`}>
            <div className="p-1 bg-white/20 rounded-full">{type === 'success' ? <Check size={16} strokeWidth={3} /> : <AlertCircle size={16} strokeWidth={3} />}</div>
            <div><p className="font-bold text-sm">{message}</p></div>
            <button onClick={onDismiss} className="absolute top-4 right-4 opacity-60 hover:opacity-100 transition-opacity"><XCircle size={16} /></button>
        </div>
    );
};

const StatusDisplay = ({ title, message, icon: Icon, colorClass, action }) => {
    const colors = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", gray: "bg-gray-100 text-gray-500", amber: "bg-amber-50 text-amber-600" };
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-in fade-in slide-in-from-bottom-4">
            <div className={`p-4 rounded-3xl mb-4 ${colors[colorClass] || colors.gray}`}><Icon size={40} /></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 text-center max-w-sm mb-8 font-medium">{message}</p>
            {action}
        </div>
    );
};

// --- 1. VIEW ALL FACULTY ---
const ViewAllFaculty = ({ animate, facultyList, isLoading, error, onAction, onDelete, onResetPassword }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [designationFilter, setDesignationFilter] = useState('All');
    const [semesterFilter, setSemesterFilter] = useState('All'); 
    const [modalAction, setModalAction] = useState({ type: null, data: null, password: null });
    const [isActionLoading, setIsActionLoading] = useState(false); 
    const [page, setPage] = useState(1);
    const PER_PAGE = 12; // Increased for wider layout

    useEffect(() => { const h = setTimeout(() => setDebouncedSearch(searchTerm), 300); return () => clearTimeout(h); }, [searchTerm]);
    
    // Group courses and batches by Semester for UI Display
    const getGroupedDetails = (faculty) => {
        const grouped = {};
        // Data from DB: "VI,SN1:CSM601"
        faculty.subjects_assigned?.forEach(str => {
            const [left, course] = str.split(':');
            if (left && course) {
                const [sem, batch] = left.split(',');
                if (sem) {
                    if (!grouped[sem]) grouped[sem] = { courses: new Set(), batches: new Set() };
                    grouped[sem].courses.add(course);
                    if (batch) grouped[sem].batches.add(batch);
                }
            }
        });
        return grouped;
    };

    const designationOptions = useMemo(() => {
        const unique = new Set(facultyList ? facultyList.map(f => f.designation).filter(Boolean) : []);
        DESIGNATIONS.forEach(d => unique.add(d));
        return ['All', ...Array.from(unique).sort()].map(d => ({ value: d, label: d === 'All' ? 'All Designations' : d }));
    }, [facultyList]);

    const semesterOptions = useMemo(() => {
        return ['All', ...SEMESTERS].map(s => ({ value: s, label: s === 'All' ? 'All Semesters' : `Semester ${s}` }));
    }, []);

    const filtered = useMemo(() => {
        if (!facultyList) return [];
        return facultyList.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || f.facultyid.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesDesignation = designationFilter === 'All' || f.designation === designationFilter;
            // Check if faculty has the filtered semester in their array
            const matchesSemester = semesterFilter === 'All' || (f.sem && f.sem.includes(semesterFilter));
            return matchesSearch && matchesDesignation && matchesSemester;
        });
    }, [debouncedSearch, designationFilter, semesterFilter, facultyList]);

    const handleConfirm = async () => {
        if (!modalAction.data) return;
        setIsActionLoading(true); 
        try {
            if (modalAction.type === 'delete') {
                await onDelete(modalAction.data);
                setModalAction({ type: null, data: null });
            }
            if (modalAction.type === 'reset') {
                const newPassword = await onResetPassword(modalAction.data);
                setModalAction(prev => ({ ...prev, type: 'show_password', password: newPassword }));
            }
        } catch (error) { 
            console.error(error); 
        } finally { 
            setIsActionLoading(false); 
        }
    };

    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 animate-in fade-in">
                    {Array(PER_PAGE).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            );
        }
        
        if (error) return <StatusDisplay title="Faculty Not Found" message="Could not retrieve faculty data." icon={ServerCrash} colorClass="red" action={<button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">Retry</button>} />;
        if (!facultyList || facultyList.length === 0) return <StatusDisplay title="No Records" message="No faculty members found." icon={Users} colorClass="amber" />;
        if (paginated.length === 0) return <StatusDisplay title="No Matches" message="Try clearing your search or filters." icon={Search} colorClass="gray" action={<button onClick={() => {setSearchTerm(''); setDesignationFilter('All'); setSemesterFilter('All');}} className="text-blue-600 font-bold underline decoration-2 underline-offset-4">Reset Filters</button>} />;

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {paginated.map(f => {
                        const grouped = getGroupedDetails(f);
                        const sortedSems = Object.keys(grouped).sort((a,b) => SEMESTERS.indexOf(a) - SEMESTERS.indexOf(b));

                        return (
                            <div key={f.facultyid} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-lg hover:border-blue-200 transition-all duration-300 group">
                                <div className="p-5 flex-grow">
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="relative">
                                            <img className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md bg-gray-100 group-hover:scale-105 transition-transform" 
                                                src={`https://ui-avatars.com/api/?name=${f.name.replace(/ /g, '+')}&background=F3F4F6&color=111827&size=128&font-size=0.4`} 
                                                alt={f.name} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold text-gray-900 truncate">{f.name}</h3>
                                            <p className="text-xs font-semibold text-gray-500 font-mono uppercase tracking-wide">{f.facultyid}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-2">
                                            <InfoTag icon={<Briefcase size={12} />} text={f.designation} color="border-indigo-100 bg-indigo-50 text-indigo-700" />
                                        </div>

                                        {sortedSems.length > 0 ? sortedSems.map(sem => (
                                            <div key={sem} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                     <span className="text-[10px] uppercase font-extrabold tracking-wider py-1 px-2 rounded-lg bg-white border border-gray-200 text-gray-800 shadow-sm">
                                                        Sem {sem}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-2 pl-1">
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        <BookOpen size={10} className="text-teal-500" />
                                                        {Array.from(grouped[sem].courses).map(c => (
                                                            <span key={c} className="text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                                                                {c}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        <LayoutGrid size={10} className="text-blue-500" />
                                                        {Array.from(grouped[sem].batches).map(b => (
                                                            <span key={b} className="text-[10px] font-bold text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                                                                {b}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-gray-400 italic pl-1">No active assignments</p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 rounded-b-2xl">
                                    <button onClick={() => onAction('find', f)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5">
                                        <Edit size={14} /> Edit
                                    </button>
                                    <button onClick={() => setModalAction({ type: 'reset', data: f })} className="flex-1 py-2 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5">
                                        <KeyRound size={14} /> Reset
                                    </button>
                                    <button onClick={() => setModalAction({ type: 'delete', data: f })} className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
                 <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><ChevronLeft size={16} /> Previous</button>
                    <span className="text-sm font-bold text-gray-900">Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Next <ChevronRight size={16} /></button>
                </div>
            </>
        );
    };

    return (
        <div className={`space-y-6 transition-opacity duration-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-gray-100 min-h-[500px]">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-5 mb-8 border-b border-gray-100 pb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 tracking-tight">
                            Faculty Directory 
                            {filtered.length > 0 && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold">{filtered.length} Members</span>}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Manage faculty profiles, designations, and assignments.</p>
                    </div>
                    <div className="w-full xl:w-auto flex flex-col md:flex-row gap-3">
                        <div className="relative w-full md:w-64">
                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input type="text" placeholder="Search faculty..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-300 transition-all" />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="w-full md:w-48">
                                <NativeSelect options={semesterOptions} value={semesterFilter} onChange={setSemesterFilter} placeholder="All Semesters" icon={GraduationCap} />
                            </div>
                            <div className="w-full md:w-48">
                                <NativeSelect options={designationOptions} value={designationFilter} onChange={setDesignationFilter} placeholder="All Designations" icon={Briefcase} />
                            </div>
                        </div>
                    </div>
                </div>
                {renderContent()}
            </div>

            {/* MODALS */}
            <ModalTemplate isOpen={modalAction.type === 'delete'} onClose={() => setModalAction({type:null,data:null})} onConfirm={handleConfirm} title="Delete Faculty?" message={`Permanently delete ${modalAction.data?.name} (${modalAction.data?.facultyid})?`} confirmText="Yes, Delete" icon={Trash2} colorClass="red" isLoading={isActionLoading} />
            <ModalTemplate isOpen={modalAction.type === 'reset'} onClose={() => setModalAction({type:null,data:null})} onConfirm={handleConfirm} title="Reset Password?" message={`Are you sure you want to reset the password for ${modalAction.data?.name}?`} confirmText="Confirm Reset" icon={ShieldCheck} colorClass="amber" isLoading={isActionLoading} />
            <ModalTemplate isOpen={modalAction.type === 'show_password'} onClose={() => setModalAction({type:null,data:null})} title="Password Reset Successful" message="The password has been reset successfully." showPassword={modalAction.password} icon={Check} colorClass="green" />
        </div>
    );
};

// --- 2. ADD FACULTY (UPDATED) ---
const AddFacultyForm = ({ animate, onCancel, onFacultyAdded }) => {
    const { logout } = useAuth(); // Connect Auth
    const initialState = { name: "", facultyid: "", email: "", designation: "Assistant Professor" };
    const [basicInfo, setBasicInfo] = useState(initialState);
    const [selectedSems, setSelectedSems] = useState([]); 
    const [semData, setSemData] = useState({});
    const [loadingSems, setLoadingSems] = useState({});
    const [assignments, setAssignments] = useState({}); 
    const [submitting, setSubmitting] = useState(false);
    
    // Updated state to hold the full success response object
    const [successData, setSuccessData] = useState(null);

    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setBasicInfo(p => ({ ...p, [name]: value }));
    };

    const toggleSemester = async (sem) => {
        const isSelected = selectedSems.includes(sem);
        if (isSelected) {
            setSelectedSems(prev => prev.filter(s => s !== sem));
             setAssignments(prev => {
                const next = { ...prev };
                delete next[sem];
                return next;
            });
        } else {
            setSelectedSems(prev => [...prev, sem]);
            if (!semData[sem]) {
                setLoadingSems(prev => ({ ...prev, [sem]: true }));
                try {
                    const res = await fetch(`${API_BASE_URL}/api/get-sem-info/${sem}`, { credentials: "include" });
                    
                    if (res.status === 401 || res.status === 403) { logout(); return; }
                    
                    const json = await res.json();
                    if (json.success) setSemData(prev => ({ ...prev, [sem]: json.data }));
                    else throw new Error("Failed to load semester data");
                } catch (err) { console.error(err); } finally { setLoadingSems(prev => ({ ...prev, [sem]: false })); }
            }
        }
    };

    const toggleBatchForCourse = (sem, course, batch) => {
        setAssignments(prev => {
            const semAssignments = prev[sem] || {};
            const courseBatches = semAssignments[course] || [];
            let newCourseBatches = courseBatches.includes(batch) ? courseBatches.filter(b => b !== batch) : [...courseBatches, batch];
            if (newCourseBatches.length === 0) {
                const newSemAssignments = { ...semAssignments };
                delete newSemAssignments[course];
                return { ...prev, [sem]: newSemAssignments };
            }
            return { ...prev, [sem]: { ...semAssignments, [course]: newCourseBatches } };
        });
    };

    const resetForm = () => {
        setBasicInfo(initialState);
        setSelectedSems([]);
        setAssignments({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const subjects_assigned = [];
        const batches_assigned = [];
        
        // Loop through assignments to construct payloads
        Object.keys(assignments).forEach(sem => {
            if (!selectedSems.includes(sem)) return; // Security check
            const courses = assignments[sem];
            Object.keys(courses).forEach(course => {
                const batches = courses[course];
                batches.forEach(batch => {
                    // Correct Format: "VI,SN1:CSM601"
                    subjects_assigned.push(`${sem},${batch}:${course}`);
                    // Correct Format: "VI:SN1"
                    batches_assigned.push(`${sem}:${batch}`);
                });
            });
        });

        const payload = { ...basicInfo, sem: selectedSems, subjects_assigned, batches_assigned };

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/add-faculty`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: "include" });
            
            if (res.status === 401 || res.status === 403) { logout(); return; }
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.message || "Failed to add faculty");
            
            // Set data for the specific Success Modal
            setSuccessData(result);
            
        } catch (err) { 
            onFacultyAdded(false, err.message); 
        } finally { 
            setSubmitting(false); 
        }
    };

    if(successData) {
        return <FacultyOnboardModal 
            isOpen={true} 
            data={successData} 
            onClose={() => {
                setSuccessData(null); 
                resetForm(); // Reset form state
                onFacultyAdded(true, 'Faculty added! Ready for next entry.'); 
            }} 
        />;
    }

    return (
        <div className={`bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
                <div><h3 className="text-2xl font-bold text-gray-800 tracking-tight">Onboard Faculty</h3><p className="text-gray-500 text-sm mt-1">Configure academic details and course load.</p></div>
                <button onClick={onCancel} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><XCircle size={24} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Full Name</label><input type="text" name="name" value={basicInfo.name} onChange={handleInfoChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Faculty ID</label><input type="text" name="facultyid" value={basicInfo.facultyid} onChange={handleInfoChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Email Address</label><input type="email" name="email" value={basicInfo.email} onChange={handleInfoChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Designation</label>
                        <div className="relative">
                             <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input 
                                list="designation-options" 
                                name="designation"
                                value={basicInfo.designation} 
                                onChange={handleInfoChange}
                                placeholder="Select or type designation..." 
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 block outline-none font-medium"
                            />
                            <datalist id="designation-options">
                                {DESIGNATIONS.map(d => <option key={d} value={d} />)}
                            </datalist>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-3 ml-1 uppercase flex items-center gap-2"><GraduationCap size={16}/> Active Semesters</label>
                    <div className="flex flex-wrap gap-2">{SEMESTERS.map(sem => (<button key={sem} type="button" onClick={() => toggleSemester(sem)} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${selectedSems.includes(sem) ? 'bg-slate-800 text-white border-slate-800 shadow-lg transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>Sem {sem}</button>))}</div>
                </div>
                {selectedSems.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase flex items-center gap-2"><BookOpen size={16}/> Course & Batch Mapping</label>
                        <div className="grid grid-cols-1 gap-4">
                            {selectedSems.map(sem => {
                                const data = semData[sem];
                                const isLoading = loadingSems[sem];
                                return (
                                    <div key={sem} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center"><span className="font-bold text-gray-800 text-sm">Semester {sem} Configuration</span>{isLoading && <Loader2 className="animate-spin text-blue-500" size={16} />}</div>
                                        <div className="p-4">
                                            {isLoading ? <div className="text-center py-6 text-gray-400 text-sm">Fetching courses...</div> : data ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                                                    {data.courses && data.courses.length > 0 ? data.courses.map(course => {
                                                        const selectedBatches = assignments[sem]?.[course] || [];
                                                        const isCourseActive = selectedBatches.length > 0;
                                                        return (
                                                            <div key={course} className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full ${isCourseActive ? 'bg-blue-500' : 'bg-gray-300'}`}></div><span className={`text-sm font-bold ${isCourseActive ? 'text-gray-900' : 'text-gray-500'}`}>{course}</span></div>
                                                                <div className="flex flex-wrap gap-1.5 pl-4">{data.batches && data.batches.length > 0 ? data.batches.map(batch => (<button key={batch} type="button" onClick={() => toggleBatchForCourse(sem, course, batch)} className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-all ${selectedBatches.includes(batch) ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{batch}</button>)) : <span className="text-xs text-red-400 italic">No batches found</span>}</div>
                                                            </div>
                                                        );
                                                    }) : <div className="col-span-full text-center text-sm text-gray-400 italic">No courses available for this semester.</div>}
                                                </div>
                                            ) : <div className="text-center py-4 text-red-400 text-sm flex items-center justify-center gap-2"><ServerCrash size={16} /> Failed to load data</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="flex justify-end pt-6 border-t border-gray-100">
                    <button type="submit" disabled={submitting} className="bg-slate-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all transform active:scale-95">{submitting ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Add Faculty</>}</button>
                </div>
            </form>
        </div>
    );
};

// --- 3. MODIFY FACULTY PANEL (UPDATED) ---
const ModifyFacultyPanel = ({ animate, preloadedFaculty, onCancel, onFacultyUpdated }) => {
    const { logout } = useAuth(); // Connect Auth
    const [editData, setEditData] = useState({ name: "", facultyid: "", email: "", designation: "" });
    const [selectedSems, setSelectedSems] = useState([]);
    const [semData, setSemData] = useState({});
    const [loadingSems, setLoadingSems] = useState({});
    const [assignments, setAssignments] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!preloadedFaculty) return;
        setEditData({
            name: preloadedFaculty.name || "",
            facultyid: preloadedFaculty.facultyid || "",
            email: preloadedFaculty.email || "",
            designation: preloadedFaculty.designation || ""
        });

        // RECONSTRUCT ASSIGNMENTS from "VI,SN1:CSM601"
        const initialAssignments = {};
        if (preloadedFaculty.subjects_assigned) {
            preloadedFaculty.subjects_assigned.forEach(entry => {
                const parts = entry.split(':');
                if(parts.length === 2) {
                    const [left, course] = parts;
                    const subParts = left.split(',');
                    if(subParts.length === 2) {
                        const [sem, batch] = subParts;
                        if (!initialAssignments[sem]) initialAssignments[sem] = {};
                        if (!initialAssignments[sem][course]) initialAssignments[sem][course] = [];
                        if (!initialAssignments[sem][course].includes(batch)) {
                            initialAssignments[sem][course].push(batch);
                        }
                    }
                }
            });
        }
        setAssignments(initialAssignments);

        if (preloadedFaculty.sem) {
            setSelectedSems(preloadedFaculty.sem);
            preloadedFaculty.sem.forEach(sem => fetchSemesterData(sem));
        }
    }, [preloadedFaculty]);

    const fetchSemesterData = async (sem) => {
        setLoadingSems(prev => ({ ...prev, [sem]: true }));
        try {
            const res = await fetch(`${API_BASE_URL}/api/get-sem-info/${sem}`, { credentials: "include" });
            
            if (res.status === 401 || res.status === 403) { logout(); return; }
            
            const json = await res.json();
            if (json.success) {
                setSemData(prev => ({ ...prev, [sem]: json.data }));
            }
        } catch (err) {
            console.error(`Failed to fetch info for Sem ${sem}`, err);
        } finally {
            setLoadingSems(prev => ({ ...prev, [sem]: false }));
        }
    };

    const toggleSemester = (sem) => {
        if (selectedSems.includes(sem)) {
            setSelectedSems(prev => prev.filter(s => s !== sem));
            setAssignments(prev => {
                const next = { ...prev };
                delete next[sem];
                return next;
            });
        } else {
            setSelectedSems(prev => [...prev, sem]);
            if (!semData[sem]) fetchSemesterData(sem);
        }
    };

    const toggleBatchForCourse = (sem, course, batch) => {
        setAssignments(prev => {
            const semAssignments = prev[sem] || {};
            const courseBatches = semAssignments[course] || [];
            let newCourseBatches = courseBatches.includes(batch) ? courseBatches.filter(b => b !== batch) : [...courseBatches, batch];
            
            if (newCourseBatches.length === 0) {
                const newSemAssignments = { ...semAssignments };
                delete newSemAssignments[course];
                return { ...prev, [sem]: newSemAssignments };
            }
            return { ...prev, [sem]: { ...semAssignments, [course]: newCourseBatches } };
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault(); 
        setIsSubmitting(true);
        
        const subjects_assigned = [];
        const batches_assigned = [];
        
        Object.keys(assignments).forEach(sem => {
            if(!selectedSems.includes(sem)) return; // Consistency check
            const courses = assignments[sem];
            Object.keys(courses).forEach(course => {
                const batches = courses[course];
                batches.forEach(batch => {
                    subjects_assigned.push(`${sem},${batch}:${course}`);
                    batches_assigned.push(`${sem}:${batch}`);
                });
            });
        });

        const payload = {
            facultyid: editData.facultyid,
            name: editData.name,
            email: editData.email,
            designation: editData.designation,
            sem: selectedSems,
            subjects_assigned,
            batches_assigned
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/update-faculty`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload), 
                credentials: "include" 
            });
            
            if (response.status === 401 || response.status === 403) { logout(); return; }
            
            if (!response.ok) throw new Error('Update failed');
            onFacultyUpdated(true, 'Faculty profile updated successfully!'); 
            onCancel();
        } catch (error) { 
            onFacultyUpdated(false, error.message || 'Failed to update faculty.'); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    if (!editData.facultyid) return null;

    return (
        <div className={`bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Faculty Profile</h3>
                <button onClick={onCancel} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><XCircle size={24} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 text-center sticky top-6">
                        <img className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mx-auto bg-gray-200" 
                             src={`https://ui-avatars.com/api/?name=${editData.name.replace(/ /g, '+')}&background=F3F4F6&color=111827&size=128&font-size=0.4`} 
                             alt={editData.name}/>
                        <h2 className="text-lg font-bold text-gray-900 mt-4">{editData.name}</h2>
                        <p className="font-bold text-gray-400 text-sm mb-6">{editData.facultyid}</p>
                        <div className="space-y-3 text-left bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase">Designation</span><span className="font-bold text-gray-800 text-right">{editData.designation}</span></div>
                            <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase">Email</span><span className="font-bold text-gray-800 truncate ml-2">{editData.email}</span></div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Full Name</label><input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Email</label><input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Designation</label>
                                <div className="relative">
                                    <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input 
                                        list="designation-options-edit" 
                                        value={editData.designation} 
                                        onChange={e => setEditData({...editData, designation: e.target.value})}
                                        placeholder="Select or type designation..." 
                                        className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 block outline-none font-medium"
                                    />
                                    <datalist id="designation-options-edit">
                                        {DESIGNATIONS.map(d => <option key={d} value={d} />)}
                                    </datalist>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-3 ml-1 uppercase flex items-center gap-2"><GraduationCap size={16}/> Active Semesters</label>
                            <div className="flex flex-wrap gap-2">
                                {SEMESTERS.map(sem => (
                                    <button key={sem} type="button" onClick={() => toggleSemester(sem)} 
                                        className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${selectedSems.includes(sem) ? 'bg-slate-800 text-white border-slate-800 shadow-lg transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                        Sem {sem}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedSems.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase flex items-center gap-2"><BookOpen size={16}/> Course & Batch Mapping</label>
                                <div className="grid grid-cols-1 gap-4">
                                    {selectedSems.map(sem => {
                                        const data = semData[sem];
                                        const isLoading = loadingSems[sem];
                                        return (
                                            <div key={sem} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center"><span className="font-bold text-gray-800 text-sm">Semester {sem} Configuration</span>{isLoading && <Loader2 className="animate-spin text-blue-500" size={16} />}</div>
                                                <div className="p-4">
                                                    {isLoading ? <div className="text-center py-6 text-gray-400 text-sm">Fetching courses...</div> : data ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                                                            {data.courses && data.courses.length > 0 ? data.courses.map(course => {
                                                                const selectedBatches = assignments[sem]?.[course] || [];
                                                                const isCourseActive = selectedBatches.length > 0;
                                                                return (
                                                                    <div key={course} className="flex flex-col gap-2">
                                                                        <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full ${isCourseActive ? 'bg-blue-500' : 'bg-gray-300'}`}></div><span className={`text-sm font-bold ${isCourseActive ? 'text-gray-900' : 'text-gray-500'}`}>{course}</span></div>
                                                                        <div className="flex flex-wrap gap-1.5 pl-4">{data.batches && data.batches.length > 0 ? data.batches.map(batch => (<button key={batch} type="button" onClick={() => toggleBatchForCourse(sem, course, batch)} className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-all ${selectedBatches.includes(batch) ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{batch}</button>)) : <span className="text-xs text-red-400 italic">No batches found</span>}</div>
                                                                    </div>
                                                                );
                                                            }) : <div className="col-span-full text-center text-sm text-gray-400 italic">No courses available for this semester.</div>}
                                                        </div>
                                                    ) : <div className="text-center py-4 text-red-400 text-sm flex items-center justify-center gap-2"><ServerCrash size={16} /> Failed to load data</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={onCancel} disabled={isSubmitting} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-70">
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Changes</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- 4. MAIN PAGE ---
const ManageFacultyPage = () => {
    const { user, logout } = useAuth(); // Connect Auth
    const navigate = useNavigate();
    
    const [animate, setAnimate] = useState(false);
    const [activeTab, setActiveTab] = useState('view');
    const [facultyList, setFacultyList] = useState(null); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [preloadedFaculty, setPreloadedFaculty] = useState(null);

    const fetchFaculty = useCallback(async () => {
        if (!user) { navigate('/'); return; }

        setIsLoading(true); setError(null); setFacultyList([]); 
        try {
            const url = `${API_BASE_URL}/api/admin/view-faculty`;
            const response = await fetch(url, { method: "GET", credentials: "include" });
            
            if (response.status === 401 || response.status === 403) {
                logout(); return;
            }

            if (!response.ok) throw new Error("Failed to fetch faculty directory");
            
            const data = await response.json();
            setFacultyList(Array.isArray(data) ? data : []);
        } catch (err) { setError(err); setFacultyList([]); } finally { setIsLoading(false); }
    }, [user, navigate, logout]);

    useEffect(() => { 
        if(!user) { navigate('/'); return; }
        fetchFaculty(); 
    }, [fetchFaculty, user, navigate]);
    
    useEffect(() => { setTimeout(() => setAnimate(true), 100); }, []);

    const showToast = (type, message) => setToast({ type, message });
    const refresh = (success, message) => { showToast(success?'success':'error', message); if(success) fetchFaculty(); };
    const handleAction = (tabId, data = null) => { setPreloadedFaculty(data); setActiveTab(tabId); };
    
    const handleFacultyDelete = async (facultyData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/delete-faculty`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facultyid: facultyData.facultyid }), credentials: "include" });
            
            if (res.status === 401 || res.status === 403) { logout(); return; }
            
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Delete failed');
            refresh(true, result.message || 'Faculty deleted successfully');
        } catch (e) { throw e; }
    };

    const handlePasswordReset = async (facultyData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, { 
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({  username: facultyData.facultyid }), 
                credentials: "include" 
            });
            
            if (response.status === 401 || response.status === 403) { logout(); return; }
            if (!response.ok) throw new Error('Could not reset password.');
            
            const result = await response.json();
            setToast({ message: 'Password reset successful', type: 'success' });
            return result.password || result.defaultPassword || ""; 
        } catch (err) { showToast('error', err.message); throw err; }
    };
    
    const tabs = [{ id: 'view', label: 'Directory', icon: Users }, { id: 'add', label: 'Onboard Faculty', icon: UserPlus }, { id: 'find', label: 'Find & Modify', icon: Search }];

    return (
        <div className="min-h-screen font-sans bg-[#F3F4F6] pb-10">
            <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({message:'',type:''})} />
            
            {/* WIDENED HEADER SECTION */}
            <div className="bg-[#0F172A] pb-32 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                {/* WIDENED MAX WIDTH CONTAINER */}
                <div className="px-6 pt-6 relative z-10 max-w-[1600px] mx-auto">
                    {/* UPDATED HEADER POSITIONING */}
                    <div className="flex justify-between items-center">
                        <Header animate={animate} />
                    </div>

                    <div className="mt-12 mb-6">
                        <SectionHeader title="Faculty Management System" animate={animate} delay={200} />
                        <div className={`flex flex-wrap gap-4 transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {tabs.map(t => (
                                <button key={t.id} onClick={() => handleAction(t.id, null)} className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2.5 transition-all duration-300 ${activeTab === t.id ? 'bg-white text-gray-900 shadow-xl scale-105' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}>
                                    <t.icon size={18} /> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* WIDENED MAIN CONTENT AREA */}
            <main className="px-6 -mt-24 relative z-20 max-w-[1600px] mx-auto">
                <div className={activeTab === 'view' ? 'block' : 'hidden'}>
                    <ViewAllFaculty animate={animate} facultyList={facultyList} isLoading={isLoading} error={error} onAction={handleAction} onDelete={handleFacultyDelete} 
                        onResetPassword={handlePasswordReset} />
                </div>

                {activeTab === 'add' && (
                    <div className="block">
                        <AddFacultyForm animate={animate} onCancel={() => setActiveTab('view')} onFacultyAdded={refresh} />
                    </div>
                )}

                <div className={activeTab === 'find' ? 'block' : 'hidden'}>
                    {preloadedFaculty ? (
                        <ModifyFacultyPanel animate={animate} preloadedFaculty={preloadedFaculty} onCancel={() => setActiveTab('view')} onFacultyUpdated={refresh} />
                    ) : (
                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center animate-in fade-in zoom-in-95 flex flex-col items-center justify-center min-h-[450px]">
                            <div className="p-5 bg-blue-50 text-blue-500 rounded-full mb-6"><Search size={48} /></div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Find & Modify</h3>
                            <p className="text-gray-500 mb-8 font-medium max-w-md">Select a specific faculty member from the directory to unlock profile editing and course assignment updates.</p>
                            <button onClick={() => setActiveTab('view')} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">Return to Directory</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ManageFacultyPage;