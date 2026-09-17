import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, Mail, Lock, Unlock, X, 
    Loader2, CheckCircle, AlertTriangle, 
    ShieldCheck, Fingerprint, 
    Calendar, Activity
} from 'lucide-react';
import Header from '../../components/Header'; 
import { useAuth } from '../../context/AuthContext'; 
import Loader from '../../components/Loader'; 

// --- CONFIGURATION ---
const backendUrl = import.meta.env.VITE_BASE_URL;

// --- REUSABLE UI COMPONENTS ---

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

const PasswordInput = ({ id, label, value, onChange, placeholder }) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase ml-1" htmlFor={id}>{label}</label>
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    id={id}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all text-sm"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                    title={showPassword ? "Hide Password" : "Show Password"}
                >
                    {showPassword ? <Unlock size={20} /> : <Lock size={20} />}
                </button>
            </div>
        </div>
    );
};

// --- MODALS ---

const ChangePasswordModal = ({ isOpen, onClose, adminId }) => {
    const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (isOpen) {
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
            setMessage({ text: '', type: '' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        if (passwords.newPassword !== passwords.confirmPassword) {
            setMessage({ text: "New passwords do not match.", type: 'error' });
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch(`${backendUrl}/api/auth/change-password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: adminId, ...passwords }),
                credentials: "include"
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to update password.");
            setMessage({ text: "Password updated successfully!", type: 'success' });
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"><X size={24}/></button>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Change Password</h2>
                <p className="text-sm text-gray-500 mb-6">Update your password to keep your account secure.</p>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <PasswordInput id="old" label="Current Password" value={passwords.oldPassword} onChange={e => setPasswords({...passwords, oldPassword: e.target.value})} placeholder="••••••••" />
                    <PasswordInput id="new" label="New Password" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} placeholder="••••••••" />
                    <PasswordInput id="confirm" label="Confirm New Password" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} placeholder="••••••••" />
                    
                    {message.text && (
                        <div className={`p-4 rounded-xl text-sm border flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {message.type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                            {message.text}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 mt-2">
                        <button type="button" onClick={onClose} className="py-2.5 px-5 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm">Cancel</button>
                        <button type="submit" disabled={isLoading} className="py-2.5 px-6 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Update Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const AdminProfilePage = () => {
    const { user: authUser, logout } = useAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [animate, setAnimate] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    useEffect(() => {
        if (!authUser) { navigate('/'); return; }
        setAnimate(true);
        const fetchAdminData = async () => {
            try {
                const response = await fetch(`${backendUrl}/api/admin/profile-data`, { method: "GET", credentials: "include" });
                if (!response.ok) { logout(); return; }
                const data = await response.json();
                if (data.admin) setUser({ id: data.admin.adminId, name: data.admin.name, email: data.admin.email, role: 'Administrator' });
            } catch (err) { console.error(err); } finally { setIsLoading(false); }
        };
        fetchAdminData();
    }, [authUser, navigate, logout]);

    if (isLoading) return <Loader />;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#F0F2F5] text-gray-800 font-sans">
            {/* 1. Hero / Header Section */}
            <section className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] pb-24 pt-6 rounded-bl-[3rem] rounded-br-[3rem] shadow-2xl">
                <div className="w-full px-4 sm:px-6 lg:px-10">
                    <div className="w-full">
                         <Header animate={animate} />
                    </div>
                    
                    <div className="w-full h-px bg-white/10 my-8" />
                    
                    <div className={`flex flex-col md:flex-row items-start md:items-end justify-between gap-6 transition-all duration-700 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <div className="space-y-2 text-left">
                            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">{user.name}</h1>
                            <div className="flex items-center gap-3 text-blue-300/80">
                                <Fingerprint className="w-5 h-5" />
                                <span className="font-mono text-lg tracking-wider">{user.id}</span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsPasswordModalOpen(true)} 
                            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-xl backdrop-blur-md border border-white/20 transition-all active:scale-95"
                        >
                            <Lock size={18} /> Account Security
                        </button>
                    </div>
                </div>
            </section>

            {/* 2. Content Section - FULL WIDTH, REORDERED ITEMS */}
            <main className="w-full px-4 sm:px-6 lg:px-10 -mt-12 mb-12">
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-1000 delay-200 ${animate ? 'opacity-100' : 'opacity-0'}`}>
                    
                    {/* -- ROW 1: Identity & Role -- */}
                    <ProfileDetailCard icon={<User />} label="Full Name" value={user.name} variant="primary" />
                    <ProfileDetailCard icon={<Mail />} label="Email Address" value={user.email} variant="secondary" />
                    <ProfileDetailCard icon={<ShieldCheck />} label="User Role" value={user.role} variant="primary" />
                    
                    {/* -- ROW 2: Technical & Status -- */}
                    <ProfileDetailCard icon={<Fingerprint />} label="System ID" value={user.id} />
                    <ProfileDetailCard icon={<Activity />} label="Status" value="Active Account" />
                    <ProfileDetailCard icon={<Calendar />} label="Session Date" value={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} variant="secondary" />
                
                </div>
            </main>

            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
                adminId={user.id} 
            />
        </div>
    );
};

export default AdminProfilePage;