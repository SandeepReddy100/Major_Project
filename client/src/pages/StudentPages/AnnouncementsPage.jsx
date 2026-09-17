/**
 * @file InboxPage.jsx
 * @description Student Inbox/Announcements with unified styling and fixed mobile alignment.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Calendar, Clock, 
    ExternalLink, Info, Megaphone, 
    ArrowRight, Bell, X,
    FileText, ClipboardCheck, UserPlus,
    Star, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 
import Loader from '../../components/Loader';
import api from '/src/api/axiosConfig'; 

const API_URL = import.meta.env.VITE_BASE_URL;

// --- STYLING CONFIGURATION ---
const CATEGORY_STYLES = {
    GENERAL: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-300',
        border: 'border-blue-500/20',
        icon: <Info className="w-3.5 h-3.5" />,
    },
    EVENTS: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-300',
        border: 'border-purple-500/20',
        icon: <Calendar className="w-3.5 h-3.5" />,
    },
    FORMS: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-300',
        border: 'border-amber-500/20',
        icon: <FileText className="w-3.5 h-3.5" />,
    },
    ASSESSMENTS: {
        bg: 'bg-rose-500/10',
        text: 'text-rose-300',
        border: 'border-rose-500/20',
        icon: <ClipboardCheck className="w-3.5 h-3.5" />,
    },
    REGISTRATIONS: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-300',
        border: 'border-emerald-500/20',
        icon: <UserPlus className="w-3.5 h-3.5" />,
    },
    DEFAULT: {
        bg: 'bg-slate-500/10',
        text: 'text-slate-300',
        border: 'border-slate-500/20',
        icon: <Megaphone className="w-3.5 h-3.5" />,
    }
};

const getCategoryStyle = (cat) => CATEGORY_STYLES[cat?.toUpperCase()] || CATEGORY_STYLES.DEFAULT;

// --- DETAIL MODAL COMPONENT ---
const AnnouncementModal = ({ item, onClose }) => {
    if (!item) return null;
    const style = getCategoryStyle(item.category);
    const dateObj = new Date(item.createdAt);
    
    const primaryLink = item.googleSheetUrl || item.linkUrl;
    const linkLabel = item.googleSheetUrl ? "Action Required" : "Open Resource";

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div 
                initial={{ scale: 0.95, y: 20 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-[#0F172A] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                <div className="p-8 border-b border-white/5 bg-[#1E293B]">
                    <div className="flex justify-between items-start mb-6">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${style.bg} ${style.text} ${style.border}`}>
                            {style.icon} {item.category || 'GENERAL'}
                        </span>
                        <button onClick={onClose} className="p-2 bg-black/20 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white leading-tight pr-4 mb-2">{item.title}</h2>
                    <p className="text-slate-400 text-sm font-medium flex items-center gap-2">
                        <Clock size={14}/> Posted on {dateObj.toLocaleDateString(undefined, { dateStyle: 'full' })}
                    </p>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    {(item.isMandatory || item.deadline) && (
                        <div className="flex flex-wrap gap-3">
                            {item.isMandatory && (
                                <div className="flex items-center gap-2 text-xs font-bold text-rose-300 bg-rose-500/10 px-4 py-2.5 rounded-full border border-rose-500/20 w-fit">
                                    <ShieldAlert size={14} /> Mandatory
                                </div>
                            )}
                            {item.deadline && (
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 px-4 py-2.5 rounded-full border border-amber-500/20 w-fit">
                                    <Clock size={14} /> Due: {new Date(item.deadline).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="prose prose-invert prose-lg max-w-none">
                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-base font-medium">
                            {item.description}
                        </p>
                    </div>
                </div>

                {primaryLink && (
                    <div className="p-8 border-t border-white/5 bg-black/20">
                        <a 
                            href={primaryLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-blue-600/20 active:scale-95"
                        >
                            {linkLabel} <ExternalLink size={18} /> 
                        </a>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

// --- MAIN PAGE COMPONENT ---
const InboxPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [animate, setAnimate] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [availableCategories, setAvailableCategories] = useState(['ALL']);
    
    // Modal State
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!user) { navigate('/'); return; }
        const fetchData = async () => {
            try {
                // Modified: Wait for both the API call AND a 2.5 second timer
                const [_, response] = await Promise.all([
                    new Promise(resolve => setTimeout(resolve, 1000)), // Minimum 2.5s delay
                    fetch(`${API_URL}/api/student/get-announcements`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: "include",
                    })
                ]);
                
                if (response.status === 401 || response.status === 403) { logout(); return; }
                
                const data = await response.json();
                
                if (data.success && Array.isArray(data.announcements)) {
                    setMessages(data.announcements);
                    const uniqueCats = new Set(data.announcements.map(a => a.category ? a.category.toUpperCase() : 'GENERAL'));
                    setAvailableCategories(['ALL', ...Array.from(uniqueCats).sort()]);
                }
            } catch (err) { console.error("Inbox fetch error:", err); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, [user, navigate, logout]);

    const filteredData = useMemo(() => {
        return messages.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  item.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = activeFilter === 'ALL' || (item.category?.toUpperCase() || 'GENERAL') === activeFilter;
            return matchesSearch && matchesFilter;
        }).sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [messages, searchTerm, activeFilter]);

    if (loading) return <Loader />;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans pb-20 relative overflow-hidden selection:bg-blue-500/30">
            
            {/* Header */}
            <div className="relative px-6 sm:px-8 pt-4 pb-6 z-20">
                <Header animate={animate} />
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4"></div>
            </div>

            <main className="relative z-10 px-6 sm:px-8 py-4 max-w-7xl mx-auto space-y-10">
                
                {/* 1. Page Title & Search */}
                <div className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-6 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400 pb-2">
                                Inbox
                            </span>
                        </h1>
                    </div>

                    <div className="relative group w-full md:w-80">
                        <div className="relative flex items-center bg-[#0F172A] border border-white/10 rounded-full shadow-xl hover:border-white/20 transition-colors h-12 md:h-14">
                            <Search className="absolute left-5 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search announcements..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-12 py-3 bg-transparent text-sm md:text-base text-white placeholder-slate-500 focus:outline-none rounded-full font-medium"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-4 p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Filter Tabs */}
                <div className={`flex flex-wrap gap-2 transition-all duration-700 delay-100 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {availableCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveFilter(cat)}
                            className={`
                                relative px-6 py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300
                                border
                                ${activeFilter === cat 
                                    ? 'bg-white text-[#071225] border-white shadow-[0_0_15px_rgba(255,255,255,0.2)] transform -translate-y-0.5' 
                                    : 'bg-[#1E293B]/40 text-slate-400 border-white/5 hover:bg-[#1E293B] hover:text-white hover:border-white/20'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* 3. Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredData.length > 0 ? (
                            filteredData.map((item, index) => {
                                const style = getCategoryStyle(item.category);
                                const dateObj = new Date(item.createdAt);
                                
                                return (
                                    <motion.div
                                        key={item._id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        className="h-full"
                                    >
                                        <div 
                                            className={`
                                                group relative h-full flex flex-col justify-between
                                                bg-[#0F172A]/40 backdrop-blur-md
                                                border border-white/5 hover:border-white/20
                                                rounded-[2rem] p-6 md:p-8 min-h-[260px]
                                                transition-all duration-300 hover:shadow-2xl hover:bg-[#0F172A]/60 cursor-pointer
                                            `}
                                            onClick={() => setSelectedAnnouncement(item)}
                                        >
                                            
                                            <div className="relative z-10 flex flex-col h-full">
                                                
                                                {/* Header: Category & Date Block */}
                                                <div className="flex justify-between items-start mb-6">
                                                    <span className={`
                                                        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                                                        text-[10px] font-black uppercase tracking-widest border
                                                        ${style.bg} ${style.text} ${style.border}
                                                    `}>
                                                        {style.icon} {item.category || 'GENERAL'}
                                                    </span>
                                                    
                                                    <div className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 border border-white/10 shadow-inner backdrop-blur-md shrink-0">
                                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {dateObj.toLocaleString('default', { month: 'short' })}
                                                        </span>
                                                        <span className="text-lg md:text-xl font-black text-white leading-none mt-0.5">
                                                            {dateObj.getDate()}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="mb-8 flex-1">
                                                    <h3 className="text-xl font-bold text-white mb-3 leading-tight group-hover:text-blue-200 transition-colors line-clamp-2">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-sm text-slate-400 leading-relaxed font-medium line-clamp-3">
                                                        {item.description}
                                                    </p>
                                                </div>

                                                {/* Footer: View More */}
                                                <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-5">
                                                    {item.priority >= 2 ? (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                                                            <Star size={12} fill="currentColor" /> Important
                                                        </span>
                                                    ) : <span></span>}

                                                    <button 
                                                        className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all group-hover:translate-x-1"
                                                    >
                                                        Details <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            // Empty State
                            <div className="col-span-full min-h-[40vh] flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed border-white/10 rounded-[3rem] bg-white/5 backdrop-blur-sm">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
                                    <Bell className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
                                <p className="text-slate-400 text-sm max-w-md">
                                    {searchTerm 
                                        ? `No results found for "${searchTerm}"` 
                                        : "Your inbox is clear. Check back later for updates."}
                                </p>
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="mt-6 px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all"
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* --- MODAL --- */}
            <AnimatePresence>
                {selectedAnnouncement && (
                    <AnnouncementModal 
                        item={selectedAnnouncement} 
                        onClose={() => setSelectedAnnouncement(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default InboxPage;