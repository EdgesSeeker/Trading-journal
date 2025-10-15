
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { TradingPlan } from '../types';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: Omit<TradingPlan, 'id' | 'rules'> & { rules: string }) => void;
}

const emptyPlan = {
    name: '',
    description: '',
    rules: '',
    active: true,
};

const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, onSave }) => {
    const [planData, setPlanData] = useState(emptyPlan);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setPlanData({ ...planData, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(planData);
        setPlanData(emptyPlan);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-xl shadow-2xl">
                <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                    <h3 className="text-xl font-semibold">Create New Trading Plan</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <input type="text" name="name" value={planData.name} onChange={handleChange} placeholder="Plan Name" className="input-field" required />
                    <input type="text" name="description" value={planData.description} onChange={handleChange} placeholder="Brief Description" className="input-field" />
                    <textarea name="rules" value={planData.rules} onChange={handleChange} placeholder="Rules (one per line)" rows={6} className="input-field" required />
                </form>
                <div className="p-5 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50">
                    <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold border border-gray-700 rounded-md hover:bg-gray-800 transition-colors">Cancel</button>
                    <button type="submit" onClick={handleSubmit} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                        <Save size={16} /> Create Plan
                    </button>
                </div>
            </div>
            <style>{`.input-field { background-color: #1f2937; border: 1px solid #374151; border-radius: 0.375rem; padding: 0.75rem; width: 100%; font-size: 0.875rem; color: #d1d5db; } .input-field:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px #4f46e5; }`}</style>
        </div>
    );
};

export default PlanModal;
