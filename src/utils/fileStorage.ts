import { Block, StandardBlock } from '../types';

// Type declarations for File System Access API
declare global {
  interface Window {
    showOpenFilePicker: (options?: {
      types?: { description: string; accept: Record<string, string[]> }[];
      multiple?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker: (options?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  }
  
  interface FileSystemFileHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
    name: string;
  }
  
  interface FileSystemWritableFileStream {
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }
}

export interface FileData {
  blocks: Block[];
  standardBlocks: StandardBlock[];
}

// File System Access API support check
export const isFileSystemAccessSupported = (): boolean => {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
};

// New improved file selection with create/open choice
export const selectFile = async (): Promise<FileSystemFileHandle | null> => {
  if (!isFileSystemAccessSupported()) {
    alert('File System Access API is not supported in this browser. Please use Chrome or Edge.');
    return null;
  }

  try {
    // Show choice dialog
    const choice = confirm('Create a new file? (OK = New, Cancel = Open existing)');
    
    if (choice) {
      // Create new file
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: 'sc-blocker-data.json',
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      // Initialize with empty structure
      await writeFile(fileHandle, { blocks: [], standardBlocks: [] });
      return fileHandle;
    } else {
      // Open existing file
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      return fileHandle;
    }
  } catch (error) {
    console.log('File selection cancelled');
    return null;
  }
};

// Legacy function for backward compatibility - now uses the new selectFile
export const selectFileOld = async (): Promise<FileSystemFileHandle | null> => {
  if (!isFileSystemAccessSupported()) {
    alert('File System Access API is not supported in this browser. Please use Chrome or Edge.');
    return null;
  }

  try {
    // Try to open existing file first
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{
        description: 'JSON files',
        accept: { 'application/json': ['.json'] }
      }],
      multiple: false
    });
    return fileHandle;
  } catch (error) {
    // If user cancels or no file selected, try to create new file
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: 'sc-blocker-data.json',
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      // Initialize new file with empty structure
      await writeFile(fileHandle, { blocks: [], standardBlocks: [] });
      return fileHandle;
    } catch (saveError) {
      console.log('User cancelled file selection');
      return null;
    }
  }
};

// Read file and parse JSON
export const readFile = async (fileHandle: FileSystemFileHandle): Promise<FileData> => {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    
    if (!text.trim()) {
      // Empty file, return default structure
      return { blocks: [], standardBlocks: [] };
    }
    
    const data = JSON.parse(text, (key, value) => {
      // Parse dates in blocks
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
    
    // Ensure the data has the correct structure
    return {
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      standardBlocks: Array.isArray(data.standardBlocks) ? data.standardBlocks : []
    };
  } catch (error) {
    console.error('Error reading file:', error);
    // Return default structure on error
    return { blocks: [], standardBlocks: [] };
  }
};

// Write JSON to file
export const writeFile = async (fileHandle: FileSystemFileHandle, data: FileData): Promise<void> => {
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
}; 