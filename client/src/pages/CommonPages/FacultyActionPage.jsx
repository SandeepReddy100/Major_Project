import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    QrCode,
    UserCheck,
    ArrowRight,
    Layers,
    Loader2
} from 'lucide-react';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext'; 


// --- Main Action Page Component (Shared for Admin & Faculty) ---
const FacultyActionPage = () => {
    const { user, loading } = useAuth(); 
    const [animate, setAnimate] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // 1. Security Check: Wait for loading to finish
        if (!loading) {
            // Redirect if not logged in
            if (!user) {
                navigate('/', { replace: true });
                return;
            }

            // Redirect if user is NOT Admin AND NOT Faculty (e.g., Student)
            if (user.role !== 'admin' && user.role !== 'faculty') {
                navigate('/unauthorized', { replace: true });
                return;
            }
        }

        // Animation trigger
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, [user, loading, navigate]);

    // 2. Loading State
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    // 3. Determine Route for Manual Attendance based on Role
    // Admins go to their full management page, Faculty go to their specific student list
    

    const actionItems = [
        {
            title: "Single-Batch QR Scan",
            icon: <QrCode className="w-8 h-8 text-blue-600" />,
            description: "Use the camera to scan QR codes for one specific batch in a session.",
            bgColor: "bg-gradient-to-br from-blue-100 via-blue-50 to-purple-50",
            path: "/post-attendance"
        },
        {
            title: "Multi-Batch QR Scan",
            icon: <Layers className="w-8 h-8 text-sky-600" />,
            description: "Scan QR codes for multiple classes simultaneously in a single session.",
            bgColor: "bg-gradient-to-br from-sky-50 to-indigo-100",
            path: "/post-attendance-multiple"
        },
        {
            title: "Mark Attendance Manually",
            icon: <UserCheck className="w-8 h-8 text-green-600" />,
            description: `Select a batch and session to manually update the ${user.role === 'admin' ? 'system' : 'class'} roster.`,
            bgColor: "bg-gradient-to-br from-green-100 via-green-50 to-teal-50",
            path: "/mark-attendance" 
        },
    ];

    return (
        <div className="min-h-screen text-gray-800 font-sans bg-gray-50 flex flex-col">
            {/* Header Section */}
            <header className="bg-gradient-to-br from-[#071225] via-[#0A1B3A] to-[#071225] w-full shadow-lg sticky top-0 z-40">
                <div className="px-4 sm:px-6 lg:px-8 py-3">
                    <Header animate={animate} />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {actionItems.map((item, index) => (
                            <div
                                key={index}
                                onClick={() => navigate(item.path)}
                                className={`${item.bgColor} rounded-2xl p-4 md:p-6 text-gray-800 shadow-lg transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl flex flex-col border border-white/50 relative overflow-hidden group cursor-pointer ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                                style={{ transitionDelay: `${400 + index * 150}ms` }}
                            >
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-1000"></div>

                                <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-2">{item.title}</h3>
                                
                                <p className="text-sm text-gray-600 mb-6 flex-grow">{item.description}</p>
                                
                                <div className="flex items-center justify-end mt-auto">
                                    <div className="bg-gray-800 text-white font-bold py-2 px-4 rounded-lg text-sm self-end shadow-md flex items-center gap-2 group-hover:bg-gray-900 transition-colors">
                                        Proceed <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FacultyActionPage;