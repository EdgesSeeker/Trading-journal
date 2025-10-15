
import React from 'react';
import { Lightbulb, CheckCircle, BrainCircuit } from 'lucide-react';
import type { DailyReport } from '../types';

type GoalsWidgetProps = {
    report?: DailyReport;
};

const GoalsWidget: React.FC<GoalsWidgetProps> = ({ report }) => {
    const renderContent = () => {
        if (report?.isGenerating) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <BrainCircuit size={24} className="animate-spin text-indigo-400 mb-2" />
                    <p className="text-sm text-gray-400">Generating your goals...</p>
                </div>
            );
        }
        
        if (!report || !report.goals || report.goals.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Lightbulb size={24} className="text-yellow-400 mb-2" />
                    <p className="text-sm text-gray-400">Your AI-generated goals will appear here after you complete a daily report.</p>
                </div>
            );
        }

        return (
            <ul className="space-y-3">
                {report.goals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="text-green-400 mt-1 flex-shrink-0" size={18} />
                        <span className="text-gray-300">{goal}</span>
                    </li>
                ))}
            </ul>
        );
    };


    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg h-full">
            <h3 className="text-lg font-semibold text-white mb-4">Focus for Next Session</h3>
            <div className="h-full min-h-[120px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default GoalsWidget;
