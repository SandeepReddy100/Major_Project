import React, { useState, useEffect } from 'react';

// Define a color mapping for each platform
const platformColors = {
  'GeeksforGeeks': 'bg-gradient-to-r from-green-400 to-green-600',
  'LeetCode': 'bg-gradient-to-r from-yellow-400 to-orange-500',
  'CodeChef': 'bg-gradient-to-r from-blue-400 to-indigo-600',
};

/**
 * A sub-component that renders and animates a single bar.
 */
const BarItem = ({ platform, score, maxScore, index }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const timer = setTimeout(() => {
      setWidth(percentage);
    }, 150 + index * 100);

    return () => clearTimeout(timer);
  }, [score, maxScore, index]);

  const barColor = platformColors[platform] || 'bg-gray-500';

  return (
    <div style={{ animation: `fadeInUp 0.8s ease-in-out ${index * 200}ms forwards`, opacity: 0 }}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-gray-700">{platform}</span>
        <span className="text-xs font-bold text-gray-600">
          {score} / {maxScore}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner overflow-hidden">
        <div
          // Slower (3 seconds) and smoother (ease-in-out) transition
          className={`${barColor} h-3 rounded-full transition-all duration-[3000ms] ease-in-out`}
          style={{ width: `${width}%` }}
        ></div>
      </div>
    </div>
  );
};


const BarChart = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No coding scores available.</p>
        <p className="text-sm mt-2">Start coding to see your performance!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((item, index) => (
        <BarItem
          key={item.platform}
          platform={item.platform}
          score={item.score}
          maxScore={item.maxScore}
          index={index}
        />
      ))}
    </div>
  );
};

export default BarChart;