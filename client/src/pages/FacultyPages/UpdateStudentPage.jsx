import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Loader2, UserCog, CheckCircle, KeyRound, 
    AlertCircle, Phone, Calendar, GitBranch, Users, Lock,
    BookOpen, Mail
} from 'lucide-react';
import Header from '../../components/Header'; 

// --- CONFIGURATION ---
const backendUrl = import.meta.env.VITE_BASE_URL;

// --- UI COMPONENTS ---

const SectionHeader = ({ title, animate, delay }) => (
    <div className={`flex items-center mb-6 transition-all duration-1000 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{ transitionDelay: `${delay}ms` }}>
        <div className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3 shadow-lg shadow-blue-500/30"></div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{title}</h2>
    </div>
);

const DetailCard = ({ icon: Icon, label, value, color = "blue" }) => {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
        pink: "bg-pink-50 text-pink-600 border-pink-100",
    };

    return (
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className={`hidden sm:flex p-3 rounded-xl border ${colorStyles[color]} bg-opacity-50`}>
                <Icon size={20} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 truncate" title={value}>{value || 'N/A'}</p>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const UpdateStudentPage = () => {
    const navigate = useNavigate();
    const [animate, setAnimate] = useState(false);
    
    // State
    const [searchRollNo, setSearchRollNo] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(false); 
    const [updateLoading, setUpdateLoading] = useState(false); 
    const [message, setMessage] = useState({ type: '', text: '' }); 

    useEffect(() => {
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 5000); // Message disappears after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [message]);
    
    const handleSearch = async (e) => {
        if(e) e.preventDefault();
        
        if (!searchRollNo.trim()) {
            setMessage({ type: 'error', text: 'Please enter a roll number.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });
        setStudentData(null);

        try {
            const response = await fetch(`${backendUrl}/api/Faculty/get-student-data/${searchRollNo.trim()}`, { 
                method: "GET", 
                credentials: "include" 
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error('Student not found.');
                if (response.status === 401 || response.status === 403) {
                    navigate('/'); return;
                }
                throw new Error('Failed to fetch student data.');
            }

            const data = await response.json();
            
            setStudentData({
                name: data.name,
                rollno: data.rollno,
                branch: data.branch,
                batch: data.batch,
                sem: data.sem,
                email: data.email,
                qrLink: data.qrLink,
                profilePhoto: `https://iare-data.s3.ap-south-1.amazonaws.com/uploads/STUDENTS/${data.rollno}/${data.rollno}.jpg`
            });

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if(!studentData) return;

        setUpdateLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: studentData.rollno,
                    semname: studentData.sem
                }),
                credentials: "include"
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    navigate('/'); return;
                }
                throw new Error(result.message || 'Failed to reset password.');
            }

            // --- UI UPDATE: CLEAR STATE ON SUCCESS ---
            setMessage({ type: 'success', text: `Success! Password for ${studentData.rollno} reset to default.` });
            setStudentData(null); // Remove profile
            setSearchRollNo('');  // Clear input

        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setUpdateLoading(false);
        }
    };

    return (
        <div className="min-h-screen font-sans bg-[#F3F4F6] pb-10">
            {/* --- HEADER SECTION --- */}
            <div className="bg-[#0F172A] pb-24 sm:pb-32 rounded-b-[2rem] sm:rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-purple-600/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 relative z-50 max-w-[1400px] mx-auto">
                    <div className="flex justify-between items-center">
                        <Header animate={animate} />
                    </div>
                    
                    <div className="mt-8 sm:mt-12 mb-6">
                        <SectionHeader title="Student Management" animate={animate} delay={200} />
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="px-4 sm:px-6 -mt-20 sm:-mt-24 relative z-20 max-w-[1400px] mx-auto">
                <div className={`bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-12 shadow-xl border border-gray-100 transition-all duration-700 min-h-[400px] ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    
                    {/* 1. Search Section */}
                    <div className="max-w-2xl mx-auto mb-8 sm:mb-10">
                        <div className="text-center mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Find Student</h3>
                            <p className="text-gray-500 mt-2 text-xs sm:text-sm">Enter the roll number to view profile details or reset credentials.</p>
                        </div>

                        <form onSubmit={handleSearch} className="flex flex-col sm:block relative">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchRollNo}
                                    onChange={(e) => {
                                        setSearchRollNo(e.target.value.toUpperCase());
                                        // Only clear message if it's an error. Keep success message visible until new search.
                                        if(message.type === 'error') setMessage({ type: '', text: '' }); 
                                    }}
                                    placeholder="Enter Roll Number"
                                    className="w-full pl-12 pr-4 sm:pr-32 py-3.5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-800 font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all shadow-sm text-sm sm:text-base"
                                />
                                {/* Desktop Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="hidden sm:flex absolute right-2 top-2 bottom-2 bg-slate-900 hover:bg-black text-white px-6 rounded-xl font-bold text-sm transition-all shadow-md items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                    Search
                                </button>
                            </div>
                            
                            {/* Mobile Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="sm:hidden mt-3 w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                Search Student
                            </button>
                        </form>

                        {/* MESSAGES: Show here if no student data is active (Error OR Success after reset) */}
                        {message.text && !studentData && (
                            <div className={`mt-4 p-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-2 ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                {message.type === 'success' ? <CheckCircle size={18} className="flex-shrink-0"/> : <AlertCircle size={18} className="flex-shrink-0" />} 
                                {message.text}
                            </div>
                        )}
                    </div>

                    <div className="w-full h-px bg-gray-100 mb-8 sm:mb-10"></div>

                    {/* 2. Student Profile Section */}
                    {studentData ? (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                                
                                {/* Left Column: Identity Card */}
                                <div className="lg:col-span-1">
                                    <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl sm:rounded-3xl border border-gray-200 p-6 sm:p-8 text-center shadow-lg relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-24 sm:h-32 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-10 group-hover:opacity-15 transition-opacity"></div>
                                        
                                        <div className="relative mb-4 sm:mb-6 mt-2">
                                            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full p-1 bg-white shadow-xl">
                                                <img
                                                    src={studentData.profilePhoto}
                                                    alt={studentData.name}
                                                    className="w-full h-full rounded-full object-cover bg-gray-200"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${studentData.name.replace(/ /g, '+')}&background=random&color=fff&size=128`;
                                                    }}
                                                />
                                            </div>
                                            <div className="absolute bottom-1 right-1/2 translate-x-10 sm:translate-x-12 bg-green-500 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 sm:border-4 border-white"></div>
                                        </div>

                                        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 break-words leading-tight">{studentData.name}</h2>
                                        <p className="text-xs sm:text-sm font-bold text-gray-500 mt-1 uppercase tracking-widest">{studentData.rollno}</p>
                                        
                                        <div className="mt-4 sm:mt-6 flex justify-center gap-2">
                                            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-bold border border-blue-200">Student</span>
                                            {studentData.qrLink && <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] sm:text-xs font-bold border border-purple-200">Active</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Details & Actions */}
                                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <DetailCard icon={GitBranch} label="Branch" value={studentData.branch} color="blue" />
                                        <DetailCard icon={Users} label="Batch" value={studentData.batch} color="purple" />
                                        <DetailCard icon={BookOpen} label="Semester" value={`Sem ${studentData.sem}`} color="emerald" />
                                        <DetailCard icon={Mail} label="Email" value={studentData.email} color="pink" />
                                    </div>

                                    {/* Action Zone */}
                                    <div className="bg-red-50 rounded-2xl sm:rounded-3xl border border-red-100 p-5 sm:p-8 mt-2">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                                            <div>
                                                <h4 className="text-base sm:text-lg font-bold text-red-900 flex items-center gap-2">
                                                    <Lock size={18} className="text-red-500"/> Security & Access
                                                </h4>
                                                <p className="text-xs sm:text-sm text-red-700/80 mt-1 sm:mt-2 font-medium leading-relaxed max-w-md">
                                                    Resets password to default: <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded text-red-800 border border-red-200">pat@currentYear</span>
                                                </p>
                                            </div>
                                            
                                            <button
                                                onClick={handleResetPassword}
                                                disabled={updateLoading}
                                                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-xl font-bold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed group text-sm sm:text-base"
                                            >
                                                {updateLoading ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} className="group-hover:rotate-12 transition-transform" />}
                                                Reset Password
                                            </button>
                                        </div>

                                        {/* Error Message inside profile (Success moves to top upon reset) */}
                                        {message.text && message.type === 'error' && (
                                            <div className="mt-4 sm:mt-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 border bg-red-100 border-red-200 text-red-800">
                                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                                <div className="font-bold text-xs sm:text-sm">{message.text}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        !loading && (
                            <div className="flex flex-col items-center justify-center py-10 sm:py-16 opacity-50">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <UserCog size={40} className="text-gray-300" />
                                </div>
                                <p className="text-gray-400 font-bold text-base sm:text-lg">No student selected</p>
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    );
};

export default UpdateStudentPage;