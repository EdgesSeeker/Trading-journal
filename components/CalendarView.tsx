
import React, { useState } from 'react';
import { Calendar, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import type { Trade } from '../types';
import WeeklyUploadModal from './WeeklyUploadModal';

type CalendarViewProps = {
    trades: Trade[];
    onImportTrades: (trades: Trade[]) => void;
};

const CalendarView: React.FC<CalendarViewProps> = ({ trades, onImportTrades }) => {
    const [selectedWeek, setSelectedWeek] = useState<{ weekStart: Date; weekEnd: Date } | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    
    // Debug: Log trades prop
    console.log('CalendarView received trades:', trades.length);

    // Helper function to get the start of the week (Sunday)
    function getWeekStart(date: Date): Date {
        const day = date.getDay();
        const diff = date.getDate() - day; // Sunday = 0, so no adjustment needed
        const weekStart = new Date(date);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }

    // Generate next 10 weeks starting from current week (Sunday to Saturday)
    const generateWeeks = () => {
        const weeks = [];
        const now = new Date();
        const currentWeekStart = getWeekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        
        for (let i = 0; i < 10; i++) {
            const weekStart = new Date(currentWeekStart.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
            const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000); // Saturday
            const weekKey = weekStart.toISOString().split('T')[0];
            
            weeks.push({
                weekKey,
                weekStart,
                weekEnd,
                pnl: 0,
                trades: [],
                openTrades: 0,
                hasUploadedFile: false,
                uploadedFileName: '',
                uploadDate: null
            });
        }
        return weeks;
    };

    // Group existing trades by week (using close date for closed trades, entry date for open trades)
    const tradesByWeek = trades.reduce((acc, t) => {
        // Use close date for closed trades, entry date for open trades
        const tradeDate = t.status === 'open' ? t.date : (t.closeDate || t.date);
        const date = new Date(tradeDate + 'T00:00:00');
        const weekStart = getWeekStart(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!acc[weekKey]) {
            acc[weekKey] = { 
                pnl: 0, 
                trades: [], 
                openTrades: 0,
                weekStart: weekStart,
                weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
                hasUploadedFile: false,
                uploadedFileName: '',
                uploadDate: null
            };
        }
        
        // Only add PnL for closed trades
        if (t.status !== 'open') {
            acc[weekKey].pnl += t.pnl;
        } else {
            acc[weekKey].openTrades += 1;
        }
        acc[weekKey].trades.push(t);
        return acc;
    }, {} as Record<string, { 
        pnl: number, 
        trades: Trade[], 
        openTrades: number,
        weekStart: Date,
        weekEnd: Date,
        hasUploadedFile: boolean,
        uploadedFileName: string,
        uploadDate: Date | null
    }>);

    // Special handling: Group all October trades (16-23) into one week based on close date
    const octoberTrades = trades.filter(t => {
        // Use close date for closed trades, entry date for open trades
        const tradeDate = t.status === 'open' ? t.date : (t.closeDate || t.date);
        const date = new Date(tradeDate);
        return date.getMonth() === 9 && date.getDate() >= 16 && date.getDate() <= 23; // October = month 9
    });
    
    if (octoberTrades.length > 0) {
        // Create a single week for October 16-23
        const octoberWeekStart = new Date(2025, 9, 16); // October 16, 2025
        const octoberWeekKey = octoberWeekStart.toISOString().split('T')[0];
        
        // Remove existing October weeks and create one consolidated week
        Object.keys(tradesByWeek).forEach(key => {
            const weekData = tradesByWeek[key];
            if (weekData.trades.some(t => {
                const tradeDate = t.status === 'open' ? t.date : (t.closeDate || t.date);
                const date = new Date(tradeDate);
                return date.getMonth() === 9 && date.getDate() >= 16 && date.getDate() <= 23;
            })) {
                delete tradesByWeek[key];
            }
        });
        
        // Create consolidated October week
        tradesByWeek[octoberWeekKey] = {
            pnl: octoberTrades.reduce((sum, t) => sum + (t.status !== 'open' ? t.pnl : 0), 0),
            trades: octoberTrades,
            openTrades: octoberTrades.filter(t => t.status === 'open').length,
            weekStart: octoberWeekStart,
            weekEnd: new Date(2025, 9, 23), // October 23, 2025
            hasUploadedFile: false,
            uploadedFileName: '',
            uploadDate: null
        };
        
        console.log(`🔄 Consolidated ${octoberTrades.length} October trades into single week (Oct 16-23)`);
    }

    // Debug: Log total trades and PnL
    console.log('CalendarView - Total trades:', trades.length);
    console.log('CalendarView - Total PnL:', trades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    console.log('CalendarView - Trades by week:', Object.keys(tradesByWeek).length, 'weeks');

    // Load upload status from localStorage
    const loadUploadStatus = () => {
        try {
            const uploads = JSON.parse(localStorage.getItem('weeklyUploads') || '{}');
            return uploads;
        } catch (error) {
            console.error('Error loading upload status:', error);
            return {};
        }
    };

    // Generate weeks and merge with existing data
    const uploadStatus = loadUploadStatus();
    const allWeeks = generateWeeks().map(week => {
        const existingWeek = tradesByWeek[week.weekKey];
        const weekUploadStatus = uploadStatus[week.weekKey];
        
        if (existingWeek) {
            // If we have trades but no upload status, mark as uploaded with generic info
            const hasUploadedFile = weekUploadStatus ? true : existingWeek.trades.length > 0;
            const uploadedFileName = weekUploadStatus?.uploadedFileName || (existingWeek.trades.length > 0 ? 'Previous Import' : '');
            const uploadDate = weekUploadStatus?.uploadDate ? new Date(weekUploadStatus.uploadDate) : (existingWeek.trades.length > 0 ? new Date() : null);
            
            return {
                ...week,
                pnl: existingWeek.pnl,
                trades: existingWeek.trades,
                openTrades: existingWeek.openTrades,
                hasUploadedFile,
                uploadedFileName,
                uploadDate
            };
        }
        
        return {
            ...week,
            hasUploadedFile: weekUploadStatus ? true : false,
            uploadedFileName: weekUploadStatus?.uploadedFileName || '',
            uploadDate: weekUploadStatus?.uploadDate ? new Date(weekUploadStatus.uploadDate) : null
        };
    });
    
    // Add consolidated October week if it exists
    if (octoberTrades.length > 0) {
        const octoberWeekStart = new Date(2025, 9, 16);
        const octoberWeekKey = octoberWeekStart.toISOString().split('T')[0];
        
        // Remove ALL October weeks from allWeeks (both Oct 16-23 and Oct 19-25)
        const filteredWeeks = allWeeks.filter(week => {
            const weekDate = new Date(week.weekStart);
            return !(weekDate.getMonth() === 9 && weekDate.getDate() >= 16 && weekDate.getDate() <= 25);
        });
        
        // Add consolidated October week
        const consolidatedWeek = {
            weekKey: octoberWeekKey,
            weekStart: octoberWeekStart,
            weekEnd: new Date(2025, 9, 23),
            pnl: octoberTrades.reduce((sum, t) => sum + (t.status !== 'open' ? t.pnl : 0), 0),
            trades: octoberTrades,
            openTrades: octoberTrades.filter(t => t.status === 'open').length,
            hasUploadedFile: true,
            uploadedFileName: 'Previous Import',
            uploadDate: new Date()
        };
        
        allWeeks.length = 0; // Clear the array
        allWeeks.push(...filteredWeeks, consolidatedWeek);
        
        console.log('🔄 Removed all October weeks and created single consolidated week');
    }

    const sortedWeeks = allWeeks.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    
    // Debug: Log sortedWeeks
    console.log('sortedWeeks length:', sortedWeeks.length);
    console.log('sortedWeeks with trades:', sortedWeeks.filter(w => w.trades.length > 0).length);

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Calendar size={20} /> Weekly Trading Overview
                </h3>
                
                {/* Show all weeks that have trades */}
                {(() => {
                    const weeksWithTrades = sortedWeeks.filter(data => data.trades.length > 0);
                    console.log('Weeks with trades:', weeksWithTrades.length);
                    console.log('First week data:', weeksWithTrades[0]);
                    
                    if (weeksWithTrades.length === 0) {
                        return (
                            <div className="text-center py-12">
                                <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
                                <p className="text-gray-400">No weeks uploaded yet</p>
                                <p className="text-sm text-gray-500 mt-2">Upload your weekly trades to see the overview</p>
                            </div>
                        );
                    }
                    
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {weeksWithTrades.slice(0, 6).map((data) => {
                            const closedTrades = data.trades.filter(t => t.status !== 'open');
                            const isWin = data.pnl >= 0;
                            const hasOpenTrades = data.openTrades > 0;
                            const isCurrentWeek = isCurrentWeekCheck(data.weekStart);
                            
                            return (
                                <div key={data.weekKey} className={`p-6 rounded-xl border-2 relative overflow-hidden transition-all hover:scale-105 hover:shadow-2xl ${
                                    isCurrentWeek
                                        ? 'border-blue-500/30 bg-blue-900/10'
                                        : hasOpenTrades && closedTrades.length === 0 
                                            ? 'border-gray-500/30 bg-gray-900/10'
                                            : isWin 
                                                ? 'border-green-500/30 bg-green-900/10' 
                                                : 'border-red-500/30 bg-red-900/10'
                                }`}>
                                    
                                    {/* Week indicator */}
                                    {isCurrentWeek && (
                                        <div className="absolute top-2 right-2">
                                            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                                Current Week
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Icon */}
                                    <div className={`absolute -top-2 -right-2 w-20 h-20 ${
                                        isCurrentWeek
                                            ? 'text-blue-500/10'
                                            : hasOpenTrades && closedTrades.length === 0
                                                ? 'text-gray-500/10'
                                                : isWin 
                                                    ? 'text-green-500/10' 
                                                    : 'text-red-500/10'
                                    }`}>
                                        <Calendar size={80}/>
                                    </div>
                                    
                                    {/* Week range */}
                                    <p className="text-sm font-semibold text-gray-300 mb-1">
                                        Week of {data.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {data.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    
                                    {/* P&L */}
                                    <p className={`text-4xl font-bold mb-2 ${
                                        isCurrentWeek
                                            ? 'text-blue-400'
                                            : hasOpenTrades && closedTrades.length === 0
                                                ? 'text-gray-400'
                                                : isWin 
                                                    ? 'text-green-400' 
                                                    : 'text-red-400'
                                    }`}>
                                        {hasOpenTrades && closedTrades.length === 0 
                                            ? 'Open'
                                            : `${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}`
                                        }
                                    </p>
                                    
                                    {/* Trade count */}
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold">{data.trades.length}</span>
                                            <span>{data.trades.length === 1 ? 'trade' : 'trades'}</span>
                                        </div>
                                        {data.openTrades > 0 && (
                                            <div className="flex items-center gap-1">
                                                <AlertCircle size={14} className="text-orange-400" />
                                                <span className="text-orange-400">{data.openTrades} open</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Win/Loss indicator */}
                                    <div className="mt-4 flex items-center gap-2">
                                        {data.trades.length > 0 ? (
                                            isWin ? (
                                                <div className="flex items-center gap-1 text-green-400">
                                                    <TrendingUp size={16} />
                                                    <span className="text-sm font-medium">Profitable Week</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-red-400">
                                                    <TrendingDown size={16} />
                                                    <span className="text-sm font-medium">Loss Week</span>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <Calendar size={16} />
                                                <span className="text-sm font-medium">No Trades</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Upload status indicator */}
                                    <div className="mt-3 pt-3 border-t border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">Upload Status</span>
                                            <div className="flex items-center gap-1">
                                                {data.hasUploadedFile ? (
                                                    <>
                                                        <CheckCircle size={14} className="text-green-400" />
                                                        <span className="text-xs text-green-400">Uploaded</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle size={14} className="text-orange-400" />
                                                        <span className="text-xs text-orange-400">Pending</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        </div>
                    );
                })()}
            </div>
            
            {/* Weekly Upload Management */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Upload size={20} className="text-blue-400" />
                    Weekly Upload Management
                </h4>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left">Week</th>
                                <th className="px-4 py-3 text-left">Trades</th>
                                <th className="px-4 py-3 text-right">P/L</th>
                                <th className="px-4 py-3 text-left">Upload Status</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedWeeks.map((data) => {
                                const isWin = data.pnl >= 0;
                                const hasOpenTrades = data.openTrades > 0;
                                const isCurrentWeek = isCurrentWeekCheck(data.weekStart);
                                
                                return (
                                    <tr key={data.weekKey} className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-gray-300">
                                                Week of {data.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {data.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {data.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-300">{data.trades.length}</span>
                                                <span className="text-gray-500">trades</span>
                                                {data.openTrades > 0 && (
                                                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                                                        {data.openTrades} open
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={`font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                {hasOpenTrades && data.trades.filter(t => t.status !== 'open').length === 0 
                                                    ? 'Open'
                                                    : `${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}`
                                                }
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                {data.hasUploadedFile ? (
                                                    <>
                                                        <CheckCircle size={16} className="text-green-400" />
                                                        <span className="text-green-400 text-sm">Uploaded</span>
                                                        {data.uploadedFileName && (
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                ({data.uploadedFileName})
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle size={16} className="text-orange-400" />
                                                        <span className="text-orange-400 text-sm">Pending</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <button 
                                                onClick={() => {
                                                    setSelectedWeek({ weekStart: data.weekStart, weekEnd: data.weekEnd });
                                                    setShowUploadModal(true);
                                                }}
                                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                                    data.hasUploadedFile 
                                                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                }`}
                                            >
                                                {data.hasUploadedFile ? 'Re-Upload' : 'Upload Week'}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Weekly Upload Modal */}
            {selectedWeek && (
                <WeeklyUploadModal
                    isOpen={showUploadModal}
                    onClose={() => {
                        setShowUploadModal(false);
                        setSelectedWeek(null);
                    }}
                    onImportTrades={onImportTrades}
                    weekStart={selectedWeek.weekStart}
                    weekEnd={selectedWeek.weekEnd}
                />
            )}
        </div>
    );

    // Helper function to check if a week is the current week
    function isCurrentWeekCheck(weekStart: Date): boolean {
        const now = new Date();
        const currentWeekStart = getWeekStart(now);
        return weekStart.getTime() === currentWeekStart.getTime();
    }
};

export default CalendarView;
