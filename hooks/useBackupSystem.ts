import { useCallback, useEffect, useRef } from 'react';
import type { Trade, TradingPlan, DailyReport, Analysis } from '../types';

// Backup-Storage Keys
const BACKUP_KEYS = {
  TRADES: 'zenith_trades_backup',
  PLANS: 'zenith_plans_backup', 
  REPORTS: 'zenith_reports_backup',
  ANALYSES: 'zenith_analyses_backup',
  FULL_BACKUP: 'zenith_full_backup',
  VERSION: 'zenith_backup_version',
  LAST_BACKUP: 'zenith_last_backup'
};

// Current schema version for migration protection
const CURRENT_SCHEMA_VERSION = '1.2.0';

interface FullBackupData {
  trades: Trade[];
  tradingPlans: TradingPlan[];
  dailyReports: DailyReport[];
  analyses: Analysis[];
  version: string;
  timestamp: number;
}

class BackupSystem {
  private static instance: BackupSystem;
  private backupInterval: NodeJS.Timeout | null = null;
  private isBackingUp = false;

  static getInstance(): BackupSystem {
    if (!BackupSystem.instance) {
      BackupSystem.instance = new BackupSystem();
    }
    return BackupSystem.instance;
  }

  // Save data to localStorage with simple error handling
  private saveToStorage(key: string, data: any): boolean {
    try {
      const compressed = JSON.stringify(data);
      
      // Check data size before saving
      if (compressed.length > 5000000) { // 5MB limit
        console.warn(`Data for ${key} is too large (${compressed.length} bytes), skipping backup`);
        return false;
      }
      
      // Try to save to primary key first
      try {
        localStorage.setItem(key, compressed);
        console.log(`✅ Backup saved: ${key}`);
        return true;
    } catch (error) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          console.warn(`Quota exceeded for ${key}, clearing old backups`);
          this.clearOldBackups();
          
          // Try again after clearing
          try {
            localStorage.setItem(key, compressed);
            console.log(`✅ Backup saved after cleanup: ${key}`);
            return true;
          } catch (retryError) {
            console.error(`Failed to save ${key} even after cleanup:`, retryError);
        return false;
      }
    }
        throw error;
      }
    } catch (error) {
      console.error(`🚨 Backup failure for ${key}:`, error);
      return false;
    }
  }

  // Clear old backups to free up space
  private clearOldBackups(): void {
    try {
      const keysToRemove: string[] = [];
      
      // Find old backup keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('zenith_backup_') || 
          key.includes('zenith_trades_backup') ||
          key.includes('zenith_plans_backup') ||
          key.includes('zenith_reports_backup')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove oldest backups (keep only the 3 most recent)
      keysToRemove.sort().slice(0, Math.max(0, keysToRemove.length - 3)).forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed old backup: ${key}`);
      });
      
    } catch (error) {
      console.error('Error clearing old backups:', error);
    }
  }

  // Create a simple backup
  createBackup(trades: Trade[], tradingPlans: TradingPlan[], dailyReports: DailyReport[], analyses: Analysis[] = []): void {
    if (this.isBackingUp) return;
    
    this.isBackingUp = true;
    
    try {
      // Save individual components
      this.saveToStorage(BACKUP_KEYS.TRADES, trades);
      this.saveToStorage(BACKUP_KEYS.PLANS, tradingPlans);
      this.saveToStorage(BACKUP_KEYS.REPORTS, dailyReports);
      this.saveToStorage(BACKUP_KEYS.ANALYSES, analyses);
      
      // Save full backup
      const fullBackup: FullBackupData = {
        trades,
        tradingPlans,
        dailyReports,
        analyses,
        version: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now()
      };
      
      this.saveToStorage(BACKUP_KEYS.FULL_BACKUP, fullBackup);
      this.saveToStorage(BACKUP_KEYS.LAST_BACKUP, Date.now());
      
      console.log('✅ Backup completed successfully');
    } catch (error) {
      console.error('❌ Backup failed:', error);
    } finally {
      this.isBackingUp = false;
    }
  }

  // Restore data from backup
  restoreBackup(): FullBackupData | null {
    try {
      // Try to restore from full backup first
      const fullBackupData = localStorage.getItem(BACKUP_KEYS.FULL_BACKUP);
      if (fullBackupData) {
        const parsed = JSON.parse(fullBackupData);
        if (parsed.version === CURRENT_SCHEMA_VERSION) {
          console.log('✅ Restored from full backup');
          return parsed;
        }
      }
      
      // Fallback to individual components
      const trades = localStorage.getItem(BACKUP_KEYS.TRADES);
      const tradingPlans = localStorage.getItem(BACKUP_KEYS.PLANS);
      const dailyReports = localStorage.getItem(BACKUP_KEYS.REPORTS);
      const analyses = localStorage.getItem(BACKUP_KEYS.ANALYSES);
      
      if (trades || tradingPlans || dailyReports || analyses) {
        const backup: FullBackupData = {
          trades: trades ? JSON.parse(trades) : [],
          tradingPlans: tradingPlans ? JSON.parse(tradingPlans) : [],
          dailyReports: dailyReports ? JSON.parse(dailyReports) : [],
          analyses: analyses ? JSON.parse(analyses) : [],
          version: CURRENT_SCHEMA_VERSION,
          timestamp: Date.now()
        };
        
        console.log('✅ Restored from individual backups');
        return backup;
      }
      
      console.log('❌ No backup found');
      return null;
    } catch (error) {
      console.error('❌ Restore failed:', error);
      return null;
    }
  }

  // Start automatic backup (every 5 minutes)
  startAutoBackup(trades: Trade[], tradingPlans: TradingPlan[], dailyReports: DailyReport[], analyses: Analysis[] = []): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    this.backupInterval = setInterval(() => {
      this.createBackup(trades, tradingPlans, dailyReports, analyses);
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop automatic backup
  stopAutoBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

  // Get backup info
  getBackupInfo(): { lastBackup: number | null; hasBackup: boolean } {
    try {
      const lastBackup = localStorage.getItem(BACKUP_KEYS.LAST_BACKUP);
      const hasBackup = !!localStorage.getItem(BACKUP_KEYS.FULL_BACKUP);
      
      return {
        lastBackup: lastBackup ? parseInt(lastBackup) : null,
        hasBackup
      };
    } catch (error) {
      console.error('Error getting backup info:', error);
      return { lastBackup: null, hasBackup: false };
    }
  }
}

// Hook for using the backup system
export const useBackupSystem = () => {
  const backupSystem = useRef(BackupSystem.getInstance());

  const createBackup = useCallback((trades: Trade[], tradingPlans: TradingPlan[], dailyReports: DailyReport[], analyses: Analysis[] = []) => {
    backupSystem.current.createBackup(trades, tradingPlans, dailyReports, analyses);
  }, []);

  const restoreBackup = useCallback(() => {
    return backupSystem.current.restoreBackup();
  }, []);
  
  const startAutoBackup = useCallback((trades: Trade[], tradingPlans: TradingPlan[], dailyReports: DailyReport[], analyses: Analysis[] = []) => {
    backupSystem.current.startAutoBackup(trades, tradingPlans, dailyReports, analyses);
  }, []);
  
  const stopAutoBackup = useCallback(() => {
    backupSystem.current.stopAutoBackup();
  }, []);

  const getBackupInfo = useCallback(() => {
    return backupSystem.current.getBackupInfo();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      backupSystem.current.stopAutoBackup();
    };
  }, []);

  return {
    createBackup,
    restoreBackup,
    startAutoBackup,
    stopAutoBackup,
    getBackupInfo
  };
};