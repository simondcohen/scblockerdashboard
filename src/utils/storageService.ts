import { Block, StandardBlock, StorageData } from '../types';

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
  if (key === 'startTime' || key === 'endTime') {
    return new Date(value as string);
  }
  return value;
};

export class StorageService {
  private handle: FileSystemFileHandle | null = null;
  private bc: BroadcastChannel;
  private useLocalStorage = false;
  private mode: 'file' | 'localStorage' | 'memory' = 'memory';
  private data: StorageData = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    blocks: [],
    standardBlocks: [],
  };
  private lastModified = 0;
  private saveTimeout?: number;
  private blockSubs = new Set<(blocks: Block[]) => void>();
  private standardSubs = new Set<(blocks: StandardBlock[]) => void>();
  private savingSubs = new Set<(saving: boolean) => void>();
  private fileSubs = new Set<(name: string | null) => void>();
  private modeSubs = new Set<() => void>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private saving = false;

  constructor() {
    this.bc = new BroadcastChannel('storage-service');
    this.bc.onmessage = (ev) => {
      if (ev.data === 'fileChanged') {
        this.handleExternalFileChange();
      }
      if (ev.data?.type === 'dataUpdated') {
        if (ev.data.timestamp && ev.data.timestamp !== this.data.lastModified) {
          this.handleExternalFileChange();
        }
      }
    };
  }

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.initialized || typeof window === 'undefined') {
      return Promise.resolve();
    }

    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<void> {
    this.initialized = true;

    if (!('showSaveFilePicker' in window)) {
      this.useLocalStorage = true;
      this.mode = 'localStorage';
      this.readFromLocalStorage();
      window.addEventListener('storage', this.handleStorageChange);
      window.addEventListener('beforeunload', this.flush);
      this.notifyMode();
      return;
    }

    this.handle = await getStoredHandle();

    if (this.handle) {
      try {
        await this.handle.getFile();
        this.notifyFile();
      } catch {
        await clearStoredHandle();
        this.handle = null;
      }
    }

    if (!this.handle) {
      try {
        await this.promptForFile();
      } catch (error) {
        console.warn('File selection cancelled:', error);
        // App will continue without file persistence
      }
    }

    if (this.handle) {
      await this.readFromFile();
      this.mode = 'file';
      window.addEventListener('beforeunload', this.flush);
    }
    this.notifyMode();
  }

  private async promptForFile() {
    let attempts = 0;
    const maxAttempts = 2;
    
    while (!this.handle && attempts < maxAttempts) {
      try {
        this.handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: 'blocker-data.json',
          types: [{ accept: { 'application/json': ['.json'] } }],
        });
        if (this.handle) {
          await storeHandle(this.handle);
          this.notifyFile();
          this.mode = 'file';
          this.bc.postMessage('fileChanged');
          this.notifyMode();
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          console.warn('A file must be selected to use the dashboard.');
        }
      }
    }
    
    if (!this.handle) {
      throw new Error('User cancelled file selection. Dashboard will run without data persistence.');
    }
  }

  async changeFile() {
    try {
      await this.promptForFile();
      await this.writeToFile();
      this.bc.postMessage('fileChanged');
    } catch (error) {
      console.warn('File selection cancelled:', error);
      // Keep using existing file or no file
    }
  }

  private notifyFile() {
    const name = this.getFileName();
    for (const cb of this.fileSubs) cb(name);
  }

  private notifyMode() {
    for (const cb of this.modeSubs) cb();
  }

  private setSaving(s: boolean) {
    this.saving = s;
    for (const cb of this.savingSubs) cb(s);
  }

  private async readFromFile() {
    if (!this.handle) return;
    try {
      const file = await this.handle.getFile();
      this.lastModified = file.lastModified;
      const text = await file.text();
      if (text.trim()) {
        try {
          this.data = JSON.parse(text, reviver) as StorageData;
        } catch {
          console.warn('Failed to parse storage file, starting fresh');
        }
      }
      this.mode = 'file';
      this.notifyMode();
    } catch (error) {
      console.error('Error reading from file:', error);
      await clearStoredHandle();
      this.handle = null;
      this.mode = 'memory';
      this.notifyMode();
      try {
        await this.promptForFile();
        await this.writeToFile();
        this.bc.postMessage('fileChanged');
      } catch (promptError) {
        console.warn('File selection cancelled after losing access:', promptError);
        // Continue without file persistence
      }
    }
  }

  private async writeToFile() {
    if (!this.handle) return;

    try {
      this.setSaving(true);
      const file = await this.handle.getFile();
      if (file.lastModified !== this.lastModified) {
        const text = await file.text();
        if (text.trim()) {
          try {
            const onDisk = JSON.parse(text, reviver) as StorageData;
            this.data.blocks = this.mergeBlocks(onDisk.blocks, this.data.blocks);
            this.data.standardBlocks = this.mergeStandardBlocks(onDisk.standardBlocks, this.data.standardBlocks);
          } catch {
            // ignore merge errors
          }
        }
      }
      const writable = await this.handle.createWritable();
      this.data.lastModified = new Date().toISOString();
      await writable.write(JSON.stringify(this.data, null, 2));
      await writable.close();
      const updatedFile = await this.handle.getFile();
      this.lastModified = updatedFile.lastModified;
      this.bc.postMessage({ type: 'dataUpdated', timestamp: this.data.lastModified });
    } catch (error) {
      console.error('Error writing to file:', error);
      await clearStoredHandle();
      this.handle = null;
      this.mode = 'memory';
      this.notifyMode();
      try {
        await this.promptForFile();
      } catch (promptError) {
        console.warn('File selection cancelled after write error:', promptError);
        // Continue without file persistence
      }
    } finally {
      this.setSaving(false);
    }
  }



  private notify() {
    for (const cb of this.blockSubs) cb(this.data.blocks);
    for (const cb of this.standardSubs) cb(this.data.standardBlocks);
  }

  private mergeBlocks(external: Block[], local: Block[]): Block[] {
    const map = new Map<number, Block>();
    for (const b of external) map.set(b.id, b);
    for (const b of local) {
      const existing = map.get(b.id);
      if (!existing) {
        map.set(b.id, b);
      } else {
        const eTime = existing.lastModified ? new Date(existing.lastModified).getTime() : 0;
        const lTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        if (lTime >= eTime) {
          map.set(b.id, b);
        }
      }
    }
    return Array.from(map.values());
  }

  private mergeStandardBlocks(external: StandardBlock[], local: StandardBlock[]): StandardBlock[] {
    const map = new Map<number, StandardBlock>();
    for (const b of external) map.set(b.id, b);
    for (const b of local) map.set(b.id, b);
    return Array.from(map.values());
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
  subscribeSaving(cb: (saving: boolean) => void) {
    this.savingSubs.add(cb);
  }
  unsubscribeSaving(cb: (saving: boolean) => void) {
    this.savingSubs.delete(cb);
  }
  subscribeFile(cb: (name: string | null) => void) {
    this.fileSubs.add(cb);
  }
  unsubscribeFile(cb: (name: string | null) => void) {
    this.fileSubs.delete(cb);
  }
  subscribeMode(cb: () => void) {
    this.modeSubs.add(cb);
  }
  unsubscribeMode(cb: () => void) {
    this.modeSubs.delete(cb);
  }

  getFileName(): string | null {
    return this.handle ? this.handle.name : null;
  }

  getMode() {
    return this.mode;
  }

  getBlocks() {
    return this.data.blocks;
  }
  getStandardBlocks() {
    return this.data.standardBlocks;
  }

  async setBlocks(blocks: Block[]) {
    await this.init();
    this.data.blocks = blocks;
    this.notify();
    await this.persist();
  }

  async setStandardBlocks(blocks: StandardBlock[]) {
    await this.init();
    this.data.standardBlocks = blocks;
    this.notify();
    await this.persist();
  }

  private async persist() {
    if (this.saveTimeout) window.clearTimeout(this.saveTimeout);
    if (this.useLocalStorage) {
      this.saveTimeout = window.setTimeout(() => this.writeToLocalStorage(), 300);
    } else {
      this.saveTimeout = window.setTimeout(() => this.writeToFile(), 300);
    }
  }

  private async handleExternalFileChange() {
    this.handle = await getStoredHandle();
    if (this.handle) {
      await this.readFromFile();
      this.mode = 'file';
    }
    this.notifyFile();
    this.notify();
    this.notifyMode();
  }

  private readFromLocalStorage() {
    const text = localStorage.getItem('blocker-data');
    if (text) {
      try {
        this.data = JSON.parse(text, reviver) as StorageData;
        this.notify();
      } catch {
        console.warn('Failed to parse localStorage data, starting fresh');
      }
    }
  }

  private writeToLocalStorage() {
    this.data.lastModified = new Date().toISOString();
    localStorage.setItem('blocker-data', JSON.stringify(this.data));
    this.bc.postMessage({ type: 'dataUpdated', timestamp: this.data.lastModified });
  }

  private handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'blocker-data' && e.newValue) {
      try {
        this.data = JSON.parse(e.newValue, reviver) as StorageData;
        this.notify();
      } catch {
        console.warn('Failed to parse localStorage update');
      }
    }
  };

  private flush = () => {
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
      if (this.useLocalStorage) {
        this.writeToLocalStorage();
      } else {
        this.writeToFile();
      }
    }
  };

  isInitialized(): boolean {
    return this.initialized;
  }

  getInitPromise(): Promise<void> {
    return this.init();
  }
}

export const storageService = new StorageService();
