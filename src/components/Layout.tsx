import React from 'react';
import { Clock, History, Star } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useFileStorage } from '../hooks/useFileStorage';
import ExportImportButtons from './ExportImportButtons';

interface LayoutProps {
  children: React.ReactNode;
}


const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isHistoryActive = location.pathname === '/history';
  const isDashboardActive = location.pathname === '/';
  const isRequiredActive = location.pathname === '/required';
  
  const {
    getRequiredBlocks,
    blocks,
    currentTime,
    fileName,
    fileStatus,
    selectFile,
    isLoading,
  } = useFileStorage();

  const changeLocation = async () => {
    await selectFile();
  };
  
  // Get active block names for required blocks check
  const activeBlockNames = blocks
    .filter(block => currentTime >= block.startTime && currentTime < block.endTime)
    .map(block => block.name);
  
  // Check if all required blocks are active (only if not loading)
  const requiredBlocks = getRequiredBlocks();
  const allRequiredActive = isLoading ? true :
    (requiredBlocks.length === 0 ? true :
      requiredBlocks.every(block => activeBlockNames.includes(block.name)));


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
              
              <div id="storage-info" className="flex items-center space-x-2 text-sm text-gray-600 pl-4 border-l border-gray-200">
                {fileStatus === 'no-file' && (
                  <>
                    <span className="text-amber-600">⚠️ No File</span>
                    <button
                      onClick={changeLocation}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Select File
                    </button>
                  </>
                )}

                {fileStatus === 'error' && (
                  <>
                    <span>Storage:</span>
                    <span className="font-medium flex items-center text-amber-600">
                      <span className="mr-1">📁</span>{fileName}
                      <span className="ml-1 text-xs">(permission needed)</span>
                    </span>
                    <button
                      onClick={changeLocation}
                      className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                    >
                      Restore Access
                    </button>
                  </>
                )}

                {fileStatus === 'ready' && (
                  <>
                    <span>Storage:</span>
                    <span className="font-medium flex items-center">
                      <span className="mr-1">📁</span>{fileName}
                    </span>
                    <button onClick={changeLocation} className="underline text-blue-600 text-xs">
                      Change
                    </button>
                  </>
                )}

                <ExportImportButtons />
              </div>
            </div>
          </div>
        </div>
      </header>
      {(fileStatus === 'no-file' || fileStatus === 'error') && (
        <div
          className={`${
            fileStatus === 'no-file' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          } border rounded-md p-3 mb-4 flex items-center justify-between`}
        >
          <div className="flex items-center">
            <span className="text-lg mr-2">{fileStatus === 'no-file' ? '⚠️' : '🔒'}</span>
            <div>
              <p className={`font-medium ${fileStatus === 'no-file' ? 'text-red-800' : 'text-amber-800'}`}>
                {fileStatus === 'no-file' ? 'No file selected' : 'Storage permission needed'}
              </p>
              <p className={`text-sm ${fileStatus === 'no-file' ? 'text-red-600' : 'text-amber-600'}`}>
                {fileStatus === 'no-file'
                  ? 'Select a storage file to persist your blocks.'
                  : 'Click below to restore access to your saved data.'}
              </p>
            </div>
          </div>
          <button
            onClick={changeLocation}
            className={`px-4 py-2 rounded font-medium text-white ${
              fileStatus === 'no-file' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {fileStatus === 'no-file' ? 'Select File' : 'Restore Access'}
          </button>
        </div>
      )}
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