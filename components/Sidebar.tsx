
import React from 'react';
import { LayoutDashboard, BookOpen, Calendar, BarChart3, Target, TrendingUp, ClipboardList, Eye, DollarSign, FileText } from 'lucide-react';
import type { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

const NavItem = ({ icon: Icon, label, isActive, onClick }: { icon: React.ElementType, label: string, isActive: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <Icon size={20} className="mr-3" />
      <span>{label}</span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal', label: 'Trade Journal', icon: BookOpen },
    { id: 'reports', label: 'Daily Reports', icon: ClipboardList },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'planning', label: 'Planning', icon: Target },
    { id: 'focuslist', label: 'Focus List', icon: Eye },
    { id: 'stock-analysis', label: 'Stock Analysis', icon: FileText },
    { id: 'profit-taking', label: 'Profit Taking', icon: DollarSign },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex-shrink-0 p-4 border-r border-gray-800 flex flex-col">
        <div className="flex items-center gap-3 px-2 mb-8">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <TrendingUp size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Zenith Journal</h1>
        </div>
        <nav className="flex-1 space-y-2">
            {navItems.map(item => (
                <NavItem 
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                />
            ))}
        </nav>
        <div className="mt-auto text-center text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} Zenith Trading</p>
        </div>
    </aside>
  );
};

export default Sidebar;
