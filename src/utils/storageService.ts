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

const reviver = (key: string, value: unknown) => {
  if (key === 'startTime' || key === 'endTime') {
    return new Date(value);
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

  async init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;
    if ('showOpenFilePicker' in window) {
      try {
        this.handle = await getStoredHandle();
        if (!this.handle) {
          this.handle = await window.showSaveFilePicker({
            suggestedName: 'blocker-dashboard-data.json',
            types: [{ accept: { 'application/json': ['.json'] } }],
          });
          if (this.handle) await storeHandle(this.handle);
        }
        await this.readFromFile();
        this.startPolling();
        return;
      } catch {
        this.handle = null; // fall through to localStorage
      }
    }
    this.readFromLocalStorage();
    this.startPolling();
  }

  private async readFromFile() {
    if (!this.handle) return;
    const file = await this.handle.getFile();
    this.lastModified = file.lastModified;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text, reviver) as StorageData;
      this.data = parsed;
    } catch {
      // keep default empty structure
    }
  }

  private readFromLocalStorage() {
    try {
      const blocksText = localStorage.getItem(BLOCKS_KEY);
      const stdText = localStorage.getItem(STANDARD_KEY);
      if (blocksText) this.data.blocks = JSON.parse(blocksText, reviver);
      if (stdText) this.data.standardBlocks = JSON.parse(stdText);
    } catch {
      // ignore
    }
  }

  private async writeToFile() {
    if (!this.handle) return;
    try {
      const writable = await this.handle.createWritable();
      this.data.lastModified = new Date().toISOString();
      await writable.write(JSON.stringify(this.data));
      await writable.close();
      const file = await this.handle.getFile();
      this.lastModified = file.lastModified;
    } catch {
      // ignore
    }
  }

  private writeToLocalStorage() {
    localStorage.setItem(BLOCKS_KEY, JSON.stringify(this.data.blocks));
    localStorage.setItem(STANDARD_KEY, JSON.stringify(this.data.standardBlocks));
  }

  private startPolling() {
    this.polling = window.setInterval(async () => {
      if (this.handle) {
        const file = await this.handle.getFile();
        if (file.lastModified !== this.lastModified) {
          await this.readFromFile();
          this.notify();
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
    this.data.blocks = blocks;
    await this.persist();
  }
  async setStandardBlocks(blocks: StandardBlock[]) {
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
}

export const storageService = new StorageService();
