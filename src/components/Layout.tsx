import React from 'react';
import { Clock, History, Star, Download, Upload, File, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { useBlocker } from '../context/BlockerContext';

interface LayoutProps {
  children: React.ReactNode;
  onFileSelect?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  currentFileName?: string | null;
  isFileSystemSupported?: boolean;
}

interface BackupData {
  version: string;
  exportDate: string;
  blocks: unknown[];
  standardBlocks: unknown[];
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onFileSelect,
  onDisconnect,
  currentFileName,
  isFileSystemSupported = false
}) => {
  const location = useLocation();
  const isHistoryActive = location.pathname === '/history';
  const isDashboardActive = location.pathname === '/';
  const isRequiredActive = location.pathname === '/required';
  
  const { getRequiredBlocks } = useStandardBlocks();
  const { blocks, currentTime } = useBlocker();
  
  // Get active block names for required blocks check
  const activeBlockNames = blocks
    .filter(block => currentTime >= block.startTime && currentTime < block.endTime)
    .map(block => block.name);
  
  // Check if all required blocks are active
  const requiredBlocks = getRequiredBlocks();
  const allRequiredActive = requiredBlocks.length === 0 ? true : 
    requiredBlocks.every(block => activeBlockNames.includes(block.name));

  const downloadBackup = () => {
    try {
      // Get data from localStorage
      const blocksData = localStorage.getItem('tech-blocker-blocks');
      const standardBlocksData = localStorage.getItem('tech-blocker-standard-blocks');
      
      // Parse the data
      const blocks = blocksData ? JSON.parse(blocksData) : [];
      const standardBlocks = standardBlocksData ? JSON.parse(standardBlocksData) : [];
      
      // Create backup object
      const backupData: BackupData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        blocks,
        standardBlocks
      };
      
      // Create and download file
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Format date for filename
      const today = new Date();
      const dateStr = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      link.download = `blocker-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup. Please try again.');
    }
  };

  const uploadBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const backupData: BackupData = JSON.parse(content);
          
          // Validate backup structure
          if (!backupData.version || !backupData.blocks || !backupData.standardBlocks) {
            throw new Error('Invalid backup file format');
          }
          
          // Confirm before overwriting
          const confirmMessage = `This will replace all your current data with the backup from ${
            backupData.exportDate ? new Date(backupData.exportDate).toLocaleDateString() : 'unknown date'
          }. Are you sure?`;
          
          if (window.confirm(confirmMessage)) {
            // Update localStorage
            localStorage.setItem('tech-blocker-blocks', JSON.stringify(backupData.blocks));
            localStorage.setItem('tech-blocker-standard-blocks', JSON.stringify(backupData.standardBlocks));
            
            // Reload page to apply changes
            window.location.reload();
          }
          
        } catch (error) {
          console.error('Error restoring backup:', error);
          alert('Error reading backup file. Please ensure it\'s a valid backup file.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  const handleFileSelect = async () => {
    if (onFileSelect) {
      await onFileSelect();
    }
  };

  const handleDisconnect = async () => {
    if (onDisconnect) {
      if (window.confirm('Are you sure you want to disconnect from the file? The app will revert to using local browser storage.')) {
        await onDisconnect();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">Tech Blocker</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-1">
                <Link 
                  to="/" 
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isDashboardActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Clock className={`h-4 w-4 mr-1.5 ${isDashboardActive ? 'text-blue-500' : 'text-gray-500'}`} />
                  Dashboard
                </Link>
                <Link 
                  to="/required" 
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isRequiredActive 
                      ? 'bg-amber-50 text-amber-700' 
                      : requiredBlocks.length > 0 && !allRequiredActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Star className={`h-4 w-4 mr-1.5 ${
                    isRequiredActive 
                      ? 'text-amber-500' 
                      : requiredBlocks.length > 0 && !allRequiredActive
                        ? 'text-red-500'
                        : 'text-gray-500'
                  }`} />
                  Required
                  {requiredBlocks.length > 0 && !allRequiredActive && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </Link>
                <Link 
                  to="/history" 
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isHistoryActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <History className={`h-4 w-4 mr-1.5 ${isHistoryActive ? 'text-blue-500' : 'text-gray-500'}`} />
                  History
                </Link>
              </nav>
              
              <div className="flex space-x-1 border-l border-gray-200 pl-4">
                {/* File Management Buttons */}
                {isFileSystemSupported && (
                  <>
                    <button
                      onClick={handleFileSelect}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors ${
                        currentFileName
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      title={currentFileName ? `Current file: ${currentFileName}` : 'Select data file'}
                    >
                      {currentFileName ? (
                        <FileText className="h-4 w-4 mr-1.5 text-blue-500" />
                      ) : (
                        <File className="h-4 w-4 mr-1.5 text-gray-500" />
                      )}
                      {currentFileName || 'Select File'}
                    </button>

                    {currentFileName && (
                      <button
                        onClick={handleDisconnect}
                        className="px-3 py-2 rounded-md text-sm font-medium flex items-center text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                        title="Disconnect from file"
                      >
                        Disconnect
                      </button>
                    )}
                  </>
                )}

                {/* Legacy Backup Buttons */}
                <button
                  onClick={downloadBackup}
                  className="px-3 py-2 rounded-md text-sm font-medium flex items-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  title="Download Backup"
                >
                  <Download className="h-4 w-4 mr-1.5 text-gray-500" />
                  Download Backup
                </button>
                <button
                  onClick={uploadBackup}
                  className="px-3 py-2 rounded-md text-sm font-medium flex items-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  title="Upload Backup"
                >
                  <Upload className="h-4 w-4 mr-1.5 text-gray-500" />
                  Upload Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Tech Blocker
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;