import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Calendar, Target, Edit, Trash2, Save, X, ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { Analysis } from '../types';

type FocusListViewProps = {
  analyses: Analysis[];
  onSaveAnalysis: (analysis: Omit<Analysis, 'id'>) => void;
  onDeleteAnalysis: (id: number) => void;
  onUpdateAnalysis: (id: number, analysis: Partial<Analysis>) => void;
};

const FocusListView: React.FC<FocusListViewProps> = ({
  analyses,
  onSaveAnalysis,
  onDeleteAnalysis,
  onUpdateAnalysis
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState<Analysis | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [newAnalysis, setNewAnalysis] = useState({
    symbol: '',
    title: '',
    fullAnalysis: '',
    technicals: '',
    tags: [] as string[]
  });

  const extractRankingNumber = (text: string): number => {
    const rankingMatch = text.match(/Ranking\s*(\d+)/i);
    return rankingMatch ? parseInt(rankingMatch[1]) : 0;
  };

  // Group analyses by date
  const analysesByDate = useMemo(() => {
    const grouped = analyses.reduce((acc, analysis) => {
      const date = analysis.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(analysis);
      return acc;
    }, {} as Record<string, Analysis[]>);

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedDates.map(date => ({
      date,
      analyses: grouped[date].sort((a, b) => {
        const aRanking = extractRankingNumber(a.fullAnalysis);
        const bRanking = extractRankingNumber(b.fullAnalysis);
        return bRanking - aRanking; // Absteigend nach Ranking sortieren
      })
    }));
  }, [analyses]);

  const extractSymbol = (text: string): string => {
    // Try multiple patterns to extract symbol
    const patterns = [
      /^([A-Z]{1,6})\s*\(/,  // SYMBOL ( at start
      /\(([A-Z]{1,6})\)/,    // (SYMBOL) anywhere
      /^([A-Z]{1,6})\s/,     // SYMBOL at start followed by space
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '';
  };

  const handleTextChange = (text: string) => {
    const symbol = extractSymbol(text);
    const title = symbol ? `${symbol} Analysis` : 'Analysis';
    
    setNewAnalysis(prev => ({
      ...prev,
      symbol: symbol || 'UNKNOWN',
      title,
      fullAnalysis: text
    }));
  };

  const handleSaveAnalysis = useCallback(() => {
    if (!newAnalysis.fullAnalysis.trim()) {
      return;
    }

    const symbol = newAnalysis.symbol || 'UNKNOWN';
    const title = newAnalysis.title || `${symbol} Analysis`;

    onSaveAnalysis({
      symbol,
      title,
      fullAnalysis: newAnalysis.fullAnalysis,
      technicals: newAnalysis.technicals,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      tags: []
    });

    setNewAnalysis({
      symbol: '',
      title: '',
      fullAnalysis: '',
      technicals: '',
      tags: []
    });
    setShowAddModal(false);
  }, [newAnalysis, onSaveAnalysis]);

  const handleEditAnalysis = useCallback((analysis: Analysis) => {
    setEditingAnalysis(analysis);
    setNewAnalysis({
      symbol: analysis.symbol,
      title: analysis.title,
      fullAnalysis: analysis.fullAnalysis,
      technicals: analysis.technicals,
      tags: analysis.tags
    });
    setShowAddModal(true);
  }, []);

  const handleUpdateAnalysis = useCallback(() => {
    if (!editingAnalysis || !newAnalysis.fullAnalysis.trim()) {
      return;
    }

    onUpdateAnalysis(editingAnalysis.id, {
      symbol: newAnalysis.symbol,
      title: newAnalysis.title,
      fullAnalysis: newAnalysis.fullAnalysis,
      technicals: newAnalysis.technicals,
      tags: newAnalysis.tags
    });

    setEditingAnalysis(null);
    setNewAnalysis({
      symbol: '',
      title: '',
      fullAnalysis: '',
      technicals: '',
      tags: []
    });
    setShowAddModal(false);
  }, [editingAnalysis, newAnalysis, onUpdateAnalysis]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toggleDayExpansion = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const exportDayAnalyses = (analyses: Analysis[]) => {
    const exportText = analyses.map(analysis => {
      return `${analysis.symbol} Analysis - ${analysis.date}\n${'='.repeat(50)}\n${analysis.fullAnalysis}${analysis.technicals ? `\n\nTechnicals:\n${analysis.technicals}` : ''}\n\n${'='.repeat(50)}\n`;
    }).join('\n');

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyses-${analyses[0]?.date || 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseAnalysisContent = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const sections: { [key: string]: string[] } = {};
    let currentSection = 'overview';
    
    lines.forEach(line => {
      if (line.match(/^What they do/i)) {
        currentSection = 'whatTheyDo';
        sections[currentSection] = [];
      } else if (line.match(/^Bullcase/i)) {
        currentSection = 'bullcase';
        sections[currentSection] = [];
      } else if (line.match(/^Catalyst/i)) {
        currentSection = 'catalyst';
        sections[currentSection] = [];
      } else if (line.match(/^Ranking/i)) {
        currentSection = 'summary';
        sections[currentSection] = [];
      } else if (line.trim()) {
        if (!sections[currentSection]) {
          sections[currentSection] = [];
        }
        sections[currentSection].push(line);
      }
    });

    return sections;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Focus List</h2>
          <p className="text-gray-400">Manage your stock analyses by day</p>
        </div>
            <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
          <Plus size={20} />
          Add Analysis
            </button>
        </div>
        
      {/* Analyses by Date */}
      <div className="space-y-6">
        {analysesByDate.length === 0 ? (
          <div className="text-center py-12">
            <Target size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No analyses yet</p>
            <p className="text-sm text-gray-500 mt-2">Add your first stock analysis to get started</p>
          </div>
        ) : (
          analysesByDate.map(({ date, analyses }) => {
            const isExpanded = expandedDays.has(date);
            
            return (
              <div key={date} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleDayExpansion(date)}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <Calendar size={20} className="text-indigo-400" />
                    <h3 className="text-lg font-semibold text-white">{formatDate(date)}</h3>
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm">
                      {analyses.length} {analyses.length === 1 ? 'Analysis' : 'Analyses'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => exportDayAnalyses(analyses)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm transition-colors"
                  >
                    <Download size={16} />
                    Export Day
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="grid gap-4">
                    {analyses.map((analysis) => {
                      const parsedContent = parseAnalysisContent(analysis.fullAnalysis);
                      
                      return (
                        <div key={analysis.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-white">{analysis.symbol}</h4>
                              {(() => {
                                const ranking = extractRankingNumber(analysis.fullAnalysis);
                                if (ranking > 0) {
                                  const getRankingColor = (rank: number) => {
                                    if (rank >= 8) return 'bg-green-600 text-white';
                                    if (rank >= 6) return 'bg-yellow-600 text-white';
                                    if (rank >= 4) return 'bg-orange-600 text-white';
                                    return 'bg-red-600 text-white';
                                  };
                                  return (
                                    <span className={`px-2 py-1 rounded-full text-sm font-bold ${getRankingColor(ranking)}`}>
                                      {ranking}/10
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditAnalysis(analysis)}
                                className="text-gray-400 hover:text-indigo-400 transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => onDeleteAnalysis(analysis.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Parsed Content Display */}
                          <div className="space-y-3">
                            {parsedContent.summary && (
                              <div>
                                <h5 className="text-sm font-semibold text-red-400 mb-1">Summary:</h5>
                                <ul className="text-sm text-gray-300 space-y-1">
                                  {parsedContent.summary.map((line, index) => {
                                    // Remove the ranking number from the summary line
                                    const cleanLine = line.replace(/^\d+\s*–\s*/, '');
                                    return (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-red-400 -mt-0.5">▪</span>
                                        <span>{cleanLine}</span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}

                            {analysis.technicals && (
                              <div>
                                <h5 className="text-sm font-semibold text-purple-400 mb-1">Technicals:</h5>
                                <div className="flex items-start gap-2">
                                  <span className="text-purple-400 -mt-0.5">▪</span>
                                  <p className="text-sm text-gray-300">{analysis.technicals}</p>
                                </div>
                              </div>
                            )}

                            {parsedContent.overview && (
                              <div>
                                <h5 className="text-sm font-semibold text-orange-400 mb-1">News:</h5>
                                <ul className="text-sm text-gray-300 space-y-1">
                                  {parsedContent.overview.map((line, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-orange-400 -mt-0.5">▪</span>
                                      <span>{line}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {parsedContent.whatTheyDo && (
                              <div>
                                <h5 className="text-sm font-semibold text-green-400 mb-1">What they do:</h5>
                                <ul className="text-sm text-gray-300 space-y-1">
                                  {parsedContent.whatTheyDo.map((line, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-green-400 -mt-0.5">▪</span>
                                      <span>{line}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {parsedContent.bullcase && (
                              <div>
                                <h5 className="text-sm font-semibold text-blue-400 mb-1">Bullcase:</h5>
                                <ul className="text-sm text-gray-300 space-y-1">
                                  {parsedContent.bullcase.map((line, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-blue-400 -mt-0.5">▪</span>
                                      <span>{line}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {parsedContent.catalyst && (
                              <div>
                                <h5 className="text-sm font-semibold text-yellow-400 mb-1">Catalyst:</h5>
                                <ul className="text-sm text-gray-300 space-y-1">
                                  {parsedContent.catalyst.map((line, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <span className="text-yellow-400 -mt-0.5">▪</span>
                                      <span>{line}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
            </div>
          </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingAnalysis ? 'Edit Analysis' : 'Add New Analysis'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAnalysis(null);
                  setNewAnalysis({
                    symbol: '',
                    title: '',
                    fullAnalysis: '',
                    technicals: '',
                    tags: []
                  });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Symbol (Auto-detected)
                </label>
                <input
                  type="text"
                  value={newAnalysis.symbol}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Symbol wird automatisch aus dem Text erkannt</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Analysis *
                </label>
                <textarea
                  value={newAnalysis.fullAnalysis}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Füge hier deine komplette Stock-Analyse ein..."
                  rows={12}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Technicals
                </label>
                <textarea
                  value={newAnalysis.technicals}
                  onChange={(e) => setNewAnalysis(prev => ({ ...prev, technicals: e.target.value }))}
                  placeholder="Füge hier deine technische Analyse ein..."
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={editingAnalysis ? handleUpdateAnalysis : handleSaveAnalysis}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Save size={16} />
                  {editingAnalysis ? 'Update Analysis' : 'Save Analysis'}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAnalysis(null);
                    setNewAnalysis({
                      symbol: '',
                      title: '',
                      fullAnalysis: '',
                      technicals: '',
                      tags: []
                    });
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusListView;