import React from 'react';
import { BlockerProvider } from './context/BlockerContext';
import { StandardBlocksProvider } from './context/StandardBlocksContext';
import Layout from './components/Layout';
import BlockerDashboard from './components/BlockerDashboard';

function App() {
  return (
    <BlockerProvider>
      <StandardBlocksProvider>
        <Layout>
          <BlockerDashboard />
        </Layout>
      </StandardBlocksProvider>
    </BlockerProvider>
  );
}

export default App;