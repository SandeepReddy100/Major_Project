import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Database, Trash2, Save, X, 
    CheckCircle, ArrowLeft, Plus, 
    Terminal, Clock, FileText, 
    LayoutDashboard, Activity, PlusCircle,
    UploadCloud, FileSpreadsheet,
    Check, Archive, Grid, Loader2, AlertCircle, Layers,
    Upload, Briefcase, GraduationCap, ClipboardList,
    Settings, Edit3, RefreshCw, MinusCircle, BookOpen, Hash, AlertTriangle, ArrowRight
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 

// --- CONFIGURATION ---
const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const CATEGORY_THEMES = {
    attendance: { 
        label: "Attendance", 
        icon: ClipboardList,
        classes: "bg-gradient-to-br from-blue-50/50 to-white hover:shadow-blue-200",
        iconColor: "text-blue-600 bg-blue-100",
        badge: "bg-blue-100 text-blue-700 border-blue-200"
    },
    timetables: { 
        label: "Timetables", 
        icon: Clock,
        classes: "bg-gradient-to-br from-orange-50/50 to-white hover:shadow-orange-200",
        iconColor: "text-orange-600 bg-orange-100",
        badge: "bg-orange-100 text-orange-700 border-orange-200"
    },
    students: { 
        label: "Students", 
        icon: GraduationCap,
        classes: "bg-gradient-to-br from-violet-50/50 to-white hover:shadow-violet-200",
        iconColor: "text-violet-600 bg-violet-100",
        badge: "bg-violet-100 text-violet-700 border-violet-200"
    },
    faculty: { 
        label: "Faculty", 
        icon: Briefcase,
        classes: "bg-gradient-to-br from-emerald-50/50 to-white hover:shadow-emerald-200",
        iconColor: "text-emerald-600 bg-emerald-100",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200"
    },
    others: { 
        label: "System", 
        icon: Database,
        classes: "bg-gradient-to-br from-slate-50/50 to-white hover:shadow-slate-200",
        iconColor: "text-slate-600 bg-slate-100",
        badge: "bg-slate-100 text-slate-700 border-slate-200"
    },
};

const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const DEFAULT_COURSES = ["CP", "JFS", "DBS", "AWS", "DBMS"];

const generateDefaultBatches = () => {
    const prefixes = ['SU', 'SN', 'SB'];
    const batches = [];
    prefixes.forEach(prefix => {
        for (let i = 1; i <= 5; i++) {
            batches.push(`${prefix}${i}`);
        }
    });
    return batches;
};

const getBatchColorStyle = (batchName, isSelected = true) => {
    if (!isSelected) return 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50';
    if (batchName.startsWith('SU')) return 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-200';
    if (batchName.startsWith('SN')) return 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200';
    if (batchName.startsWith('SB')) return 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200';
    return 'bg-violet-50 text-violet-700 border-violet-300 ring-1 ring-violet-200';
};

const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
    </div>
);

const DbStatCard = ({ label, value, icon: Icon, color }) => (
    <div className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md`}>
        <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}><Icon size={20} /></div>
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

// --- UPDATED STATUS MODAL WITH WIDER LIST ---
const StatusModal = ({ status, onClose }) => {
    if (!status || !status.type) return null;

    const hasMismatches = status.details?.mismatchedBatchRolls && status.details.mismatchedBatchRolls.length > 0;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl w-full text-center border border-gray-100 max-h-[90vh] overflow-y-auto">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${status.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {status.type === 'success' ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 capitalize">{status.type === 'success' ? 'Processing Results' : 'System Alert'}</h3>
                <p className="text-gray-500 mb-6 font-medium text-sm leading-relaxed">{status.message}</p>

                {status.type === 'success' && status.details?.addedCount !== undefined && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                            <p className="text-[10px] uppercase font-bold text-green-600 tracking-wider mb-1">Successfully Added</p>
                            <p className="text-3xl font-black text-green-700">{status.details.addedCount}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border ${hasMismatches ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                            <p className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1">Mismatched Batches</p>
                            <p className={`text-3xl font-black ${hasMismatches ? 'text-amber-600' : 'text-gray-400'}`}>{status.details.mismatchedCount || 0}</p>
                        </div>
                    </div>
                )}

                {hasMismatches && (
                    <div className="bg-slate-50 rounded-2xl p-6 mb-6 text-left border border-slate-200 shadow-inner">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle size={14} className="text-amber-500"/> Ignored Records Detail
                            </p>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">Mismatch List</span>
                        </div>
                        
                        {/* WIDER HORIZONTAL GRID FOR ROLL NUMBERS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {status.details.mismatchedBatchRolls.map((item, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col gap-1 shadow-sm hover:border-amber-300 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-mono font-black text-gray-800 text-xs tracking-tighter">{item.rollno}</span>
                                        <Hash size={10} className="text-slate-300" />
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                        <div className="px-2 py-0.5 bg-red-50 text-red-500 rounded border border-red-100 font-bold">{item.batch}</div>
                                        <ArrowRight size={10} className="text-slate-400" />
                                        <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-bold">{item.expectedBatch}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4 italic text-center">
                            Only students belonging to <span className="font-bold text-gray-600">"{status.details.mismatchedBatchRolls[0]?.expectedBatch}"</span> were processed.
                        </p>
                    </div>
                )}

                <button 
                    onClick={onClose} 
                    className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg hover:shadow-xl ${status.type === 'success' ? 'bg-gray-900 hover:bg-black' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    {status.type === 'success' ? 'Acknowledged & Close' : 'Return to Manager'}
                </button>
            </div>
        </div>
    );
};

// --- MODIFY COLLECTION MODAL ---
const ModifyCollectionModal = ({ collection, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    const [courseList, setCourseList] = useState([]); 
    const [newCourseInput, setNewCourseInput] = useState("");
    const [status, setStatus] = useState({ type: null, message: null });

    const parts = collection.collectionName.split('-');
    const semName = parts[0]; 
    const batchName = parts.length > 3 ? parts[3] : 'Unknown';

    useEffect(() => {
        fetchSemConfig();
    }, []);

    const fetchSemConfig = async () => {
        setConfigLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/get-sem-config/${semName}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include' 
            });
            const response = await res.json();
            
            if (response.success && response.data && response.data.config) {
                const batchConfig = response.data.config.find(item => item.name === batchName);
                if (batchConfig && batchConfig.availableCourses) {
                    setCourseList(batchConfig.availableCourses);
                } else {
                    setCourseList([]); 
                }
            }
        } catch (error) {
            console.error("Config fetch error:", error);
            setStatus({ type: 'error', message: "Failed to fetch batch configuration." });
        } finally {
            setConfigLoading(false);
        }
    };

    const handleAddCourse = (e) => {
        e.preventDefault();
        const trimmed = newCourseInput.trim();
        if (trimmed && !courseList.includes(trimmed)) {
            setCourseList([...courseList, trimmed]);
            setNewCourseInput("");
        }
    };

    const handleRemoveCourse = (courseToRemove) => {
        setCourseList(courseList.filter(c => c !== courseToRemove));
    };

    const handleSave = async () => {
        if (courseList.length === 0) {
            setStatus({ type: 'error', message: "Batch must have at least one course." });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                semname: semName,
                batch: batchName,
                courses: courseList
            };

            const response = await fetch(`${API_URL}/api/admin/modify-collection`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: "include"
            });

            const result = await response.json();

            if (result.success) {
                setStatus({ type: 'success', message: result.msg || "Updated successfully." });
            } else {
                setStatus({ type: 'error', message: result.msg || "Update failed" });
            }
        } catch (error) {
            setStatus({ type: 'error', message: "Network Error" });
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessClose = () => {
        onSuccess(); 
        onClose();
    };

    if (status.type) {
        return <StatusModal status={status} onClose={status.type === 'success' ? handleSuccessClose : () => setStatus({ type: null, message: null })} />;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-white border-b border-gray-100 p-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Modify Collection</h3>
                        <p className="text-sm text-gray-500 font-mono mt-1">{collection.collectionName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow bg-slate-50">
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Batch Configuration</h4>
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">
                                {semName} • {batchName}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <BookOpen size={18} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Courses</p>
                                <p className="text-xl font-black text-gray-800">{courseList.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">Managed Courses</label>
                        <form onSubmit={handleAddCourse} className="flex gap-2">
                            <input 
                                type="text" 
                                value={newCourseInput}
                                onChange={(e) => setNewCourseInput(e.target.value)}
                                placeholder="Add custom course (e.g. AI/ML)"
                                className="flex-grow px-4 py-2.5 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-medium"
                            />
                            <button type="submit" disabled={!newCourseInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50">
                                <Plus size={20} />
                            </button>
                        </form>

                        {configLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-500" /></div>
                        ) : (
                            <div className="flex flex-wrap gap-2 min-h-[100px] content-start">
                                {courseList.length > 0 ? (
                                    courseList.map((course, idx) => (
                                        <div key={idx} className="group flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg shadow-sm font-semibold text-sm hover:border-indigo-300 transition-colors">
                                            <Hash size={12} className="text-gray-400" />
                                            {course}
                                            <button onClick={() => handleRemoveCourse(course)} className="ml-1 text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-md hover:bg-red-50">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 italic w-full text-center py-4">No courses configured for this batch.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={loading || configLoading || courseList.length === 0} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- UPLOAD MODAL WITH ENTER KEY SUPPORT ---
const CollectionManagerModal = ({ collection, onClose, onSuccess }) => {
    const { logout } = useAuth();
    const [courses, setCourses] = useState(DEFAULT_COURSES); 
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [customCourse, setCustomCourse] = useState("");
    const [file, setFile] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); 
    const [confirmInput, setConfirmInput] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: null, details: null }); 

    const displayBatchName = collection.collectionName.includes('_') 
        ? collection.collectionName.split('_').pop() 
        : collection.collectionName.slice(-3);

    const validationTarget = confirmAction === 'upload' ? 'confirm' : collection.collectionName;

    const handleAddCustomCourse = (e) => {
        e.preventDefault();
        const newVal = customCourse.trim();
        if (!newVal) return;
        if (!courses.includes(newVal)) setCourses(prev => [...prev, newVal]);
        if (!selectedCourses.includes(newVal)) setSelectedCourses(prev => [...prev, newVal]);
        setCustomCourse("");
    };

    const toggleCourse = (course) => {
        setSelectedCourses(prev => 
            prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
        );
    };

    const initiateAction = (actionType) => {
        if (actionType === 'upload') {
            if (!file || selectedCourses.length === 0) {
                setStatus({ type: 'error', message: "Please upload a CSV/Excel file and select at least one course." });
                return;
            }
        }
        setConfirmAction(actionType);
        setConfirmInput("");
    };

    const executeAction = async () => {
        if (confirmInput !== validationTarget) {
            setStatus({ type: 'error', message: `Please type "${validationTarget}" to confirm.` });
            return;
        }

        try {
            setIsUploading(true); 

            if (confirmAction === 'upload') {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('attendanceCollectionName', collection.collectionName);
                formData.append('courses', JSON.stringify(selectedCourses));
                
                const response = await fetch(`${API_URL}/api/admin/addstudents/upload`, {
                    method: 'POST',
                    body: formData,
                    credentials: "include"
                });
                
                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 400 && data.missingFields) {
                        setStatus({
                            type: 'error',
                            message: data.message || "Structure mismatch detected.",
                            details: data
                        });
                        setConfirmAction(null); 
                        return; 
                    }
                    throw new Error(data.message || "Upload failed");
                }

                setStatus({ 
                    type: 'success', 
                    message: data.message || "Enrollment batch processed successfully.",
                    details: data 
                });
            }
            setConfirmAction(null); 
        } catch (error) {
            console.error("Action Error:", error);
            setStatus({ type: 'error', message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    // ENTER KEY HANDLER
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && confirmInput === validationTarget && !isUploading) {
            executeAction();
        }
    };

    const handleSuccessClose = () => {
        onSuccess(); 
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative border border-gray-100">
                <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="text-blue-600" /> {collection.collectionName}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Enrollment Manager • CSV/XLSX Upload</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 bg-slate-50">
                    <div className="max-w-5xl mx-auto space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileSpreadsheet size={14}/> CSV Layout Requirement
                            </h4>
                            <div className="bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-blue-50 border-b border-blue-100 text-blue-700">
                                        <tr>
                                            <th className="px-4 py-2">S NO</th>
                                            <th className="px-4 py-2">Roll No</th>
                                            <th className="px-4 py-2">Name of the Student</th>
                                            <th className="px-4 py-2">Branch</th>
                                            <th className="px-4 py-2 bg-blue-100 text-blue-800">Batch</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-500">
                                        <tr>
                                            <td className="px-4 py-2">1</td>
                                            <td className="px-4 py-2 font-mono text-gray-700">21SU1A0501</td>
                                            <td className="px-4 py-2">Sample Student</td>
                                            <td className="px-4 py-2">CSE</td>
                                            <td className="px-4 py-2 font-bold bg-blue-50 text-blue-600">{displayBatchName}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><UploadCloud size={16} className="text-slate-400"/> Source File</h3>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/10 transition-all group cursor-pointer relative h-40 flex flex-col items-center justify-center">
                                    <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    <UploadCloud size={32} className={`mb-2 transition-colors ${file ? 'text-emerald-600' : 'text-gray-300 group-hover:text-emerald-500'}`} />
                                    {file ? <p className="font-bold text-emerald-600 text-sm truncate w-full px-2">{file.name}</p> : <><p className="text-sm text-gray-500 font-medium">Click to select</p><p className="text-xs text-gray-400 mt-1">.csv, .xlsx, .xls</p></>}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2"><BookOpen size={16} className="text-slate-400"/> Course Link</h3>
                                    <form onSubmit={handleAddCustomCourse} className="flex gap-1">
                                        <input value={customCourse} onChange={e => setCustomCourse(e.target.value)} placeholder="New..." className="w-20 px-2 py-1 text-xs border rounded-md outline-none focus:border-violet-500" />
                                        <button type="submit" className="bg-violet-600 text-white p-1 rounded-md hover:bg-violet-700"><Plus size={12}/></button>
                                    </form>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                                    {courses.map(course => {
                                        const isSelected = selectedCourses.includes(course);
                                        return (
                                            <button key={course} onClick={() => toggleCourse(course)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 ${isSelected ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'}`}>
                                                {isSelected && <Check size={10} />} {course}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <button onClick={() => initiateAction('upload')} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                            <UploadCloud size={18} /> Review & Execute Enrollment
                        </button>
                    </div>
                </div>

                {confirmAction && (
                    <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="w-full max-w-md bg-white border border-gray-100 shadow-2xl rounded-2xl p-8 relative animate-in slide-in-from-bottom-8 duration-300">
                            {!isUploading && <button onClick={() => setConfirmAction(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>}
                            <h3 className="text-xl font-bold text-gray-900 mb-2 capitalize">Action Verification</h3>
                            <p className="text-gray-500 text-sm mb-4">Confirm processing by typing: <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{validationTarget}</span></p>
                            <input 
                                type="text" 
                                value={confirmInput} 
                                onChange={(e) => setConfirmInput(e.target.value)} 
                                onKeyDown={handleKeyDown}
                                className="w-full px-4 py-4 border border-gray-300 rounded-xl mb-4 font-mono text-center text-lg focus:border-blue-500 outline-none shadow-inner" 
                                placeholder="..." 
                                autoFocus
                            />
                            <button onClick={executeAction} disabled={confirmInput !== validationTarget || isUploading} className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${confirmInput === validationTarget ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                                {isUploading ? <Loader2 className="animate-spin" size={20}/> : `Verify & Process`}
                            </button>
                            <p className="text-[10px] text-gray-400 mt-4 text-center">Press <span className="font-bold">Enter</span> to confirm</p>
                        </div>
                    </div>
                )}
                {status.type && <StatusModal status={status} onClose={status.type === 'success' ? handleSuccessClose : () => setStatus({ type: null, message: null, details: null })} />}
            </div>
        </div>
    );
};

// --- DELETE CONFIRMATION MODAL ---
const DeleteConfirmationModal = ({ collectionName, onClose, onSuccess }) => {
    const { logout } = useAuth();
    const [confirmInput, setConfirmInput] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [status, setStatus] = useState({ type: null, message: null });

    const handleDelete = async () => {
        if (confirmInput.toLowerCase() !== "delete") return;

        try {
            setIsDeleting(true);
            const res = await fetch(`${API_URL}/api/admin/deletecollections`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectionNames: [collectionName] }),
                credentials: "include"
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }

            const data = await res.json();
            
            if (res.ok) {
                setStatus({ type: 'success', message: `Collection deleted.` });
                setTimeout(() => {
                    onSuccess(); 
                }, 800);
            } else {
                setStatus({ type: 'error', message: data.message || "Delete failed" });
            }
        } catch (error) {
            setStatus({ type: 'error', message: "Network error occurred." });
        } finally {
            setIsDeleting(false);
        }
    };

    if (status.type) {
        return <StatusModal status={status} onClose={onClose} />;
    }

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-red-100">
                {!isDeleting && <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"><X size={20}/></button>}
                <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto"><Trash2 size={28} /></div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Collection</h3>
                <p className="text-gray-500 text-sm text-center mb-6">Permanently delete <strong>{collectionName}</strong>? <br/> Type <span className="font-bold text-red-600">"delete"</span> to confirm.</p>
                <input type="text" placeholder="Type delete..." value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} disabled={isDeleting} className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 text-center font-bold focus:border-red-500 outline-none focus:ring-2 focus:ring-red-100 transition-all disabled:bg-gray-50" />
                <button onClick={handleDelete} disabled={confirmInput.toLowerCase() !== "delete" || isDeleting} className={`w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${confirmInput.toLowerCase() === "delete" ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    {isDeleting ? <><Loader2 className="animate-spin" size={20}/> Deleting...</> : 'Confirm Delete'}
                </button>
            </div>
        </div>
    );
};


// --- MAIN PAGE ---
const SystemAdministrationPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [animate, setAnimate] = useState(false);
    const [isLoading, setIsLoading] = useState(false); 
    const [activeMainTab, setActiveMainTab] = useState('create');
    const [flatList, setFlatList] = useState([]);
    
    const [newSem, setNewSem] = useState("");
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [availableBatches, setAvailableBatches] = useState(generateDefaultBatches());
    const [customBatchInput, setCustomBatchInput] = useState("");
    const [isInitSubmitting, setIsInitSubmitting] = useState(false);
    
    const [modifySemName, setModifySemName] = useState(null);
    const [semConfigData, setSemConfigData] = useState(null);
    const [modifyLoading, setModifyLoading] = useState(false);
    const [modifyActionLoading, setModifyActionLoading] = useState(false);
    const [modifyOperation, setModifyOperation] = useState('add');
    const [renameInput, setRenameInput] = useState("");
    
    const [newBatchInput, setNewBatchInput] = useState("");
    const [selectedModifyBatches, setSelectedModifyBatches] = useState([]); 
    const [batchesToAdd, setBatchesToAdd] = useState([]);

    const [selectedCollection, setSelectedCollection] = useState(null); 
    const [selectedModifyCollection, setSelectedModifyCollection] = useState(null); 
    const [deleteTarget, setDeleteTarget] = useState(null); 
    const [globalStatus, setGlobalStatus] = useState({ type: null, message: null });

    const handleTabChange = (tab) => {
        setActiveMainTab(tab);
        if (tab !== 'modify') {
            setModifySemName(null);
            setSemConfigData(null);
        }
    };

    useEffect(() => { 
        if (!user) {
            navigate('/');
            return;
        }
        setTimeout(() => setAnimate(true), 100); 
        loadData();
    }, [user, navigate]);

    const loadData = async () => {
        setIsLoading(true); 
        try {
            const res = await fetch(`${API_URL}/api/admin/getcollections`, {
                method: "GET",
                credentials: "include"
            });
            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }
            const data = await res.json();
            let flat = [];
            Object.entries(data.groups || {}).forEach(([key, items]) => {
                items.forEach(item => flat.push({ ...item, category: key }));
            });
            setFlatList(flat);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); } 
    };

    const { groupedCollections, stats } = useMemo(() => {
        const grouped = {};
        SEMESTERS.forEach(sem => grouped[sem] = []);
        grouped["Others"] = [];

        flatList.forEach(item => {
            const matchedSem = SEMESTERS.find(sem => 
                item.collectionName === sem || 
                item.collectionName.startsWith(`${sem}_`) || 
                item.collectionName.startsWith(`${sem} `) ||
                item.collectionName.startsWith(`${sem}-`)
            );
            if (matchedSem) grouped[matchedSem].push(item);
            else grouped["Others"].push(item);
        });

        const newStats = {
            total: flatList.length,
            categories: Object.keys(grouped).filter(k => grouped[k].length > 0).length,
            documents: flatList.reduce((acc, curr) => acc + (curr.documents || 0), 0)
        };
        return { groupedCollections: grouped, stats: newStats };
    }, [flatList]);

    const handleDeleteSuccess = () => {
        setDeleteTarget(null);
        loadData(); 
    };

    const handleAddCustomBatch = (e) => {
        e.preventDefault();
        const newVal = customBatchInput.trim().toUpperCase();
        if (!newVal) return;
        if (!availableBatches.includes(newVal)) setAvailableBatches(prev => [...prev, newVal]);
        if (!selectedBatches.includes(newVal)) setSelectedBatches(prev => [...prev, newVal]);
        setCustomBatchInput("");
    };

    const toggleBatch = (batch) => {
        setSelectedBatches(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch]);
    };

    const handleInitSubmit = async () => {
        if (!newSem || selectedBatches.length === 0) return;
        setIsInitSubmitting(true);
        const payload = { semname: newSem, batches: selectedBatches };
        try {
            const res = await fetch(`${API_URL}/api/admin/create-sem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: "include"
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }

            const data = await res.json();
            if (res.ok) {
                setGlobalStatus({ type: 'success', message: data.message || "Semester Initialized Successfully" });
                handleTabChange('collections');
                loadData(); 
            } else {
                setGlobalStatus({ type: 'error', message: data.message || "Initialization failed" });
            }
        } catch (error) {
            setGlobalStatus({ type: 'error', message: "Network Error" });
        } finally {
            setIsInitSubmitting(false);
            setNewSem(""); setSelectedBatches([]); 
        }
    };
    
    const fetchSemConfig = async (sem) => {
        setModifyLoading(true);
        setModifySemName(sem);
        setSemConfigData(null);
        setSelectedModifyBatches([]);
        setBatchesToAdd([]);
        setRenameInput("");
        try {
            const res = await fetch(`${API_URL}/api/get-sem-info/${sem}`, {
                method: 'GET',
                credentials: "include"
            });
            const data = await res.json();
            if (data.success && data.data) {
                setSemConfigData(data.data);
            } else {
                setGlobalStatus({ type: 'error', message: "Failed to fetch configuration" });
                setModifySemName(null);
            }
        } catch (error) {
            console.error(error);
            setModifySemName(null);
        } finally {
            setModifyLoading(false);
        }
    };

    const handleModifyAddBatchToList = (e) => {
        e.preventDefault();
        const b = newBatchInput.trim().toUpperCase();
        if(b && !batchesToAdd.includes(b)) setBatchesToAdd(prev => [...prev, b]);
        setNewBatchInput("");
    };

    const toggleModifyBatchSelection = (batchName) => {
        setSelectedModifyBatches(prev => prev.includes(batchName) ? prev.filter(b => b !== batchName) : [...prev, batchName]);
    };

    const executeModify = async (operationType) => {
        setModifyActionLoading(true);
        const payload = {
            semname: modifySemName,
            newsemname: renameInput ? renameInput : modifySemName, 
            operation: operationType 
        };

        if (operationType !== 'rename') {
            if (operationType === 'add') payload.batches = batchesToAdd;
            else payload.batches = selectedModifyBatches;
            
            if (payload.batches.length === 0) {
                setGlobalStatus({ type: 'error', message: "Please select batches first" });
                setModifyActionLoading(false);
                return;
            }
        }

        try {
            const res = await fetch(`${API_URL}/api/admin/modify-sem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: "include"
            });
            const data = await res.json();

            if (res.ok) {
                setGlobalStatus({ type: 'success', message: "Operation successful" });
                if (operationType === 'rename' && renameInput) {
                   setModifySemName(renameInput);
                   fetchSemConfig(renameInput); 
                } else {
                   fetchSemConfig(modifySemName); 
                }
                loadData(); 
            } else {
                setGlobalStatus({ type: 'error', message: data.message || "Operation failed" });
            }
        } catch (error) {
            console.error(error);
            setGlobalStatus({ type: 'error', message: "Network error" });
        } finally {
            setModifyActionLoading(false);
        }
    };

    const handleCollectionClick = (col) => {
        if (col.collectionName.toLowerCase().includes('attendance')) setSelectedCollection(col);
    };

    const handleModifyCollectionClick = (e, col) => {
        e.stopPropagation(); 
        setSelectedModifyCollection(col);
    };

    const handleDeleteClick = (e, colName) => {
        e.stopPropagation(); 
        setDeleteTarget(colName);
    };

    if (!user) return null;

    return (
        <div className="min-h-screen font-sans bg-slate-50 pb-20">
            <div className="bg-slate-900 pb-32 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="px-6 pt-6 relative z-10 max-w-[95%] mx-auto">
                    <Header animate={animate} />
                    <div className="mt-10 mb-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className={`transition-all duration-1000 ${animate ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2">System <span className="text-blue-500">Administration</span></h1>
                                <p className="text-slate-400 text-lg">Manage academic sessions and database integrity.</p>
                            </div>
                            <div className={`bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 flex gap-1 transition-all duration-1000 ${animate ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                                <button onClick={() => handleTabChange('create')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeMainTab === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}><PlusCircle size={16} /> Create Sem</button>
                                <button onClick={() => handleTabChange('modify')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeMainTab === 'modify' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}><Settings size={16} /> Modify Sem</button>
                                <button onClick={() => handleTabChange('collections')} className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeMainTab === 'collections' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}><Database size={16} /> Collections</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-4 -mt-24 relative z-20 max-w-[95%] mx-auto">
                {activeMainTab === 'create' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
                            <div className="lg:col-span-8 p-8 lg:p-10 border-r border-gray-100">
                                <SectionHeader title="Create New Semester" subtitle="Configure and initialize the database for a new academic session." />
                                <div className="space-y-10">
                                    <div className="relative pl-8 border-l-2 border-blue-100">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-white"></div>
                                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Step 1: Select Semester</h4>
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                            {SEMESTERS.map(sem => (
                                                <button key={sem} onClick={() => setNewSem(sem)} className={`py-3 rounded-lg text-sm font-bold border transition-all ${newSem === sem ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50'}`}>{sem}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative pl-8 border-l-2 border-transparent">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-violet-600 ring-4 ring-white"></div>
                                        <div className="flex flex-wrap justify-between items-end mb-4 gap-4">
                                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Step 2: Link Batches</h4>
                                            <form onSubmit={handleAddCustomBatch} className="flex items-center gap-2">
                                                <input type="text" placeholder="Custom (e.g. SP1)" value={customBatchInput} onChange={(e) => setCustomBatchInput(e.target.value)} className="px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg outline-none focus:border-violet-500 w-36" />
                                                <button type="submit" className="p-1.5 bg-violet-600 text-white rounded-lg"><Plus size={14} /></button>
                                            </form>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-60 overflow-y-auto pr-2">
                                            {availableBatches.map(batch => {
                                                const isActive = selectedBatches.includes(batch);
                                                return (
                                                    <button key={batch} onClick={() => toggleBatch(batch)} className={`px-3 py-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 ${getBatchColorStyle(batch, isActive)}`}>
                                                        {isActive && <CheckCircle size={12} />} {batch}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="pt-8">
                                            <button onClick={handleInitSubmit} disabled={!newSem || selectedBatches.length === 0 || isInitSubmitting} className="w-full md:w-auto px-10 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                                {isInitSubmitting ? <Activity className="animate-spin" size={20} /> : <Terminal size={20} />} 
                                                {isInitSubmitting ? 'Initializing...' : 'Initialize Database'}
                                            </button>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-4 bg-gray-50 p-6 flex flex-col h-full border-l border-gray-200">
                                {newSem || selectedBatches.length > 0 ? (
                                    <div className="w-full h-full flex flex-col animate-in fade-in">
                                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><LayoutDashboard className="text-blue-600" size={18} /> Configuration Preview</h3>
                                        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm mb-4 relative overflow-hidden group">
                                           <div className="absolute top-0 right-0 p-2 opacity-10 text-blue-600 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform"><Archive size={60} /></div>
                                           <div className="text-xs text-blue-500 uppercase font-extrabold tracking-wide mb-1">Target Semester</div>
                                           <div className="text-3xl font-black text-gray-800">{newSem ? `Sem ${newSem}` : <span className="text-gray-300 text-xl">--</span>}</div>
                                        </div>
                                         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-grow flex flex-col">
                                           <div className="flex justify-between items-center mb-4">
                                                <div className="text-xs text-gray-500 uppercase font-extrabold tracking-wide">Linked Batches</div>
                                                <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{selectedBatches.length}</span>
                                           </div>
                                           <div className="flex-grow overflow-y-auto pr-1">
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedBatches.length > 0 ? selectedBatches.map(b => (
                                                        <span key={b} className={`px-3 py-1.5 rounded-lg text-sm font-bold border flex items-center gap-1 ${getBatchColorStyle(b, true)}`}><Grid size={12} className="opacity-50"/> {b}</span>
                                                    )) : <div className="text-center w-full py-10 text-gray-300 text-sm italic">No batches selected yet</div>}
                                                </div>
                                           </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                                            <div className="w-20 h-20 rounded-full bg-white border-2 border-dashed border-gray-200 flex items-center justify-center mb-4"><Layers size={32} className="opacity-30 text-gray-400"/></div>
                                            <p className="font-bold text-gray-500">No configuration selected</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeMainTab === 'modify' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-8">
                        {!modifySemName ? (
                            <div className="p-10 min-h-[500px] flex flex-col items-center justify-center">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2"><Settings className="text-indigo-600" /> Select Semester to Modify</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
                                    {SEMESTERS.map(sem => (
                                        <button key={sem} onClick={() => fetchSemConfig(sem)} disabled={modifyLoading} className="group py-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-2">
                                            <span className="text-2xl font-black text-gray-400 group-hover:text-indigo-600">{sem}</span>
                                            <span className="text-xs font-bold text-gray-400 group-hover:text-indigo-400 uppercase">Manage</span>
                                        </button>
                                    ))}
                                </div>
                                {modifyLoading && <div className="mt-8 flex items-center gap-2 text-indigo-600 font-bold"><Loader2 className="animate-spin"/> Fetching Configuration...</div>}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
                                <div className="lg:col-span-5 bg-gray-50 p-8 border-r border-gray-200">
                                    <button onClick={() => setModifySemName(null)} className="mb-6 text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1"><ArrowLeft size={12} /> Select Different Semester</button>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-6">
                                        <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Active Configuration</h3>
                                        <h2 className="text-3xl font-black text-gray-800 mb-4">Semester {modifySemName}</h2>
                                        {semConfigData ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                                    <span className="text-gray-500">Status</span>
                                                    <span className={`font-bold ${semConfigData.isActive ? 'text-green-600' : 'text-red-500'}`}>{semConfigData.isActive ? 'Active' : 'Inactive'}</span>
                                                </div>
                                                <div className="pt-2">
                                                    <span className="text-xs text-gray-500 uppercase font-bold block mb-2">Current Batches</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {semConfigData.batches && semConfigData.batches.length > 0 ? semConfigData.batches.map((batch, i) => (
                                                            <div key={i} className="px-3 py-1 bg-gray-100 rounded-md border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-2">{batch}</div>
                                                        )) : <span className="text-xs text-gray-400 italic">No batches found</span>}
                                                    </div>
                                                </div>
                                                <div className="pt-2">
                                                    <span className="text-xs text-gray-500 uppercase font-bold block mb-2">Current Courses</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {semConfigData.courses && semConfigData.courses.length > 0 ? semConfigData.courses.map((course, i) => (
                                                            <div key={i} className="px-3 py-1 bg-blue-50 rounded-md border border-blue-100 text-xs font-bold text-blue-600 flex items-center gap-2"><BookOpen size={10} /> {course}</div>
                                                        )) : <span className="text-xs text-gray-400 italic">No courses found</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : <Loader2 className="animate-spin text-gray-400" />}
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Edit3 size={16} /> Rename Semester</h3>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="New Name (e.g. VII)" value={renameInput} onChange={(e) => setRenameInput(e.target.value)} className="flex-grow px-4 py-2 border border-gray-300 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold"/>
                                            <button onClick={() => executeModify('rename')} disabled={modifyActionLoading} className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black disabled:opacity-50">Save</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-7 p-8">
                                    <SectionHeader title="Modify Batches" subtitle="Add, Remove, or Reset attendance for batches in this semester." />
                                    <div className="flex p-1 bg-gray-100 rounded-xl w-full max-w-md mb-8">
                                        {['add', 'remove', 'reset'].map(op => (
                                            <button key={op} onClick={() => { setModifyOperation(op); setSelectedModifyBatches([]); setBatchesToAdd([]); }} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${modifyOperation === op ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>{op} Batches</button>
                                        ))}
                                    </div>
                                    <div className="space-y-6">
                                        {modifyOperation === 'add' && (
                                            <div className="animate-in fade-in slide-in-from-right-4">
                                                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-6">
                                                    <h4 className="text-sm font-bold text-indigo-800 mb-4">Add New Batches</h4>
                                                    <form onSubmit={handleModifyAddBatchToList} className="flex gap-2 mb-4">
                                                        <input value={newBatchInput} onChange={(e) => setNewBatchInput(e.target.value)} placeholder="Batch Name (e.g. SN6)" className="flex-grow px-4 py-3 rounded-xl border-2 border-indigo-200 outline-none focus:border-indigo-500" />
                                                        <button type="submit" className="px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"><Plus/></button>
                                                    </form>
                                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                                        {batchesToAdd.map(b => (
                                                            <span key={b} className="px-3 py-1.5 bg-white text-indigo-600 font-bold rounded-lg border border-indigo-200 shadow-sm flex items-center gap-2">{b} <button onClick={() => setBatchesToAdd(prev => prev.filter(x => x!==b))}><X size={12}/></button></span>
                                                        ))}
                                                        {batchesToAdd.length === 0 && <span className="text-indigo-300 text-sm italic">No batches added yet</span>}
                                                    </div>
                                                </div>
                                                <button onClick={() => executeModify('add')} disabled={modifyActionLoading || batchesToAdd.length === 0} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">{modifyActionLoading ? <Loader2 className="animate-spin"/> : <Save size={18} />} Save Changes</button>
                                            </div>
                                        )}
                                        {modifyOperation === 'remove' && (
                                            <div className="animate-in fade-in slide-in-from-right-4">
                                                <div className="bg-red-50 p-6 rounded-xl border border-red-100 mb-6">
                                                    <h4 className="text-sm font-bold text-red-800 mb-4">Select Batches to Remove</h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {semConfigData?.batches.map((batch) => {
                                                            const isSel = selectedModifyBatches.includes(batch);
                                                            return (
                                                                <button key={batch} onClick={() => toggleModifyBatchSelection(batch)} className={`px-4 py-2 rounded-lg font-bold border-2 transition-all flex items-center gap-2 ${isSel ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-red-100 text-gray-500 hover:border-red-300'}`}>{isSel ? <Trash2 size={14}/> : <MinusCircle size={14}/>} {batch}</button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                                <button onClick={() => executeModify('remove')} disabled={modifyActionLoading || selectedModifyBatches.length === 0} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">{modifyActionLoading ? <Loader2 className="animate-spin"/> : <Trash2 size={18} />} Remove Selected</button>
                                            </div>
                                        )}
                                        {modifyOperation === 'reset' && (
                                            <div className="animate-in fade-in slide-in-from-right-4">
                                                <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 mb-6">
                                                    <h4 className="text-sm font-bold text-orange-800 mb-4">Select Batches to Reset Attendance</h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {semConfigData?.batches.map((batch) => {
                                                            const isSel = selectedModifyBatches.includes(batch);
                                                            return (
                                                                <button key={batch} onClick={() => toggleModifyBatchSelection(batch)} className={`px-4 py-2 rounded-lg font-bold border-2 transition-all flex items-center gap-2 ${isSel ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-orange-100 text-gray-500 hover:border-orange-300'}`}>{isSel ? <RefreshCw size={14}/> : <RefreshCw size={14} className="opacity-50"/>} {batch}</button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                                <button onClick={() => executeModify('reset')} disabled={modifyActionLoading || selectedModifyBatches.length === 0} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2">{modifyActionLoading ? <Loader2 className="animate-spin"/> : <RefreshCw size={18} />} Reset Attendance</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeMainTab === 'collections' && (
                    <div className="space-y-6 transition-all duration-500 animate-in fade-in slide-in-from-bottom-8">
                        {isLoading ? (
                        <div className="flex flex-col items-center mt-24 py-20">
                        <Loader2 className="animate-spin text-blue-600 mb-8" size={40} />
                        <p className="text-gray-500 font-medium">
                            Fetching database collections...
                        </p>
                        </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DbStatCard label="Total Collections" value={stats.total} icon={Database} color="blue" />
                                    <DbStatCard label="Categories" value={stats.categories} icon={LayoutDashboard} color="violet" />
                                    <DbStatCard label="Total Documents" value={stats.documents} icon={FileText} color="emerald" />
                                    <DbStatCard label="System Status" value="Online" icon={Activity} color="green" />
                                </div>
                                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'Others'].map(groupName => {
                                    const items = groupedCollections[groupName];
                                    if (!items || items.length === 0) return null;
                                    return (
                                        <div key={groupName} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8 mb-6">
                                            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-lg">{groupName === 'Others' ? '#' : groupName}</div>
                                                <h3 className="text-xl font-bold text-gray-800">{groupName === 'Others' ? 'Other Collections' : `Semester ${groupName} Data`}</h3>
                                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">{items.length}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {items.map((col, idx) => {
                                                    const themeKey = Object.keys(CATEGORY_THEMES).find(k => k === col.category) || 'others';
                                                    const theme = CATEGORY_THEMES[themeKey];
                                                    const isAttendance = col.collectionName.toLowerCase().includes('attendance');
                                                    return (
                                                        <div key={idx} onClick={() => handleCollectionClick(col)} className={`group relative rounded-xl p-5 border transition-all duration-300 ${theme.classes} ${isAttendance ? 'cursor-pointer hover:-translate-y-1' : 'cursor-not-allowed opacity-80'}`}>
                                                            {groupName !== 'Others' && (
                                                                <button onClick={(e) => handleDeleteClick(e, col.collectionName)} className="absolute top-4 right-4 p-2 bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-200 transition-colors shadow-sm" title="Delete Collection"><Trash2 size={16}/></button>
                                                            )}
                                                            <div className="flex justify-between items-start mb-4 pr-10">
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${theme.iconColor}`}><theme.icon size={20} /></div>
                                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide border ${theme.badge}`}>{theme.label}</span>
                                                            </div>
                                                            <div className="mb-4 h-12"><h3 className="text-base font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">{col.collectionName}</h3></div>
                                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100/50">
                                                                <span className="text-xs font-bold text-gray-500 flex items-center gap-1"><FileText size={12} /> {col.documents || 0} Records</span>
                                                                {isAttendance && (
                                                                    <div className="flex gap-2">
                                                                        <button onClick={(e) => handleModifyCollectionClick(e, col)} className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md transition-all"><Edit3 size={10} /> Modify</button>
                                                                        <span className="text-[10px] font-bold text-white bg-black hover:bg-gray-800 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md transition-all"><Upload size={10} /> Upload</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </main>

            {selectedCollection && <CollectionManagerModal collection={selectedCollection} onClose={() => setSelectedCollection(null)} onSuccess={loadData} />}
            {selectedModifyCollection && <ModifyCollectionModal collection={selectedModifyCollection} onClose={() => setSelectedModifyCollection(null)} onSuccess={() => { loadData(); }} />}
            {deleteTarget && <DeleteConfirmationModal collectionName={deleteTarget} onClose={() => setDeleteTarget(null)} onSuccess={handleDeleteSuccess} />}
            {globalStatus.type && <StatusModal status={globalStatus} onClose={() => setGlobalStatus({ type: null, message: null })} />}
        </div>
    );
};

export default SystemAdministrationPage;