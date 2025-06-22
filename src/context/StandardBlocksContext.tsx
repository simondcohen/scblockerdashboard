import React, { createContext, useState, useEffect, useContext } from 'react';
import { StandardBlock } from '../types';
import { readFile, writeFile, FileData } from '../utils/fileStorage';

interface StandardBlocksContextType {
  standardBlocks: StandardBlock[];
  addStandardBlock: (block: Omit<StandardBlock, 'id'>) => void;
  updateStandardBlock: (id: number, block: Omit<StandardBlock, 'id'>) => void;
  removeStandardBlock: (id: number) => void;
  toggleRequiredStatus: (id: number) => void;
  getRequiredBlocks: () => StandardBlock[];
  areAllRequiredBlocksActive: (activeBlockNames: string[]) => boolean;
}

const StandardBlocksContext = createContext<StandardBlocksContextType | undefined>(undefined);

export const useStandardBlocks = () => {
  const context = useContext(StandardBlocksContext);
  if (!context) {
    throw new Error('useStandardBlocks must be used within a StandardBlocksProvider');
  }
  return context;
};

const STORAGE_KEY = 'tech-blocker-standard-blocks';

export const StandardBlocksProvider: React.FC<{ 
  children: React.ReactNode; 
  fileHandle?: FileSystemFileHandle | null; 
}> = ({ children, fileHandle }) => {
  const [standardBlocks, setStandardBlocks] = useState<StandardBlock[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [lastFileModified, setLastFileModified] = useState<number>(0);
  const [currentFileHandle, setCurrentFileHandle] = useState<FileSystemFileHandle | null>(null);

  // Initialize data from file or localStorage - reload when fileHandle changes
  useEffect(() => {
    const initializeData = async () => {
      if (fileHandle) {
        try {
          const fileData = await readFile(fileHandle);
          // Clear existing data and load from new file
          setStandardBlocks(fileData.standardBlocks);
          setBlocks(fileData.blocks);
          
          // Track file modification time
          const file = await fileHandle.getFile();
          setLastFileModified(file.lastModified);
          setCurrentFileHandle(fileHandle);
        } catch (error) {
          console.error('Error loading data from file:', error);
        }
      } else {
        // Fallback to localStorage - only load if switching from file mode
        if (currentFileHandle) {
          // Switching from file to localStorage mode, load localStorage data
          setCurrentFileHandle(null);
          try {
            const savedBlocks = localStorage.getItem(STORAGE_KEY);
            if (savedBlocks) {
              const parsedBlocks = JSON.parse(savedBlocks);
              
              if (Array.isArray(parsedBlocks) && parsedBlocks.every(block => 
                typeof block.id === 'number' &&
                typeof block.name === 'string'
              )) {
                setStandardBlocks(parsedBlocks);
              }
            } else {
              // No localStorage data, start fresh
              setStandardBlocks([]);
            }
            setBlocks([]);
          } catch (error) {
            console.error('Error loading standard blocks from localStorage:', error);
            setStandardBlocks([]);
            setBlocks([]);
          }
        } else if (!currentFileHandle && standardBlocks.length === 0) {
          // Initial load with localStorage (not switching modes)
          try {
            const savedBlocks = localStorage.getItem(STORAGE_KEY);
            if (savedBlocks) {
              const parsedBlocks = JSON.parse(savedBlocks);
              
              if (Array.isArray(parsedBlocks) && parsedBlocks.every(block => 
                typeof block.id === 'number' &&
                typeof block.name === 'string'
              )) {
                setStandardBlocks(parsedBlocks);
              }
            }
          } catch (error) {
            console.error('Error loading standard blocks from localStorage:', error);
          }
        }
      }
    };

    initializeData();
  }, [fileHandle]); // Re-run when fileHandle changes

  // Polling for file changes (1.5 seconds)
  useEffect(() => {
    if (!fileHandle) return;

    const checkForFileChanges = async () => {
      try {
        const file = await fileHandle.getFile();
        if (file.lastModified > lastFileModified) {
          const fileData = await readFile(fileHandle);
          setStandardBlocks(fileData.standardBlocks);
          setBlocks(fileData.blocks);
          setLastFileModified(file.lastModified);
        }
      } catch (error) {
        console.error('Error checking for file changes:', error);
      }
    };

    const interval = setInterval(checkForFileChanges, 1500);
    return () => clearInterval(interval);
  }, [fileHandle, lastFileModified]);
  
  // Save to file or localStorage when standardBlocks change
  useEffect(() => {
    const saveData = async () => {
      if (fileHandle) {
        try {
          const fileData: FileData = { blocks, standardBlocks };
          await writeFile(fileHandle, fileData);
          
          // Update last modified time after writing
          const file = await fileHandle.getFile();
          setLastFileModified(file.lastModified);
        } catch (error) {
          console.error('Error saving data to file:', error);
        }
      } else {
        // Fallback to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(standardBlocks));
        } catch (error) {
          console.error('Error saving standard blocks to localStorage:', error);
        }
      }
    };

    // Only save if there are blocks or if we're explicitly clearing
    if (standardBlocks.length > 0 || currentFileHandle !== fileHandle) {
      saveData();
    }
  }, [standardBlocks, fileHandle]);
  
  const addStandardBlock = (block: Omit<StandardBlock, 'id'>) => {
    const newBlock = {
      ...block,
      id: Date.now()
    };
    setStandardBlocks(prevBlocks => [...prevBlocks, newBlock]);
  };

  const updateStandardBlock = (id: number, block: Omit<StandardBlock, 'id'>) => {
    setStandardBlocks(prevBlocks => 
      prevBlocks.map(b => b.id === id ? { ...block, id } : b)
    );
  };
  
  const removeStandardBlock = (id: number) => {
    setStandardBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
  };
  
  const toggleRequiredStatus = (id: number) => {
    setStandardBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.id === id 
          ? { ...block, required: block.required ? false : true }
          : block
      )
    );
  };
  
  const getRequiredBlocks = () => {
    return standardBlocks.filter(block => block.required);
  };
  
  const areAllRequiredBlocksActive = (activeBlockNames: string[]) => {
    const requiredBlocks = getRequiredBlocks();
    if (requiredBlocks.length === 0) return true;
    
    return requiredBlocks.every(block => 
      activeBlockNames.includes(block.name)
    );
  };
  
  return (
    <StandardBlocksContext.Provider
      value={{
        standardBlocks,
        addStandardBlock,
        updateStandardBlock,
        removeStandardBlock,
        toggleRequiredStatus,
        getRequiredBlocks,
        areAllRequiredBlocksActive
      }}
    >
      {children}
    </StandardBlocksContext.Provider>
  );
}; 