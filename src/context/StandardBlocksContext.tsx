import React, { createContext, useState, useEffect, useContext } from 'react';
import { StandardBlock } from '../types';

interface StandardBlocksContextType {
  standardBlocks: StandardBlock[];
  addStandardBlock: (block: Omit<StandardBlock, 'id'>) => void;
  updateStandardBlock: (id: number, block: Omit<StandardBlock, 'id'>) => void;
  removeStandardBlock: (id: number) => void;
}

const StandardBlocksContext = createContext<StandardBlocksContextType | undefined>(undefined);

export const useStandardBlocks = () => {
  const context = useContext(StandardBlocksContext);
  if (!context) {
    throw new Error('useStandardBlocks must be used within a StandardBlocksProvider');
  }
  return context;
};

const STORAGE_KEY = 'tech-blocker-standard-blocks';

export const StandardBlocksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [standardBlocks, setStandardBlocks] = useState<StandardBlock[]>(() => {
    try {
      const savedBlocks = localStorage.getItem(STORAGE_KEY);
      if (savedBlocks) {
        const parsedBlocks = JSON.parse(savedBlocks);
        
        if (Array.isArray(parsedBlocks) && parsedBlocks.every(block => 
          typeof block.id === 'number' &&
          typeof block.name === 'string'
        )) {
          return parsedBlocks;
        }
      }
    } catch (error) {
      console.error('Error loading standard blocks from localStorage:', error);
    }
    return [];
  });
  
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(standardBlocks));
    } catch (error) {
      console.error('Error saving standard blocks to localStorage:', error);
    }
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
  
  return (
    <StandardBlocksContext.Provider
      value={{
        standardBlocks,
        addStandardBlock,
        updateStandardBlock,
        removeStandardBlock
      }}
    >
      {children}
    </StandardBlocksContext.Provider>
  );
}; 