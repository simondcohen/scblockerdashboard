import React, { useState } from 'react';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { useBlocker } from '../context/BlockerContext';
import { Star, Trash2, PlusCircle, Star as StarIcon, AlertTriangle } from 'lucide-react';
import { StandardBlock } from '../types';

const RequiredBlocksPage: React.FC = () => {
  const { standardBlocks, getRequiredBlocks, toggleRequiredStatus } = useStandardBlocks();
  const { blocks, currentTime } = useBlocker();
  
  // Filter standard blocks that are not already required
  const nonRequiredStandardBlocks = standardBlocks.filter(block => !block.required);
  const requiredBlocks = getRequiredBlocks();
  
  // Get the names of currently active blocks
  const activeBlockNames = blocks
    .filter(block => currentTime >= block.startTime && currentTime < block.endTime)
    .map(block => block.name);
  
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
            {requiredBlocks.map(block => (
              <RequiredBlockCard 
                key={block.id} 
                block={block} 
                isActive={activeBlockNames.includes(block.name)}
                onRemoveRequired={() => toggleRequiredStatus(block.id)}
              />
            ))}
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
  onRemoveRequired: () => void;
}> = ({ block, isActive, onRemoveRequired }) => {
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