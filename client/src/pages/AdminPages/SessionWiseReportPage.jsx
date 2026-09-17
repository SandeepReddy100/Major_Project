import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added useNavigate
import { FileText, FileSpreadsheet, Download, Calendar, Clock, GraduationCap } from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 


// --- Reusable Helper Components ---

const SpinnerOverlay = ({ isLoading }) => {
    if (!isLoading) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-14 h-14 border-4 border-gray-500 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );
};

const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const baseStyle = "fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 text-white rounded-lg shadow-xl text-sm font-semibold z-50";
    const typeStyle = type === 'error' ? 'bg-red-500' : 'bg-green-500';

    return <div className={`${baseStyle} ${typeStyle}`}>{message}</div>;
};

// --- Main Page Component ---

const SessionReport = () => {
    const { user, logout } = useAuth(); // 2. Consume AuthContext
    const navigate = useNavigate();
    const [animate, setAnimate] = useState(false);
    
    // Form State
    const [semname, setSemname] = useState('');
    const [date, setDate] = useState('');
    const [session, setSession] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    // Constants
    const semesters = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    const backendUrl = import.meta.env.VITE_BASE_URL;

    useEffect(() => {
        // 3. Security check: Redirect if no user
        if (!user) {
            navigate('/');
            return;
        }

        // Removed sessionStorage.setItem("userRole", "admin");
        
        setDate(new Date().toISOString().split("T")[0]);
        setTimeout(() => setAnimate(true), 100);
    }, [user, navigate]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
    };

    const formatDateForFilename = (isoDate) => {
        const [year, month, day] = isoDate.split("-");
        return `${day}-${month}-${year}`;
    };

    const handleDownload = async (format) => {
        // Validation
        if (!semname) {
            showToast("⚠️ Please select a semester.", 'error');
            return;
        }
        if (!date) {
            showToast("⚠️ Please select a date.", 'error');
            return;
        }
        if (!session) {
            showToast("⚠️ Please select a session (FN/AN).", 'error');
            return;
        }

        setIsLoading(true);

        // Construct URL Query Params
        const params = new URLSearchParams();
        params.append("semname", semname);
        params.append("date", date);
        params.append("session", session);

        const isPdf = format === 'pdf';
        
        // Endpoint logic
        const endpoint = isPdf
            ? `/api/admin/session-attendance-report-pdf`
            : `/api/admin/session-attendance-report-excel`; 
        
        const fileExtension = isPdf ? 'pdf' : 'xlsx';
        const url = `${backendUrl}${endpoint}?${params.toString()}`;

        try {
            const response = await fetch(url, {
                method: "GET", 
                credentials: "include" // Important for cookies
            });
            
            // 4. Handle Session Expiry
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Download failed. No records found for this criteria.");
            }
            
            const formattedDate = formatDateForFilename(date);
            const filename = `CDC-${semname}_${session}_${formattedDate}.${fileExtension}`;

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
            
            showToast(`✅ ${format.toUpperCase()} report downloaded successfully.`, 'success');
        } catch (error) {
            console.error("Download Error:", error);
            showToast(`❌ ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <style>{`
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; }
            `}</style>
            
            <SpinnerOverlay isLoading={isLoading} />
            {toast.visible && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ ...toast, visible: false })} />}

            <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans">
                <div className="px-4 sm:px-6 lg:px-8 relative z-10">
                    <Header animate={animate} />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4"></div>
                </div>

                <main className="flex justify-center items-center pt-10 pb-20 px-4">
                    <div className={`bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-white/10 transition-all duration-500 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="text-center mb-6">
                            <div className="mx-auto h-14 w-14 bg-blue-500/10 rounded-full flex items-center justify-center border-2 border-blue-400/30">
                                <Download className="h-7 w-7 text-blue-300" />
                            </div>
                            <h1 className="mt-3 text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                                Session Attendance Report
                            </h1>
                            <p className="mt-1 text-sm text-gray-400">
                                Generate reports based on Semester, Date, and Session.
                            </p>
                        </div>
                        
                        <div className="space-y-6">
                            
                            {/* 1. Semester Selection */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-md font-semibold text-gray-300">
                                    <GraduationCap size={18} /> 1. Select Semester
                                </label>
                                <div className="relative">
                                    <select
                                        value={semname}
                                        onChange={(e) => setSemname(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled className="text-gray-500 bg-[#0A1B3A]">Choose Semester</option>
                                        {semesters.map((sem) => (
                                            <option key={sem} value={sem} className="bg-[#0A1B3A]">
                                                Semester {sem}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* 2. Date Selection */}
                                <div className="space-y-3">
                                    <label htmlFor="date" className="flex items-center gap-2 text-md font-semibold text-gray-300">
                                        <Calendar size={18}/> 2. Select Date
                                    </label>
                                    <input
                                        type="date"
                                        id="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>

                                {/* 3. Session Selection */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-md font-semibold text-gray-300">
                                        <Clock size={18}/> 3. Select Session
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => setSession('FN')} 
                                            className={`p-3 rounded-lg text-sm font-semibold transition-all border border-transparent ${session === 'FN' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                                        >
                                            Forenoon (FN)
                                        </button>
                                        <button 
                                            onClick={() => setSession('AN')} 
                                            className={`p-3 rounded-lg text-sm font-semibold transition-all border border-transparent ${session === 'AN' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                                        >
                                            Afternoon (AN)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Download section */}
                            <div className="space-y-3 pt-6 border-t border-white/10">
                                <label className="block text-md font-semibold text-gray-300 text-center mb-2">
                                    4. Download Report
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleDownload('pdf')}
                                        disabled={isLoading}
                                        className="group w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A1B3A] focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FileText size={20} /> PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownload('excel')}
                                        disabled={isLoading}
                                        className="group w-full flex items-center justify-center gap-3 px-4 py-3 bg-purple-600 text-white font-semibold rounded-xl shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A1B3A] focus:ring-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FileSpreadsheet size={20} /> Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default SessionReport;