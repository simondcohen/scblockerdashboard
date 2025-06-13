import { Block, StandardBlock, StorageData } from '../types';

// Keys for localStorage fallback
const BLOCKS_KEY = 'tech-blocker-blocks';
const STANDARD_KEY = 'tech-blocker-standard-blocks';
const HANDLE_DB = 'blocker-dashboard-db';
const HANDLE_STORE = 'file-handles';
const HANDLE_KEY = 'dataFile';

/** Simple wrapper around IndexedDB for storing file handles */
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
  if (key === 'startTime' || key === 'endTime') {
    return new Date(value as string);
  }
  return value;
};

export class StorageService {
  private handle: FileSystemFileHandle | null = null;
  private data: StorageData = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    blocks: [],
    standardBlocks: [],
  };
  private lastModified = 0;
  private polling?: number;
  private blockSubs = new Set<(blocks: Block[]) => void>();
  private standardSubs = new Set<(blocks: StandardBlock[]) => void>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // Return existing promise if already initializing or initialized
    if (this.initPromise) {
      return this.initPromise;
    }

    // If already initialized, return immediately
    if (this.initialized || typeof window === 'undefined') {
      return Promise.resolve();
    }

    // Create and store the initialization promise
    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<void> {
    this.initialized = true;

    if ('showOpenFilePicker' in window) {
      try {
        // First, read existing localStorage data as backup
        const existingLocalStorageData = this.readLocalStorageData();

        this.handle = await getStoredHandle();
        
        // Try to access the stored handle if it exists
        if (this.handle) {
          try {
            // Test if we still have permission to access the file
            await this.handle.getFile();
          } catch (error) {
            // Permission lost or file no longer accessible
            console.warn('Stored file handle is no longer accessible:', error);
            await clearStoredHandle();
            this.handle = null;
          }
        }

        // If no handle or handle is invalid, prompt for file picker
        if (!this.handle) {
          this.handle = await (window as any).showSaveFilePicker({
            suggestedName: 'blocker-dashboard-data.json',
            types: [{ accept: { 'application/json': ['.json'] } }],
          });
          if (this.handle) {
            await storeHandle(this.handle);
          }
        }

        if (this.handle) {
          await this.readFromFile();
          
          // If file is empty or new, merge with existing localStorage data
          if (this.data.blocks.length === 0 && existingLocalStorageData.blocks.length > 0) {
            this.data.blocks = existingLocalStorageData.blocks;
          }
          if (this.data.standardBlocks.length === 0 && existingLocalStorageData.standardBlocks.length > 0) {
            this.data.standardBlocks = existingLocalStorageData.standardBlocks;
          }

          // Save merged data back to file if we had to merge
          if ((this.data.blocks.length > 0 || this.data.standardBlocks.length > 0) && 
              (existingLocalStorageData.blocks.length > 0 || existingLocalStorageData.standardBlocks.length > 0)) {
            await this.writeToFile();
          }

          this.startPolling();
          return;
        }
      } catch (error) {
        console.warn('File System Access API failed, falling back to localStorage:', error);
        this.handle = null;
      }
    }

    // Fallback to localStorage
    this.readFromLocalStorage();
    this.startPolling();
  }

  private readLocalStorageData(): { blocks: Block[]; standardBlocks: StandardBlock[] } {
    const result = { blocks: [] as Block[], standardBlocks: [] as StandardBlock[] };
    
    try {
      const blocksText = localStorage.getItem(BLOCKS_KEY);
      const stdText = localStorage.getItem(STANDARD_KEY);
      if (blocksText) result.blocks = JSON.parse(blocksText, reviver);
      if (stdText) result.standardBlocks = JSON.parse(stdText);
    } catch (error) {
      console.warn('Error reading localStorage data:', error);
    }
    
    return result;
  }

  private async readFromFile() {
    if (!this.handle) return;
    
    try {
      const file = await this.handle.getFile();
      this.lastModified = file.lastModified;
      const text = await file.text();
      
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text, reviver) as StorageData;
          this.data = parsed;
        } catch (error) {
          console.warn('Error parsing file content, keeping current data:', error);
        }
      }
      // If file is empty, keep current data structure
    } catch (error) {
      console.error('Error reading from file:', error);
      // Clear the handle if we can't read from it
      await clearStoredHandle();
      this.handle = null;
      throw error;
    }
  }

  private readFromLocalStorage() {
    const localData = this.readLocalStorageData();
    this.data.blocks = localData.blocks;
    this.data.standardBlocks = localData.standardBlocks;
  }

  private async writeToFile() {
    if (!this.handle) return;
    
    try {
      const writable = await this.handle.createWritable();
      this.data.lastModified = new Date().toISOString();
      await writable.write(JSON.stringify(this.data, null, 2));
      await writable.close();
      const file = await this.handle.getFile();
      this.lastModified = file.lastModified;
    } catch (error) {
      console.error('Error writing to file:', error);
      // If write fails, clear the handle and fall back to localStorage
      await clearStoredHandle();
      this.handle = null;
      this.writeToLocalStorage();
    }
  }

  private writeToLocalStorage() {
    try {
      localStorage.setItem(BLOCKS_KEY, JSON.stringify(this.data.blocks));
      localStorage.setItem(STANDARD_KEY, JSON.stringify(this.data.standardBlocks));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  private startPolling() {
    this.polling = window.setInterval(async () => {
      if (this.handle) {
        try {
          const file = await this.handle.getFile();
          if (file.lastModified !== this.lastModified) {
            await this.readFromFile();
            this.notify();
          }
        } catch (error) {
          console.warn('Error during polling, file may no longer be accessible:', error);
          // Clear handle and switch to localStorage polling
          await clearStoredHandle();
          this.handle = null;
        }
      } else {
        const prevBlocks = JSON.stringify(this.data.blocks);
        const prevStd = JSON.stringify(this.data.standardBlocks);
        this.readFromLocalStorage();
        if (
          prevBlocks !== JSON.stringify(this.data.blocks) ||
          prevStd !== JSON.stringify(this.data.standardBlocks)
        ) {
          this.notify();
        }
      }
    }, 1500);
  }

  private notify() {
    for (const cb of this.blockSubs) cb(this.data.blocks);
    for (const cb of this.standardSubs) cb(this.data.standardBlocks);
  }

  subscribeBlocks(cb: (blocks: Block[]) => void) {
    this.blockSubs.add(cb);
  }
  unsubscribeBlocks(cb: (blocks: Block[]) => void) {
    this.blockSubs.delete(cb);
  }
  subscribeStandard(cb: (blocks: StandardBlock[]) => void) {
    this.standardSubs.add(cb);
  }
  unsubscribeStandard(cb: (blocks: StandardBlock[]) => void) {
    this.standardSubs.delete(cb);
  }

  getBlocks() {
    return this.data.blocks;
  }
  getStandardBlocks() {
    return this.data.standardBlocks;
  }

  async setBlocks(blocks: Block[]) {
    // Wait for initialization to complete before setting data
    await this.init();
    this.data.blocks = blocks;
    await this.persist();
  }

  async setStandardBlocks(blocks: StandardBlock[]) {
    // Wait for initialization to complete before setting data
    await this.init();
    this.data.standardBlocks = blocks;
    await this.persist();
  }

  private async persist() {
    if (this.handle) {
      await this.writeToFile();
    } else {
      this.writeToLocalStorage();
    }
  }

  // Method to check if initialization is complete
  isInitialized(): boolean {
    return this.initialized;
  }

  // Method to get initialization promise for contexts to wait on
  getInitPromise(): Promise<void> {
    return this.init();
  }
}

export const storageService = new StorageService();
