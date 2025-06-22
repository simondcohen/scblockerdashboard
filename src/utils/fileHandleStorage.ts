const DB_NAME = 'SCBlockerDB';
const DB_VERSION = 1;
const STORE_NAME = 'fileHandles';

// Open or create the database
const openDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Save file handle to IndexedDB
export const saveFileHandle = async (handle: FileSystemFileHandle): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put(handle, 'lastFileHandle');
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Retrieve file handle from IndexedDB
export const getStoredFileHandle = async (): Promise<FileSystemFileHandle | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('lastFileHandle');
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error('Error retrieving file handle:', error);
    return null;
  }
};

// Clear stored file handle
export const clearStoredFileHandle = async (): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete('lastFileHandle');
};

// Check and request permission for a stored handle
export const verifyAndRequestPermission = async (handle: FileSystemFileHandle): Promise<boolean> => {
  try {
    // Check current permission
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    
    if (permission === 'granted') {
      return true;
    }
    
    // Request permission if needed
    if (permission === 'prompt') {
      const newPermission = await handle.requestPermission({ mode: 'readwrite' });
      return newPermission === 'granted';
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying permission:', error);
    return false;
  }
}; 