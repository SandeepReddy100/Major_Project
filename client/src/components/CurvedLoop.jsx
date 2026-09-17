import React, { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

const CurvedLoop = ({
  marqueeText = "Welcome to React Bits ✦",
  speed = 1, // Rotation speed
  direction = "left", // 'left' or 'right'
  curveAmount = 500, // Higher = larger circle/less curve
  interactive = false, // Stops on hover if true
  className = "",
}) => {
  const [rotation, setRotation] = useState(0);
  const controls = useAnimation();

  useEffect(() => {
    // Calculate full rotation duration based on speed
    // Base duration for 1 full rotation (adjust divider to tune base speed)
    const duration = 20 / speed;

    controls.start({
      rotate: direction === "right" ? 360 : -360,
      transition: {
        duration: duration,
        ease: "linear",
        repeat: Infinity,
      },
    });
  }, [speed, direction, controls]);

  const handleMouseEnter = () => {
    if (interactive) controls.stop();
  };

  const handleMouseLeave = () => {
    if (interactive) {
      const duration = 20 / speed;
      controls.start({
        rotate: direction === "right" ? 360 : -360,
        transition: {
          duration: duration,
          ease: "linear",
          repeat: Infinity,
        },
      });
    }
  };

  // Helper to calculate circle radius
  // We approximate the path radius based on the curveAmount
  const radius = curveAmount / 2;
  const viewBoxSize = curveAmount + 100; // Add padding

  return (
    <div
      className={`relative flex items-center justify-center overflow-visible ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: `${viewBoxSize}px`, height: `${viewBoxSize}px` }}
    >
      <motion.div
        animate={controls}
        className="origin-center"
        style={{ width: "100%", height: "100%" }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Define the path. 
            M = Move to start (center-top)
            m = relative move
            a = elliptical arc
          */}
          <path
            id="curvePath"
            fill="transparent"
            d={`
              M ${viewBoxSize / 2}, ${viewBoxSize / 2}
              m -${radius}, 0
              a ${radius},${radius} 0 1,1 ${radius * 2},0
              a ${radius},${radius} 0 1,1 -${radius * 2},0
            `}
          />
          <text className="fill-current text-sm font-bold tracking-widest uppercase">
            <textPath
              href="#curvePath"
              startOffset="0%"
              // Repeated text to ensure full loop coverage
              // Ideally, you'd calculate how many times to repeat based on radius
            >
              {marqueeText} &nbsp; {marqueeText} &nbsp; {marqueeText} &nbsp; {marqueeText}
            </textPath>
          </text>
        </svg>
      </motion.div>
    </div>
  );
};

export default CurvedLoop;