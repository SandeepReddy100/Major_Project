import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../assets/Scene-1.json'; 

const Loader = () => {
  return (
    // Changes made:
    // 1. z-[9999]: Ensures it sits on top of EVERYTHING (navbars, modals, etc).
    // 2. h-screen w-screen: Forces it to fill the entire viewport exactly.
    // 3. bg-white: Sets the background to solid white.
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white h-screen w-screen">
      <div className="w-64 h-64"> 
        <Lottie 
          animationData={loadingAnimation} 
          loop={true} 
          autoplay={true}
        />
      </div>
    </div>
  );
};

export default Loader;