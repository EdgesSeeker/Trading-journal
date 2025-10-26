import { useState, useCallback } from 'react';

interface BackupStatus {
  isBackingUp: boolean;
  lastBackupTime: number | null;
  backupError: string | null;
  totalBackups: number;
}

export const useBackupStatus = () => {
  const [status, setStatus] = useState<BackupStatus>({
    isBackingUp: false,
    lastBackupTime: null,
    backupError: null,
    totalBackups: 0
  });

  const startBackup = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isBackingUp: true,
      backupError: null
    }));
  }, []);

  const completeBackup = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isBackingUp: false,
      lastBackupTime: Date.now(),
      totalBackups: prev.totalBackups + 1
    }));
  }, []);

  const setBackupError = useCallback((error: string) => {
    setStatus(prev => ({
      ...prev,
      isBackingUp: false,
      backupError: error
    }));
  }, []);

  return {
    status,
    startBackup,
    completeBackup,
    setBackupError
  };
};

