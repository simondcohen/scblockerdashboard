import React, { useEffect, useState } from 'react';
import { storageService } from '../utils/storageService';
import { BlockerProvider } from './BlockerContext';
import { StandardBlocksProvider } from './StandardBlocksContext';
import { NotificationProvider, useNotifications } from './NotificationContext';

interface StorageStatus {
  fileName: string | null;
  saving: boolean;
  mode: 'file' | 'localStorage' | 'memory' | 'needs-permission';
  changeFile: () => Promise<void>;
}

const StorageContext = React.createContext<StorageStatus | undefined>(undefined);

export const useStorage = () => {
  const ctx = React.useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within StorageProvider');
  return ctx;
};

const InnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notify } = useNotifications();
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'file' | 'localStorage' | 'memory' | 'needs-permission'>('memory');
  const [hasShownMemoryWarning, setHasShownMemoryWarning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    storageService.init().then(() => {
      setFileName(storageService.getFileName());
      setMode(storageService.getMode());
      setIsInitialized(true);
    });
    const fileCb = (n: string | null) => setFileName(n);
    const saveCb = (s: boolean) => setSaving(s);
    const modeCb = () => setMode(storageService.getMode());
    storageService.subscribeFile(fileCb);
    storageService.subscribeSaving(saveCb);
    storageService.subscribeMode(modeCb);
    return () => {
      storageService.unsubscribeFile(fileCb);
      storageService.unsubscribeSaving(saveCb);
      storageService.unsubscribeMode(modeCb);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (mode === 'memory' && !hasShownMemoryWarning) {
      setHasShownMemoryWarning(true);
      notify('No file selected. Click "Enable Storage" to save your data.', 'warning');
    } else if (mode === 'needs-permission' && !hasShownMemoryWarning) {
      setHasShownMemoryWarning(true);
      notify('Storage permission needed. Click "Restore Access" to continue.', 'warning');
    } else if (mode === 'file' || mode === 'localStorage') {
      setHasShownMemoryWarning(false);
    }
  }, [mode, hasShownMemoryWarning, isInitialized, notify]);

  const changeFile = async () => {
    await storageService.changeFile();
    setFileName(storageService.getFileName());
    setMode(storageService.getMode());
  };

  return (
    <StorageContext.Provider value={{ fileName, saving, mode, changeFile }}>
      <BlockerProvider>
        <StandardBlocksProvider>{children}</StandardBlocksProvider>
      </BlockerProvider>
    </StorageContext.Provider>
  );
};

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificationProvider>
    <InnerProvider>{children}</InnerProvider>
  </NotificationProvider>
);
