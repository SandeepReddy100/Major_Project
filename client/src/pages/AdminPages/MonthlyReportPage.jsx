import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Download, Calendar, GraduationCap, ChevronDown } from 'lucide-react';
// Removed react-day-picker imports
import { format } from 'date-fns';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 

const SpinnerOverlay = ({ isLoading }) => {
    if (!isLoading) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="w-14 h-14 border-4 border-gray-500 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );
};

const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const baseStyle = "fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 text-white rounded-lg shadow-xl text-sm font-semibold z-[100]";
    const typeStyle = type === 'error' ? 'bg-red-500' : 'bg-green-500';

    return <div className={`${baseStyle} ${typeStyle}`}>{message}</div>;
};

// --- Main Monthly Report Page Component ---

const MonthlyReport = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [animate, setAnimate] = useState(false);
    const [semname, setSemname] = useState('');
    // State now holds string values 'YYYY-MM-DD' for native inputs
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    // Constants
    const semesters = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    const backendUrl = import.meta.env.VITE_BASE_URL;

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }

        // Set default dates strings (YYYY-MM-DD)
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        setToDate(today.toISOString().split('T')[0]);
        setFromDate(firstDayOfMonth.toISOString().split('T')[0]);
        
        setTimeout(() => setAnimate(true), 100);
    }, [user, navigate]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
    };

    const handleDownload = async () => {
        if (!semname) {
            showToast("⚠️ Please select a semester.", 'error');
            return;
        }
        if (!fromDate || !toDate) {
            showToast("⚠️ Please select both a 'From' and 'To' date.", 'error');
            return;
        }
        if (fromDate > toDate) {
            showToast("⚠️ 'From Date' cannot be after 'To Date'.", 'error');
            return;
        }

        setIsLoading(true);

        try {
            // Inputs are already YYYY-MM-DD, no formatting needed for API params
            const params = new URLSearchParams({ 
                semname: semname,
                from: fromDate, 
                to: toDate 
            });
            
            const url = `${backendUrl}/api/admin/monthly-attendance-report-excel?${params.toString()}`;

            const response = await fetch(url, { 
                method: 'GET',
                credentials: "include"
            });

            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }

            if (!response.ok) {
                throw new Error(`Download failed. No records found.`);
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Format filename date for readability (DD-MM-YYYY)
            const fDate = new Date(fromDate);
            const tDate = new Date(toDate);
            const filename = `CDC-MonthlyReport_${semname}_${format(fDate, 'dd-MM-yyyy')}_to_${format(tDate, 'dd-MM-yyyy')}.xlsx`;
            
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            a.remove();
            URL.revokeObjectURL(blobUrl);

            showToast(`✅ Excel report downloaded successfully.`, 'success');

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
            <SpinnerOverlay isLoading={isLoading} />
            {toast.visible && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ ...toast, visible: false })} />}

            <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans">
                <div className="px-4 sm:px-6 lg:px-8 py-2 relative z-10">
                    <Header animate={animate} />
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4"></div>
                </div>

                <main className="flex justify-center items-start pt-4 pb-20 px-4">
                    <div className={`bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 w-full max-w-lg flex flex-col shadow-2xl border border-white/10 transition-all duration-500 ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="text-center mb-6">
                            <div className="mx-auto h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center border-2 border-blue-400/30">
                                <Download className="h-6 w-6 text-blue-300" />
                            </div>
                            <h1 className="mt-4 text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                                Monthly Attendance Report
                            </h1>
                            <p className="mt-1 text-sm text-gray-400">
                                Select semester and date range to generate report.
                            </p>
                        </div>
                        
                        <div className="space-y-6">
                            
                            {/* Semester Selection */}
                            <div className="relative">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                                    <GraduationCap size={16} /> Select Semester
                                </label>
                                <div className="relative">
                                    <select
                                        value={semname}
                                        onChange={(e) => setSemname(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled className="bg-[#0A1B3A] text-gray-500">Choose Semester</option>
                                        {semesters.map((sem) => (
                                            <option key={sem} value={sem} className="bg-[#0A1B3A]">
                                                Semester {sem}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Standard HTML Date Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* From Date */}
                                <div className="relative">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                                        <Calendar size={16}/> From Date
                                    </label>
                                    <input 
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        max={toDate || new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [color-scheme:dark] cursor-pointer"
                                    />
                                </div>

                                {/* To Date */}
                                <div className="relative">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                                        <Calendar size={16}/> To Date
                                    </label>
                                    <input 
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        min={fromDate}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all [color-scheme:dark] cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        disabled={isLoading}
                                        className="group w-full max-w-xs flex items-center justify-center gap-3 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A1B3A] focus:ring-green-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FileSpreadsheet size={20} /> Download in Excel
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

export default MonthlyReport;