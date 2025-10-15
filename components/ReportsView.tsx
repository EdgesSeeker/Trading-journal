
import React, { useState, useEffect } from 'react';
import { Calendar, Save, BrainCircuit } from 'lucide-react';
import type { DailyReport } from '../types';
import GoalsWidget from './GoalsWidget';

type ReportsViewProps = {
    reports: DailyReport[];
    onSaveReport: (date: string, wentWell: string, wentWrong: string) => Promise<void>;
};

const ReportsView: React.FC<ReportsViewProps> = ({ reports, onSaveReport }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [wentWell, setWentWell] = useState('');
    const [wentWrong, setWentWrong] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const activeReport = reports.find(r => r.date === selectedDate);

    useEffect(() => {
        if (activeReport) {
            setWentWell(activeReport.wentWell);
            setWentWrong(activeReport.wentWrong);
        } else {
            setWentWell('');
            setWentWrong('');
        }
    }, [selectedDate, reports]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveReport(selectedDate, wentWell, wentWrong);
        setIsSaving(false);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Calendar size={20} /> Daily Report Card
                            </h3>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-md p-2 text-sm"
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">What went well today?</label>
                                <textarea
                                    value={wentWell}
                                    onChange={(e) => setWentWell(e.target.value)}
                                    placeholder="e.g., Followed my plan, cut losses quickly..."
                                    rows={5}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-300">What went wrong or could be improved?</label>
                                <textarea
                                    value={wentWrong}
                                    onChange={(e) => setWentWrong(e.target.value)}
                                    placeholder="e.g., Hesitated on entry, revenge traded..."
                                    rows={5}
                                    className="input-field"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || activeReport?.isGenerating}
                                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
                                >
                                    {isSaving || activeReport?.isGenerating ? <BrainCircuit size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isSaving ? 'Saving...' : activeReport?.isGenerating ? 'Generating Goals...' : 'Save & Generate Goals'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <GoalsWidget report={activeReport} />
                </div>
                
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Past Reports</h3>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {reports.length > 0 ? reports.map(report => (
                            <div key={report.date} className="bg-gray-800/50 p-4 rounded-lg">
                                <p className="font-semibold text-white">{report.date}</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    <strong className="text-green-400">Well:</strong> {report.wentWell.substring(0, 50)}...
                                </p>
                                <p className="text-sm text-gray-400 mt-1">
                                    <strong className="text-red-400">Wrong:</strong> {report.wentWrong.substring(0, 50)}...
                                </p>
                            </div>
                        )) : (
                            <p className="text-sm text-gray-500 text-center py-8">No past reports found.</p>
                        )}
                    </div>
                </div>

            </div>
            <style>{`.input-field { background-color: #1f2937; border: 1px solid #374151; border-radius: 0.375rem; padding: 0.75rem; width: 100%; font-size: 0.875rem; color: #d1d5db; } .input-field:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px #4f46e5; }`}</style>
        </div>
    );
};

export default ReportsView;
