import React, { useEffect, useState } from 'react';
import { storageService } from '../utils/storageService';
import { BlockerProvider } from './BlockerContext';
import { StandardBlocksProvider } from './StandardBlocksContext';
import { NotificationProvider, useNotifications } from './NotificationContext';

interface StorageStatus {
  fileName: string | null;
  saving: boolean;
  mode: 'file' | 'localStorage' | 'memory';
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
  const [mode, setMode] = useState<'file' | 'localStorage' | 'memory'>('memory');

  useEffect(() => {
    storageService.init().then(() => {
      setFileName(storageService.getFileName());
      setMode(storageService.getMode());
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
    if (mode === 'memory') {
      notify('Running without persistent storage', 'warning');
    }
  }, [mode, notify]);

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
