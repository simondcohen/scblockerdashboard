import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Block, StandardBlock, StorageData } from '../types';

// IndexedDB helpers for storing the file handle
const HANDLE_DB = 'blocker-dashboard-db';
const HANDLE_STORE = 'file-handles';
const HANDLE_KEY = 'dataFile';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(HANDLE_STORE);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

const getStoredHandle = async (): Promise<FileSystemFileHandle | null> => {
  try {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction(HANDLE_STORE, 'readonly');
      const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const storeHandle = async (handle: FileSystemFileHandle) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite');
      tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

const clearStoredHandle = async () => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, 'readwrite');
      tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

const reviver = (key: string, value: unknown) => {
  if (key === 'startTime' || key === 'endTime' || key === 'failedAt') {
    return value ? new Date(value as string) : value;
  }
  return value;
};

const isValidStorageData = (data: unknown): data is StorageData => {
  return (
    typeof data === 'object' &&
    !!data &&
    (data as StorageData).version !== undefined &&
    Array.isArray((data as StorageData).blocks) &&
    Array.isArray((data as StorageData).standardBlocks)
  );
};

type FileStatus = 'no-file' | 'loading' | 'ready' | 'error';

interface FileStorageContextValue {
  blocks: Block[];
  standardBlocks: StandardBlock[];
  addBlock: (block: Omit<Block, 'id' | 'status' | 'failedAt' | 'failureReason'>) => void;
  updateBlock: (id: number, block: Omit<Block, 'id'>) => void;
  markBlockFailed: (id: number, failedAt: Date, reason: string) => void;
  removeBlock: (id: number) => void;
  removeUpcomingBlocks: () => void;
  addStandardBlock: (block: Omit<StandardBlock, 'id'>) => void;
  updateStandardBlock: (id: number, block: Omit<StandardBlock, 'id'>) => void;
  removeStandardBlock: (id: number) => void;
  setBlocks: (blocks: Block[]) => void;
  setStandardBlocks: (blocks: StandardBlock[]) => void;
  toggleRequiredStatus: (id: number) => void;
  getRequiredBlocks: () => StandardBlock[];
  areAllRequiredBlocksActive: (activeBlockNames: string[]) => boolean;
  currentTime: Date;
  fileStatus: FileStatus;
  fileName: string | null;
  selectFile: () => Promise<void>;
  isLoading: boolean;
}

const FileStorageContext = createContext<FileStorageContextValue | undefined>(undefined);

export const useFileStorage = () => {
  const ctx = useContext(FileStorageContext);
  if (!ctx) throw new Error('useFileStorage must be used within FileStorageProvider');
  return ctx;
};

const verifyPermission = async (handle: FileSystemFileHandle, mode: 'read' | 'readwrite') => {
  const opts = { mode } as const;
  const h = handle as unknown as {
    queryPermission?(d: typeof opts): Promise<PermissionState>;
    requestPermission?(d: typeof opts): Promise<PermissionState>;
  };

  if (h.queryPermission && (await h.queryPermission(opts)) === 'granted') {
    return true;
  }
  if (h.requestPermission && (await h.requestPermission(opts)) === 'granted') {
    return true;
  }
  return false;
};

function useProvideFileStorage(): FileStorageContextValue {
  const [data, setData] = useState<StorageData>({
    version: '1.0',
    lastModified: new Date().toISOString(),
    blocks: [],
    standardBlocks: [],
  });
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileStatus, setFileStatus] = useState<FileStatus>('loading');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastModifiedRef = useRef<number>(0);
  const pollRef = useRef<number>();
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const readFile = async (handle: FileSystemFileHandle): Promise<boolean> => {
    try {
      const hasPerm = await verifyPermission(handle, 'read');
      if (!hasPerm) return false;
      const file = await handle.getFile();
      lastModifiedRef.current = file.lastModified;
      setFileName(handle.name);
      const text = await file.text();
      if (text.trim()) {
        const parsed = JSON.parse(text, reviver);
        if (isValidStorageData(parsed)) {
          setData(parsed);
        }
      }
      setFileStatus('ready');
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Read file failed', err);
      setFileStatus('error');
      setIsLoading(false);
      return false;
    }
  };

  const writeFile = async (updated: StorageData) => {
    if (!fileHandle) return;
    try {
      const hasPerm = await verifyPermission(fileHandle, 'readwrite');
      if (!hasPerm) {
        setFileStatus('error');
        return;
      }
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(updated, null, 2));
      await writable.close();
      const file = await fileHandle.getFile();
      lastModifiedRef.current = file.lastModified;
    } catch (err) {
      console.error('Write file failed', err);
      setFileStatus('error');
    }
  };

  const startPolling = () => {
    if (!fileHandle) return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const file = await fileHandle!.getFile();
        if (file.lastModified > lastModifiedRef.current) {
          await readFile(fileHandle!);
        }
      } catch (err) {
        console.warn('Polling error', err);
        setFileStatus('error');
      }
    }, 1500);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = undefined;
    }
  };

  const selectFile = async () => {
    if (!('showOpenFilePicker' in window)) {
      setFileStatus('error');
      setIsLoading(false);
      return;
    }
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ accept: { 'application/json': ['.json'] } }],
        excludeAcceptAllOption: true,
        multiple: false,
      });
      if (handle) {
        setFileStatus('loading');
        const ok = await readFile(handle);
        if (ok) {
          setFileHandle(handle);
          await storeHandle(handle);
          startPolling();
        }
      }
    } catch (e) {
      console.log('File selection cancelled', e);
    }
  };

  useEffect(() => {
    (async () => {
      if (!('showOpenFilePicker' in window)) {
        setFileStatus('no-file');
        setIsLoading(false);
        return;
      }
      const stored = await getStoredHandle();
      if (stored) {
        const ok = await readFile(stored);
        if (ok) {
          setFileHandle(stored);
          startPolling();
        } else {
          setFileStatus('error');
        }
      } else {
        setFileStatus('no-file');
        setIsLoading(false);
      }
    })();
    return () => stopPolling();
  }, []);

  const updateData = (updater: (d: StorageData) => StorageData) => {
    setData(prev => {
      const updated = updater({ ...prev });
      updated.lastModified = new Date().toISOString();
      void writeFile(updated);
      return updated;
    });
  };

  const addBlock = (block: Omit<Block, 'id' | 'status' | 'failedAt' | 'failureReason'>) => {
    const newBlock: Block = {
      ...block,
      id: Date.now(),
      status: 'active',
      lastModified: new Date().toISOString(),
    };
    updateData(d => ({ ...d, blocks: [...d.blocks, newBlock] }));
  };

  const updateBlock = (id: number, block: Omit<Block, 'id'>) => {
    updateData(d => ({
      ...d,
      blocks: d.blocks.map(b => (b.id === id ? { ...block, id } : b)),
    }));
  };

  const markBlockFailed = (id: number, failedAt: Date, reason: string) => {
    updateData(d => ({
      ...d,
      blocks: d.blocks.map(b =>
        b.id === id ? { ...b, status: 'failed', failedAt, failureReason: reason } : b
      ),
    }));
  };

  const removeBlock = (id: number) => {
    updateData(d => ({ ...d, blocks: d.blocks.filter(b => b.id !== id) }));
  };

  const removeUpcomingBlocks = () => {
    const now = new Date();
    updateData(d => ({ ...d, blocks: d.blocks.filter(b => now >= b.startTime) }));
  };

  const addStandardBlock = (block: Omit<StandardBlock, 'id'>) => {
    const newBlock: StandardBlock = { ...block, id: Date.now() + Math.random() };
    updateData(d => ({ ...d, standardBlocks: [...d.standardBlocks, newBlock] }));
  };

  const updateStandardBlock = (id: number, block: Omit<StandardBlock, 'id'>) => {
    updateData(d => ({
      ...d,
      standardBlocks: d.standardBlocks.map(b => (b.id === id ? { ...block, id } : b)),
    }));
  };

  const removeStandardBlock = (id: number) => {
    updateData(d => ({ ...d, standardBlocks: d.standardBlocks.filter(b => b.id !== id) }));
  };

  const setBlocks = (blocks: Block[]) => {
    updateData(d => ({ ...d, blocks }));
  };

  const setStandardBlocks = (blocks: StandardBlock[]) => {
    updateData(d => ({ ...d, standardBlocks: blocks }));
  };

  const toggleRequiredStatus = (id: number) => {
    updateData(d => ({
      ...d,
      standardBlocks: d.standardBlocks.map(b =>
        b.id === id ? { ...b, required: !b.required } : b
      ),
    }));
  };

  const getRequiredBlocks = () => data.standardBlocks.filter(b => b.required);

  const areAllRequiredBlocksActive = (activeBlockNames: string[]) => {
    const required = getRequiredBlocks();
    if (required.length === 0) return true;
    return required.every(b => activeBlockNames.includes(b.name));
  };

  return {
    blocks: data.blocks,
    standardBlocks: data.standardBlocks,
    addBlock,
    updateBlock,
    markBlockFailed,
    removeBlock,
    removeUpcomingBlocks,
    addStandardBlock,
    updateStandardBlock,
    removeStandardBlock,
    setBlocks,
    setStandardBlocks,
    toggleRequiredStatus,
    getRequiredBlocks,
    areAllRequiredBlocksActive,
    currentTime,
    fileStatus,
    fileName,
    selectFile,
    isLoading,
  };
}

export const FileStorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useProvideFileStorage();
  return <FileStorageContext.Provider value={value}>{children}</FileStorageContext.Provider>;
};

