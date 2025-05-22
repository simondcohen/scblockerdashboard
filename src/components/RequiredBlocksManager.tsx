import React from 'react';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { Star, Trash2, AlertTriangle, Check, Clock } from 'lucide-react';
import { StandardBlock, Block } from '../types';
import { formatSimplifiedRemainingTime } from '../utils/timeUtils';

const RequiredBlocksManager: React.FC<{
  activeBlocks: Block[];
  allBlocks: Block[];
}> = ({ activeBlocks, allBlocks }) => {
  const { getRequiredBlocks, toggleRequiredStatus } = useStandardBlocks();
  
  const requiredBlocks = getRequiredBlocks();
  const activeBlockNames = activeBlocks.map(block => block.name);
  const allRequired = requiredBlocks.length === 0 ? true : 
    requiredBlocks.every(block => activeBlockNames.includes(block.name));
  
  if (requiredBlocks.length === 0) {
    return null;
  }

  // Get active/scheduled blocks for each required block
  const getBlocksForRequiredBlock = (requiredBlock: StandardBlock) => {
    return allBlocks.filter(block => block.name === requiredBlock.name);
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
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Star size={18} className="text-amber-500" />
          Required Blocks
          
          <div className={`ml-2 flex items-center gap-1 rounded-full px-3 py-0.5 text-sm ${
            allRequired 
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}>
            {allRequired ? (
              <>
                <Check size={14} />
                <span>All Active</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} /> 
                <span>Missing Required</span>
              </>
            )}
          </div>
        </h3>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedRequiredBlocks.map(block => {
            const isActive = activeBlockNames.includes(block.name);
            const earliestEndTime = getEarliestEndTime(block);
            
            return (
              <RequiredBlockItem 
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
    </div>
  );
};

const RequiredBlockItem: React.FC<{
  block: StandardBlock;
  isActive: boolean;
  endTime: Date | null;
  onRemoveRequired: () => void;
}> = ({ block, isActive, endTime, onRemoveRequired }) => {
  const now = new Date();
  const timeRemaining = endTime ? formatSimplifiedRemainingTime(endTime, now) : null;
  
  return (
    <div className={`border rounded-lg p-3 ${
      isActive 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-medium ${
            isActive ? 'text-green-700' : 'text-red-700'
          }`}>
            {block.name}
            <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${
              isActive 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </h4>
          
          {isActive && timeRemaining && (
            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Clock size={12} />
              <span>Expires in: {timeRemaining}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onRemoveRequired}
          className="text-amber-500 hover:text-amber-700 p-1 transition-colors"
          title="Remove required status"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default RequiredBlocksManager; 