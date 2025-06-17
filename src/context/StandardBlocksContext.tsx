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
  
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    storageService.getInitPromise().then(() => {
      setStandardBlocks(storageService.getStandardBlocks());
      setIsLoading(false);

      const cb = (b: StandardBlock[]) => {
        setStandardBlocks(b);
      };
      storageService.subscribeStandard(cb);
      cleanup = () => storageService.unsubscribeStandard(cb);
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);
  
  const addStandardBlock = (block: Omit<StandardBlock, 'id'>) => {
    const newBlock = {
      ...block,
      id: Date.now() + Math.random() // Add random component to prevent ID collisions
    };
    const updated = [...storageService.getStandardBlocks(), newBlock];
    storageService.setStandardBlocks(updated);
  };

  const updateStandardBlock = (id: number, block: Omit<StandardBlock, 'id'>) => {
    const updated = storageService.getStandardBlocks().map(b =>
      b.id === id ? { ...block, id } : b
    );
    storageService.setStandardBlocks(updated);
  };

  const removeStandardBlock = (id: number) => {
    const updated = storageService.getStandardBlocks().filter(block => block.id !== id);
    storageService.setStandardBlocks(updated);
  };

  const toggleRequiredStatus = (id: number) => {
    const updated = storageService.getStandardBlocks().map(block =>
      block.id === id ? { ...block, required: block.required ? false : true } : block
    );
    storageService.setStandardBlocks(updated);
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