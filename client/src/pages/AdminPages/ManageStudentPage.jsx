import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    User, Search, Edit, Loader2, Check, AlertCircle, Users, 
    ChevronDown, UserPlus, Trash2, Briefcase, Building, 
    XCircle, Filter, Code2, KeyRound, ChevronLeft, ChevronRight,
    LayoutGrid, ServerCrash, ShieldCheck, Save, Lock, Github,
    GraduationCap, FolderOpen, Copy, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 

// --- CONFIGURATION ---
const API_BASE_URL = import.meta.env.VITE_BASE_URL;

const ALL_BRANCHES_FALLBACK = ["CSE", "CSE (AI&ML)", "CSE (CS)","CSE (DS)","IT", "ECE", "EEE", "MECH", "CIVIL"];
const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// --- UI COMPONENTS ---

const SectionHeader = ({ title, animate, delay }) => (
    <div className={`flex items-center mb-6 transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{ transitionDelay: `${delay}ms` }}>
        <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3 shadow-lg shadow-blue-500/30"></div>
        <h2 className="text-xl font-bold text-white tracking-wide">{title}</h2>
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
        <span className="uppercase text-[10px] tracking-wide">{text}</span>
    </div>
);

// SKELETON LOADER
const SkeletonCard = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col h-[180px] animate-pulse">
        <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
        </div>
        <div className="flex gap-2 mb-auto">
            <div className="h-6 bg-gray-100 rounded w-16"></div>
            <div className="h-6 bg-gray-100 rounded w-16"></div>
        </div>
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
            <div className="h-8 bg-gray-100 rounded flex-1"></div>
            <div className="h-8 bg-gray-100 rounded flex-1"></div>
            <div className="h-8 bg-gray-100 rounded w-10"></div>
        </div>
    </div>
);

// --- UPDATED: ROBUST & INEFFICIENT STUDENT AVATAR ---
const StudentAvatar = ({ url, name, size = "w-14 h-14" }) => {
    // State to hold the specific source we are trying to render
    const [imgState, setImgState] = useState({
        src: null,
        status: 'loading' // loading, loaded, error
    });

    useEffect(() => {
        // "Inefficient" Fetching Strategy:
        // We append a timestamp to the URL. This forces the browser to bypass its cache 
        // and make a brand new network request for this specific image every time this component mounts.
        // This ensures if an image exists, we *really* try to fetch it, rather than relying on a stale 404 cache.
        const freshUrl = `${url}?t=${Date.now()}`;
        
        setImgState({
            src: freshUrl,
            status: 'loading'
        });
    }, [url]);

    const handleLoad = () => {
        setImgState(prev => ({ ...prev, status: 'loaded' }));
    };

    const handleError = () => {
        // Fallback to UI Avatars if the S3 link fails
        const fallbackUrl = `https://ui-avatars.com/api/?name=${(name || 'User').replace(/ /g, '+')}&background=F3F4F6&color=111827&font-size=0.35&rounded=true&bold=true`;
        setImgState({
            src: fallbackUrl,
            status: 'error'
        });
    };

    return (
        <div className={`relative ${size} rounded-full flex-shrink-0 overflow-hidden border-2 border-white shadow-md bg-gray-100 group-hover:scale-105 transition-transform duration-300`}>
            {/* Show Skeleton while loading (overlay) */}
            {imgState.status === 'loading' && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse z-10" />
            )}
            
            {imgState.src && (
                <img 
                    src={imgState.src} 
                    alt={name}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imgState.status === 'loading' ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="eager" // Force immediate fetch, disable lazy loading
                />
            )}
        </div>
    );
};

// --- ONBOARD RESULT MODAL ---
const OnboardResultModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;
    
    const isSuccess = !!data.student;
    const { student, message } = data;

    const theme = isSuccess 
        ? { bg: 'bg-emerald-600', iconBg: 'bg-white/20', icon: Check, title: 'Onboarding Complete!', btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200', btnText: 'Add Another Student' }
        : { bg: 'bg-rose-600', iconBg: 'bg-white/20', icon: AlertTriangle, title: 'Onboarding Failed', btn: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200', btnText: 'Try Again' };

    const Icon = theme.icon;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className={`${theme.bg} p-6 text-center`}>
                    <div className={`mx-auto ${theme.iconBg} w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm`}>
                        <Icon size={32} className="text-white" strokeWidth={3} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{theme.title}</h3>
                </div>
                
                <div className="p-6">
                    <p className="text-center text-gray-600 text-sm mb-6 font-medium">
                        {message}
                    </p>
                    
                    {isSuccess && student && (
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6 space-y-3">
                             <div className="flex items-center gap-4 border-b border-gray-200 pb-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {student.name ? student.name.charAt(0) : 'S'}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-gray-900 truncate">{student.name}</h4>
                                    <p className="text-xs text-gray-500 font-mono">{student.rollno}</p>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-2 rounded-lg border border-gray-100">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Semester</span>
                                    <span className="text-sm font-bold text-gray-800">{student.sem}</span>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-gray-100">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Batch</span>
                                    <span className="text-sm font-bold text-gray-800">{student.batch}</span>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={onClose} 
                        className={`w-full py-3 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${theme.btn}`}
                    >
                        {theme.btnText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- PASSWORD SUCCESS MODAL ---
const PasswordSuccessModal = ({ isOpen, onClose, data }) => {
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (isOpen) setShowPassword(false);
    }, [isOpen]);

    if (!isOpen || !data) return null;
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(data.password);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="bg-emerald-500 p-6 text-center">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Check size={32} className="text-white" strokeWidth={3} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Reset Successful!</h3>
                </div>
                
                <div className="p-6">
                    <p className="text-center text-gray-600 text-sm mb-6 font-medium leading-relaxed">
                        {data.message}
                    </p>
                    
                    {data.password && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 mb-6 relative">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Default Password</p>
                                <div className="flex items-center">
                                    <p className="text-lg font-mono font-bold text-gray-800 tracking-wider">
                                        {showPassword ? data.password : '••••••••'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
                                    title={showPassword ? "Hide Password" : "Show Password"}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button 
                                    onClick={copyToClipboard}
                                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
                                    title="Copy Password"
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

const ModalTemplate = ({ isOpen, onClose, onConfirm, title, message, icon: Icon, colorClass, confirmText, isLoading }) => {
    if (!isOpen) return null;
    const styles = {
        red: { bg: 'bg-red-50', iconBg: 'bg-red-100', icon: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' },
        amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', icon: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' },
        blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', icon: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
    }[colorClass] || { bg: 'bg-gray-50', iconBg: 'bg-gray-100', icon: 'text-gray-600', btn: 'bg-gray-800' };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300" onClick={!isLoading ? onClose : undefined}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex items-start gap-5">
                    <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl ${styles.iconBg}`}>
                        <Icon className={`h-6 w-6 ${styles.icon}`} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                    <button onClick={onClose} disabled={isLoading} className="py-2.5 px-5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 text-sm transition-all shadow-sm">Cancel</button>
                    <button onClick={onConfirm} disabled={isLoading} className={`py-2.5 px-5 text-white rounded-xl font-bold shadow-md text-sm transition-all flex items-center gap-2 ${styles.btn}`}>
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : confirmText}
                    </button>
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
            <div><div className="font-bold text-sm whitespace-pre-wrap">{message}</div></div>
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

// --- 1. VIEW ALL STUDENTS ---
const ViewAllStudents = ({ animate, students, isLoading, error, onAction, onDelete, onResetPassword, currentSemester, onSemesterChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('All');
    const [batchFilter, setBatchFilter] = useState('All');
    const [modalAction, setModalAction] = useState({ type: null, data: null });
    const [isActionLoading, setIsActionLoading] = useState(false); 
    const [page, setPage] = useState(1);
    const PER_PAGE = 12;

    useEffect(() => { const h = setTimeout(() => setDebouncedSearch(searchTerm), 300); return () => clearTimeout(h); }, [searchTerm]);
    
    const { branchOptions, batchOptions } = useMemo(() => {
        if (!students?.length) return { branchOptions: [], batchOptions: [] };
        const br = ['All', ...Array.from(new Set(students.map(s => s.branch).filter(Boolean))).sort()];
        const ba = ['All', ...Array.from(new Set(students.map(s => s.batch).filter(Boolean))).sort()];
        return {
            branchOptions: br.map(b => ({ value: b, label: b === 'All' ? 'All Branches' : b })),
            batchOptions: ba.map(b => ({ value: b, label: b === 'All' ? 'All Batches' : b }))
        };
    }, [students]);

    useEffect(() => { setBranchFilter('All'); setBatchFilter('All'); setPage(1); }, [currentSemester]);

    const filtered = useMemo(() => {
        if (!students) return [];
        return students.filter(s => {
            const name = (s.name || "").toLowerCase();
            const rollno = (s.rollno || "").toLowerCase();
            const search = debouncedSearch.toLowerCase();

            return (
                (branchFilter === 'All' || s.branch === branchFilter) &&
                (batchFilter === 'All' || s.batch === batchFilter) &&
                (name.includes(search) || rollno.includes(search))
            );
        });
    }, [debouncedSearch, branchFilter, batchFilter, students]);

    const handleConfirm = async () => {
        if (!modalAction.data) return;
        setIsActionLoading(true); 
        try {
            if (modalAction.type === 'delete') await onDelete(modalAction.data.rollno);
            if (modalAction.type === 'reset') await onResetPassword(modalAction.data.rollno);
            setModalAction({ type: null, data: null });
        } catch (error) { console.error(error); } finally { setIsActionLoading(false); }
    };

    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    const renderContent = () => {
        if (!currentSemester) return <StatusDisplay title="Select Semester" message="Choose a semester tab above to browse the student directory." icon={LayoutGrid} colorClass="gray" />;
        
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in">
                    {Array(12).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            );
        }
        
        if (error) {
            const isMissingData = error.message.includes("does not exist") || error.message.includes("No students");
            return <StatusDisplay 
                title={isMissingData ? "No Data Available" : "Connection Failed"} 
                message={error.message} 
                icon={isMissingData ? FolderOpen : ServerCrash} 
                colorClass={isMissingData ? "amber" : "red"} 
                action={<button onClick={() => onSemesterChange(currentSemester)} className={`px-6 py-2 ${isMissingData ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-bold text-sm transition-colors`}>Retry</button>} 
            />;
        }

        if (!students || students.length === 0) return <StatusDisplay title="No Records" message={`No students found in Semester ${currentSemester}.`} icon={Users} colorClass="amber" />;
        if (paginated.length === 0) return <StatusDisplay title="No Matches" message="Try clearing your search or filters." icon={Search} colorClass="gray" action={<button onClick={() => {setSearchTerm(''); setBranchFilter('All'); setBatchFilter('All');}} className="text-blue-600 font-bold underline decoration-2 underline-offset-4">Reset Filters</button>} />;

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom-4">
                    {paginated.map(s => {
                        const safeName = s.name || "Student";
                        const safeRoll = s.rollno || "Unknown";
                        
                        return (
                            <div key={safeRoll} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-lg hover:border-blue-200 transition-all duration-300 group overflow-hidden">
                                <div className="p-5 flex-grow">
                                    <div className="flex items-center gap-4 mb-5">
                                        <StudentAvatar 
                                            key={safeRoll} // Force remount on roll change
                                            url={`https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${safeRoll}/${safeRoll}.jpg`}
                                            name={safeName}
                                            size="w-14 h-14"
                                        />
                                        <div className="min-w-0">
                                            <h3 className="text-base font-bold text-gray-900 truncate">{safeRoll}</h3>
                                            <p className="text-xs font-semibold text-gray-500 font-mono uppercase tracking-wide truncate">{safeName}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <InfoTag icon={<Briefcase size={12} />} text={s.branch || "N/A"} color="border-indigo-100 bg-indigo-50 text-indigo-700" />
                                        <InfoTag icon={<Building size={12} />} text={s.batch || "N/A"} color="border-teal-100 bg-teal-50 text-teal-700" />
                                    </div>
                                </div>
                                
                                <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                                    <button onClick={() => onAction('find', s)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5">
                                        <Edit size={14} /> Edit
                                    </button>
                                    <button onClick={() => setModalAction({ type: 'reset', data: s })} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5">
                                        <KeyRound size={14} /> Reset
                                    </button>
                                    <button onClick={() => setModalAction({ type: 'delete', data: s })} className="p-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
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
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200 flex overflow-x-auto no-scrollbar gap-2">
                {SEMESTERS.map(sem => (
                    <button key={sem} onClick={() => onSemesterChange(sem)} className={`flex-shrink-0 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${currentSemester === sem ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>Semester {sem}</button>
                ))}
            </div>

            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-gray-100 min-h-[500px]">
                {currentSemester && (
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-5 mb-8 border-b border-gray-100 pb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3 tracking-tight">
                                {`Semester ${currentSemester}`} 
                                {students?.length > 0 && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold">{filtered.length} Students</span>}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Manage enrollments, branches and student data.</p>
                        </div>
                        {students?.length > 0 && (
                            <div className="w-full xl:w-auto flex flex-col md:flex-row gap-3">
                                <div className="relative w-full md:w-64">
                                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-300 transition-all" />
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <div className="w-1/2 md:w-40"><NativeSelect options={branchOptions} value={branchFilter} onChange={setBranchFilter} placeholder="All Branches" /></div>
                                    <div className="w-1/2 md:w-40"><NativeSelect options={batchOptions} value={batchFilter} onChange={setBatchFilter} placeholder="All Batches" /></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {renderContent()}
            </div>

            <ModalTemplate isOpen={modalAction.type === 'delete'} onClose={() => setModalAction({type:null,data:null})} onConfirm={handleConfirm} title="Delete Student?" message={`Permanently delete ${modalAction.data?.name} (${modalAction.data?.rollno})?`} confirmText="Yes, Delete" icon={Trash2} colorClass="red" isLoading={isActionLoading} />
            <ModalTemplate isOpen={modalAction.type === 'reset'} onClose={() => setModalAction({type:null,data:null})} onConfirm={handleConfirm} title="Reset Password?" message={`Reset password for ${modalAction.data?.name} to their roll number?`} confirmText="Confirm Reset" icon={ShieldCheck} colorClass="amber" isLoading={isActionLoading} />
        </div>
    );
};

// --- 2. ADD STUDENT ---
const AddStudentForm = ({ animate, onCancel, onStudentAdded }) => {
    const { logout } = useAuth();
    const [selectedSem, setSelectedSem] = useState(null);
    const [fetchingSemData, setFetchingSemData] = useState(false);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [semCourses, setSemCourses] = useState([]);
    const [semError, setSemError] = useState(null);

    const initialState = { 
        rollno: "", name: "", branch: "", batch: "", 
        handles: { leetcode: "", gfg: "", codechef: "", hackerank: "", github: "" } 
    };
    const [data, setData] = useState(initialState);
    const [submitting, setSubmitting] = useState(false);

    const handleSemSelect = async (sem) => {
        setSelectedSem(sem); setFetchingSemData(true); setSemError(null); setAvailableBatches([]); setSemCourses([]);
        try {
            const res = await fetch(`${API_BASE_URL}/api/get-sem-info/${sem}`, { credentials: "include" });
            if (res.status === 401 || res.status === 403) { logout(); return; }
            
            if(!res.ok) throw new Error("Failed to fetch semester info");
            const result = await res.json();
            if(result.success && result.data) {
                setAvailableBatches((result.data.batches || []).map(b => ({ value: b, label: b })));
                setSemCourses(result.data.courses || []);
                setData(prev => ({ ...prev, batch: "" }));
            }
        } catch (err) { setSemError("Could not load batch info."); } finally { setFetchingSemData(false); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (['leetcode', 'gfg', 'codechef', 'hackerank', 'github'].includes(name)) {
            setData(p => ({ ...p, handles: { ...p.handles, [name]: value } }));
        } else {
            setData(p => ({ ...p, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); if(!selectedSem) return; setSubmitting(true);
        try {
            const payload = { semname: selectedSem, rollno: data.rollno.toUpperCase(), name: data.name.toUpperCase(), branch: data.branch, batch: data.batch, handles: data.handles, courses: semCourses };
            const res = await fetch(`${API_BASE_URL}/api/admin/add-student`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: "include" });
            
            if (res.status === 401 || res.status === 403) { logout(); return; }
            
            const result = await res.json();

            if (!res.ok) {
                onStudentAdded({ success: false, ...result }); 
            } else {
                setData(initialState); 
                onStudentAdded(result); 
            }

        } catch (err) { 
            onStudentAdded({ success: false, message: 'Connection Error or Server unavailable.' }); 
        } finally { setSubmitting(false); }
    };

    const branchOptions = ALL_BRANCHES_FALLBACK.map(b => ({ value: b, label: b }));

    return (
        <div className={`bg-white rounded-3xl p-6 lg:p-8 shadow-xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Onboard Student</h3>
                    <p className="text-gray-500 text-sm mt-1">Add a new student record to the system.</p>
                </div>
                <button onClick={onCancel} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><XCircle size={24} className="text-gray-400 hover:text-gray-600"/></button>
            </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider"><GraduationCap size={16}/> Select Semester</div>
                <div className="flex overflow-x-auto no-scrollbar gap-2 p-1">
                    {SEMESTERS.map(sem => (
                        <button key={sem} type="button" onClick={() => handleSemSelect(sem)} 
                            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${selectedSem === sem ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                            {sem}
                        </button>
                    ))}
                </div>
                {fetchingSemData && <div className="mt-3 text-xs text-blue-600 flex items-center font-bold px-1"><Loader2 className="animate-spin mr-1" size={12}/> Loading configuration...</div>}
                {semError && <div className="mt-2 text-xs text-red-600 font-bold">{semError}</div>}
            </div>

            <form onSubmit={handleSubmit} className={`space-y-6 transition-all duration-500 ${!selectedSem ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Roll Number</label><input type="text" name="rollno" value={data.rollno} onChange={handleChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Full Name</label><input type="text" name="name" value={data.name} onChange={handleChange} required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Branch</label>
                        <NativeSelect options={branchOptions} value={data.branch} onChange={(v) => setData(p => ({ ...p, branch: v }))} placeholder="Select Branch" icon={Briefcase} />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Batch {selectedSem && `(Sem ${selectedSem})`}</label>
                        <NativeSelect 
                            options={availableBatches} 
                            value={data.batch} 
                            onChange={(v) => setData(p => ({ ...p, batch: v }))} 
                            placeholder={fetchingSemData ? "Loading..." : "Select Batch"} 
                            disabled={fetchingSemData || !selectedSem}
                            icon={Users}
                        />
                    </div>
                </div>

                <fieldset className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm">
                    <legend className="text-sm font-bold text-gray-800 px-2 flex items-center gap-2 mb-2"><Code2 size={16} className="text-blue-500"/> Coding Profiles</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['leetcode', 'gfg', 'codechef', 'hackerank', 'github'].map(p => (
                            <div key={p}>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{p === 'github' && <Github size={10} />} {p}</label>
                                <input type="text" name={p} value={data.handles[p]} onChange={handleChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:border-blue-400 focus:bg-white outline-none transition-colors" placeholder={`${p} username`} />
                            </div>
                        ))}
                    </div>
                </fieldset>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button type="submit" disabled={submitting || !selectedSem || fetchingSemData} className="bg-slate-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 transition-all transform active:scale-95">
                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Complete Onboarding</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- 3. MODIFY STUDENT PANEL ---
const ModifyStudentPanel = ({ animate, preloadedStudent, onCancel, onStudentUpdated, currentSemester }) => {
    const { logout } = useAuth();
    const [editData, setEditData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // NEW: State for API fetched batches
    const [fetchedBatches, setFetchedBatches] = useState([]);
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);
    
    // Load student data
    useEffect(() => { 
        if (preloadedStudent) {
            setEditData({ ...preloadedStudent, handles: { ...preloadedStudent.handles } }); 
        }
    }, [preloadedStudent]);

    // NEW: Fetch Batches from API based on Current Semester
    useEffect(() => {
        const fetchBatchConfig = async () => {
            if (!currentSemester) return;
            
            setIsLoadingBatches(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/get-sem-config/${currentSemester}`, {
                    method: 'GET',
                    credentials: 'include', // Include cookies/token
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }

                const result = await response.json();

                // Check success and extract batch names from the config array
                if (result.success && result.data && Array.isArray(result.data.config)) {
                    // Map through config to get "name"
                    const batchList = result.data.config.map(item => ({
                        value: item.name,
                        label: item.name
                    }));
                    setFetchedBatches(batchList);
                }
            } catch (error) {
                console.error("Failed to fetch batch config:", error);
            } finally {
                setIsLoadingBatches(false);
            }
        };

        fetchBatchConfig();
    }, [currentSemester, logout]);

    const handleUpdate = async (e) => {
        e.preventDefault(); 
        setIsSubmitting(true);
        try {
            const payload = { 
                semname: currentSemester, 
                rollno: editData.rollno, 
                name: editData.name, 
                branch: editData.branch, 
                batch: editData.batch, 
                handles: editData.handles 
            };
            const response = await fetch(`${API_BASE_URL}/api/admin/update-student`, { 
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload), 
                credentials: "include" 
            });
            
            if (response.status === 401 || response.status === 403) { logout(); return; }
            if (!response.ok) throw new Error('Update failed');
            
            await response.json(); 
            onStudentUpdated(true, 'Student updated successfully!'); 
            onCancel();
        } catch (error) { 
            onStudentUpdated(false, error.message || 'Failed to update student.'); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    if (!editData) return null;

    // Logic to ensure the student's current batch is in the list even if API fails or doesn't have it
    let batchOpts = [...fetchedBatches];
    
    // If API returned nothing (or failed), fall back to just the student's current batch if it exists
    if (batchOpts.length === 0 && editData.batch) {
        batchOpts.push({ value: editData.batch, label: editData.batch });
    } else if (editData.batch && !batchOpts.find(b => b.value === editData.batch)) {
        // If student has a batch that isn't in the active config, add it solely for display
        batchOpts.push({ value: editData.batch, label: `${editData.batch} (Legacy)` });
    }

    return (
        <div className={`bg-white rounded-3xl p-6 lg:p-8 shadow-2xl border border-gray-100 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Student Profile</h3>
                <button onClick={onCancel} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"><XCircle size={24} className="text-gray-400 hover:text-gray-600"/></button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 text-center sticky top-6 z-10">
                        <div className="flex justify-center mb-4">
                            <StudentAvatar 
                                key={editData.rollno}
                                url={`https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${editData.rollno}/${editData.rollno}.jpg`}
                                name={editData.name}
                                size="w-32 h-32"
                            />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mt-4">{editData.name}</h2>
                        <p className="font-bold text-gray-400 text-sm mb-6">{editData.rollno}</p>
                        <div className="space-y-3 text-left bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase">Semester</span><span className="font-bold text-gray-800">{currentSemester}</span></div>
                            <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase">Branch</span><span className="font-bold text-gray-800">{editData.branch}</span></div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Full Name</label><input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none" /></div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Batch</label>
                                <NativeSelect 
                                    options={batchOpts} 
                                    value={editData.batch} 
                                    onChange={(v) => setEditData({...editData, batch: v})} 
                                    placeholder={isLoadingBatches ? "Loading..." : "Select Batch"}
                                    disabled={isLoadingBatches}
                                />
                            </div>
                        </div>
                        
                        <fieldset className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm">
                            <legend className="text-sm font-bold text-gray-800 px-2 flex items-center gap-2 mb-2"><Code2 size={16} className="text-blue-500"/> Update Handles</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['leetcode', 'gfg', 'codechef', 'hackerank'].map(p => (
                                    <div key={p}>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{p}</label>
                                        <input type="text" value={editData.handles?.[p] || ''} onChange={e => setEditData({...editData, handles: {...editData.handles, [p]: e.target.value}})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:border-blue-400 focus:bg-white outline-none" />
                                    </div>
                                ))}
                            </div>
                        </fieldset>

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
const ManageStudentPage = () => {
    const { user, logout, loading } = useAuth();
    const navigate = useNavigate();
    
    const [animate, setAnimate] = useState(false);
    const [activeTab, setActiveTab] = useState('view');
    const [students, setStudents] = useState(null); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });
    const [currentSemester, setCurrentSemester] = useState(null);
    const [preloadedStudent, setPreloadedStudent] = useState(null);
    const [derivedBatches, setDerivedBatches] = useState([]);
    
    const [resetSuccessData, setResetSuccessData] = useState(null); 
    const [onboardResult, setOnboardResult] = useState(null);

    const fetchStudents = useCallback(async () => {
        if (!currentSemester || !user) return; 

        setIsLoading(true); setError(null); setStudents([]); 
        try {
            const url = `${API_BASE_URL}/api/admin/view-students/${currentSemester}`;
            const response = await fetch(url, { method: "GET", credentials: "include" });
            
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }

            if (!response.ok) {
                let errorMessage = `Server Error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        if (errorData.error.includes("Collection") && errorData.error.includes("does not exist")) {
                            errorMessage = errorData.error.replace("Collection ", "").replace(/'/g, "");
                        } else {
                            errorMessage = errorData.error;
                        }
                    }
                } catch (e) {
                    if (response.status === 404) errorMessage = "No students found";
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            const fetchedStudents = data.AllStudents || [];
            setStudents(fetchedStudents);
            const uniqueBatches = Array.from(new Set(fetchedStudents.map(s => s.batch).filter(Boolean))).sort();
            setDerivedBatches(uniqueBatches);
        } catch (err) { setError(err); setStudents([]); setDerivedBatches([]); } finally { setIsLoading(false); }
    }, [currentSemester, user, logout, navigate]);

    useEffect(() => {
        if (loading) return;
        if (!user) { navigate('/'); return; }
        if (currentSemester) fetchStudents();
    }, [user, loading, currentSemester, fetchStudents, navigate]);

    useEffect(() => { setTimeout(() => setAnimate(true), 100); }, []);

    const showToast = (type, message) => setToast({ type, message });
    
    const refresh = (success, message) => { showToast(success?'success':'error', message); if(success) fetchStudents(); };
    
    const handleOnboardResponse = (response) => {
        if (response.student) {
            setOnboardResult(response);
            fetchStudents(); 
        } else if (response.message) {
            setOnboardResult(response);
        } else {
             showToast('error', response.message || 'Unknown error occurred');
        }
    };

    const handleAction = (tabId, data = null) => { setPreloadedStudent(data); setActiveTab(tabId); };
    
    const handleStudentDelete = async (rollno) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/delete-student`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ semname: currentSemester, rollno: rollno }), credentials: "include" });
            
            if (res.status === 401 || res.status === 403) { logout(); return; }
            if (!res.ok) throw new Error('Delete failed');
            
            refresh(true, 'Student deleted successfully');
        } catch (e) { throw e; }
    };
    
    const handlePasswordReset = async (username) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ semname: currentSemester, username: username }), credentials: "include" });
            
            if (response.status === 401 || response.status === 403) { logout(); return; }
            if (!response.ok) throw new Error('Reset failed');
            
            const result = await response.json();

            setResetSuccessData({
                message: result.message,
                password: result.defaultPassword
            });
            
        } catch (err) { showToast('error', err.message); throw err; }
    };

    if (loading) return null;
    if (!user) return null;

    const tabs = [{ id: 'view', label: 'Directory', icon: Users }, { id: 'add', label: 'Onboard Student', icon: UserPlus }, { id: 'find', label: 'Find & Modify', icon: Search }];

    return (
        <div className="min-h-screen font-sans bg-[#F3F4F6] pb-10">
            <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({message:'',type:''})} />
            
            <PasswordSuccessModal 
                isOpen={!!resetSuccessData} 
                onClose={() => setResetSuccessData(null)} 
                data={resetSuccessData} 
            />

            <OnboardResultModal 
                isOpen={!!onboardResult}
                onClose={() => setOnboardResult(null)}
                data={onboardResult}
            />

            <div className="bg-[#0F172A] pb-32 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div className="px-6 pt-6 relative z-10 max-w-[95%] mx-auto">
                    <div className="flex justify-start items-center">
                        <Header animate={animate} />
                    </div>
                    <div className="mt-8 mb-6">
                        <SectionHeader title="Student Management" animate={animate} delay={200} />
                        <div className={`flex flex-wrap gap-3 transition-all duration-700 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                            {tabs.map(t => (
                                <button key={t.id} onClick={() => handleAction(t.id, null)} className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-300 ${activeTab === t.id ? 'bg-white text-gray-900 shadow-xl scale-105' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md'}`}>
                                    <t.icon size={16} /> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-4 -mt-24 relative z-20 max-w-[95%] mx-auto">
                <div className={activeTab === 'view' ? 'block' : 'hidden'}>
                    <ViewAllStudents animate={animate} students={students} isLoading={isLoading} error={error} onAction={handleAction} onDelete={handleStudentDelete} onResetPassword={handlePasswordReset} currentSemester={currentSemester} onSemesterChange={setCurrentSemester} />
                </div>
                <div className={activeTab === 'add' ? 'block' : 'hidden'}>
                    <AddStudentForm animate={animate} onCancel={() => setActiveTab('view')} onStudentAdded={handleOnboardResponse} />
                </div>
                <div className={activeTab === 'find' ? 'block' : 'hidden'}>
                    {preloadedStudent ? (
                        <ModifyStudentPanel animate={animate} preloadedStudent={preloadedStudent} currentSemester={currentSemester} onCancel={() => setActiveTab('view')} onStudentUpdated={refresh} />
                    ) : (
                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center animate-in fade-in zoom-in-95 flex flex-col items-center justify-center min-h-[400px]">
                            <div className="p-4 bg-blue-50 text-blue-500 rounded-full mb-4"><Search size={40} /></div>
                            <h3 className="text-xl font-bold text-gray-900">Find & Modify</h3>
                            <p className="text-gray-500 mb-6 font-medium max-w-sm">Select a student from the <b>Directory</b> to edit their profile details or update coding handles.</p>
                            <button onClick={() => setActiveTab('view')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">Go to Directory</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ManageStudentPage;