
import React from 'react';
import type { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  children?: React.ReactNode;
}

const tabTitles: Record<ActiveTab, string> = {
  dashboard: 'Dashboard Overview',
  journal: 'Trade Journal',
  calendar: 'Trading Calendar',
  analytics: 'Performance Analytics',
  planning: 'Trading Plans & Strategy',
  reports: 'Daily Reports & Goals',
};

const Header: React.FC<HeaderProps> = ({ activeTab, children }) => {
  return (
    <header className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800 flex-shrink-0">
      <h2 className="text-2xl font-bold text-white capitalize">{tabTitles[activeTab]}</h2>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </header>
  );
};

export default Header;
