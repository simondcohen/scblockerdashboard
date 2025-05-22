import React from 'react';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { Star, Trash2, AlertTriangle, Check } from 'lucide-react';
import { StandardBlock } from '../types';

const RequiredBlocksManager: React.FC<{
  activeBlockNames: string[];
}> = ({ activeBlockNames }) => {
  const { getRequiredBlocks, toggleRequiredStatus, areAllRequiredBlocksActive } = useStandardBlocks();
  
  const requiredBlocks = getRequiredBlocks();
  const allRequired = areAllRequiredBlocksActive(activeBlockNames);
  
  if (requiredBlocks.length === 0) {
    return null;
  }
  
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
          {requiredBlocks.map(block => (
            <RequiredBlockItem 
              key={block.id} 
              block={block} 
              isActive={activeBlockNames.includes(block.name)}
              onRemoveRequired={() => toggleRequiredStatus(block.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const RequiredBlockItem: React.FC<{
  block: StandardBlock;
  isActive: boolean;
  onRemoveRequired: () => void;
}> = ({ block, isActive, onRemoveRequired }) => {
  return (
    <div className={`border rounded-lg p-3 ${
      isActive 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex justify-between items-center">
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