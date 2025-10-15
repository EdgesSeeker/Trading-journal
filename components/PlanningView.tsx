
import React from 'react';
import { Target, CheckCircle, Plus } from 'lucide-react';
import type { TradingPlan } from '../types';

type PlanningViewProps = {
    plans: TradingPlan[];
    onAddPlan: () => void;
};

const PlanningView: React.FC<PlanningViewProps> = ({ plans, onAddPlan }) => {
    return (
        <div className="space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Target size={20} /> My Trading Plans
                    </h3>
                    <button onClick={onAddPlan} className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors font-semibold">
                        <Plus size={16} /> New Plan
                    </button>
                </div>
                <div className="space-y-4">
                    {plans.map(plan => (
                        <div key={plan.id} className="border-2 border-gray-800 rounded-lg p-5 bg-gray-950/30 hover:border-indigo-500/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold text-lg text-white">{plan.name}</h4>
                                    <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${plan.active ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
                                    {plan.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="mt-4 border-t border-gray-800 pt-4">
                                <p className="text-sm font-medium mb-2 text-gray-300">Execution Rules:</p>
                                <ul className="space-y-2">
                                    {plan.rules.map((rule, idx) => (
                                        <li key={idx} className="text-sm text-gray-400 flex items-start gap-3">
                                            <CheckCircle className="text-indigo-400 mt-0.5 flex-shrink-0" size={16} />
                                            <span>{rule}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PlanningView;
