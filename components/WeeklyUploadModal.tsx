import React, { useState, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Trade } from '../types';

interface WeeklyUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTrades: (trades: Trade[]) => void;
  weekStart: Date;
  weekEnd: Date;
}

interface ParsedTrade {
  date: string;
  symbol: string;
  type: 'Long' | 'Short';
  shares: number;
  entry: number;
  exit: number;
  stopLoss: number;
  pnl: number;
  notes: string;
  setup: string;
  timeframe: string;
  tags: string[];
  mistakes: string[];
  rating: number;
}

const WeeklyUploadModal: React.FC<WeeklyUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onImportTrades, 
  weekStart, 
  weekEnd 
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parse German number format (comma to decimal)
  const parseGermanNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const str = String(value).replace(',', '.');
    return parseFloat(str) || 0;
  };

  // Parse XTB date format to journal format
  const parseXTBDate = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    try {
      // Handle Excel serial number (e.g., 45951.6938431134)
      if (typeof dateValue === 'number') {
        // Excel serial date: days since 1900-01-01, but Excel treats 1900 as leap year
        const excelEpoch = new Date(1900, 0, 1);
        const days = Math.floor(dateValue);
        const time = (dateValue - days) * 24 * 60 * 60 * 1000;
        
        // Excel bug: treats 1900 as leap year, so we need to adjust
        const adjustedDate = new Date(excelEpoch.getTime() + (days - 2) * 24 * 60 * 60 * 1000 + time);
        
        return adjustedDate.toISOString().split('T')[0];
      }
      
      // Handle string format "17.10.2025 20:30:49"
      if (typeof dateValue === 'string') {
        const parts = dateValue.split(' ')[0].split('.');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    } catch (error) {
      console.error('Error parsing date:', dateValue, error);
    }
    
    return new Date().toISOString().split('T')[0];
  };

  // Parse Excel file and extract trades (identical to TradeUploadView)
  const parseExcelFile = async (file: File): Promise<ParsedTrade[]> => {
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 13 });
      
      if (data.length < 2) {
        throw new Error('No trade data found in file');
      }

      const trades: ParsedTrade[] = [];
      
      // Process each row (skip header row)
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[1]) continue;
        
        const trade: ParsedTrade = {
          date: parseXTBDate(row[4]), // Open time (column E)
          symbol: String(row[1] || '').trim(), // Symbol (column B)
          type: row[2] === 'SELL' ? 'Short' : 'Long', // Type (column C)
          shares: parseGermanNumber(row[3]), // Volume (column D)
          entry: parseGermanNumber(row[5]), // Open price (column F)
          exit: parseGermanNumber(row[7]), // Close price (column H)
          stopLoss: parseGermanNumber(row[12]), // SL (column M)
          pnl: parseGermanNumber(row[18]), // Gross P/L (column S)
          notes: String(row[19] || '').trim(), // Comment (column T)
          setup: 'XTB Import',
          timeframe: '1d',
          tags: [],
          mistakes: [],
          rating: 3
        };

        // Only add valid trades - EXACT same logic as TradeUploadView
        if (trade.symbol && trade.shares > 0 && trade.entry > 0 && trade.exit > 0) {
          trades.push(trade);
        }
      }
      
      console.log(`Parsed ${trades.length} trades from Excel file`);
      return trades;
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please upload an Excel (.xlsx) file');
      return;
    }

    setUploadedFile(file);
    setError(null);
    setSuccessMessage(null);
    setIsParsing(true);

    try {
      const trades = await parseExcelFile(file);
      setParsedTrades(trades);
      
      if (trades.length === 0) {
        setError('No valid trades found in the uploaded file');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to parse file');
      setParsedTrades([]);
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Import trades to journal
  const handleImportTrades = useCallback(() => {
    if (parsedTrades.length === 0) {
      setError('No trades to import');
      return;
    }

    try {

    // Convert ParsedTrade to Trade format (IDENTICAL to TradeUploadView)
    const tradesToImport: Trade[] = parsedTrades.map(trade => {
      // Calculate R-Multiple (Risk/Reward ratio)
      let rMultiple = 0;
      let profitPercentage = 0;
      let distanceToSL = 0;
      
      if (trade.stopLoss > 0) {
        // Calculate risk amount (distance from entry to stop loss)
        let riskAmount = 0;
        
        if (trade.type === 'Long') {
          // For Long: Risk = Entry - Stop Loss
          riskAmount = (trade.entry - trade.stopLoss) * trade.shares;
          // % Distanz zum SL = (Entry - SL) / Entry * 100
          distanceToSL = ((trade.entry - trade.stopLoss) / trade.entry) * 100;
        } else {
          // For Short: Risk = Stop Loss - Entry
          riskAmount = (trade.stopLoss - trade.entry) * trade.shares;
          // % Distanz zum SL = (SL - Entry) / Entry * 100
          distanceToSL = ((trade.stopLoss - trade.entry) / trade.entry) * 100;
        }
        
        // Calculate % Gewinn = (Exit - Entry) / Entry * 100
        if (trade.type === 'Long') {
          profitPercentage = ((trade.exit - trade.entry) / trade.entry) * 100;
        } else {
          profitPercentage = ((trade.entry - trade.exit) / trade.entry) * 100;
        }
        
        // If risk amount > 0, calculate R-Multiple
        if (riskAmount > 0) {
          // Calculate R-Multiple based on point movement, not dollar P/L
          let pointMovement = 0;
          
          if (trade.type === 'Long') {
            pointMovement = trade.exit - trade.entry;
          } else {
            pointMovement = trade.entry - trade.exit;
          }
          
          // R-Multiple = Point Movement / Risk in Points
          let riskInPoints = 0;
          if (trade.type === 'Long') {
            riskInPoints = trade.entry - trade.stopLoss;
          } else {
            riskInPoints = trade.stopLoss - trade.entry;
          }
          
          if (riskInPoints > 0) {
            rMultiple = pointMovement / riskInPoints;
            
            // Cap R-Multiple to realistic values
            // For losses, max -1.0 (stop loss hit)
            // For profits, allow unlimited values
            if (rMultiple < -1.0) {
              rMultiple = -1.0; // Stop loss hit = -1R
            }
          }
        }
      }
      
      return {
        id: Date.now() + Math.random(), // Generate unique ID
        date: trade.date,
        symbol: trade.symbol,
        type: trade.type,
        entry: trade.entry,
        exit: trade.exit,
        stopLoss: trade.stopLoss > 0 ? trade.stopLoss : undefined,
        shares: trade.shares,
        pnl: trade.pnl,
        setup: trade.setup,
        timeframe: trade.timeframe,
        notes: trade.notes,
        rating: trade.rating,
        tags: trade.tags,
        mistakes: trade.mistakes,
        rMultiple: parseFloat(rMultiple.toFixed(2)),
        status: 'closed',
        entryDate: trade.date,
        side: trade.type === 'Long' ? 'BUY' : 'SELL',
        profitTakingCompleted: false,
        trailingMA: '20',
        profitPercentage: parseFloat(profitPercentage.toFixed(2)),
        distanceToSL: parseFloat(distanceToSL.toFixed(2))
      };
    });

    // Mark the week as uploaded with file info
    const weekData = {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      uploadedFileName: uploadedFile?.name || '',
      uploadDate: new Date().toISOString()
    };

    // Store upload info in localStorage (with error handling for quota)
    try {
      const existingUploads = JSON.parse(localStorage.getItem('weeklyUploads') || '{}');
      existingUploads[weekData.weekStart] = weekData;
      localStorage.setItem('weeklyUploads', JSON.stringify(existingUploads));
    } catch (error) {
      console.warn('Could not save upload status to localStorage:', error);
      // Continue with import even if localStorage fails
    }

      // Debug: Log import details
      console.log('WeeklyUploadModal - Importing trades:', tradesToImport.length);
      console.log('WeeklyUploadModal - Total PnL:', tradesToImport.reduce((sum, t) => sum + (t.pnl || 0), 0));
      console.log('WeeklyUploadModal - Sample trades:', tradesToImport.slice(0, 3));

      onImportTrades(tradesToImport);
      setSuccessMessage(`Successfully imported ${tradesToImport.length} trades!`);
      
      // Close modal after successful import
      setTimeout(() => {
        onClose();
        setUploadedFile(null);
        setParsedTrades([]);
        setSuccessMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Error importing trades:', error);
      setError(`Failed to import trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [parsedTrades, onImportTrades, onClose, uploadedFile, weekStart, weekEnd]);

  // Clear all data
  const handleClear = useCallback(() => {
    setUploadedFile(null);
    setParsedTrades([]);
    setError(null);
    setSuccessMessage(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            Upload Week: {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              <span className="text-green-400">{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* File Upload Section */}
          <div className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-all ${
            isDragging ? 'border-blue-500 bg-blue-900/10' : 'border-gray-600 bg-gray-800/20'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-semibold mb-2">Upload XTB Excel Statement</h4>
            <p className="text-gray-400 mb-4">Drag and drop your XTB Excel file here, or click to browse</p>
            
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileInputChange}
              className="hidden"
              id="weekly-file-upload"
            />
            
            <label htmlFor="weekly-file-upload" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
              Choose File
            </label>
            
            {uploadedFile && (
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg flex items-center justify-center gap-2">
                <FileText size={20} className="text-green-400" />
                <span className="text-gray-300">{uploadedFile.name}</span>
              </div>
            )}
          </div>

          {/* Parsing Status */}
          {isParsing && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center mb-6">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Parsing Excel file...</p>
            </div>
          )}

          {/* Preview Section */}
          {parsedTrades.length > 0 && !isParsing && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <h4 className="text-lg font-semibold">Preview ({parsedTrades.length} trades)</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleClear}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleImportTrades}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                  >
                    <CheckCircle size={14} />
                    Import All Trades
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Symbol</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-right">Entry</th>
                      <th className="px-3 py-2 text-right">Exit</th>
                      <th className="px-3 py-2 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTrades.map((trade, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="px-3 py-2 text-gray-300">{trade.date}</td>
                        <td className="px-3 py-2 font-semibold text-white">{trade.symbol}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.type === 'Long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-300 text-right">${trade.entry.toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-300 text-right">${trade.exit.toFixed(2)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${
                          trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyUploadModal;
