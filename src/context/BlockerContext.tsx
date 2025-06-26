import React, { createContext, useState, useEffect, useContext } from 'react';
import { Block } from '../types';
import { useFileDataStore } from './FileDataStore';

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

export const BlockerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fileDataStore = useFileDataStore();
  const [localBlocks, setLocalBlocks] = useState<Block[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  
  // Sync with file data store or localStorage
  useEffect(() => {
    if (fileDataStore.fileHandle) {
      // Use file data
      setLocalBlocks(fileDataStore.blocks);
    } else {
      // Use localStorage
      try {
        const savedBlocks = localStorage.getItem(STORAGE_KEY);
        if (savedBlocks) {
          const parsedBlocks = JSON.parse(savedBlocks, (key, value) => {
            if (key === 'startTime' || key === 'endTime') {
              return new Date(value);
            }
            return value;
          });
          
          if (Array.isArray(parsedBlocks)) {
            setLocalBlocks(parsedBlocks);
          }
        }
      } catch (error) {
        console.error('Error loading blocks from localStorage:', error);
      }
    }
  }, [fileDataStore.fileHandle, fileDataStore.blocks]);
  
  // Save to localStorage when not using file
  useEffect(() => {
    if (!fileDataStore.fileHandle && localBlocks.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localBlocks));
      } catch (error) {
        console.error('Error saving blocks to localStorage:', error);
      }
    }
  }, [localBlocks, fileDataStore.fileHandle]);
  
  // Update currentTime every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const addBlock = (block: Omit<Block, 'id'>) => {
    const newBlock = {
      ...block,
      id: Date.now()
    };
    
    const updatedBlocks = [...localBlocks, newBlock];
    setLocalBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateBlocks(updatedBlocks);
    }
  };

  const updateBlock = (id: number, block: Omit<Block, 'id'>) => {
    const updatedBlocks = localBlocks.map(b => 
      b.id === id ? { ...block, id } : b
    );
    setLocalBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateBlocks(updatedBlocks);
    }
  };
  
  const removeBlock = (id: number) => {
    const updatedBlocks = localBlocks.filter(block => block.id !== id);
    setLocalBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateBlocks(updatedBlocks);
    }
  };

  const removeUpcomingBlocks = () => {
    const updatedBlocks = localBlocks.filter(block => currentTime >= block.startTime);
    setLocalBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateBlocks(updatedBlocks);
    }
  };
  
  return (
    <BlockerContext.Provider
      value={{
        blocks: localBlocks,
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