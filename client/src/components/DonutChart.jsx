import React, { useState, useEffect } from 'react';

const DonutChart = ({ percentage = 0, presentColor = '#60A5FA', absentColor = '#374151' }) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [offset, setOffset] = useState(0);

  const sqSize = 120;
  const strokeWidth = 10;
  const radius = (sqSize - strokeWidth) / 2;
  const viewBox = `0 0 ${sqSize} ${sqSize}`;
  const circumference = radius * Math.PI * 2;

  useEffect(() => {
    // Animate the SVG circle offset for the fill effect
    const progressOffset = ((100 - percentage) / 100) * circumference;
    setOffset(progressOffset);

    // Animate the percentage text from 0 to the target value
    let start = 0;
    const end = parseInt(percentage, 10);
    if (start === end) return;

    const duration = 1500; // Animation duration in ms
    const incrementTime = (duration / end) || 20; // Avoid division by zero
    
    const timer = setInterval(() => {
      start += 1;
      setAnimatedPercentage(start);
      if (start === end) clearInterval(timer);
    }, incrementTime);

    // Cleanup on component unmount
    return () => clearInterval(timer);
  }, [percentage, circumference]);

  return (
    <div className="relative w-32 h-32 sm:w-36 sm:h-36">
      <svg width={sqSize} height={sqSize} viewBox={viewBox}>
        <circle
          className="fill-transparent"
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          stroke={absentColor}
          strokeWidth={`${strokeWidth}px`}
        />
        <circle
          className="fill-transparent transition-all duration-[1500ms] ease-out"
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          stroke={presentColor}
          strokeWidth={`${strokeWidth}px`}
          transform={`rotate(-90 ${sqSize / 2} ${sqSize / 2})`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            strokeLinecap: 'round',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-2xl sm:text-3xl text-white">
          {animatedPercentage}
          <span className="text-base sm:text-lg">%</span>
        </span>
      </div>
    </div>
  );
};

export default DonutChart;