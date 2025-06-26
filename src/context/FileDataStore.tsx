import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Block, StandardBlock } from '../types';
import { readFile, writeFile, FileData } from '../utils/fileStorage';

interface FileDataStoreType {
  blocks: Block[];
  standardBlocks: StandardBlock[];
  updateBlocks: (blocks: Block[]) => void;
  updateStandardBlocks: (standardBlocks: StandardBlock[]) => void;
  fileHandle: FileSystemFileHandle | null;
  isLoading: boolean;
  error: string | null;
}

const FileDataStoreContext = createContext<FileDataStoreType | undefined>(undefined);

export const useFileDataStore = () => {
  const context = useContext(FileDataStoreContext);
  if (!context) {
    throw new Error('useFileDataStore must be used within a FileDataStoreProvider');
  }
  return context;
};

export const FileDataStoreProvider: React.FC<{
  children: React.ReactNode;
  fileHandle: FileSystemFileHandle | null;
}> = ({ children, fileHandle }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [standardBlocks, setStandardBlocks] = useState<StandardBlock[]>([]);
  const [lastFileModified, setLastFileModified] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Queue for write operations to prevent race conditions
  const writeQueue = useRef(Promise.resolve());
  
  // Load data when fileHandle changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      if (!fileHandle) {
        // No file handle, reset to empty state
        setBlocks([]);
        setStandardBlocks([]);
        setIsLoading(false);
        return;
      }
      
      try {
        const fileData = await readFile(fileHandle);
        setBlocks(fileData.blocks);
        setStandardBlocks(fileData.standardBlocks);
        
        const file = await fileHandle.getFile();
        setLastFileModified(file.lastModified);
      } catch (err) {
        console.error('Error loading file:', err);
        setError('Failed to load file. Please check permissions and try again.');
        // Don't reset data on error - keep what we have
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fileHandle]);
  
  // Polling for external file changes
  useEffect(() => {
    if (!fileHandle) return;
    
    const checkForChanges = async () => {
      try {
        const file = await fileHandle.getFile();
        if (file.lastModified > lastFileModified) {
          const fileData = await readFile(fileHandle);
          setBlocks(fileData.blocks);
          setStandardBlocks(fileData.standardBlocks);
          setLastFileModified(file.lastModified);
        }
      } catch (err) {
        // Silently ignore polling errors - file might be temporarily locked
        console.debug('Polling error (normal during saves):', err);
      }
    };
    
    const interval = setInterval(checkForChanges, 1500);
    return () => clearInterval(interval);
  }, [fileHandle, lastFileModified]);
  
  // Queued write function
  const queueWrite = useCallback(async (data: FileData) => {
    if (!fileHandle) return;
    
    // Queue this write after any pending writes
    writeQueue.current = writeQueue.current
      .then(async () => {
        try {
          await writeFile(fileHandle, data);
          const file = await fileHandle.getFile();
          setLastFileModified(file.lastModified);
        } catch (err) {
          console.error('Error writing file:', err);
          setError('Failed to save changes. Please check file permissions.');
        }
      })
      .catch(console.error);
      
    return writeQueue.current;
  }, [fileHandle]);
  
  // Update functions that trigger saves
  const updateBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    queueWrite({ blocks: newBlocks, standardBlocks });
  }, [standardBlocks, queueWrite]);
  
  const updateStandardBlocks = useCallback((newStandardBlocks: StandardBlock[]) => {
    setStandardBlocks(newStandardBlocks);
    queueWrite({ blocks, standardBlocks: newStandardBlocks });
  }, [blocks, queueWrite]);
  
  return (
    <FileDataStoreContext.Provider
      value={{
        blocks,
        standardBlocks,
        updateBlocks,
        updateStandardBlocks,
        fileHandle,
        isLoading,
        error
      }}
    >
      {children}
    </FileDataStoreContext.Provider>
  );
}; 