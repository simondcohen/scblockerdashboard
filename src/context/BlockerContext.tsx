import React, { createContext, useState, useEffect, useContext } from 'react';
import { Block } from '../types';

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
  const [blocks, setBlocks] = useState<Block[]>(() => {
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
          return parsedBlocks;
        }
      }
    } catch (error) {
      console.error('Error loading blocks from localStorage:', error);
    }
    return [];
  });
  
  // Initialize currentTime with a fresh Date object
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  
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
  
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
    } catch (error) {
      console.error('Error saving blocks to localStorage:', error);
    }
  }, [blocks]);
  
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