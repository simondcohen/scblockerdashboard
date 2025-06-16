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

const isValidStorageData = (data: any): data is StorageData => {
  return data && 
    typeof data.version === 'string' &&
    Array.isArray(data.blocks) &&
    Array.isArray(data.standardBlocks);
};

type FileSystemHandlePermissionDescriptor = {
  mode?: 'read' | 'readwrite';
};

interface PermissibleHandle extends FileSystemFileHandle {
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

export class StorageService {
  private handle: FileSystemFileHandle | null = null;
  private bc: BroadcastChannel;
  private useLocalStorage = false;
  private mode: 'file' | 'localStorage' | 'memory' | 'needs-permission' = 'memory';
  private data: StorageData = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    blocks: [],
    standardBlocks: [],
  };
  private lastModified = 0;
  private saveTimeout?: number;
  private pollInterval?: number;
  private blockSubs = new Set<(blocks: Block[]) => void>();
  private standardSubs = new Set<(blocks: StandardBlock[]) => void>();
  private savingSubs = new Set<(saving: boolean) => void>();
  private fileSubs = new Set<(name: string | null) => void>();
  private modeSubs = new Set<() => void>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private saving = false;
  private visibilityHandler: () => void;

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

    // Store reference to visibility handler for cleanup
    this.visibilityHandler = () => {
      if (!document.hidden && this.mode === 'file') {
        this.checkForExternalChanges();
      }
    };
    
    // Handle visibility changes for optimized polling
    document.addEventListener('visibilitychange', this.visibilityHandler);
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
      this.notifyFile();
      const success = await this.tryReadFromFile();
      if (success) {
        this.mode = 'file';
        this.startPolling();
        window.addEventListener('beforeunload', this.flush);
      } else if (this.handle) {
        this.mode = 'needs-permission';
      }
    } else {
      this.mode = 'memory';
    }

    this.notifyMode();
  }

  private async promptForFile(): Promise<boolean> {
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
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async changeFile() {
    if (this.mode === 'needs-permission' && this.handle) {
      const restored = await this.restoreFileAccess();
      if (restored) return;
    }

    const picked = await this.promptForFile();
    if (picked) {
      this.startPolling();
      await this.writeToFile();
      this.bc.postMessage('fileChanged');
    } else {
      console.warn('File selection cancelled');
    }
  }

  private notifyFile() {
    const name = this.getFileName();
    for (const cb of this.fileSubs) cb(name);
  }

  private notifyMode() {
    for (const cb of this.modeSubs) cb();
  }

  private async verifyPermission(handle: FileSystemFileHandle, readWrite: boolean): Promise<boolean> {
    const opts: FileSystemHandlePermissionDescriptor = readWrite ? { mode: 'readwrite' } : { mode: 'read' };
    const h = handle as PermissibleHandle;

    // First check if we already have permission
    if (h.queryPermission && (await h.queryPermission(opts)) === 'granted') {
      return true;
    }

    // If not, request it
    if (h.requestPermission && (await h.requestPermission(opts)) === 'granted') {
      return true;
    }

    return false;
  }

  private setSaving(s: boolean) {
    this.saving = s;
    for (const cb of this.savingSubs) cb(s);
  }

  private async tryReadFromFile(): Promise<boolean> {
    if (!this.handle) return false;

    // Check permission first using the proper API
    const hasPermission = await this.verifyPermission(this.handle, false);
    if (!hasPermission) {
      console.info('Read permission needed');
      return false;
    }

    try {
      const file = await this.handle.getFile();
      this.lastModified = file.lastModified;
      const text = await file.text();
      if (text.trim()) {
        try {
          const parsedData = JSON.parse(text, reviver);
          if (!isValidStorageData(parsedData)) {
            console.warn('Invalid storage file format, starting fresh');
            // Use default empty data structure
            return true;
          }
          this.data = parsedData;
        } catch {
          console.warn('Failed to parse storage file, starting fresh');
        }
      }
      this.notify();
      return true;
    } catch (error) {
      // If we get here despite permission check, handle is invalid
      console.error('File access error:', error);
      await clearStoredHandle();
      this.handle = null;
      return false;
    }
  }

  async restoreFileAccess(): Promise<boolean> {
    if (!this.handle) return false;

    // This will trigger the permission prompt if needed
    const hasPermission = await this.verifyPermission(this.handle, true);
    if (!hasPermission) {
      return false;
    }

    // Now try to read
    const success = await this.tryReadFromFile();
    if (success) {
      this.mode = 'file';
      this.startPolling();
      this.notifyMode();
      window.addEventListener('beforeunload', this.flush);
      return true;
    }

    return false;
  }

  private async readFromFile() {
    const success = await this.tryReadFromFile();
    if (success) {
      this.mode = 'file';
      this.startPolling();
    } else {
      this.stopPolling();
      if (this.handle) {
        this.mode = 'needs-permission';
      } else {
        this.mode = 'memory';
      }
    }
    this.notifyMode();
  }

  private async writeToFile() {
    if (!this.handle) return;

    // Check write permission first
    const hasPermission = await this.verifyPermission(this.handle, true);
    if (!hasPermission) {
      console.warn('Write permission needed');
      this.mode = 'needs-permission';
      this.notifyMode();
      return;
    }

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
      // Only clear handle for non-permission errors since we checked permission above
      await clearStoredHandle();
      this.handle = null;
      this.stopPolling();
      this.mode = 'memory';
      this.notifyMode();
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
    } else if (this.mode !== 'needs-permission') {
      this.saveTimeout = window.setTimeout(() => this.writeToFile(), 300);
    }
  }

  private async handleExternalFileChange() {
    this.handle = await getStoredHandle();
    if (this.handle) {
      const success = await this.tryReadFromFile();
      if (success) {
        this.mode = 'file';
        this.startPolling();
      } else {
        this.stopPolling();
        this.mode = 'needs-permission';
      }
    } else {
      this.stopPolling();
    }
    this.notifyFile();
    this.notifyMode();
  }

  private readFromLocalStorage() {
    const text = localStorage.getItem('blocker-data');
    if (text) {
      try {
        const parsedData = JSON.parse(text, reviver);
        if (!isValidStorageData(parsedData)) {
          console.warn('Invalid storage file format, starting fresh');
          // Use default empty data structure
          return;
        }
        this.data = parsedData;
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
      } else if (this.mode !== 'needs-permission') {
        this.writeToFile();
      }
    }
    this.stopPolling();
  };

  private startPolling() {
    // Only poll when in file mode with a valid handle
    if (this.mode !== 'file' || !this.handle) return;
    
    // Clear any existing interval
    if (this.pollInterval) {
      window.clearInterval(this.pollInterval);
    }
    
    this.pollInterval = window.setInterval(async () => {
      // Skip polling if tab is in background
      if (document.hidden) return;
      
      // Skip if we're currently saving
      if (this.saving) return;
      
      try {
        // Check if file has been modified
        const file = await this.handle!.getFile();
        if (file.lastModified > this.lastModified) {
          console.log('External file change detected, reloading...');
          await this.readFromFile();
        }
      } catch (error) {
        // If we can't access the file, check if it's a permission issue
        console.warn('Polling error:', error);
        // Don't clear the handle here - let readFromFile handle permission issues properly
      }
    }, 1500); // Poll every 1.5 seconds
  }

  private stopPolling() {
    if (this.pollInterval) {
      window.clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  private async checkForExternalChanges() {
    if (this.mode !== 'file' || !this.handle || this.saving) return;
    
    try {
      const file = await this.handle.getFile();
      if (file.lastModified > this.lastModified) {
        await this.readFromFile();
      }
    } catch (error) {
      console.warn('External change check failed:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInitPromise(): Promise<void> {
    return this.init();
  }

  destroy() {
    this.stopPolling();
    window.removeEventListener('beforeunload', this.flush);
    window.removeEventListener('storage', this.handleStorageChange);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.bc) {
      this.bc.close();
    }
    if (this.saveTimeout) {
      window.clearTimeout(this.saveTimeout);
    }
  }
}

export const storageService = new StorageService();
