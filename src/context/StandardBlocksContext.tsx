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
  
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    storageService.init().then(() => {
      setStandardBlocks(storageService.getStandardBlocks());
      const cb = (b: StandardBlock[]) => setStandardBlocks(b);
      storageService.subscribeStandard(cb);
      cleanup = () => storageService.unsubscribeStandard(cb);
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    storageService.setStandardBlocks(standardBlocks);
  }, [standardBlocks]);
  
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