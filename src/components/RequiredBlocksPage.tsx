import React from 'react';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { useBlocker } from '../context/BlockerContext';
import { Star, Trash2, Star as StarIcon, AlertTriangle, Clock } from 'lucide-react';
import { StandardBlock } from '../types';
import { formatSimplifiedRemainingTime } from '../utils/timeUtils';

const RequiredBlocksPage: React.FC = () => {
  const { standardBlocks, getRequiredBlocks, toggleRequiredStatus, isLoading: standardBlocksLoading } = useStandardBlocks();
  const { blocks, currentTime, isLoading: blocksLoading } = useBlocker();
  
  // Filter standard blocks that are not already required
  const nonRequiredStandardBlocks = standardBlocks.filter(block => !block.required);
  const requiredBlocks = getRequiredBlocks();
  
  // Filter active and upcoming blocks
  const activeBlocks = blocks.filter(block => 
    currentTime >= block.startTime && currentTime < block.endTime
  );
  
  const upcomingBlocks = blocks.filter(block => 
    currentTime < block.startTime
  );
  
  // Combine active and upcoming for scheduled blocks
  const activeAndUpcomingBlocks = [...activeBlocks, ...upcomingBlocks];
  
  // Get the names of currently active blocks
  const activeBlockNames = activeBlocks.map(block => block.name);
  
  // Get active/scheduled blocks for each required block
  const getBlocksForRequiredBlock = (requiredBlock: StandardBlock) => {
    return activeAndUpcomingBlocks.filter(block => block.name === requiredBlock.name);
  };

  // Find earliest end time for active/scheduled blocks for this required block
  const getEarliestEndTime = (requiredBlock: StandardBlock) => {
    const matchingBlocks = getBlocksForRequiredBlock(requiredBlock);
    if (matchingBlocks.length === 0) return null;

    // Sort by end time and take the earliest
    return matchingBlocks.sort((a, b) => a.endTime.getTime() - b.endTime.getTime())[0].endTime;
  };

  // Sort required blocks by their end time (soonest first)
  const sortedRequiredBlocks = [...requiredBlocks].sort((a, b) => {
    const aEndTime = getEarliestEndTime(a);
    const bEndTime = getEarliestEndTime(b);
    
    // If no matching blocks or end time, put at the end
    if (!aEndTime) return 1;
    if (!bEndTime) return -1;
    
    // Sort by earliest end time
    return aEndTime.getTime() - bEndTime.getTime();
  });
  
  // Show loading state while storage is initializing
  if (blocksLoading || standardBlocksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Required Blocks</h2>
          <p className="text-gray-600">Setting up your required blocks management...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Star className="text-amber-500" />
          Required Blocks Management
        </h2>
        <p className="text-gray-600">
          Required blocks will be tracked on your dashboard and you'll be notified when any are missing.
        </p>
      </div>
      
      {requiredBlocks.length > 0 ? (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Current Required Blocks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRequiredBlocks.map(block => {
              const isActive = activeBlockNames.includes(block.name);
              const earliestEndTime = getEarliestEndTime(block);
              
              return (
                <RequiredBlockCard 
                  key={block.id} 
                  block={block} 
                  isActive={isActive}
                  endTime={earliestEndTime}
                  onRemoveRequired={() => toggleRequiredStatus(block.id)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8 text-center">
          <h3 className="text-xl font-semibold text-amber-700 mb-2">No Required Blocks</h3>
          <p className="text-amber-600">
            You haven't marked any blocks as required yet. Add required blocks from standard blocks below.
          </p>
        </div>
      )}
      
      {nonRequiredStandardBlocks.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Add Required Blocks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nonRequiredStandardBlocks.map(block => (
              <StandardBlockCard 
                key={block.id} 
                block={block} 
                onMakeRequired={() => toggleRequiredStatus(block.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RequiredBlockCard: React.FC<{
  block: StandardBlock;
  isActive: boolean;
  endTime: Date | null;
  onRemoveRequired: () => void;
}> = ({ block, isActive, endTime, onRemoveRequired }) => {
  const now = new Date();
  const timeRemaining = endTime ? formatSimplifiedRemainingTime(endTime, now) : null;
  
  return (
    <div className={`border rounded-lg p-5 shadow-sm ${
      isActive 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className={`font-bold text-lg ${
            isActive ? 'text-green-700' : 'text-red-700'
          }`}>
            {block.name}
          </h4>
          <div className={`inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5 text-sm ${
            isActive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {isActive ? (
              <span>Currently Active</span>
            ) : (
              <>
                <AlertTriangle size={14} />
                <span>Not Active</span>
              </>
            )}
          </div>
          
          {isActive && timeRemaining && (
            <div className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
              <Clock size={12} />
              <span>Expires in: {timeRemaining}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onRemoveRequired}
          className="text-gray-500 hover:text-red-600 p-1 transition-colors"
          title="Remove required status"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

const StandardBlockCard: React.FC<{
  block: StandardBlock;
  onMakeRequired: () => void;
}> = ({ block, onMakeRequired }) => {
  return (
    <div className="border rounded-lg p-5 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-lg text-gray-800">{block.name}</h4>
      </div>
      
      <button
        onClick={onMakeRequired}
        className="w-full bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
      >
        <StarIcon size={16} /> Mark as Required
      </button>
    </div>
  );
};

export default RequiredBlocksPage; 