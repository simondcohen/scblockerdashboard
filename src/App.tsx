import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StorageProvider } from './context/StorageProvider';
import Layout from './components/Layout';
import BlockerDashboard from './components/BlockerDashboard';
import HistoryPage from './components/HistoryPage';
import RequiredBlocksPage from './components/RequiredBlocksPage';

function App() {
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