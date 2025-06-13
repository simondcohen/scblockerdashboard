import React, { createContext, useState, useEffect, useContext } from 'react';
import { StandardBlock } from '../types';
import { storageService } from '../utils/storageService';

interface StandardBlocksContextType {
  standardBlocks: StandardBlock[];
  addStandardBlock: (block: Omit<StandardBlock, 'id'>) => void;
  updateStandardBlock: (id: number, block: Omit<StandardBlock, 'id'>) => void;
  removeStandardBlock: (id: number) => void;
  toggleRequiredStatus: (id: number) => void;
  getRequiredBlocks: () => StandardBlock[];
  areAllRequiredBlocksActive: (activeBlockNames: string[]) => boolean;
  isLoading: boolean;
}

const StandardBlocksContext = createContext<StandardBlocksContextType | undefined>(undefined);

export const useStandardBlocks = () => {
  const context = useContext(StandardBlocksContext);
  if (!context) {
    throw new Error('useStandardBlocks must be used within a StandardBlocksProvider');
  }
  return context;
};

export const StandardBlocksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [standardBlocks, setStandardBlocks] = useState<StandardBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const initializeStorage = async () => {
      try {
        setIsLoading(true);
        await storageService.init();
        setStandardBlocks(storageService.getStandardBlocks());
        setIsInitialized(true);
        
        const cb = (b: StandardBlock[]) => setStandardBlocks(b);
        storageService.subscribeStandard(cb);
        cleanup = () => storageService.unsubscribeStandard(cb);
      } catch (error) {
        console.error('Failed to initialize storage:', error);
        // Even if initialization fails, we should still set up with empty state
        setStandardBlocks([]);
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Only update storage after initialization is complete and we're not loading
  useEffect(() => {
    if (isInitialized && !isLoading) {
      storageService.setStandardBlocks(standardBlocks);
    }
  }, [standardBlocks, isInitialized, isLoading]);
  
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
        areAllRequiredBlocksActive,
        isLoading,
      }}
    >
      {children}
    </StandardBlocksContext.Provider>
  );
}; 