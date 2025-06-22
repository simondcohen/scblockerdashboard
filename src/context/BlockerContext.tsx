import React, { createContext, useState, useEffect, useContext } from 'react';
import { Block } from '../types';
import { readFile, writeFile, FileData } from '../utils/fileStorage';

interface BlockerContextType {
  blocks: Block[];
  addBlock: (block: Omit<Block, 'id'>) => void;
  updateBlock: (id: number, block: Omit<Block, 'id'>) => void;
  removeBlock: (id: number) => void;
  removeUpcomingBlocks: () => void;
  currentTime: Date;
}

const BlockerContext = createContext<BlockerContextType | undefined>(undefined);

export const useBlocker = () => {
  const context = useContext(BlockerContext);
  if (!context) {
    throw new Error('useBlocker must be used within a BlockerProvider');
  }
  return context;
};

const STORAGE_KEY = 'tech-blocker-blocks';

export const BlockerProvider: React.FC<{ 
  children: React.ReactNode; 
  fileHandle?: FileSystemFileHandle | null; 
}> = ({ children, fileHandle }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [standardBlocks, setStandardBlocks] = useState<any[]>([]);
  const [lastFileModified, setLastFileModified] = useState<number>(0);
  const [currentFileHandle, setCurrentFileHandle] = useState<FileSystemFileHandle | null>(null);
  
  // Initialize currentTime with a fresh Date object
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  
  // Initialize data from file or localStorage - reload when fileHandle changes
  useEffect(() => {
    const initializeData = async () => {
      if (fileHandle) {
        try {
          const fileData = await readFile(fileHandle);
          // Clear existing data and load from new file
          setBlocks(fileData.blocks);
          setStandardBlocks(fileData.standardBlocks);
          
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
              const parsedBlocks = JSON.parse(savedBlocks, (key, value) => {
                if (key === 'startTime' || key === 'endTime') {
                  const date = new Date(value);
                  return new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    date.getHours(),
                    date.getMinutes(),
                    date.getSeconds()
                  );
                }
                return value;
              });
              
              if (Array.isArray(parsedBlocks) && parsedBlocks.every(block => 
                typeof block.id === 'number' &&
                typeof block.name === 'string' &&
                block.startTime instanceof Date &&
                block.endTime instanceof Date &&
                !isNaN(block.startTime.getTime()) &&
                !isNaN(block.endTime.getTime())
              )) {
                setBlocks(parsedBlocks);
              }
            } else {
              // No localStorage data, start fresh
              setBlocks([]);
            }
            setStandardBlocks([]);
          } catch (error) {
            console.error('Error loading blocks from localStorage:', error);
            setBlocks([]);
            setStandardBlocks([]);
          }
        } else if (!currentFileHandle && blocks.length === 0) {
          // Initial load with localStorage (not switching modes)
          try {
            const savedBlocks = localStorage.getItem(STORAGE_KEY);
            if (savedBlocks) {
              const parsedBlocks = JSON.parse(savedBlocks, (key, value) => {
                if (key === 'startTime' || key === 'endTime') {
                  const date = new Date(value);
                  return new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    date.getHours(),
                    date.getMinutes(),
                    date.getSeconds()
                  );
                }
                return value;
              });
              
              if (Array.isArray(parsedBlocks) && parsedBlocks.every(block => 
                typeof block.id === 'number' &&
                typeof block.name === 'string' &&
                block.startTime instanceof Date &&
                block.endTime instanceof Date &&
                !isNaN(block.startTime.getTime()) &&
                !isNaN(block.endTime.getTime())
              )) {
                setBlocks(parsedBlocks);
              }
            }
          } catch (error) {
            console.error('Error loading blocks from localStorage:', error);
          }
        }
      }
    };

    initializeData();
  }, [fileHandle]); // Re-run when fileHandle changes

  // Update currentTime every second to ensure we always have the latest time
  useEffect(() => {
    // Force immediate update with the latest time when component mounts
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
    };
    
    // Update immediately
    updateTime();
    
    // Set interval to update time every second
    const timer = setInterval(updateTime, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Polling for file changes (1.5 seconds)
  useEffect(() => {
    if (!fileHandle) return;

    const checkForFileChanges = async () => {
      try {
        const file = await fileHandle.getFile();
        if (file.lastModified > lastFileModified) {
          const fileData = await readFile(fileHandle);
          setBlocks(fileData.blocks);
          setStandardBlocks(fileData.standardBlocks);
          setLastFileModified(file.lastModified);
        }
      } catch (error) {
        console.error('Error checking for file changes:', error);
      }
    };

    const interval = setInterval(checkForFileChanges, 1500);
    return () => clearInterval(interval);
  }, [fileHandle, lastFileModified]);
  
  // Save to file or localStorage when blocks change
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
        } catch (error) {
          console.error('Error saving blocks to localStorage:', error);
        }
      }
    };

    // Only save if there are blocks or if we're explicitly clearing
    if (blocks.length > 0 || currentFileHandle !== fileHandle) {
      saveData();
    }
  }, [blocks, fileHandle]);
  
  const addBlock = (block: Omit<Block, 'id'>) => {
    const newBlock = {
      ...block,
      id: Date.now()
    };
    setBlocks(prevBlocks => [...prevBlocks, newBlock]);
  };

  const updateBlock = (id: number, block: Omit<Block, 'id'>) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(b => b.id === id ? { ...block, id } : b)
    );
  };
  
  const removeBlock = (id: number) => {
    setBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
  };

  const removeUpcomingBlocks = () => {
    setBlocks(prevBlocks => 
      prevBlocks.filter(block => currentTime >= block.startTime)
    );
  };
  
  return (
    <BlockerContext.Provider
      value={{
        blocks,
        addBlock,
        updateBlock,
        removeBlock,
        removeUpcomingBlocks,
        currentTime,
      }}
    >
      {children}
    </BlockerContext.Provider>
  );
};