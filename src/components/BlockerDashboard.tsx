import React from 'react';
import { useFileStorage } from '../hooks/useFileStorage';
import AddBlockForm from './AddBlockForm';
import ActiveBlocksList from './ActiveBlocksList';
import UpcomingBlocksList from './UpcomingBlocksList';
import CompletedBlocksList from './CompletedBlocksList';
import { Loader2 } from 'lucide-react';

const BlockerDashboard: React.FC = () => {
  const { blocks, currentTime, isLoading } = useFileStorage();
  
  // Show loading state while storage is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Blocker Dashboard</h2>
          <p className="text-gray-600">Initializing storage and loading your blocks...</p>
        </div>
      </div>
    );
  }
  
  // Filter blocks by status
  const activeBlocks = blocks.filter(block =>
    block.status !== 'failed' && currentTime >= block.startTime && currentTime < block.endTime
  ).sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
  
  const upcomingBlocks = blocks.filter(block =>
    block.status !== 'failed' && currentTime < block.startTime
  ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  const completedBlocks = blocks.filter(block =>
    block.status === 'failed' || currentTime >= block.endTime
  ).sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  
  const todayCompletedBlocks = completedBlocks.filter(block => 
    block.endTime.toDateString() === currentTime.toDateString()
  );
  
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Blocker Dashboard</h2>
        <AddBlockForm />
      </div>
      
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Blocks (Main Focus) */}
        <div className="lg:col-span-2">
          <ActiveBlocksList blocks={activeBlocks} />
        </div>
        
        {/* Sidebar with Upcoming and Completed */}
        <div className="space-y-6">
          <UpcomingBlocksList blocks={upcomingBlocks} />
          <CompletedBlocksList blocks={todayCompletedBlocks} />
        </div>
      </div>
    </div>
  );
};

export default BlockerDashboard;