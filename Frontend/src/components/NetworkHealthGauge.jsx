import React from 'react';
import { motion } from 'framer-motion';

const NetworkHealthGauge = ({ score, label, size = 'md' }) => {
    const sizes = {
        sm: { width: 120, stroke: 8 },
        md: { width: 180, stroke: 12 },
        lg: { width: 240, stroke: 16 }
    };

    const { width, stroke } = sizes[size];
    const radius = (width - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getColor = (score) => {
        if (score >= 80) return '#10b981'; // green
        if (score >= 60) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    const color = getColor(score);

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative" style={{ width, height: width }}>
                {/* Background circle */}
                <svg className="transform -rotate-90" width={width} height={width}>
                    <circle
                        cx={width / 2}
                        cy={width / 2}
                        r={radius}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth={stroke}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx={width / 2}
                        cy={width / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={stroke}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-bold" style={{ color }}>{score}%</span>
                </div>
            </div>
            {label && <span className="text-lg font-semibold text-cyan-400 mt-2">{label}</span>}
        </div>
    );
};

export default NetworkHealthGauge;
