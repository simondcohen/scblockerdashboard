import React, { createContext, useState, useEffect, useContext } from 'react';
import { Block } from '../types';
import { storageService } from '../utils/storageService';

interface BlockerContextType {
  blocks: Block[];
  addBlock: (block: Omit<Block, 'id' | 'status' | 'failedAt' | 'failureReason'>) => void;
  updateBlock: (id: number, block: Omit<Block, 'id'>) => void;
  markBlockFailed: (id: number, failedAt: Date, reason: string) => void;
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
  const [isLoading, setIsLoading] = useState(true);
  
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
      setBlocks(storageService.getBlocks());
      setIsLoading(false);

      const cb = (b: Block[]) => {
        setBlocks(b);
      };
      storageService.subscribeBlocks(cb);
      cleanup = () => storageService.unsubscribeBlocks(cb);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);
  
  const addBlock = (block: Omit<Block, 'id' | 'status' | 'failedAt' | 'failureReason'>) => {
    const newBlock = {
      ...block,
      id: Date.now(),
      status: 'active' as const,
      lastModified: new Date().toISOString()
    };
    const updated = [...storageService.getBlocks(), newBlock];
    storageService.setBlocks(updated);
  };

  const updateBlock = (id: number, block: Omit<Block, 'id'>) => {
    const updated = storageService.getBlocks().map(b =>
      b.id === id ? { ...block, id, lastModified: new Date().toISOString() } : b
    );
    storageService.setBlocks(updated);
  };

  const markBlockFailed = (id: number, failedAt: Date, reason: string) => {
    const updated = storageService.getBlocks().map(b =>
      b.id === id
        ? {
            ...b,
            status: 'failed',
            failedAt,
            failureReason: reason,
            lastModified: new Date().toISOString(),
          }
        : b
    );
    storageService.setBlocks(updated);
  };

  const removeBlock = (id: number) => {
    const updated = storageService.getBlocks().filter(block => block.id !== id);
    storageService.setBlocks(updated);
  };

  const removeUpcomingBlocks = () => {
    const updated = storageService.getBlocks().filter(block => currentTime >= block.startTime);
    storageService.setBlocks(updated);
  };

  useEffect(() => {
    const updated = storageService.getBlocks().map(b =>
      b.status !== 'failed' && currentTime >= b.endTime && b.status !== 'completed'
        ? { ...b, status: 'completed' }
        : b
    );
    storageService.setBlocks(updated);
  }, [currentTime]);

  return (
    <BlockerContext.Provider
      value={{
        blocks,
        addBlock,
        updateBlock,
        markBlockFailed,
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