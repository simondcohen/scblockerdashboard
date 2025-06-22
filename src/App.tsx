import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FileStorageProvider } from './hooks/useFileStorage';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import BlockerDashboard from './components/BlockerDashboard';
import HistoryPage from './components/HistoryPage';
import RequiredBlocksPage from './components/RequiredBlocksPage';

function App() {

  return (
    <BrowserRouter>
      <NotificationProvider>
        <FileStorageProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<BlockerDashboard />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/required" element={<RequiredBlocksPage />} />
            </Routes>
          </Layout>
        </FileStorageProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;