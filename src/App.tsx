import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StorageProvider } from './context/StorageProvider';
import { storageService } from './utils/storageService';
import Layout from './components/Layout';
import BlockerDashboard from './components/BlockerDashboard';
import HistoryPage from './components/HistoryPage';
import RequiredBlocksPage from './components/RequiredBlocksPage';

function App() {
  useEffect(() => {
    // Cleanup function to destroy storageService when app unmounts
    return () => {
      storageService.destroy();
    };
  }, []);

  return (
    <BrowserRouter>
      <StorageProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<BlockerDashboard />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/required" element={<RequiredBlocksPage />} />
          </Routes>
        </Layout>
      </StorageProvider>
    </BrowserRouter>
  );
}

export default App;