import React, { createContext, useState, useEffect, useContext } from 'react';
import { Block } from '../types';

interface BlockerContextType {
  blocks: Block[];
  addBlock: (block: Omit<Block, 'id'>) => void;
  updateBlock: (id: number, block: Omit<Block, 'id'>) => void;
  removeBlock: (id: number) => void;
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

// Helper function to generate recurring blocks
const generateRecurringBlocks = (block: Omit<Block, 'id'>): Block[] => {
  if (!block.recurring) {
    return [{
      ...block,
      id: Date.now()
    }];
  }

  const blocks: Block[] = [];
  const { interval, daysOfWeek, endDate } = block.recurring;
  
  // If it's a weekly recurrence without selected days, return empty array
  if (interval === 'weekly' && (!daysOfWeek || daysOfWeek.length === 0)) {
    return blocks;
  }

  let currentStart = new Date(block.startTime);
  let currentEnd = new Date(block.endTime);
  const duration = currentEnd.getTime() - currentStart.getTime();

  // Function to check if we should create a block for the current date
  const shouldCreateBlock = (date: Date): boolean => {
    if (interval !== 'weekly' || !daysOfWeek) return true;
    return daysOfWeek.includes(date.getDay());
  };

  // Function to get the next valid date based on interval
  const getNextDate = (date: Date): Date => {
    const next = new Date(date);
    switch (interval) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        // Find the next selected day of the week
        let daysToAdd = 1;
        while (!daysOfWeek?.includes((next.getDay() + daysToAdd) % 7)) {
          daysToAdd++;
        }
        next.setDate(next.getDate() + daysToAdd);
        break;
    }
    return next;
  };

  // Generate blocks until we reach the end date (if specified) or for a reasonable number of occurrences
  const maxOccurrences = endDate ? 365 : 52; // Limit to 1 year if no end date
  let occurrences = 0;

  while (occurrences < maxOccurrences && (!endDate || currentStart <= endDate)) {
    if (shouldCreateBlock(currentStart)) {
      blocks.push({
        ...block,
        id: Date.now() + blocks.length,
        startTime: new Date(currentStart),
        endTime: new Date(currentEnd)
      });
      occurrences++;
    }

    // Move to next occurrence
    currentStart = getNextDate(currentStart);
    currentEnd = new Date(currentStart.getTime() + duration);
  }

  return blocks;
};

export const BlockerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    try {
      const savedBlocks = localStorage.getItem(STORAGE_KEY);
      if (savedBlocks) {
        const parsedBlocks = JSON.parse(savedBlocks, (key, value) => {
          if (key === 'startTime' || key === 'endTime' || key === 'endDate') {
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
    const newBlocks = generateRecurringBlocks(block);
    setBlocks(prevBlocks => [...prevBlocks, ...newBlocks]);
  };

  const updateBlock = (id: number, block: Omit<Block, 'id'>) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(b => b.id === id ? { ...block, id } : b)
    );
  };
  
  const removeBlock = (id: number) => {
    setBlocks(prevBlocks => prevBlocks.filter(block => block.id !== id));
  };
  
  return (
    <BlockerContext.Provider
      value={{
        blocks,
        addBlock,
        updateBlock,
        removeBlock,
        currentTime,
      }}
    >
      {children}
    </BlockerContext.Provider>
  );
};