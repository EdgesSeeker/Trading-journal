import React, { useState, useMemo } from 'react';
import { Search, BarChart3, Calendar, TrendingUp, Target, Edit, Trash2 } from 'lucide-react';
import type { Analysis } from '../types';

type StockAnalysisViewProps = {
  analyses: Analysis[];
  onDeleteAnalysis: (id: number) => void;
  onUpdateAnalysis: (id: number, analysis: Partial<Analysis>) => void;
};

const StockAnalysisView: React.FC<StockAnalysisViewProps> = ({
  analyses,
  onDeleteAnalysis,
  onUpdateAnalysis
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Group analyses by symbol
  const analysesBySymbol = useMemo(() => {
    const filtered = analyses.filter(analysis => 
      analysis.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.fullAnalysis.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = filtered.reduce((acc, analysis) => {
      if (!acc[analysis.symbol]) {
        acc[analysis.symbol] = [];
      }
      acc[analysis.symbol].push(analysis);
      return acc;
    }, {} as Record<string, Analysis[]>);

    // Sort symbols alphabetically and analyses by date (newest first)
    const sortedSymbols = Object.keys(grouped).sort();
    
    return sortedSymbols.map(symbol => ({
      symbol,
      analyses: grouped[symbol].sort((a, b) => {
        const aRanking = extractRankingNumber(a.fullAnalysis);
        const bRanking = extractRankingNumber(b.fullAnalysis);
        return bRanking - aRanking; // Absteigend nach Ranking sortieren
      })
    }));
  }, [analyses, searchTerm]);

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

  const extractRankingNumber = (text: string): number => {
    const rankingMatch = text.match(/Ranking\s*(\d+)/i);
    return rankingMatch ? parseInt(rankingMatch[1]) : 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Stock Analysis</h2>
          <p className="text-gray-400">View your stock analyses grouped by symbol</p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by symbol, title, or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-80"
          />
        </div>
      </div>

      {/* Analyses by Symbol */}
      <div className="space-y-6">
        {analysesBySymbol.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">
              {searchTerm ? 'No analyses found matching your search' : 'No analyses yet'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm ? 'Try a different search term' : 'Add your first stock analysis in Focus List'}
            </p>
          </div>
        ) : (
          analysesBySymbol.map(({ symbol, analyses }) => (
            <div key={symbol} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-bold text-lg">
                    {symbol}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{symbol}</h3>
                    <p className="text-sm text-gray-400">
                      {analyses.length} {analyses.length === 1 ? 'Analysis' : 'Analyses'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar size={16} />
                  <span>Last updated: {formatDate(analyses[0].date)}</span>
                </div>
              </div>

              <div className="grid gap-4">
                {analyses.map((analysis, index) => {
                  const parsedContent = parseAnalysisContent(analysis.fullAnalysis);
                  
                  return (
                    <div key={analysis.id} className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${
                      index === 0 ? 'ring-2 ring-indigo-500/50' : ''
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
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
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-400">
                              {formatDate(analysis.date)}
                            </span>
                            {index === 0 && (
                              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                                Latest
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {/* TODO: Implement edit */}}
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
                      <div className="space-y-4">
                        {parsedContent.summary && (
                          <div>
                            <h5 className="text-sm font-semibold text-red-400 mb-2">Summary</h5>
                            <ul className="text-sm text-gray-300 space-y-1 ml-4">
                              {parsedContent.summary.map((line, idx) => {
                                // Remove the ranking number from the summary line
                                const cleanLine = line.replace(/^\d+\s*–\s*/, '');
                                return (
                                  <li key={idx} className="flex items-start gap-2">
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
                            <h5 className="text-sm font-semibold text-purple-400 mb-2">Technicals</h5>
                            <div className="flex items-start gap-2 ml-4">
                              <span className="text-purple-400 -mt-0.5">▪</span>
                              <p className="text-sm text-gray-300">{analysis.technicals}</p>
                            </div>
                          </div>
                        )}

                        {parsedContent.overview && (
                          <div>
                            <h5 className="text-sm font-semibold text-orange-400 mb-2">News</h5>
                            <ul className="text-sm text-gray-300 space-y-1 ml-4">
                              {parsedContent.overview.map((line, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-orange-400 -mt-0.5">▪</span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {parsedContent.whatTheyDo && (
                          <div>
                            <h5 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                              <TrendingUp size={14} />
                              What they do
                            </h5>
                            <ul className="text-sm text-gray-300 space-y-1 ml-4">
                              {parsedContent.whatTheyDo.map((line, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-400 -mt-0.5">▪</span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {parsedContent.bullcase && (
                          <div>
                            <h5 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                              <Target size={14} />
                              Bullcase
                            </h5>
                            <ul className="text-sm text-gray-300 space-y-1 ml-4">
                              {parsedContent.bullcase.map((line, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-400 -mt-0.5">▪</span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {parsedContent.catalyst && (
                          <div>
                            <h5 className="text-sm font-semibold text-yellow-400 mb-2">
                              Catalyst
                            </h5>
                            <ul className="text-sm text-gray-300 space-y-1 ml-4">
                              {parsedContent.catalyst.map((line, idx) => (
                                <li key={idx} className="flex items-start gap-2">
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StockAnalysisView;
