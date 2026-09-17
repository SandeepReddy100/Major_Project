import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Megaphone, Search, Calendar, 
    AlertCircle, FileText, CheckCircle, 
    Clock, Layers, ArrowLeft, Loader2, 
    ExternalLink, CalendarClock, Target, Plus, X, Globe,
    FileSpreadsheet, Share2, Bookmark, Link as LinkIcon, BarChart3,
    ShieldAlert, Trash2, Edit3, Send, Eye, Link, AlertTriangle
} from 'lucide-react';
import Header from '../../components/Header'; 
import { useAuth } from '../../context/AuthContext'; 
import Loader from '../../components/Loader'; 

const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

const CATEGORIES = [
    { id: 'GENERAL', label: 'General', icon: Megaphone },
    { id: 'FORMS', label: 'Forms', icon: FileText },
    { id: 'ASSESSMENTS', label: 'Assessments', icon: Bookmark },
    { id: 'EVENTS', label: 'Events', icon: Calendar },
    { id: 'REGISTRATIONS', label: 'Registrations', icon: Share2 }
];

const PRIORITIES = [
    { 
        value: 1, 
        label: 'Low', 
        base: 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50', 
        active: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 ring-2 ring-emerald-100',
        icon: CheckCircle
    },
    { 
        value: 2, 
        label: 'Medium', 
        base: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50', 
        active: 'bg-amber-500 text-white border-amber-500 shadow-amber-200 ring-2 ring-amber-100',
        icon: BarChart3
    },
    { 
        value: 3, 
        label: 'High', 
        base: 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50', 
        active: 'bg-rose-600 text-white border-rose-600 shadow-rose-200 ring-2 ring-rose-100',
        icon: AlertCircle
    }
];

const SEMESTER_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// --- THEME HELPER ---
const getCategoryTheme = (category) => {
    switch (category) {
        case 'GENERAL': return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', accent: 'bg-gray-400' };
        case 'FORMS': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-500' };
        case 'ASSESSMENTS': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', accent: 'bg-rose-500' };
        case 'EVENTS': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', accent: 'bg-amber-500' };
        case 'REGISTRATIONS': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-500' };
        default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', accent: 'bg-slate-400' };
    }
};

const getPriorityBadge = (priority) => {
    if (priority === 3) return <span className="flex items-center gap-1.5 text-[10px] font-extrabold bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-100 uppercase tracking-widest"><AlertCircle size={12} /> High</span>;
    if (priority === 2) return <span className="flex items-center gap-1.5 text-[10px] font-extrabold bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-widest"><BarChart3 size={12} /> Med</span>;
    return <span className="flex items-center gap-1.5 text-[10px] font-extrabold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest"><CheckCircle size={12} /> Low</span>;
};

const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7); 
    date.setHours(23, 59, 0, 0); 
    const offset = date.getTimezoneOffset() * 60000; 
    return (new Date(date - offset)).toISOString().slice(0, 16);
};

// --- MODAL: STATUS ---
const StatusModal = ({ status, onClose }) => {
    if (!status) return null;
    const isSuccess = status.type === 'success';

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-white/20">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isSuccess ? <CheckCircle size={32} strokeWidth={2.5}/> : <AlertCircle size={32} strokeWidth={2.5}/>}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{isSuccess ? 'Success' : 'Attention'}</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">{status.message}</p>
                <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold text-white transition-all transform active:scale-95 shadow-lg ${isSuccess ? 'bg-slate-900 hover:bg-black' : 'bg-rose-600 hover:bg-rose-700'}`}>
                    {isSuccess ? 'Continue' : 'Close'}
                </button>
            </div>
        </div>
    );
};

// --- MODAL: DELETE CONFIRMATION ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-white/20">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-6">
                    <Trash2 size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Post?</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    This action cannot be undone. The announcement will be permanently removed for all students.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- ANNOUNCEMENT CARD ---
const AnnouncementCard = ({ item, theme, index, onDeleteClick, onEditClick, isPreview = false }) => {
    return (
        <div 
            className={`bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full relative overflow-hidden group ${isPreview ? 'pointer-events-none' : ''}`}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${theme.accent}`}></div>
            
            <div className="p-8 flex flex-col flex-grow pl-10">
                {/* 1. Header: Category & Priority */}
                <div className="flex justify-between items-start mb-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border ${theme.bg} ${theme.text} ${theme.border}`}>
                        {item.category}
                    </span>
                    
                    {!isPreview && (
                        <div className="flex items-center gap-2 pointer-events-auto">
                            {getPriorityBadge(item.priority)}
                            
                            {/* MODIFY BUTTON */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEditClick(item); }} 
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors ml-2"
                                title="Edit Post"
                            >
                                <Edit3 size={12} strokeWidth={3} /> MODIFY
                            </button>

                            {/* DELETE BUTTON */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteClick(item._id); }} 
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                    {isPreview && (
                         <div className="flex items-center gap-2">
                             {getPriorityBadge(item.priority)}
                             <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase">Preview Mode</span>
                         </div>
                    )}
                </div>

                {/* 2. Content */}
                <div className="mb-8 flex-grow">
                    <h3 className="text-xl font-black text-gray-900 mb-3 leading-snug group-hover:text-slate-700 transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {item.description}
                    </p>
                </div>

                {/* 3. Structured Metadata Grid */}
                <div className="mt-auto bg-gray-50/50 rounded-2xl p-5 border border-gray-100 grid grid-cols-2 gap-y-4 gap-x-6 mb-6">
                    {/* Target Audience */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <Target size={12} /> Audience
                        </div>
                        <div className="text-xs font-bold text-gray-700 truncate" title={item.isGlobal ? "Global" : "Specific"}>
                            {item.isGlobal 
                                ? <span className="flex items-center gap-1.5 text-slate-900"><Globe size={12}/> Global</span> 
                                : <span className="flex items-center gap-1.5"><Layers size={12}/> {item.targetSemesters?.[0] || 'N/A'} • {item.targetBatches?.join(', ') || 'All'}</span>
                            }
                        </div>
                    </div>

                    {/* Deadline */}
                    <div className="flex flex-col gap-1 border-l border-gray-200 pl-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            <CalendarClock size={12} /> Due Date
                        </div>
                        <div className={`text-xs font-bold ${item.deadline ? 'text-gray-700' : 'text-gray-300'}`}>
                            {item.deadline ? new Date(item.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Deadline'}
                        </div>
                    </div>
                </div>

                {/* 4. Footer: Author & Link */}
                <div className="pt-4 flex justify-between items-center border-t border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${theme.bg} ${theme.text}`}>
                            {item.postedby ? item.postedby.charAt(0) : 'A'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">{item.postedby || 'Admin'}</span>
                            <span className="text-[10px] font-medium text-gray-400">{timeAgo(item.createdAt)}</span>
                        </div>
                    </div>
                    {/* Updated Link Display Logic */}
                    <div className="flex gap-2">
                        {item.linkUrl && (
                            <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-xl transition-all bg-slate-100 text-slate-600 hover:bg-slate-200`}>
                                Link <LinkIcon size={12} />
                            </a>
                        )}
                        {item.googleSheetUrl && (
                            <a href={item.googleSheetUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-xl transition-all ${theme.bg} ${theme.text} hover:opacity-80`}>
                                Form <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODAL: ANNOUNCEMENT FORM ---
const AnnouncementFormModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
    const [loading, setLoading] = useState(false);
    const [fetchingBatches, setFetchingBatches] = useState(false);
    const [viewMode, setViewMode] = useState('form');

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('GENERAL');
    const [deadline, setDeadline] = useState(getDefaultDeadline());
    const [priority, setPriority] = useState(1); 
    
    // Links & Config
    const [linkUrl, setLinkUrl] = useState(''); 
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');     
    const [isMandatory, setIsMandatory] = useState(false);

    // Targeting State
    const [isGlobal, setIsGlobal] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState('');
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [batchFetchError, setBatchFetchError] = useState(null);

    // Initialize or Reset
    useEffect(() => {
        if (isOpen) {
            setViewMode('form');
            if (initialData) {
                // --- EDIT MODE ---
                setTitle(initialData.title || '');
                setDescription(initialData.description || '');
                setCategory(initialData.category || 'GENERAL');
                setDeadline(initialData.deadline ? new Date(initialData.deadline).toISOString().slice(0, 16) : getDefaultDeadline());
                setPriority(initialData.priority || 1);
                
                // Set URLs correctly based on backend response keys
                setLinkUrl(initialData.linkUrl || '');
                setGoogleSheetUrl(initialData.googleSheetUrl || '');
                
                setIsMandatory(initialData.isMandatory || false);
                setIsGlobal(initialData.isGlobal);
                
                if (!initialData.isGlobal) {
                    const sem = initialData.targetSemesters?.[0] || '';
                    setSelectedSemester(sem);
                    setSelectedBatches(initialData.targetBatches || []);
                    if(sem) handleSemesterChange(sem, false); 
                } else {
                    setSelectedSemester('');
                    setAvailableBatches([]);
                    setSelectedBatches([]);
                }
            } else {
                // --- CREATE MODE ---
                setTitle(''); setDescription(''); setCategory('GENERAL');
                setDeadline(getDefaultDeadline()); setPriority(1);
                setLinkUrl(''); setGoogleSheetUrl(''); setIsMandatory(false);
                setIsGlobal(true); setSelectedSemester(''); setAvailableBatches([]); setSelectedBatches([]);
            }
        }
    }, [isOpen, initialData]);

    const handleSemesterChange = async (sem, clearSelected = true) => {
        setSelectedSemester(sem);
        if(clearSelected) {
            setSelectedBatches([]); 
            setAvailableBatches([]); 
        }
        
        if (!sem) return;

        setFetchingBatches(true);
        try {
            const res = await fetch(`${API_URL}/api/get-sem-info/${sem}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.data && Array.isArray(data.data.batches)) {
                setAvailableBatches(data.data.batches);
            } else {
                setBatchFetchError("Failed to load batches.");
            }
        } catch (error) {
            setBatchFetchError("Network error.");
        } finally {
            setFetchingBatches(false);
        }
    };

    const toggleBatch = (batch) => {
        setSelectedBatches(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch]);
    };

    const constructPayload = () => {
        return {
            id: initialData?._id, // Required for Modify endpoint
            title, description, category, priority, isGlobal, isMandatory,
            deadline: deadline ? new Date(deadline).toISOString() : null,
            linkUrl: linkUrl,
            googleSheetUrl: googleSheetUrl,
            targetSemesters: isGlobal ? [] : [selectedSemester],
            targetBatches: isGlobal ? [] : selectedBatches,
            postedby: 'Admin', // Preview placeholder
            createdAt: new Date().toISOString(), // Preview placeholder
            filledStudents: [] 
        };
    };

    const handlePreview = (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;
        if (!isGlobal && (!selectedSemester || selectedBatches.length === 0)) {
            alert("Select at least one batch."); return;
        }
        setViewMode('preview');
    };

    const handleFinalSubmit = async () => {
        setLoading(true);
        const payload = constructPayload();
        
        // Remove preview-only fields before sending
        delete payload.postedby;
        delete payload.createdAt;
        delete payload.filledStudents;

        // Determine Endpoint and Method
        const endpoint = initialData 
            ? `${API_URL}/api/modify-announcements` 
            : `${API_URL}/api/post-announcements`;
        
        const method = initialData ? 'PATCH' : 'POST';

        
        try {
            const res = await fetch(endpoint, {
                method: method, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload), 
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok) {
                onSuccess({ type: 'success', message: initialData ? 'Updated successfully!' : 'Posted successfully!' });
                onClose();
            } else throw new Error(data.message || "Failed to process request");
        } catch (error) {
            onSuccess({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300">
                <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {viewMode === 'preview' ? 'Preview Announcement' : (initialData ? 'Edit Announcement' : 'New Announcement')}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">
                            {viewMode === 'preview' ? 'Review how it looks before publishing.' : (initialData ? 'Modify existing update.' : 'Draft a new update for the portal.')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                </div>
                
                <div className="flex-grow overflow-y-auto px-8 py-8 bg-gray-50/50">
                    {viewMode === 'form' ? (
                        <form id="create-form" onSubmit={handlePreview} className="h-full">
                            
                            {/* --- TOP: CONFIGURATION --- */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* Category */}
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Category</label>
                                        <div className="flex flex-wrap gap-2">
                                            {CATEGORIES.map((cat) => (
                                                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${category === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-slate-50 text-gray-500 border-slate-200 hover:border-slate-300'}`}>
                                                    <cat.icon size={14} /> {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Config Grid */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                        {/* Colored Priority Buttons */}
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Priority</label>
                                            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
                                                {PRIORITIES.map((p) => {
                                                    const isSelected = priority === p.value;
                                                    return (
                                                        <button 
                                                            key={p.value} 
                                                            type="button" 
                                                            onClick={() => setPriority(p.value)} 
                                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${isSelected ? p.active : p.base}`}
                                                        >
                                                            {isSelected && <p.icon size={12} strokeWidth={3} />}
                                                            {p.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Deadline</label>
                                            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-400" />
                                        </div>

                                        <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert size={16} className="text-red-500"/>
                                                <span className="text-xs font-bold text-slate-700">Mandatory Submission</span>
                                            </div>
                                            <button type="button" onClick={() => setIsMandatory(!isMandatory)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isMandatory ? 'bg-red-500' : 'bg-slate-300'}`}>
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isMandatory ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- MIDDLE: CONTENT --- */}
                            <div className="space-y-6 mb-8">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700">Title</label>
                                    <input required value={title} onChange={(e) => setTitle(e.target.value)} 
                                        className="w-full px-5 py-4 text-lg font-bold bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all placeholder:text-gray-300" placeholder="e.g. Hackathon Registration" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                                    <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={6} 
                                        className="w-full px-5 py-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all resize-none placeholder:text-gray-300 leading-relaxed" placeholder="Type your message here..." />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">Link URL (Optional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Link size={16} className="text-blue-500" /></div>
                                            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder="https://..." />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">Google Sheet/Form URL (Optional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><FileSpreadsheet size={16} className="text-emerald-500" /></div>
                                            <input value={googleSheetUrl} onChange={(e) => setGoogleSheetUrl(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300" placeholder="https://..." />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- BOTTOM: TARGET AUDIENCE --- */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col shadow-sm">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Target size={18} className="text-blue-600"/> Target Audience
                                    </label>
                                    
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button type="button" onClick={() => setIsGlobal(true)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isGlobal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Global</button>
                                        <button type="button" onClick={() => setIsGlobal(false)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!isGlobal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Specific</button>
                                    </div>
                                </div>

                                <div className="flex-grow">
                                    {isGlobal ? (
                                        <div className="h-full flex items-center justify-center text-center text-gray-400 py-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 gap-4">
                                            <Globe size={32} className="text-blue-200" />
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-600">Global Announcement</p>
                                                <p className="text-xs">Visible to everyone on campus.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Select Semester</label>
                                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                                    {/* CORRECTED: Uses SEMESTER_OPTIONS instead of SEMESTERS */}
                                                    {SEMESTER_OPTIONS.map((sem) => (
                                                        <button key={sem} type="button" onClick={() => handleSemesterChange(sem)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${selectedSemester === sem ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                                                            {sem}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {selectedSemester && (
                                                <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold text-slate-400 uppercase">Select Batches</label>
                                                        {fetchingBatches && <span className="text-[10px] text-blue-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Syncing...</span>}
                                                    </div>
                                                    
                                                    {fetchingBatches ? (
                                                        <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                            <Loader2 size={24} className="animate-spin text-blue-400 mb-2" />
                                                            <p className="text-xs text-slate-400">Loading Batches...</p>
                                                        </div>
                                                    ) : batchFetchError ? (
                                                        <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-lg border border-red-100 text-center flex flex-col items-center gap-1">
                                                            <AlertTriangle size={16} /> {batchFetchError}
                                                        </div>
                                                    ) : availableBatches.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-1">
                                                            {availableBatches.map((batch) => {
                                                                const isSelected = selectedBatches.includes(batch);
                                                                return (
                                                                    <button key={batch} type="button" onClick={() => toggleBatch(batch)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${isSelected ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                                                        {isSelected ? <CheckCircle size={12} className="text-white" /> : <div className="w-3 h-3 rounded-full border border-slate-300"></div>}
                                                                        {batch}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 bg-slate-50 text-slate-400 text-xs text-center rounded-xl italic border border-slate-100">
                                                            No batches found for Sem {selectedSemester}.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    ) : (
                        // --- PREVIEW MODE ---
                        <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95">
                            <div className="w-full max-w-lg pointer-events-none">
                                <AnnouncementCard 
                                    item={constructPayload()} 
                                    theme={getCategoryTheme(category)} 
                                    index={0} 
                                    isPreview={true} 
                                />
                            </div>
                            <div className="mt-8 text-center">
                                <p className="text-sm text-gray-500 font-medium mb-2">This is how your post will appear to students.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-end gap-4 flex-shrink-0">
                    {viewMode === 'form' ? (
                        <>
                            <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                            <button type="submit" form="create-form" className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 text-sm tracking-wide flex items-center gap-2">
                                <Eye size={16} /> Preview
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setViewMode('form')} className="px-8 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2">
                                <ArrowLeft size={16} /> Back to Edit
                            </button>
                            <button onClick={handleFinalSubmit} disabled={loading} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black disabled:opacity-50 transition-all active:scale-95 text-sm tracking-wide flex items-center gap-2">
                                {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} 
                                {initialData ? 'Confirm & Update' : 'Confirm & Publish'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---
const AdminAnnouncementPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState([]);
    const [activeCategory, setActiveCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [animate, setAnimate] = useState(false);
    
    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editData, setEditData] = useState(null); // Data for editing
    const [statusModal, setStatusModal] = useState(null); 
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    useEffect(() => {
        if (!user) { navigate('/'); return; }
        fetchAnnouncements();
        setTimeout(() => setAnimate(true), 100);
    }, [user, navigate]);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/get-all-announcemnets`, { method: 'GET', credentials: 'include' });
            if (response.status === 401 || response.status === 403) { logout(); return; }
            const data = await response.json();
            processData(data);
        } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
    };

    const confirmDelete = (id) => {
        setDeleteTargetId(id);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if(!deleteTargetId) return;
        setDeleteModalOpen(false);
        try {
            const response = await fetch(`${API_URL}/api/delete-announcements/${deleteTargetId}`, {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include'
            });
            if (response.ok) {
                setAnnouncements(prev => prev.filter(a => a._id !== deleteTargetId));
                setStatusModal({ type: 'success', message: 'Announcement deleted successfully.' });
            } else {
                setStatusModal({ type: 'error', message: 'Failed to delete announcement.' });
            }
        } catch (error) {
            setStatusModal({ type: 'error', message: 'Network error occurred.' });
        }
    };

    const openCreateModal = () => {
        setEditData(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditData(item);
        setIsFormModalOpen(true);
    };

    const processData = (data) => {
        const uniqueMap = new Map();
        if (data.global) data.global.forEach(item => uniqueMap.set(item._id, item));
        if (data.yourPosts) data.yourPosts.forEach(item => uniqueMap.set(item._id, item));
        if (data.semesters) {
            Object.values(data.semesters).forEach(batches => {
                Object.values(batches).forEach(batchList => {
                    batchList.forEach(item => uniqueMap.set(item._id, item));
                });
            });
        }
        const sortedList = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAnnouncements(sortedList);
    };

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [announcements, activeCategory, searchQuery]);

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen font-sans bg-gray-50 pb-20">
            
            <AnnouncementFormModal 
                isOpen={isFormModalOpen} 
                onClose={() => setIsFormModalOpen(false)} 
                onSuccess={(status) => { setStatusModal(status); if(status.type==='success') fetchAnnouncements(); }}
                initialData={editData}
            />
            
            <StatusModal status={statusModal} onClose={() => setStatusModal(null)} />
            <DeleteConfirmationModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} />

            {/* Header */}
            <div className="bg-slate-900 pb-32 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="px-6 pt-6 relative z-10 max-w-7xl mx-auto">
                    <Header animate={animate} />
                    <div className="mt-10 mb-8">
                        <button onClick={() => navigate(-1)} className="group flex items-center text-slate-400 hover:text-white transition-colors mb-6 text-sm font-medium"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard</button>
                        <div className={`flex flex-col md:flex-row justify-between items-end gap-6 transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <div>
                                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">Announcement <span className="text-blue-400">Hub</span></h1>
                                <p className="text-slate-400 text-lg max-w-lg">Manage announcements and keep the campus connected.</p>
                            </div>
                            <div className="relative w-full md:w-auto flex gap-3">
                                <div className="relative flex-grow md:w-80">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                                    <input type="text" className="block w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md shadow-lg transition-all" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                <button onClick={openCreateModal} className="bg-white text-slate-900 px-6 py-3.5 rounded-2xl font-bold shadow-lg hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"><Plus size={20} strokeWidth={3} /> Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="px-4 -mt-20 relative z-20 max-w-7xl mx-auto">
                <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-gray-100 mb-10 flex overflow-x-auto gap-2 scrollbar-hide">
                    <button onClick={() => setActiveCategory('ALL')} className={`px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${activeCategory === 'ALL' ? 'bg-slate-900 text-white shadow-md transform scale-105' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}>ALL UPDATES</button>
                    {CATEGORIES.map((cat) => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${activeCategory === cat.id ? 'bg-slate-900 text-white shadow-md transform scale-105' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}>{cat.label.toUpperCase()}</button>
                    ))}
                </div>

                <>
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h2 className="text-gray-800 font-bold text-xl flex items-center gap-3">
                            {activeCategory === 'ALL' ? 'Latest Announcements' : activeCategory}
                            <span className="bg-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full font-bold">{filteredAnnouncements.length}</span>
                        </h2>
                    </div>

                    {filteredAnnouncements.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                            {filteredAnnouncements.map((item, idx) => (
                                <AnnouncementCard 
                                    key={item._id} 
                                    item={item} 
                                    theme={getCategoryTheme(item.category)} 
                                    index={idx} 
                                    onDeleteClick={confirmDelete}
                                    onEditClick={openEditModal}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6"><Megaphone className="text-gray-300" size={40} /></div>
                            <h3 className="text-2xl font-bold text-gray-800">No Announcements Found</h3>
                            <p className="text-gray-500 text-base mt-2 max-w-sm text-center leading-relaxed">There are no active posts in this category right now.</p>
                        </div>
                    )}
                </>
            </main>
        </div>
    );
};

export default AdminAnnouncementPage;


// import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { 
//     Megaphone, Search, Calendar, 
//     AlertCircle, FileText, CheckCircle, 
//     Clock, Layers, ArrowLeft, Loader2, 
//     ExternalLink, CalendarClock, Target, Plus, X, Globe,
//     FileSpreadsheet, Share2, Bookmark, Link as LinkIcon, BarChart3,
//     ShieldAlert, Trash2, Edit3, Send, Eye, Link, AlertTriangle
// } from 'lucide-react';
// import Header from '../../components/Header'; 
// import { useAuth } from '../../context/AuthContext'; 
// import Loader from '../../components/Loader'; 
// import CryptoJS from 'crypto-js'; // Import CryptoJS

// const API_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
// const EncDec_SECRET_KEY = import.meta.env.VITE_ENC_SECRET_KEY; // Get Secret Key

// const CATEGORIES = [
//     { id: 'GENERAL', label: 'General', icon: Megaphone },
//     { id: 'FORMS', label: 'Forms', icon: FileText },
//     { id: 'ASSESSMENTS', label: 'Assessments', icon: Bookmark },
//     { id: 'EVENTS', label: 'Events', icon: Calendar },
//     { id: 'REGISTRATIONS', label: 'Registrations', icon: Share2 }
// ];

// const PRIORITIES = [
//     { 
//         value: 1, 
//         label: 'Low', 
//         base: 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50', 
//         active: 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 ring-2 ring-emerald-100',
//         icon: CheckCircle
//     },
//     { 
//         value: 2, 
//         label: 'Medium', 
//         base: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50', 
//         active: 'bg-amber-500 text-white border-amber-500 shadow-amber-200 ring-2 ring-amber-100',
//         icon: BarChart3
//     },
//     { 
//         value: 3, 
//         label: 'High', 
//         base: 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50', 
//         active: 'bg-rose-600 text-white border-rose-600 shadow-rose-200 ring-2 ring-rose-100',
//         icon: AlertCircle
//     }
// ];

// const SEMESTER_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

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

// // --- THEME HELPER ---
// const getCategoryTheme = (category) => {
//     switch (category) {
//         case 'GENERAL': return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', accent: 'bg-gray-400' };
//         case 'FORMS': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-500' };
//         case 'ASSESSMENTS': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', accent: 'bg-rose-500' };
//         case 'EVENTS': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', accent: 'bg-amber-500' };
//         case 'REGISTRATIONS': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-500' };
//         default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', accent: 'bg-slate-400' };
//     }
// };

// const getPriorityBadge = (priority) => {
//     if (priority === 3) return <span className="flex items-center gap-1.5 text-[10px] font-extrabold bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-100 uppercase tracking-widest"><AlertCircle size={12} /> High</span>;
//     if (priority === 2) return <span className="flex items-center gap-1.5 text-[10px] font-extrabold bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-widest"><BarChart3 size={12} /> Med</span>;
//     return <span className="flex items-center gap-1.5 text-[10px] font-extrabold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest"><CheckCircle size={12} /> Low</span>;
// };

// const timeAgo = (dateString) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const seconds = Math.floor((now - date) / 1000);
//     if (seconds < 60) return "Just now";
//     const minutes = Math.floor(seconds / 60);
//     if (minutes < 60) return `${minutes}m ago`;
//     const hours = Math.floor(minutes / 60);
//     if (hours < 24) return `${hours}h ago`;
//     return `${Math.floor(hours / 24)}d ago`;
// };

// const getDefaultDeadline = () => {
//     const date = new Date();
//     date.setDate(date.getDate() + 7); 
//     date.setHours(23, 59, 0, 0); 
//     const offset = date.getTimezoneOffset() * 60000; 
//     return (new Date(date - offset)).toISOString().slice(0, 16);
// };

// // --- MODAL: STATUS ---
// const StatusModal = ({ status, onClose }) => {
//     if (!status) return null;
//     const isSuccess = status.type === 'success';

//     return (
//         <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
//             <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-white/20">
//                 <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ${isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
//                     {isSuccess ? <CheckCircle size={32} strokeWidth={2.5}/> : <AlertCircle size={32} strokeWidth={2.5}/>}
//                 </div>
//                 <h3 className="text-2xl font-bold text-gray-900 mb-2">{isSuccess ? 'Success' : 'Attention'}</h3>
//                 <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">{status.message}</p>
//                 <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold text-white transition-all transform active:scale-95 shadow-lg ${isSuccess ? 'bg-slate-900 hover:bg-black' : 'bg-rose-600 hover:bg-rose-700'}`}>
//                     {isSuccess ? 'Continue' : 'Close'}
//                 </button>
//             </div>
//         </div>
//     );
// };

// // --- MODAL: DELETE CONFIRMATION ---
// const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
//     if (!isOpen) return null;
//     return (
//         <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
//             <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-white/20">
//                 <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-6">
//                     <Trash2 size={32} strokeWidth={2.5} />
//                 </div>
//                 <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete Post?</h3>
//                 <p className="text-gray-500 text-sm mb-8 leading-relaxed">
//                     This action cannot be undone. The announcement will be permanently removed for all students.
//                 </p>
//                 <div className="flex gap-3">
//                     <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
//                         Cancel
//                     </button>
//                     <button onClick={onConfirm} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all">
//                         Delete
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- ANNOUNCEMENT CARD ---
// const AnnouncementCard = ({ item, theme, index, onDeleteClick, onEditClick, isPreview = false }) => {
//     return (
//         <div 
//             className={`bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col h-full relative overflow-hidden group ${isPreview ? 'pointer-events-none' : ''}`}
//             style={{ animationDelay: `${index * 50}ms` }}
//         >
//             <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${theme.accent}`}></div>
            
//             <div className="p-8 flex flex-col flex-grow pl-10">
//                 {/* 1. Header: Category & Priority */}
//                 <div className="flex justify-between items-start mb-6">
//                     <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest border ${theme.bg} ${theme.text} ${theme.border}`}>
//                         {item.category}
//                     </span>
                    
//                     {!isPreview && (
//                         <div className="flex items-center gap-2 pointer-events-auto">
//                             {getPriorityBadge(item.priority)}
                            
//                             {/* MODIFY BUTTON */}
//                             <button 
//                                 onClick={(e) => { e.stopPropagation(); onEditClick(item); }} 
//                                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors ml-2"
//                                 title="Edit Post"
//                             >
//                                 <Edit3 size={12} strokeWidth={3} /> MODIFY
//                             </button>

//                             {/* DELETE BUTTON */}
//                             <button 
//                                 onClick={(e) => { e.stopPropagation(); onDeleteClick(item._id); }} 
//                                 className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
//                                 title="Delete"
//                             >
//                                 <Trash2 size={16} strokeWidth={2.5} />
//                             </button>
//                         </div>
//                     )}
//                     {isPreview && (
//                          <div className="flex items-center gap-2">
//                              {getPriorityBadge(item.priority)}
//                              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase">Preview Mode</span>
//                          </div>
//                     )}
//                 </div>

//                 {/* 2. Content */}
//                 <div className="mb-8 flex-grow">
//                     <h3 className="text-xl font-black text-gray-900 mb-3 leading-snug group-hover:text-slate-700 transition-colors">
//                         {item.title}
//                     </h3>
//                     <p className="text-sm font-medium text-gray-500 leading-relaxed line-clamp-4 whitespace-pre-wrap">
//                         {item.description}
//                     </p>
//                 </div>

//                 {/* 3. Structured Metadata Grid */}
//                 <div className="mt-auto bg-gray-50/50 rounded-2xl p-5 border border-gray-100 grid grid-cols-2 gap-y-4 gap-x-6 mb-6">
//                     {/* Target Audience */}
//                     <div className="flex flex-col gap-1">
//                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
//                             <Target size={12} /> Audience
//                         </div>
//                         <div className="text-xs font-bold text-gray-700 truncate" title={item.isGlobal ? "Global" : "Specific"}>
//                             {item.isGlobal 
//                                 ? <span className="flex items-center gap-1.5 text-slate-900"><Globe size={12}/> Global</span> 
//                                 : <span className="flex items-center gap-1.5"><Layers size={12}/> {item.targetSemesters?.[0] || 'N/A'} • {item.targetBatches?.join(', ') || 'All'}</span>
//                             }
//                         </div>
//                     </div>

//                     {/* Deadline */}
//                     <div className="flex flex-col gap-1 border-l border-gray-200 pl-4">
//                         <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
//                             <CalendarClock size={12} /> Due Date
//                         </div>
//                         <div className={`text-xs font-bold ${item.deadline ? 'text-gray-700' : 'text-gray-300'}`}>
//                             {item.deadline ? new Date(item.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Deadline'}
//                         </div>
//                     </div>
//                 </div>

//                 {/* 4. Footer: Author & Link */}
//                 <div className="pt-4 flex justify-between items-center border-t border-gray-50">
//                     <div className="flex items-center gap-3">
//                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${theme.bg} ${theme.text}`}>
//                             {item.postedby ? item.postedby.charAt(0) : 'A'}
//                         </div>
//                         <div className="flex flex-col">
//                             <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">{item.postedby || 'Admin'}</span>
//                             <span className="text-[10px] font-medium text-gray-400">{timeAgo(item.createdAt)}</span>
//                         </div>
//                     </div>
//                     {/* Updated Link Display Logic */}
//                     <div className="flex gap-2">
//                         {item.linkUrl && (
//                             <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-xl transition-all bg-slate-100 text-slate-600 hover:bg-slate-200`}>
//                                 Link <LinkIcon size={12} />
//                             </a>
//                         )}
//                         {item.googleSheetUrl && (
//                             <a href={item.googleSheetUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-[10px] font-bold px-3 py-2 rounded-xl transition-all ${theme.bg} ${theme.text} hover:opacity-80`}>
//                                 Form <ExternalLink size={12} />
//                             </a>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- MODAL: ANNOUNCEMENT FORM ---
// const AnnouncementFormModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
//     const [loading, setLoading] = useState(false);
//     const [fetchingBatches, setFetchingBatches] = useState(false);
//     const [viewMode, setViewMode] = useState('form');

//     // Form State
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [category, setCategory] = useState('GENERAL');
//     const [deadline, setDeadline] = useState(getDefaultDeadline());
//     const [priority, setPriority] = useState(1); 
    
//     // Links & Config
//     const [linkUrl, setLinkUrl] = useState(''); 
//     const [googleSheetUrl, setGoogleSheetUrl] = useState('');     
//     const [isMandatory, setIsMandatory] = useState(false);

//     // Targeting State
//     const [isGlobal, setIsGlobal] = useState(true);
//     const [selectedSemester, setSelectedSemester] = useState('');
//     const [availableBatches, setAvailableBatches] = useState([]);
//     const [selectedBatches, setSelectedBatches] = useState([]);
//     const [batchFetchError, setBatchFetchError] = useState(null);

//     // Initialize or Reset
//     useEffect(() => {
//         if (isOpen) {
//             setViewMode('form');
//             if (initialData) {
//                 // --- EDIT MODE ---
//                 setTitle(initialData.title || '');
//                 setDescription(initialData.description || '');
//                 setCategory(initialData.category || 'GENERAL');
//                 setDeadline(initialData.deadline ? new Date(initialData.deadline).toISOString().slice(0, 16) : getDefaultDeadline());
//                 setPriority(initialData.priority || 1);
                
//                 // Set URLs correctly based on backend response keys
//                 setLinkUrl(initialData.linkUrl || '');
//                 setGoogleSheetUrl(initialData.googleSheetUrl || '');
                
//                 setIsMandatory(initialData.isMandatory || false);
//                 setIsGlobal(initialData.isGlobal);
                
//                 if (!initialData.isGlobal) {
//                     const sem = initialData.targetSemesters?.[0] || '';
//                     setSelectedSemester(sem);
//                     setSelectedBatches(initialData.targetBatches || []);
//                     if(sem) handleSemesterChange(sem, false); 
//                 } else {
//                     setSelectedSemester('');
//                     setAvailableBatches([]);
//                     setSelectedBatches([]);
//                 }
//             } else {
//                 // --- CREATE MODE ---
//                 setTitle(''); setDescription(''); setCategory('GENERAL');
//                 setDeadline(getDefaultDeadline()); setPriority(1);
//                 setLinkUrl(''); setGoogleSheetUrl(''); setIsMandatory(false);
//                 setIsGlobal(true); setSelectedSemester(''); setAvailableBatches([]); setSelectedBatches([]);
//             }
//         }
//     }, [isOpen, initialData]);

//     const handleSemesterChange = async (sem, clearSelected = true) => {
//         setSelectedSemester(sem);
//         if(clearSelected) {
//             setSelectedBatches([]); 
//             setAvailableBatches([]); 
//         }
        
//         if (!sem) return;

//         setFetchingBatches(true);
//         try {
//             const res = await fetch(`${API_URL}/api/get-sem-info/${sem}`, { credentials: 'include' });
//             const data = await res.json();
//             if (data.success && data.data && Array.isArray(data.data.batches)) {
//                 setAvailableBatches(data.data.batches);
//             } else {
//                 setBatchFetchError("Failed to load batches.");
//             }
//         } catch (error) {
//             setBatchFetchError("Network error.");
//         } finally {
//             setFetchingBatches(false);
//         }
//     };

//     const toggleBatch = (batch) => {
//         setSelectedBatches(prev => prev.includes(batch) ? prev.filter(b => b !== batch) : [...prev, batch]);
//     };

//     const constructPayload = () => {
//         return {
//             id: initialData?._id, // Required for Modify endpoint
//             title, description, category, priority, isGlobal, isMandatory,
//             deadline: deadline ? new Date(deadline).toISOString() : null,
//             linkUrl: linkUrl,
//             googleSheetUrl: googleSheetUrl,
//             targetSemesters: isGlobal ? [] : [selectedSemester],
//             targetBatches: isGlobal ? [] : selectedBatches,
//             postedby: 'Admin', // Preview placeholder
//             createdAt: new Date().toISOString(), // Preview placeholder
//             filledStudents: [] 
//         };
//     };

//     const handlePreview = (e) => {
//         e.preventDefault();
//         if (!title.trim() || !description.trim()) return;
//         if (!isGlobal && (!selectedSemester || selectedBatches.length === 0)) {
//             alert("Select at least one batch."); return;
//         }
//         setViewMode('preview');
//     };

//     const handleFinalSubmit = async () => {
//         setLoading(true);
//         const payload = constructPayload();
        
//         // Remove preview-only fields before sending
//         delete payload.postedby;
//         delete payload.createdAt;
//         delete payload.filledStudents;

//         // Determine Endpoint and Method
//         const endpoint = initialData 
//             ? `${API_URL}/api/modify-announcements` 
//             : `${API_URL}/api/post-announcements`;
        
//         const method = initialData ? 'PATCH' : 'POST';

        
//         try {
//             // POST/PATCH: ENCRYPT Body
//             const encryptedBody = encryptData(payload);

//             const res = await fetch(endpoint, {
//                 method: method, 
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ payload: encryptedBody }), 
//                 credentials: 'include'
//             });
            
//             const rawResult = await res.json();
//             // DECRYPT RESPONSE
//             const data = rawResult.data ? decryptData(rawResult.data) : rawResult;

//             if (res.ok) {
//                 onSuccess({ type: 'success', message: initialData ? 'Updated successfully!' : 'Posted successfully!' });
//                 onClose();
//             } else throw new Error(data.message || "Failed to process request");
//         } catch (error) {
//             onSuccess({ type: 'error', message: error.message });
//         } finally {
//             setLoading(false);
//         }
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
//             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300">
//                 <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
//                     <div>
//                         <h2 className="text-2xl font-bold text-gray-900">
//                             {viewMode === 'preview' ? 'Preview Announcement' : (initialData ? 'Edit Announcement' : 'New Announcement')}
//                         </h2>
//                         <p className="text-sm text-gray-500 font-medium">
//                             {viewMode === 'preview' ? 'Review how it looks before publishing.' : (initialData ? 'Modify existing update.' : 'Draft a new update for the portal.')}
//                         </p>
//                     </div>
//                     <button onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
//                 </div>
                
//                 <div className="flex-grow overflow-y-auto px-8 py-8 bg-gray-50/50">
//                     {viewMode === 'form' ? (
//                         <form id="create-form" onSubmit={handlePreview} className="h-full">
                            
//                             {/* --- TOP: CONFIGURATION --- */}
//                             <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8">
//                                 <div className="flex flex-col lg:flex-row gap-8">
//                                     {/* Category */}
//                                     <div className="flex-1">
//                                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Category</label>
//                                         <div className="flex flex-wrap gap-2">
//                                             {CATEGORIES.map((cat) => (
//                                                 <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
//                                                     className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${category === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' : 'bg-slate-50 text-gray-500 border-slate-200 hover:border-slate-300'}`}>
//                                                     <cat.icon size={14} /> {cat.label}
//                                                 </button>
//                                             ))}
//                                         </div>
//                                     </div>

//                                     {/* Config Grid */}
//                                     <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
//                                         {/* Colored Priority Buttons */}
//                                         <div>
//                                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Priority</label>
//                                             <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1">
//                                                 {PRIORITIES.map((p) => {
//                                                     const isSelected = priority === p.value;
//                                                     return (
//                                                         <button 
//                                                             key={p.value} 
//                                                             type="button" 
//                                                             onClick={() => setPriority(p.value)} 
//                                                             className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${isSelected ? p.active : p.base}`}
//                                                         >
//                                                             {isSelected && <p.icon size={12} strokeWidth={3} />}
//                                                             {p.label}
//                                                         </button>
//                                                     );
//                                                 })}
//                                             </div>
//                                         </div>

//                                         <div>
//                                             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Deadline</label>
//                                             <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-400" />
//                                         </div>

//                                         <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
//                                             <div className="flex items-center gap-2">
//                                                 <ShieldAlert size={16} className="text-red-500"/>
//                                                 <span className="text-xs font-bold text-slate-700">Mandatory Submission</span>
//                                             </div>
//                                             <button type="button" onClick={() => setIsMandatory(!isMandatory)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isMandatory ? 'bg-red-500' : 'bg-slate-300'}`}>
//                                                 <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isMandatory ? 'translate-x-5' : 'translate-x-1'}`} />
//                                             </button>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* --- MIDDLE: CONTENT --- */}
//                             <div className="space-y-6 mb-8">
//                                 <div className="space-y-2">
//                                     <label className="text-sm font-bold text-gray-700">Title</label>
//                                     <input required value={title} onChange={(e) => setTitle(e.target.value)} 
//                                         className="w-full px-5 py-4 text-lg font-bold bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all placeholder:text-gray-300" placeholder="e.g. Hackathon Registration" />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
//                                     <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={6} 
//                                         className="w-full px-5 py-4 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all resize-none placeholder:text-gray-300 leading-relaxed" placeholder="Type your message here..." />
//                                 </div>
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                     <div className="space-y-2">
//                                         <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">Link URL (Optional)</label>
//                                         <div className="relative">
//                                             <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Link size={16} className="text-blue-500" /></div>
//                                             <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-blue-600 focus:ring-2 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder="https://..." />
//                                         </div>
//                                     </div>
//                                     <div className="space-y-2">
//                                         <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">Google Sheet/Form URL (Optional)</label>
//                                         <div className="relative">
//                                             <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><FileSpreadsheet size={16} className="text-emerald-500" /></div>
//                                             <input value={googleSheetUrl} onChange={(e) => setGoogleSheetUrl(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300" placeholder="https://..." />
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* --- BOTTOM: TARGET AUDIENCE --- */}
//                             <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col shadow-sm">
//                                 <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
//                                     <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
//                                         <Target size={18} className="text-blue-600"/> Target Audience
//                                     </label>
                                    
//                                     <div className="flex bg-slate-100 p-1 rounded-lg">
//                                         <button type="button" onClick={() => setIsGlobal(true)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isGlobal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Global</button>
//                                         <button type="button" onClick={() => setIsGlobal(false)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!isGlobal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Specific</button>
//                                     </div>
//                                 </div>

//                                 <div className="flex-grow">
//                                     {isGlobal ? (
//                                         <div className="h-full flex items-center justify-center text-center text-gray-400 py-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 gap-4">
//                                             <Globe size={32} className="text-blue-200" />
//                                             <div className="text-left">
//                                                 <p className="text-sm font-bold text-slate-600">Global Announcement</p>
//                                                 <p className="text-xs">Visible to everyone on campus.</p>
//                                             </div>
//                                         </div>
//                                     ) : (
//                                         <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
//                                             <div className="space-y-2">
//                                                 <label className="text-xs font-bold text-slate-400 uppercase">Select Semester</label>
//                                                 <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
//                                                     {/* CORRECTED: Uses SEMESTER_OPTIONS instead of SEMESTERS */}
//                                                     {SEMESTER_OPTIONS.map((sem) => (
//                                                         <button key={sem} type="button" onClick={() => handleSemesterChange(sem)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${selectedSemester === sem ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
//                                                             {sem}
//                                                         </button>
//                                                     ))}
//                                                 </div>
//                                             </div>

//                                             {selectedSemester && (
//                                                 <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
//                                                     <div className="flex justify-between items-center">
//                                                         <label className="text-xs font-bold text-slate-400 uppercase">Select Batches</label>
//                                                         {fetchingBatches && <span className="text-[10px] text-blue-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Syncing...</span>}
//                                                     </div>
                                                    
//                                                     {fetchingBatches ? (
//                                                         <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
//                                                             <Loader2 size={24} className="animate-spin text-blue-400 mb-2" />
//                                                             <p className="text-xs text-slate-400">Loading Batches...</p>
//                                                         </div>
//                                                     ) : batchFetchError ? (
//                                                         <div className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-lg border border-red-100 text-center flex flex-col items-center gap-1">
//                                                             <AlertTriangle size={16} /> {batchFetchError}
//                                                         </div>
//                                                     ) : availableBatches.length > 0 ? (
//                                                         <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-1">
//                                                             {availableBatches.map((batch) => {
//                                                                 const isSelected = selectedBatches.includes(batch);
//                                                                 return (
//                                                                     <button key={batch} type="button" onClick={() => toggleBatch(batch)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${isSelected ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
//                                                                         {isSelected ? <CheckCircle size={12} className="text-white" /> : <div className="w-3 h-3 rounded-full border border-slate-300"></div>}
//                                                                         {batch}
//                                                                     </button>
//                                                                 );
//                                                             })}
//                                                         </div>
//                                                     ) : (
//                                                         <div className="p-4 bg-slate-50 text-slate-400 text-xs text-center rounded-xl italic border border-slate-100">
//                                                             No batches found for Sem {selectedSemester}.
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </form>
//                     ) : (
//                         // --- PREVIEW MODE ---
//                         <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95">
//                             <div className="w-full max-w-lg pointer-events-none">
//                                 <AnnouncementCard 
//                                     item={constructPayload()} 
//                                     theme={getCategoryTheme(category)} 
//                                     index={0} 
//                                     isPreview={true} 
//                                 />
//                             </div>
//                             <div className="mt-8 text-center">
//                                 <p className="text-sm text-gray-500 font-medium mb-2">This is how your post will appear to students.</p>
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-end gap-4 flex-shrink-0">
//                     {viewMode === 'form' ? (
//                         <>
//                             <button onClick={onClose} className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm">Cancel</button>
//                             <button type="submit" form="create-form" className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 text-sm tracking-wide flex items-center gap-2">
//                                 <Eye size={16} /> Preview
//                             </button>
//                         </>
//                     ) : (
//                         <>
//                             <button onClick={() => setViewMode('form')} className="px-8 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2">
//                                 <ArrowLeft size={16} /> Back to Edit
//                             </button>
//                             <button onClick={handleFinalSubmit} disabled={loading} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black disabled:opacity-50 transition-all active:scale-95 text-sm tracking-wide flex items-center gap-2">
//                                 {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} 
//                                 {initialData ? 'Confirm & Update' : 'Confirm & Publish'}
//                             </button>
//                         </>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// // --- MAIN PAGE ---
// const AdminAnnouncementPage = () => {
//     const { user, logout } = useAuth();
//     const navigate = useNavigate();
    
//     const [loading, setLoading] = useState(true);
//     const [announcements, setAnnouncements] = useState([]);
//     const [activeCategory, setActiveCategory] = useState('ALL');
//     const [searchQuery, setSearchQuery] = useState('');
//     const [animate, setAnimate] = useState(false);
    
//     // Modal States
//     const [isFormModalOpen, setIsFormModalOpen] = useState(false);
//     const [editData, setEditData] = useState(null); // Data for editing
//     const [statusModal, setStatusModal] = useState(null); 
//     const [deleteModalOpen, setDeleteModalOpen] = useState(false);
//     const [deleteTargetId, setDeleteTargetId] = useState(null);

//     useEffect(() => {
//         if (!user) { navigate('/'); return; }
//         fetchAnnouncements();
//         setTimeout(() => setAnimate(true), 100);
//     }, [user, navigate]);

//     const fetchAnnouncements = async () => {
//         setLoading(true);
//         try {
//             // GET Request: Plain Params
//             const response = await fetch(`${API_URL}/api/get-all-announcemnets`, { method: 'GET', credentials: 'include' });
//             if (response.status === 401 || response.status === 403) { logout(); return; }
            
//             const rawJson = await response.json();
//             // DECRYPT RESPONSE
//             const data = rawJson.data ? decryptData(rawJson.data) : rawJson;
            
//             processData(data);
//         } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
//     };

//     const confirmDelete = (id) => {
//         setDeleteTargetId(id);
//         setDeleteModalOpen(true);
//     };

//     const handleDelete = async () => {
//         if(!deleteTargetId) return;
//         setDeleteModalOpen(false);
//         try {
//             const response = await fetch(`${API_URL}/api/delete-announcements/${deleteTargetId}`, {
//                 method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include'
//             });
//             if (response.ok) {
//                 setAnnouncements(prev => prev.filter(a => a._id !== deleteTargetId));
//                 setStatusModal({ type: 'success', message: 'Announcement deleted successfully.' });
//             } else {
//                 setStatusModal({ type: 'error', message: 'Failed to delete announcement.' });
//             }
//         } catch (error) {
//             setStatusModal({ type: 'error', message: 'Network error occurred.' });
//         }
//     };

//     const openCreateModal = () => {
//         setEditData(null);
//         setIsFormModalOpen(true);
//     };

//     const openEditModal = (item) => {
//         setEditData(item);
//         setIsFormModalOpen(true);
//     };

//     const processData = (data) => {
//         const uniqueMap = new Map();
//         if (data.global) data.global.forEach(item => uniqueMap.set(item._id, item));
//         if (data.yourPosts) data.yourPosts.forEach(item => uniqueMap.set(item._id, item));
//         if (data.semesters) {
//             Object.values(data.semesters).forEach(batches => {
//                 Object.values(batches).forEach(batchList => {
//                     batchList.forEach(item => uniqueMap.set(item._id, item));
//                 });
//             });
//         }
//         const sortedList = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//         setAnnouncements(sortedList);
//     };

//     const filteredAnnouncements = useMemo(() => {
//         return announcements.filter(item => {
//             const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
//             const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
//             return matchesCategory && matchesSearch;
//         });
//     }, [announcements, activeCategory, searchQuery]);

//     if (loading) return <Loader />;

//     return (
//         <div className="min-h-screen font-sans bg-gray-50 pb-20">
            
//             <AnnouncementFormModal 
//                 isOpen={isFormModalOpen} 
//                 onClose={() => setIsFormModalOpen(false)} 
//                 onSuccess={(status) => { setStatusModal(status); if(status.type==='success') fetchAnnouncements(); }}
//                 initialData={editData}
//             />
            
//             <StatusModal status={statusModal} onClose={() => setStatusModal(null)} />
//             <DeleteConfirmationModal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={handleDelete} />

//             {/* Header */}
//             <div className="bg-slate-900 pb-32 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
//                 <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
//                 <div className="px-6 pt-6 relative z-10 max-w-7xl mx-auto">
//                     <Header animate={animate} />
//                     <div className="mt-10 mb-8">
//                         <button onClick={() => navigate(-1)} className="group flex items-center text-slate-400 hover:text-white transition-colors mb-6 text-sm font-medium"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard</button>
//                         <div className={`flex flex-col md:flex-row justify-between items-end gap-6 transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
//                             <div>
//                                 <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">Announcement <span className="text-blue-400">Hub</span></h1>
//                                 <p className="text-slate-400 text-lg max-w-lg">Manage announcements and keep the campus connected.</p>
//                             </div>
//                             <div className="relative w-full md:w-auto flex gap-3">
//                                 <div className="relative flex-grow md:w-80">
//                                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
//                                     <input type="text" className="block w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md shadow-lg transition-all" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
//                                 </div>
//                                 <button onClick={openCreateModal} className="bg-white text-slate-900 px-6 py-3.5 rounded-2xl font-bold shadow-lg hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"><Plus size={20} strokeWidth={3} /> Create</button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Main Content */}
//             <main className="px-4 -mt-20 relative z-20 max-w-7xl mx-auto">
//                 <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-gray-100 mb-10 flex overflow-x-auto gap-2 scrollbar-hide">
//                     <button onClick={() => setActiveCategory('ALL')} className={`px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${activeCategory === 'ALL' ? 'bg-slate-900 text-white shadow-md transform scale-105' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}>ALL UPDATES</button>
//                     {CATEGORIES.map((cat) => (
//                         <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${activeCategory === cat.id ? 'bg-slate-900 text-white shadow-md transform scale-105' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}>{cat.label.toUpperCase()}</button>
//                     ))}
//                 </div>

//                 <>
//                     <div className="flex justify-between items-center mb-6 px-2">
//                         <h2 className="text-gray-800 font-bold text-xl flex items-center gap-3">
//                             {activeCategory === 'ALL' ? 'Latest Announcements' : activeCategory}
//                             <span className="bg-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full font-bold">{filteredAnnouncements.length}</span>
//                         </h2>
//                     </div>

//                     {filteredAnnouncements.length > 0 ? (
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
//                             {filteredAnnouncements.map((item, idx) => (
//                                 <AnnouncementCard 
//                                     key={item._id} 
//                                     item={item} 
//                                     theme={getCategoryTheme(item.category)} 
//                                     index={idx} 
//                                     onDeleteClick={confirmDelete}
//                                     onEditClick={openEditModal}
//                                 />
//                             ))}
//                         </div>
//                     ) : (
//                         <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-300 shadow-sm">
//                             <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6"><Megaphone className="text-gray-300" size={40} /></div>
//                             <h3 className="text-2xl font-bold text-gray-800">No Announcements Found</h3>
//                             <p className="text-gray-500 text-base mt-2 max-w-sm text-center leading-relaxed">There are no active posts in this category right now.</p>
//                         </div>
//                     )}
//                 </>
//             </main>
//         </div>
//     );
// };

// export default AdminAnnouncementPage;