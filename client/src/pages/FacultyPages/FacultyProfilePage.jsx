import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mail, Lock, X, Eye, EyeOff,
    Loader2, Users, BookOpen, Layers,
    User, CheckCircle, AlertTriangle,
    Briefcase, ShieldCheck
} from 'lucide-react';
import Header from '../../components/Header';
import Loader from '../../components/Loader';
import { useAuth } from '../../context/AuthContext';

const backendUrl = import.meta.env.VITE_BASE_URL;

// --- 1. HELPER: Group Subjects ---
const groupSubjectsBySemester = (rawSubjects) => {
    const grouped = {};
    if (rawSubjects && Array.isArray(rawSubjects)) {
        rawSubjects.forEach(str => {
            const parts = str.split(':'); 
            if (parts.length === 2) {
                const [semBatchInfo, subjectCode] = parts;
                const subParts = semBatchInfo.split(',');
                if (subParts.length === 2) {
                    const [sem, batch] = subParts;
                    if (!grouped[sem]) grouped[sem] = {};
                    if (!grouped[sem][subjectCode]) grouped[sem][subjectCode] = [];
                    if (!grouped[sem][subjectCode].includes(batch)) {
                        grouped[sem][subjectCode].push(batch);
                    }
                }
            }
        });
    }
    return grouped;
};

// --- 2. UI SUB-COMPONENTS ---

const ProfileDetailCard = ({ icon, label, value, variant = 'default' }) => {
    const variants = {
        default: 'bg-white/80 border-white/50 hover:shadow-xl',
        primary: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-blue-100',
        secondary: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-purple-100'
    };

    return (
        <div className={`${variants[variant]} backdrop-blur-sm rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:-translate-y-1 h-full group`}>
            <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                    {React.cloneElement(icon, {
                        className: "w-6 h-6 text-blue-600 group-hover:text-blue-700 transition-colors"
                    })}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
                    <p className="font-bold text-gray-800 text-lg break-words leading-tight">{value}</p>
                </div>
            </div>
        </div>
    );
};

const SubjectCard = ({ subjectCode, batches }) => (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <BookOpen size={20} />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-gray-800 tracking-tight group-hover:text-indigo-600 transition-colors">{subjectCode}</h4>
                    <p className="text-xs text-gray-500 font-medium">Course Code</p>
                </div>
            </div>
            <div className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                {batches.length} {batches.length === 1 ? 'Batch' : 'Batches'}
            </div>
        </div>
        
        <div className="border-t border-gray-100 pt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Layers size={10} /> Assigned Batches
            </p>
            <div className="flex flex-wrap gap-2">
                {batches.map((batch, idx) => (
                    <span 
                        key={idx} 
                        className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all cursor-default"
                    >
                        {batch}
                    </span>
                ))}
            </div>
        </div>
    </div>
);

const StatusMessage = ({ type, message }) => {
    const types = {
        success: { bg: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={20} /> },
        error: { bg: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={20} /> },
    };
    const config = types[type] || types.error;
    return (
        <div className={`${config.bg} p-3 rounded-xl border flex items-center gap-3 animate-fade-in text-sm font-medium`}>
            {config.icon}
            <span>{message}</span>
        </div>
    );
};

// --- 3. MODAL COMPONENT ---

const PasswordInput = ({ id, label, value, onChange, error, placeholder }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700" htmlFor={id}>
                {label}
            </label>
            <div className="relative group">
                <input
                    type={showPassword ? 'text' : 'password'}
                    id={id}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        error
                            ? 'border-red-300 ring-red-100 focus:ring-red-200'
                            : 'border-gray-200 focus:ring-indigo-100 focus:border-indigo-400 group-hover:border-gray-300'
                    }`}
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {error && <div className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium"><AlertTriangle size={12}/> {error}</div>}
        </div>
    );
};

const ChangePasswordModal = ({ isOpen, onClose, username }) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiMessage({ type: '', text: '' });
        
        const newErrors = {};
        if (!passwords.oldPassword) newErrors.oldPassword = 'Required';
        if (!passwords.newPassword || passwords.newPassword.length < 8) newErrors.newPassword = 'Min 8 chars';
        if (passwords.newPassword !== passwords.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        
        setIsLoading(true);
        try {
            const response = await fetch(`${backendUrl}/api/auth/change-password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    oldPassword: passwords.oldPassword,
                    newPassword: passwords.newPassword
                }),
                credentials: "include",
            });
            
            const result = await response.json();

            if (!response.ok) {
                setApiMessage({ type: 'error', text: result.message || 'Failed to update.' });
                setIsLoading(false);
                return;
            }

            setApiMessage({ type: 'success', text: 'Success! Logging out...' });
            
            setTimeout(() => {
                logout();
                navigate('/', { replace: true });
            }, 2000);

        } catch (err) {
            setApiMessage({ type: 'error', text: 'Network error occurred.' });
            setIsLoading(false);
        }
    };

    const handleChange = (field) => (e) => {
        setPasswords(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-all duration-300" onClick={onClose}>
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                                <ShieldCheck size={18} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <PasswordInput 
                            id="old" 
                            label="Current Password" 
                            placeholder="Enter current..." 
                            value={passwords.oldPassword} 
                            onChange={handleChange('oldPassword')} 
                            error={errors.oldPassword} 
                        />
                        
                        <div className="h-px bg-gray-100 my-1"></div>

                        <PasswordInput 
                            id="new" 
                            label="New Password" 
                            placeholder="Min 8 chars..." 
                            value={passwords.newPassword} 
                            onChange={handleChange('newPassword')} 
                            error={errors.newPassword} 
                        />
                        <PasswordInput 
                            id="confirm" 
                            label="Confirm Password" 
                            placeholder="Retype new password..." 
                            value={passwords.confirmPassword} 
                            onChange={handleChange('confirmPassword')} 
                            error={errors.confirmPassword} 
                        />
                        
                        {apiMessage.text && <StatusMessage type={apiMessage.type} message={apiMessage.text} />}
                        
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors" disabled={isLoading}>
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2" disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

const FacultyProfilePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [facultyData, setFacultyData] = useState(null);
    const [groupedSubjects, setGroupedSubjects] = useState({});
    const [loading, setLoading] = useState(true);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!user) { navigate('/'); return; }

        const fetchProfileData = async () => {
            try {
                const response = await fetch(`${backendUrl}/api/faculty/get-profile-data`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: "include",
                });

                if (response.status === 401 || response.status === 403) { logout(); return; }
                if (!response.ok) throw new Error("Failed to fetch profile");

                const data = await response.json();
                
                if (data.faculty) {
                    setFacultyData({
                        name: data.faculty.name,
                        facultyId: data.faculty.facultyid,
                        email: data.faculty.email,
                        profilePhoto: `https://ui-avatars.com/api/?name=${data.faculty.name.replace(/ /g, '+')}&background=0EA5E9&color=fff&bold=true&size=256`,
                    });

                    const grouped = groupSubjectsBySemester(data.faculty.subjects_assigned);
                    setGroupedSubjects(grouped);
                }
            } catch (err) {
                console.error("Fetch profile error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, [user, navigate, logout]);

    // Use Custom Loader
    if (loading) {
        return <Loader />;
    }

    if (!facultyData) return null;

    const sortedSemesters = Object.keys(groupedSubjects).sort().reverse();

    return (
        <div className="min-h-screen text-gray-800 font-sans bg-gradient-to-br from-[#F0F2F5] to-[#E5E7EB] overflow-x-hidden">
            
            {/* --- HEADER SECTION --- */}
            {/* FIX: Increased z-index to z-30 and removed 'overflow-hidden' from parent */}
            <div className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full rounded-bl-[3rem] rounded-br-[3rem] relative z-30">
                
                {/* FIX: Moved rounded classes here to clip blobs without clipping header menus */}
                <div className="absolute inset-0 overflow-hidden rounded-bl-[3rem] rounded-br-[3rem]">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
                </div>

                {/* Content Container */}
                <div className="px-4 sm:px-6 lg:px-8 relative z-20">
                    <Header animate={animate} />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-6"></div>

                    <div className={`py-12 flex items-center transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                        <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-start w-full max-w-7xl mx-auto gap-8 text-white">
                            <div className="relative flex-shrink-0">
                                <img src={facultyData.profilePhoto} alt="Profile" className="w-44 h-44 rounded-full border-4 border-white/30 shadow-2xl object-cover" />
                            </div>
                            <div className="text-center lg:text-left space-y-4">
                                <div>
                                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">{facultyData.name}</h1>
                                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                                        <Briefcase className="w-5 h-5 text-blue-300" />
                                        <p className="text-blue-300 font-medium text-lg">Faculty Member</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                                        <User className="w-4 h-4" />
                                        <span className="text-sm font-medium">{facultyData.facultyId}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                                        <Mail className="w-4 h-4" />
                                        <span className="text-sm font-medium">{facultyData.email}</span>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-center lg:justify-start">
                                    <button 
                                        onClick={() => setIsPasswordModalOpen(true)} 
                                        className="flex items-center gap-2 bg-white text-gray-900 px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-white/10 hover:bg-gray-100 hover:scale-105 transition-all"
                                    >
                                        <Lock size={14} />
                                        Change Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT SECTION --- */}
            {/* FIX: Set z-index to 10 to ensure it stays below header menus */}
            <main className="px-4 sm:px-6 lg:px-8 py-12 relative z-10 max-w-7xl mx-auto">
                <div className={`transition-all duration-1000 delay-300 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
                    
                    {/* PERSONAL INFO GRID */}
                    <section className="mb-12">
                        <div className="mb-8 border-b border-gray-200 pb-4">
                            <h2 className="text-3xl font-bold text-gray-800">Personal Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <ProfileDetailCard icon={<User />} label="Full Name" value={facultyData.name} variant="primary" />
                            <ProfileDetailCard icon={<Users />} label="Faculty ID" value={facultyData.facultyId} />
                            <ProfileDetailCard icon={<Mail />} label="Email Address" value={facultyData.email} />
                        </div>
                    </section>

                    {/* ACADEMIC ASSIGNMENTS SECTION */}
                    <section>
                        <div className="mb-8 border-b border-gray-200 pb-4">
                            <h2 className="text-3xl font-bold text-gray-800">Assigned Subjects</h2>
                            <p className="text-gray-500 mt-1">Overview of your current teaching responsibilities.</p>
                        </div>
                        
                        {sortedSemesters.length > 0 ? (
                            sortedSemesters.map(sem => (
                                <div key={sem} className="mb-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                            <span className="text-white font-bold text-lg">{sem}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800">Semester {sem}</h3>
                                        <div className="flex-grow h-px bg-gray-200 ml-4"></div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Object.entries(groupedSubjects[sem]).map(([code, batches]) => (
                                            <SubjectCard key={code} subjectCode={code} batches={batches} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-200 border-dashed">
                                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="text-gray-400 w-8 h-8" />
                                </div>
                                <h3 className="text-gray-500 font-medium text-lg">No assignments found.</h3>
                            </div>
                        )}
                    </section>

                </div>
            </main>

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
                username={facultyData.facultyId} 
            />
        </div>
    );
};

export default FacultyProfilePage;