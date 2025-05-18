import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BlockerProvider } from './context/BlockerContext';
import { StandardBlocksProvider } from './context/StandardBlocksContext';
import Layout from './components/Layout';
import BlockerDashboard from './components/BlockerDashboard';
import HistoryPage from './components/HistoryPage';

function App() {
  return (
    <BrowserRouter>
      <BlockerProvider>
        <StandardBlocksProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<BlockerDashboard />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Layout>
        </StandardBlocksProvider>
      </BlockerProvider>
    </BrowserRouter>
  );
}

export default App;