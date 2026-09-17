import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, WifiOff, ServerCrash, Zap, Lock, ShieldAlert, Home, FileQuestion, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ErrorPage = ({ type, onRetry }) => {
  const navigate = useNavigate();
  
  // State for animations and responsiveness
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isRetrying, setIsRetrying] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle 3D Parallax Effect (Desktop Only)
  const handleMouseMove = (e) => {
    if (isMobile) return;
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setMousePosition({ x, y });
  };

  // Handle Button Click
  const handleActionClick = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else if (type === 'unauthorized' || type === 'notfound') {
        navigate('/'); 
      }
      setIsRetrying(false);
    }, 1500); 
  };

  // --- CONFIGURATION MAPPING ---
  // This ensures we never lose specific text or icons
  const config = {
    network: {
        theme: 'cyan',
        MainIcon: WifiOff,
        SubIcon: Zap,
        title: "Connection Lost",
        message: "Please check your internet connection and try again.",
        buttonText: "Reconnecting...",
        idleButtonText: "Try Again",
        ButtonIcon: RefreshCw
    },
    unauthorized: {
        theme: 'rose',
        MainIcon: Lock,
        SubIcon: ShieldAlert,
        title: "Access Denied",
        message: "You do not have permission to view this secure area.",
        buttonText: "Verifying...",
        idleButtonText: "Return Home",
        ButtonIcon: Home
    },
    notfound: {
        theme: 'violet',
        MainIcon: FileQuestion,
        SubIcon: SearchX,
        title: "Page Not Found",
        message: "The page you are looking for does not exist or has been moved.",
        buttonText: "Loading...",
        idleButtonText: "Go Back Home",
        ButtonIcon: Home
    },
    default: {
        theme: 'amber',
        MainIcon: ServerCrash,
        SubIcon: Zap,
        title: "System Unavailable",
        message: "We are facing technical difficulties. Please try again shortly.",
        buttonText: "Processing...",
        idleButtonText: "Try Again",
        ButtonIcon: RefreshCw
    }
  };

  // Select config based on type
  const currentConfig = config[type] || config.default;
  const { theme, MainIcon, SubIcon, title, message, buttonText, idleButtonText, ButtonIcon } = currentConfig;

  return (
    <div 
      className="min-h-screen w-full bg-[#0B0F19] flex items-center justify-center overflow-hidden relative"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setMousePosition({ x: 0, y: 0 }); }}
    >
      {/* Background Ambience (Dynamic Color) */}
      <div className={`absolute inset-0 bg-${theme}-500/10 pointer-events-none transition-colors duration-500`}></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none"></div>
      
      {/* Floating Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full opacity-20 shadow-[0_0_10px_white]"
          initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
          animate={{ y: [null, Math.random() * -100], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear" }}
          style={{ width: Math.random() * 2 + 2 + 'px', height: Math.random() * 2 + 2 + 'px' }}
        />
      ))}

      {/* --- CONTENT CONTAINER --- */}
      <motion.div 
        className={`relative w-full max-w-sm md:max-w-[700px] z-10 transition-transform duration-200 ease-out p-6 md:p-0 ${!isMobile ? 'perspective-1000' : ''}`}
        style={!isMobile ? { rotateX: isHovering ? mousePosition.y * -10 : 0, rotateY: isHovering ? mousePosition.x * 10 : 0, transformStyle: "preserve-3d" } : {}}
      >
        
        {/* LAPTOP LID / MAIN CARD */}
        <div className={`
            relative bg-[#1F2937] md:bg-[#1F2937] 
            rounded-3xl md:rounded-t-[2rem] md:rounded-b-[1rem] 
            shadow-2xl flex flex-col items-center justify-center 
            p-1.5 md:p-2 ring-1 ring-white/10
            ${isMobile ? 'border border-white/5' : ''}
        `}>
           
           {/* Camera Notch (Desktop Only) */}
           <div className="hidden md:block absolute top-3 w-16 h-1.5 bg-black/50 rounded-full blur-[1px] z-20 left-1/2 -translate-x-1/2"></div>

           {/* SCREEN DISPLAY */}
           <div className="w-full bg-[#050505] rounded-[1.2rem] md:rounded-[1.5rem] overflow-hidden relative flex flex-col items-center justify-center text-center p-8 md:aspect-[16/10]">
              
              {/* Screen Glare (Desktop Only) */}
              <div className="hidden md:block absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-20"></div>

              {/* ICON CONTAINER */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6 md:mb-8">
                 {/* INTENSE NEON GLOW */}
                 <div className={`absolute inset-0 bg-gradient-to-b from-${theme}-400/30 to-transparent rounded-full blur-[60px] transition-colors duration-500`}></div>
                 
                 <motion.div 
                    animate={{ y: [-5, 5, -5] }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-full h-full flex items-center justify-center"
                 >
                    <div className="relative">
                        {/* Shadow Icon */}
                        <MainIcon size={80} className="text-gray-800 absolute blur-sm transform translate-y-2 opacity-50" />
                        
                        {/* Main Icon - BRIGHTER (Using 400 weight + High Drop Shadow) */}
                        <MainIcon size={80} className={`text-${theme}-400 relative z-10 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]`} />
                        
                        {/* Floating Badge (Zap/Shield) */}
                        <motion.div 
                            className="absolute -top-2 -right-2 bg-[#050505] rounded-full p-1.5 border-2 border-[#1F2937] shadow-lg" 
                            animate={{ scale: [1, 1.2, 1] }} 
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <SubIcon size={18} className={`text-${theme}-400 fill-${theme}-400`} />
                        </motion.div>
                    </div>
                 </motion.div>
              </div>

              {/* Title - Bright White */}
              <h1 className="text-2xl md:text-3xl font-black text-white mb-3 relative z-10 tracking-tight drop-shadow-md">
                {title}
              </h1>
              
              {/* Message - Lighter Gray */}
              <p className="text-slate-300 text-sm md:text-base max-w-[280px] md:max-w-sm mb-8 leading-relaxed relative z-10 font-medium">
                {message}
              </p>

              {/* ACTION BUTTON */}
              <motion.button 
                onClick={handleActionClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isRetrying}
                className={`
                    px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2.5 relative z-10 w-full md:w-auto justify-center
                    bg-${theme}-600 hover:bg-${theme}-500 text-white shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] border border-${theme}-400/30
                `}
              >
                <ButtonIcon size={18} className={`${isRetrying && (type === 'network' || type === 'default') ? 'animate-spin' : ''}`} />
                {isRetrying ? buttonText : idleButtonText}
              </motion.button>

           </div>
        </div>

        {/* LAPTOP KEYBOARD/BASE (Hidden on Mobile) */}
        <div className="hidden md:flex absolute -bottom-4 inset-x-0 h-[40px] bg-[#374151] rounded-b-[2.5rem] rounded-t-[4px] shadow-xl items-center justify-center transform-style-3d origin-top" style={{ transform: 'rotateX(80deg) translateZ(-10px)' }}>
            <div className="w-32 h-1.5 bg-gray-600/50 rounded-full mt-1"></div>
        </div>

        {/* Shadow (Desktop Only) */}
        <div className="hidden md:block absolute -bottom-20 inset-x-[10%] h-12 bg-black/40 blur-2xl rounded-[100%] pointer-events-none transition-all duration-200"
             style={{ 
                 transform: `translateX(${mousePosition.x * -30}px) scale(${1 - Math.abs(mousePosition.y) * 0.1})` 
             }}
        ></div>

      </motion.div>

    </div>
  );
};

export default ErrorPage;