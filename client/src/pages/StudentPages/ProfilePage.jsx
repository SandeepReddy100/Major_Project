import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mail, Lock, X, Unlock,
    Loader2, Maximize, GraduationCap, Users,
    User, CheckCircle, AlertTriangle, Info,
    Crown, Medal, Star, BarChart3, Gauge, 
    Edit2, Save, Link as LinkIcon, ArrowUpRight,
    ListOrdered
} from 'lucide-react';

import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 
import Loader from '../../components/Loader';

// --- ASSETS ---
import lcImg from '../../assets/leetcode.webp';
import gfgImg from '../../assets/gfg.png'; 
import ccImg from '../../assets/codechef.png'; 
import ghImg from '../../assets/github.png'; 

const backendUrl = import.meta.env.VITE_BASE_URL;

// --- SUB-COMPONENTS ---

const ProfileDetailCard = ({ icon, label, value, description, variant = 'default', isImage = false, redirectUrl = null }) => {
    const variants = {
        default: 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-lg',
        primary: 'bg-blue-50/50 border-blue-100 hover:border-blue-200 hover:shadow-blue-100/50',
        secondary: 'bg-purple-50/50 border-purple-100 hover:border-purple-200 hover:shadow-purple-100/50',
        gold: 'bg-amber-50/50 border-amber-100 hover:border-amber-200 hover:shadow-amber-100/50'
    };

    const iconColor = {
        primary: 'text-blue-600',
        secondary: 'text-purple-600',
        gold: 'text-amber-600',
        default: 'text-gray-700'
    };

    return (
        <div className={`${variants[variant]} rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 h-full group relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/0 to-current opacity-5 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>

            <div className="flex items-start gap-4 relative z-10">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center shrink-0">
                    {isImage ? (
                        <img src={icon} alt={label} className="w-6 h-6 object-contain" />
                    ) : (
                        React.cloneElement(icon, {
                            className: `w-6 h-6 ${iconColor[variant] || iconColor.default}`
                        })
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="font-bold text-gray-900 text-lg leading-tight truncate" title={value}>{value}</p>
                    
                    {description && (
                        <div className="mt-2">
                            {redirectUrl ? (
                                <a 
                                    href={redirectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all text-xs font-bold max-w-full group/link"
                                >
                                    <span className="truncate">{description}</span>
                                    <ArrowUpRight size={12} className="shrink-0 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                                </a>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 border border-gray-200 text-xs font-medium max-w-full">
                                    <span className="truncate">{description}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PasswordInput = ({ id, label, value, onChange, error, placeholder }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700" htmlFor={id}>
                {label}
            </label>
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    id={id}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        error
                            ? 'border-red-500 ring-red-100 focus:ring-red-200'
                            : 'border-gray-200 focus:border-gray-400 focus:ring-gray-200'
                    }`}
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? <Unlock size={20} /> : <Lock size={20} />}
                </button>
            </div>
            {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-medium mt-1">
                    <AlertTriangle size={14} />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

const StatusMessage = ({ type, message }) => {
    const types = {
        success: { bg: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={20} /> },
        error: { bg: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={20} /> },
        info: { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Info size={20} /> }
    };
    const config = types[type] || types.info;
    return (
        <div className={`${config.bg} p-4 rounded-xl border flex items-center gap-3 animate-fade-in`}>
            {config.icon}
            <span className="font-medium text-sm">{message}</span>
        </div>
    );
};

// --- MODALS ---

const UpdateHandlesModal = ({ isOpen, onClose, currentHandles, onUpdateSuccess }) => {
    const [handles, setHandles] = useState({
        leetcode: '', gfg: '', codechef: '', github: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [apiMessage, setApiMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen && currentHandles) {
            setHandles({
                leetcode: currentHandles.leetcode || '',
                gfg: currentHandles.gfg || '',
                codechef: currentHandles.codechef || '',
                github: currentHandles.github || ''
            });
            setApiMessage({ type: '', text: '' });
            setIsLoading(false); // --- FIX 1: Reset loading state when modal opens ---
        }
    }, [isOpen, currentHandles]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setApiMessage({ type: '', text: '' });

        try {
            const payload = { handles: handles };

            const response = await fetch(`${backendUrl}/api/student/update-coding-handles`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: "include"
            });

            const result = await response.json();

            if (!response.ok) {
                setApiMessage({ type: 'error', text: result.message || 'Failed to update handles' });
                setIsLoading(false);
                return;
            }

            setApiMessage({ type: 'success', text: 'Handles updated successfully!' });
            
            if (result.codingProfile) {
                setTimeout(() => {
                    onUpdateSuccess(result.codingProfile);
                    onClose();
                    setIsLoading(false); // Ensure loading is off after close
                }, 1000);
            } else {
                setIsLoading(false);
            }

        } catch (error) {
            console.error(error);
            setApiMessage({ type: 'error', text: 'Network error occurred.' });
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Coding Profiles</h2>
                        <p className="text-gray-500 text-sm mt-1 font-medium">Link platforms to view activity and rankings.</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                    
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        {[
                            { id: 'leetcode', label: 'LeetCode', icon: lcImg, placeholder: 'leetcode_username' },
                            { id: 'gfg', label: 'GeeksForGeeks', icon: gfgImg, placeholder: 'gfg_username' },
                            { id: 'codechef', label: 'CodeChef', icon: ccImg, placeholder: 'codechef_handle' },
                            { id: 'github', label: 'GitHub', icon: ghImg, placeholder: 'github_username' },
                        ].map((platform) => (
                            <div key={platform.id} className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">{platform.label}</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3 p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm z-10">
                                        <img src={platform.icon} alt={platform.label} className="w-5 h-5 object-contain" />
                                    </div>
                                    <input
                                        type="text"
                                        value={handles[platform.id]}
                                        onChange={(e) => setHandles({...handles, [platform.id]: e.target.value})}
                                        placeholder={platform.placeholder}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-14 pr-4 py-3 text-gray-900 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all font-mono"
                                    />
                                    {/* --- FIX 2: Tick box removed from here --- */}
                                </div>
                            </div>
                        ))}
                    </div>


                    {apiMessage.text && <StatusMessage type={apiMessage.type} message={apiMessage.text} />}
                    <div className="flex gap-3 pt-6 mt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors font-bold text-sm" disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed" disabled={isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isLoading ? 'Saving...' : 'Save Profiles'}
                        </button>
                        
                    </div>
                </form>
            </div>
        </div>
    );
};

const ChangePasswordModal = ({ isOpen, onClose, rollNo, sem }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    
    const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiMessage, setApiMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (isOpen) {
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setErrors({});
            setApiMessage({ type: '', text: '' });
            setIsLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const validatePasswords = () => {
        const newErrors = {};
        if (!passwords.oldPassword) newErrors.oldPassword = 'Current password is required';
        if (!passwords.newPassword) newErrors.newPassword = 'New password is required';
        else if (passwords.newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters';
        if (passwords.newPassword !== passwords.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiMessage({ type: '', text: '' });
        const validationErrors = validatePasswords();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        
        setIsLoading(true);
        try {
            const payload = {
                semname: sem || "VI", 
                username: rollNo,
                role: "student",
                oldPassword: passwords.oldPassword,
                newPassword: passwords.newPassword
            };

            const response = await fetch(`${backendUrl}/api/auth/change-password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: "include",
            });
            
            const result = await response.json();

            if (!response.ok) {
                setApiMessage({ type: 'error', text: result.message || 'Failed to update password.' });
                setIsLoading(false);
                return;
            }

            setApiMessage({ type: 'success', text: result.message || 'Password updated successfully! Logging you out...' });
            
            setTimeout(() => {
                logout();
                navigate('/', { replace: true });
            }, 2000);

        } catch (err) {
            console.error("Password update error:", err.message);
            setApiMessage({ type: 'error', text: 'Network error occurred. Please try again.' });
            setIsLoading(false);
        }
    };

    const handleChange = (field) => (e) => {
        setPasswords(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8" onClick={(e) => e.stopPropagation()}>
                <div className="mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Change Password</h2>
                            <p className="text-gray-500 text-sm mt-1">Secure your account with a new password.</p>
                        </div>
                        <button onClick={onClose} className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <PasswordInput 
                        id="old-password" 
                        label="Current Password" 
                        placeholder="Enter current password" 
                        value={passwords.oldPassword} 
                        onChange={handleChange('oldPassword')} 
                        error={errors.oldPassword} 
                    />
                    <PasswordInput 
                        id="new-password" 
                        label="New Password" 
                        placeholder="Enter new password" 
                        value={passwords.newPassword} 
                        onChange={handleChange('newPassword')} 
                        error={errors.newPassword} 
                    />
                    <PasswordInput 
                        id="confirm-password" 
                        label="Confirm Password" 
                        placeholder="Re-enter new password" 
                        value={passwords.confirmPassword} 
                        onChange={handleChange('confirmPassword')} 
                        error={errors.confirmPassword} 
                    />
                    
                    {apiMessage.text && <StatusMessage type={apiMessage.type} message={apiMessage.text} />}
                    
                    <div className="flex gap-3 pt-6">
                        <button type="button" onClick={onClose} className="flex-1 py-3.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors font-bold text-sm" disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed" disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FullScreenQRCodeModal = ({ isOpen, onClose, qrImage, profilePhoto, name, rollNo, batch }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 w-screen h-screen bg-gray-900/95 backdrop-blur-xl flex flex-col items-center justify-center z-[60] p-4 lg:p-8 animate-fade-in" onClick={onClose}>
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 sm:p-10 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-4xl text-gray-800 flex flex-col lg:flex-row items-center gap-6 lg:gap-12 border border-gray-200">
                <div className="w-full lg:w-1/3 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <img src={profilePhoto} alt="Profile" className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-blue-200 shadow-2xl object-cover"
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${name.replace(/ /g, '+')}&background=BFDBFE&color=1E3A8A&font-size=0.4&rounded=true&size=160`; }}
                        />
                       
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{name}</h2>
                        <div className="flex items-center justify-center gap-2 text-gray-600">
                            <p className="text-sm sm:text-md font-mono">{rollNo}</p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full text-xs">{batch}</span>
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-2/3 flex flex-col items-center space-y-6 mt-6 lg:mt-0">
                    <div className="relative w-full aspect-square p-4 sm:p-6 bg-white rounded-3xl shadow-2xl border-2 border-gray-200">
                        <img src={qrImage} alt="Digital ID QR Code" className="w-full h-full object-contain rounded-2xl" draggable="false"
                            onError={(e) => { e.target.src = 'https://placehold.co/800x800/f8fafc/64748b?text=QR+Code+Error'; }}
                        />
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/80 bg-black/30 hover:bg-black/50 transition-all rounded-full p-3 hover:scale-110" aria-label="Close fullscreen view">
                <X size={28} />
            </button>
        </div>
    );
};

// --- MAIN PROFILE PAGE COMPONENT ---
const ProfilePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isHandlesModalOpen, setIsHandlesModalOpen] = useState(false);
    const [animate, setAnimate] = useState(false);
    const [isFullScreenQrOpen, setIsFullScreenQrOpen] = useState(false);

    useEffect(() => {
        const handleContextMenu = (e) => { e.preventDefault(); };
        document.addEventListener('contextmenu', handleContextMenu);
        return () => { document.removeEventListener('contextmenu', handleContextMenu); };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        const fetchProfileData = async () => {
            try {
                // Modified: Wait for both the API call AND a 2.5 second timer
                const [response, _] = await Promise.all([
                    fetch(`${backendUrl}/api/student/get-profile-data?rollno=${user.username}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: "include",
                    }),
                    new Promise(resolve => setTimeout(resolve, 1000)) // 2.5 seconds delay
                ]);

                if (response.status === 401 || response.status === 403) {
                    logout();
                    return;
                }

                if (!response.ok) throw new Error("Failed to fetch profile");

                const data = await response.json();
                
                if (data.student) {
                    setUserData({
                        name: data.student.name,
                        rollNo: data.student.rollno,
                        branch: data.student.branch,
                        batch: data.student.batch,
                        email: data.student.email,
                        sem: data.student.currentSem || data.student.sem || "VI", 
                        qrImage: data.student.qrLink,
                        profilePhoto: `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${data.student.rollno}/${data.student.rollno}.jpg`,
                        codingProfile: data.codingProfile || { handles: {}, scores: {}, totalScore: 0 },
                        globalRank: data.globalrank,
                        batchRank: data.batchrank
                    });
                }
            } catch (err) {
                console.error("Fetch profile error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [user, navigate, logout]);

    const handleHandlesUpdate = (updatedCodingProfile) => {
        setUserData(prev => ({
            ...prev,
            codingProfile: {
                ...prev.codingProfile,
                handles: updatedCodingProfile.handles || prev.codingProfile.handles
            }
        }));
    };

    if (loading) {
        return <Loader />;
    }

    if (!userData) return null;

    return (
        <div className="min-h-screen text-gray-800 font-sans bg-gradient-to-br from-[#F0F2F5] to-[#E5E7EB] overflow-x-hidden">
            <div className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-bl-[3rem] rounded-br-[3rem] relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
                </div>

                <div className="px-4 sm:px-6 lg:px-8 relative z-50">
                    <Header animate={animate} qrCode={userData.qrImage} />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-6"></div>

                    {/* FIXED: Added pb-24 for mobile to prevent overlap with the rounded bottom edge */}
                    <div className={`py-12 pb-24 lg:pb-12 lg:min-h-[50vh] flex items-center transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                        <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-7xl mx-auto gap-12 lg:gap-16">
                            <div className="flex flex-col lg:flex-row items-center gap-8 text-white">
                                <div className="relative flex-shrink-0">
                                    <img src={userData.profilePhoto} alt="Profile" className="w-44 h-44 rounded-full border-4 border-white/30 shadow-2xl object-cover"
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${userData.name.replace(/ /g, '+')}&background=1F2937&color=BFDBFE&font-size=0.4&rounded=true&size=176`; }}
                                    />
                                </div>
                                <div className="flex-grow text-center lg:text-left space-y-4">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">{userData.name}</h1>
                                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                                            <Users className="w-5 h-5 text-blue-300" />
                                            <p className="text-blue-300 font-mono text-lg sm:text-xl">{userData.rollNo}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                                            <GraduationCap className="w-4 h-4" />
                                            <span className="text-sm font-medium">{userData.branch}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                                            <Users className="w-4 h-4" />
                                            <span className="text-sm font-medium">{userData.batch}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2 flex justify-center lg:justify-start">
                                        <button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl active:scale-95">
                                            <Lock size={16} />
                                            Change Password
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-4 text-white text-center flex-shrink-0 mt-8 lg:mt-0">
                                <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-gray-200">
                                    <img src={userData.qrImage} alt="QR Code" className="w-48 h-48 rounded-xl" draggable="false"
                                        onError={(e) => { e.target.src = 'https://placehold.co/192x192/f8fafc/64748b?text=QR+Error'; }}
                                    />
                                </div>
                                <div className="max-w-xs">
                                    <p className="text-xs text-gray-400 mt-1">
                                        👉 Note: This QR code updates in real time for maximum security.
                                    </p>
                                </div>
                                <button onClick={() => setIsFullScreenQrOpen(true)} className="mt-2 flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm justify-center shadow-lg shadow-blue-600/30">
                                    <Maximize size={16} />
                                   Open Fullscreen QR

                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-4 sm:px-6 lg:px-8 py-12 relative z-10 max-w-7xl mx-auto">
                <div className={`transition-all duration-1000 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                  {/* CODING PROFILE & RANKS SECTION */}
                    <section>
                        <div className="mb-8 border-b border-gray-200 pb-4 flex items-center justify-between">
                            <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                             Performance Overview                              
                            </h2>
                            <button 
                                onClick={() => setIsHandlesModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95"
                            >
                                <Edit2 size={16} />
                               Update Profiles

                            </button>
                        </div>
                        
                        {/* Ranks & Total Score */}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
  <ProfileDetailCard 
    icon={<ListOrdered />} 
    label="Global Rank" 
    value={`#${userData.globalRank}`} 
    variant="primary"
  />

  <ProfileDetailCard 
    icon={<Users />} 
    label="Batch Rank" 
    value={`#${userData.batchRank}`} 
    variant="secondary"
  />

  <ProfileDetailCard 
    icon={<Gauge />} 
    label="Total Score" 
    value={userData.codingProfile.totalScore} 
    variant="gold"
  />
</div>

                        {/* Coding Platforms */}
                        <h3 className="text-xl font-bold text-gray-800 mb-6 px-1 flex items-center gap-2">
                            <LinkIcon size={20} className="text-blue-500" /> Linked Coding Platforms
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <ProfileDetailCard 
                                icon={lcImg}
                                isImage={true} 
                                label="LeetCode" 
                                value={userData.codingProfile.scores.leetcode || 'N/A'} 
                                description={userData.codingProfile.handles.leetcode ? `@${userData.codingProfile.handles.leetcode}` : 'Not Linked'}
                                redirectUrl={userData.codingProfile.handles.leetcode ? `https://leetcode.com/${userData.codingProfile.handles.leetcode}/` : null}
                            />
                            <ProfileDetailCard 
                                icon={gfgImg}
                                isImage={true}
                                label="GeeksForGeeks" 
                                value={userData.codingProfile.scores.gfg || 'N/A'} 
                                description={userData.codingProfile.handles.gfg ? `@${userData.codingProfile.handles.gfg}` : 'Not Linked'}
                                redirectUrl={userData.codingProfile.handles.gfg ? `https://www.geeksforgeeks.org/user/${userData.codingProfile.handles.gfg}/` : null}
                            />
                            <ProfileDetailCard 
                                icon={ccImg}
                                isImage={true}
                                label="CodeChef" 
                                value={userData.codingProfile.scores.codechef || 'N/A'} 
                                description={userData.codingProfile.handles.codechef ? `@${userData.codingProfile.handles.codechef}` : 'Not Linked'}
                                redirectUrl={userData.codingProfile.handles.codechef ? `https://www.codechef.com/users/${userData.codingProfile.handles.codechef}` : null}
                            />
                            <ProfileDetailCard 
                                icon={ghImg}
                                isImage={true}
                                label="GitHub" 
                                value={userData.codingProfile.scores.github || 'N/A'} 
                                description={userData.codingProfile.handles.github ? `@${userData.codingProfile.handles.github}` : 'Not Linked'}
                                redirectUrl={userData.codingProfile.handles.github ? `https://github.com/${userData.codingProfile.handles.github}` : null}
                            />
                        </div>
                    </section>

                </div>
            </main>

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
                rollNo={userData.rollNo} 
                sem={userData.sem} 
            />
            <UpdateHandlesModal 
                isOpen={isHandlesModalOpen} 
                onClose={() => setIsHandlesModalOpen(false)} 
                currentHandles={userData.codingProfile.handles}
                onUpdateSuccess={handleHandlesUpdate}
            />
            <FullScreenQRCodeModal isOpen={isFullScreenQrOpen} onClose={() => setIsFullScreenQrOpen(false)} qrImage={userData.qrImage} profilePhoto={userData.profilePhoto} name={userData.name} rollNo={userData.rollNo} batch={userData.batch} />
        </div>
    );
};

export default ProfilePage;