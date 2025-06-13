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
  private data: StorageData = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    blocks: [],
    standardBlocks: [],
  };
  private lastModified = 0;
  private polling?: number;
  private saveTimeout?: number;
  private blockSubs = new Set<(blocks: Block[]) => void>();
  private standardSubs = new Set<(blocks: StandardBlock[]) => void>();
  private savingSubs = new Set<(saving: boolean) => void>();
  private fileSubs = new Set<(name: string | null) => void>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private saving = false;

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
      alert('File System Access API is not supported in this browser.');
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
      await this.promptForFile();
    }

    if (this.handle) {
      await this.readFromFile();
      this.startPolling();
    }
  }

  private async promptForFile() {
    while (!this.handle) {
      try {
        this.handle = await (window as any).showSaveFilePicker({
          suggestedName: 'blocker-data.json',
          types: [{ accept: { 'application/json': ['.json'] } }],
        });
        if (this.handle) {
          await storeHandle(this.handle);
          this.notifyFile();
        }
      } catch {
        alert('A file must be selected to use the dashboard.');
      }
    }
  }

  async changeFile() {
    await this.promptForFile();
    await this.writeToFile();
  }

  private notifyFile() {
    const name = this.getFileName();
    for (const cb of this.fileSubs) cb(name);
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
    } catch (error) {
      console.error('Error reading from file:', error);
      await clearStoredHandle();
      this.handle = null;
      alert('Lost access to the storage file. Please select a new location.');
      await this.promptForFile();
      await this.writeToFile();
    }
  }

  private async writeToFile() {
    if (!this.handle) return;

    try {
      this.setSaving(true);
      const writable = await this.handle.createWritable();
      this.data.lastModified = new Date().toISOString();
      await writable.write(JSON.stringify(this.data, null, 2));
      await writable.close();
      const file = await this.handle.getFile();
      this.lastModified = file.lastModified;
    } catch (error) {
      console.error('Error writing to file:', error);
      await clearStoredHandle();
      this.handle = null;
      alert('Could not write to the file. Please select a new location.');
      await this.promptForFile();
    } finally {
      this.setSaving(false);
    }
  }

  private startPolling() {
    this.polling = window.setInterval(async () => {
      if (!this.handle) return;
      try {
        const file = await this.handle.getFile();
        if (file.lastModified !== this.lastModified) {
          await this.readFromFile();
          this.notify();
        }
      } catch {
        await clearStoredHandle();
        this.handle = null;
        alert('Lost access to the storage file. Please select a new location.');
        await this.promptForFile();
        await this.writeToFile();
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

  getFileName(): string | null {
    return this.handle ? this.handle.name : null;
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
    await this.persist();
  }

  async setStandardBlocks(blocks: StandardBlock[]) {
    await this.init();
    this.data.standardBlocks = blocks;
    await this.persist();
  }

  private async persist() {
    if (this.saveTimeout) window.clearTimeout(this.saveTimeout);
    this.saveTimeout = window.setTimeout(() => this.writeToFile(), 300);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInitPromise(): Promise<void> {
    return this.init();
  }
}

export const storageService = new StorageService();
