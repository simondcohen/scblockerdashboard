import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BlockerProvider } from './context/BlockerContext';
import { StandardBlocksProvider } from './context/StandardBlocksContext';
import Layout from './components/Layout';
import BlockerDashboard from './components/BlockerDashboard';
import HistoryPage from './components/HistoryPage';
import RequiredBlocksPage from './components/RequiredBlocksPage';
import { selectFile, isFileSystemAccessSupported } from './utils/fileStorage';
import { saveFileHandle, getStoredFileHandle, verifyAndRequestPermission, clearStoredFileHandle } from './utils/fileHandleStorage';

function App() {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [useFileStorage, setUseFileStorage] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(true);

  useEffect(() => {
    // Try to reconnect to previous file
    const reconnectToFile = async () => {
      try {
        const storedHandle = await getStoredFileHandle();
        
        if (storedHandle) {
          // Verify we still have permission
          const hasPermission = await verifyAndRequestPermission(storedHandle);
          
          if (hasPermission) {
            setFileHandle(storedHandle);
            setUseFileStorage(true);
          } else {
            // Permission denied, clear the stored handle
            await clearStoredFileHandle();
          }
        }
      } catch (error) {
        console.error('Error reconnecting to file:', error);
      } finally {
        setIsReconnecting(false);
      }
    };
    
    reconnectToFile();
  }, []);

  // Handle file selection - can be called manually
  const handleFileSelection = useCallback(async () => {
    if (!isFileSystemAccessSupported()) {
      alert('File System Access API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const handle = await selectFile();
      if (handle) {
        setFileHandle(handle);
        setUseFileStorage(true);
        // Save to IndexedDB for auto-reconnect
        await saveFileHandle(handle);
      }
      // If user cancels, we stay with current file (or localStorage if no file was selected)
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setFileHandle(null);
    setUseFileStorage(false);
    await clearStoredFileHandle();
  }, []);

  // Get current file name for display
  const getFileName = () => {
    if (fileHandle) {
      return fileHandle.name;
    }
    return null;
  };

  // Show loading state while reconnecting
  if (isReconnecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">
            Reconnecting to your data file...
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <BlockerProvider fileHandle={useFileStorage ? fileHandle : null}>
        <StandardBlocksProvider fileHandle={useFileStorage ? fileHandle : null}>
          <Layout 
            onFileSelect={handleFileSelection}
            onDisconnect={handleDisconnect}
            currentFileName={getFileName()}
            isFileSystemSupported={isFileSystemAccessSupported()}
          >
            <Routes>
              <Route path="/" element={<BlockerDashboard />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/required" element={<RequiredBlocksPage />} />
            </Routes>
          </Layout>
        </StandardBlocksProvider>
      </BlockerProvider>
    </BrowserRouter>
  );
}

export default App;