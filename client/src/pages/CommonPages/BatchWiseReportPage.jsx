import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { FileText, FileSpreadsheet, Download, Calendar, Info, ChevronDown, GraduationCap, Users } from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 


// --- Reusable Helper Components ---

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

    const baseStyle = "fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 text-white rounded-lg shadow-xl text-sm font-semibold transition-all duration-300 transform animate-fade-in-up z-[110]";
    const typeStyle = type === 'error' ? 'bg-red-500' : 'bg-green-500';

    return <div className={`${baseStyle} ${typeStyle}`}>{message}</div>;
};


// --- Main Page Component ---
const BatchWiseReport = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [animate, setAnimate] = useState(false);
    
    // Form State
    const [semname, setSemname] = useState('');
    const [date, setDate] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    
    // Data State
    const [fetchedBatches, setFetchedBatches] = useState([]);
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingBatches, setIsFetchingBatches] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    const backendUrl = import.meta.env.VITE_BASE_URL;
    const semesters = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        
        setDate(new Date().toISOString().split("T")[0]);
        setTimeout(() => setAnimate(true), 100);
    }, [user, navigate]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
    };

    // Fetch batches when semester changes
    const handleSemesterChange = async (semValue) => {
        setSemname(semValue);
        setSelectedBatch(''); 
        setFetchedBatches([]); 
        setIsFetchingBatches(true);

        try {
            const res = await fetch(`${backendUrl}/api/get-sem-info/${semValue}`, { 
                method: "GET", 
                credentials: "include" 
            });

            if (res.status === 401 || res.status === 403) {
                logout();
                return;
            }

            const responseData = await res.json();
            
            if (responseData.success && responseData.data) {
                setFetchedBatches(responseData.data.batches || []);
            } else {
                showToast("No batches found for this semester.", "info");
            }
        } catch (err) {
            console.error("Error fetching batches:", err);
            showToast("Failed to load batches.", "error");
        } finally {
            setIsFetchingBatches(false);
        }
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
        if (!selectedBatch) {
            showToast("⚠️ Please select a batch.", 'error');
            return;
        }

        setIsLoading(true);

        // Construct Query Params
        const params = new URLSearchParams();
        params.append("semname", semname);
        params.append("date", date);
        params.append("batch", selectedBatch);

        const isPdf = format === 'pdf';
        const endpoint = isPdf
            ? `/api/attendance-report-pdf`
            : `/api/attendance-report-excel`;
        
        const fileExtension = isPdf ? 'pdf' : 'xlsx';
        const url = `${backendUrl}${endpoint}?${params.toString()}`;

        try {
            const response = await fetch(url, {
                method : "GET", 
                credentials: "include"
            });
            
            if (response.status === 401 || response.status === 403) {
                logout();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Download failed. No records found.");
            }

            // --- BINARY DOWNLOAD LOGIC ---
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Simple filename using just the batch and extension
            const filename = `CDC-${selectedBatch}.${fileExtension}`; 

            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename; 
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
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
                /* Custom styles for better aesthetics */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 20px; }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.8); cursor: pointer; transition: transform 0.2s; }
                input[type="date"]::-webkit-calendar-picker-indicator:hover { transform: scale(1.1); }
            `}</style>
            
            <SpinnerOverlay isLoading={isLoading} />
            {toast.visible && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => setToast({ ...toast, visible: false })}
                />
            )}

            <div className="min-h-screen bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] text-white font-sans relative overflow-hidden">
                 {/* Decorative background elements */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>

                <div className="w-full px-4 sm:px-6 lg:px-8 py-2 relative z-50">
                    <Header animate={animate} />
                </div>

                <main className="w-full flex justify-center items-start pt-4 pb-20 px-4 relative z-10">
                    {/* Compact Form Container */}
                    <div className={`bg-white/5 backdrop-blur-xl rounded-2xl p-5 sm:p-6 w-full max-w-md flex flex-col shadow-2xl border border-white/10 transition-all duration-700 ease-out ${animate ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        
                        {/* Compact Header */}
                        <div className="text-center mb-5">
                            <div className="mx-auto h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center border-2 border-blue-400/30">
                                <Download className="h-5 w-5 text-blue-300" />
                            </div>
                            <h1 className="mt-3 text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
                                Batch Report
                            </h1>
                            <p className="text-gray-400 mt-1 text-xs max-w-xs mx-auto">
                                Generate daily attendance reports.
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            
                            {/* 1. Semester Selection */}
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                                    <GraduationCap size={16} /> Semester
                                </label>
                                <div className="relative">
                                    <select
                                        value={semname}
                                        onChange={(e) => handleSemesterChange(e.target.value)}
                                        className="w-full appearance-none px-3 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                    >
                                        <option value="" disabled className="bg-[#0A1B3A] text-gray-400">Choose Semester</option>
                                        {semesters.map((sem) => (
                                            <option key={sem} value={sem} className="bg-[#0A1B3A] text-white">
                                                Semester {sem}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Date Selection */}
                            <div className="space-y-1.5">
                                <label htmlFor="date" className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                                    <Calendar size={16}/> Date
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>

                            {/* 3. Batch Selection (Dynamic) */}
                            <div className="space-y-1.5 relative">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                                    <Users size={16} /> Batch
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedBatch}
                                        onChange={(e) => setSelectedBatch(e.target.value)}
                                        disabled={!semname || isFetchingBatches}
                                        className="w-full appearance-none px-3 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="" disabled className="bg-[#0A1B3A] text-gray-400">
                                            {isFetchingBatches ? "Loading..." : semname ? "Select a Batch..." : "Select Semester First"}
                                        </option>
                                        {fetchedBatches.map((batch) => (
                                            <option key={batch} value={batch} className="bg-[#0A1B3A] text-white">
                                                {batch}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                        {isFetchingBatches ? <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <ChevronDown size={16} />}
                                    </div>
                                </div>
                            </div>

                            {/* 4. Download Buttons */}
                            <div className="space-y-3 pt-4 border-t border-white/10">
                                <label className="block text-sm font-semibold text-gray-300 text-center">
                                    Format
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleDownload('pdf')}
                                        disabled={isLoading || !selectedBatch || !date || !semname}
                                        className="group w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A1B3A] focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm"
                                    >
                                        <FileText size={16} />
                                        PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownload('excel')}
                                        disabled={isLoading || !selectedBatch || !date || !semname}
                                        className="group w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white font-semibold rounded-xl shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A1B3A] focus:ring-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm"
                                    >
                                        <FileSpreadsheet size={16} />
                                        Excel
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Info Footer */}
                        <div className={`mt-5 p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-2 transition-opacity duration-500 delay-300 ${animate ? 'opacity-100' : 'opacity-0'}`}>
                            <Info size={16} className="text-blue-300 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-gray-400 leading-tight">
                                Report contains 'Present' or 'Absent' status for all students in the batch.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default BatchWiseReport;