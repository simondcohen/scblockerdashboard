import React, { createContext, useState, useEffect, useContext } from 'react';
import { Block } from '../types';
import { storageService } from '../utils/storageService';

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

export const BlockerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  
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
    let cleanup: (() => void) | undefined;
    storageService.init().then(() => {
      setBlocks(storageService.getBlocks());
      const cb = (b: Block[]) => setBlocks(b);
      storageService.subscribeBlocks(cb);
      cleanup = () => storageService.unsubscribeBlocks(cb);
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    storageService.setBlocks(blocks);
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