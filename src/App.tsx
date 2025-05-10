import React from 'react';
import { BlockerProvider } from './context/BlockerContext';
import Layout from './components/Layout';
import BlockerDashboard from './components/BlockerDashboard';

function App() {
  return (
    <BlockerProvider>
      <Layout>
        <BlockerDashboard />
      </Layout>
    </BlockerProvider>
  );
}

export default App;