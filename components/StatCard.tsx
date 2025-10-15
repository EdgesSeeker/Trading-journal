
import React from 'react';

interface StatCardProps {
    icon: React.ReactElement;
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative';
    colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, change, changeType, colorClass }) => {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className={`absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full ${colorClass} opacity-20`}></div>
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass} text-white`}>
                    {icon}
                </div>
                <p className="text-sm text-gray-400 mt-4">{title}</p>
                <div className="flex items-baseline space-x-2 mt-1">
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {change && (
                        <span className={`text-xs font-semibold ${changeType === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                            {change}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatCard;
