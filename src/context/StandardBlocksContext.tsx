import React, { createContext, useState, useEffect, useContext } from 'react';
import { StandardBlock } from '../types';
import { useFileDataStore } from './FileDataStore';

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

const STORAGE_KEY = 'tech-blocker-standard-blocks';

export const StandardBlocksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fileDataStore = useFileDataStore();
  const [localStandardBlocks, setLocalStandardBlocks] = useState<StandardBlock[]>([]);
  
  // Sync with file data store or localStorage
  useEffect(() => {
    if (fileDataStore.fileHandle) {
      // Use file data
      setLocalStandardBlocks(fileDataStore.standardBlocks);
    } else {
      // Use localStorage
      try {
        const savedBlocks = localStorage.getItem(STORAGE_KEY);
        if (savedBlocks) {
          const parsedBlocks = JSON.parse(savedBlocks);
          
          if (Array.isArray(parsedBlocks)) {
            setLocalStandardBlocks(parsedBlocks);
          }
        }
      } catch (error) {
        console.error('Error loading standard blocks from localStorage:', error);
      }
    }
  }, [fileDataStore.fileHandle, fileDataStore.standardBlocks]);
  
  // Save to localStorage when not using file
  useEffect(() => {
    if (!fileDataStore.fileHandle && localStandardBlocks.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localStandardBlocks));
      } catch (error) {
        console.error('Error saving standard blocks to localStorage:', error);
      }
    }
  }, [localStandardBlocks, fileDataStore.fileHandle]);
  
  const addStandardBlock = (block: Omit<StandardBlock, 'id'>) => {
    const newBlock = {
      ...block,
      id: Date.now()
    };
    
    const updatedBlocks = [...localStandardBlocks, newBlock];
    setLocalStandardBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateStandardBlocks(updatedBlocks);
    }
  };

  const updateStandardBlock = (id: number, block: Omit<StandardBlock, 'id'>) => {
    const updatedBlocks = localStandardBlocks.map(b => 
      b.id === id ? { ...block, id } : b
    );
    setLocalStandardBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateStandardBlocks(updatedBlocks);
    }
  };
  
  const removeStandardBlock = (id: number) => {
    const updatedBlocks = localStandardBlocks.filter(block => block.id !== id);
    setLocalStandardBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateStandardBlocks(updatedBlocks);
    }
  };
  
  const toggleRequiredStatus = (id: number) => {
    const updatedBlocks = localStandardBlocks.map(block => 
      block.id === id 
        ? { ...block, required: block.required ? false : true }
        : block
    );
    setLocalStandardBlocks(updatedBlocks);
    
    if (fileDataStore.fileHandle) {
      fileDataStore.updateStandardBlocks(updatedBlocks);
    }
  };
  
  const getRequiredBlocks = () => {
    return localStandardBlocks.filter(block => block.required);
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
        standardBlocks: localStandardBlocks,
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