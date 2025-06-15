import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Block } from '../types';
import { storageService } from '../utils/storageService';

interface BlockerContextType {
  blocks: Block[];
  addBlock: (block: Omit<Block, 'id'>) => void;
  updateBlock: (id: number, block: Omit<Block, 'id'>) => void;
  removeBlock: (id: number) => void;
  removeUpcomingBlocks: () => void;
  currentTime: Date;
  isLoading: boolean;
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
  const fromFile = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
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

    storageService.getInitPromise().then(() => {
      fromFile.current = true;
      setBlocks(storageService.getBlocks());
      setIsInitialized(true);
      setIsLoading(false);

      const cb = (b: Block[]) => {
        fromFile.current = true;
        setBlocks(b);
      };
      storageService.subscribeBlocks(cb);
      cleanup = () => storageService.unsubscribeBlocks(cb);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Only update storage after initialization is complete and we're not loading
  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (fromFile.current) {
        fromFile.current = false;
      } else {
        storageService.setBlocks(blocks);
      }
    }
  }, [blocks, isInitialized, isLoading]);
  
  const addBlock = (block: Omit<Block, 'id'>) => {
    const newBlock = {
      ...block,
      id: Date.now(),
      lastModified: new Date().toISOString()
    };
    setBlocks(prevBlocks => [...prevBlocks, newBlock]);
  };

  const updateBlock = (id: number, block: Omit<Block, 'id'>) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(b =>
        b.id === id ? { ...block, id, lastModified: new Date().toISOString() } : b
      )
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
        isLoading,
      }}
    >
      {children}
    </BlockerContext.Provider>
  );
};