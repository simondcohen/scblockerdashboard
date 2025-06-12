import React, { useState, useCallback } from 'react';
import { Trash2, Edit, Check, X, PlusCircle, Star, StarOff, Clock } from 'lucide-react';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { useBlocker } from '../context/BlockerContext';
import { formatSimplifiedRemainingTime } from '../utils/timeUtils';
import { StandardBlock } from '../types';

interface StandardBlockFormProps {
  onSubmit: (name: string, required?: boolean) => void;
  onCancel: () => void;
  initialName?: string;
  initialRequired?: boolean;
  isEditing?: boolean;
}

const StandardBlockForm: React.FC<StandardBlockFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialName = '', 
  initialRequired = false,
  isEditing = false 
}) => {
  const [name, setName] = useState(initialName);
  const [required, setRequired] = useState(initialRequired);
  const [error, setError] = useState('');

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleRequiredChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRequired(e.target.checked);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a block name');
      return;
    }

    onSubmit(name.trim(), required);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg border">
      {error && (
        <div className="bg-red-50 text-red-600 border border-red-200 rounded px-3 py-2 text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="standardBlockName" className="block text-sm font-medium text-gray-700 mb-1">
          Block Name:
        </label>
        <input
          id="standardBlockName"
          type="text"
          value={name}
          onChange={handleNameChange}
          className="w-full p-2 border rounded text-sm focus:outline-none focus:border-blue-500"
          placeholder="e.g., Quick Meeting"
        />
      </div>
      
      <div className="flex items-center">
        <input
          id="requiredBlock"
          type="checkbox"
          checked={required}
          onChange={handleRequiredChange}
          className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-gray-300 rounded"
        />
        <label htmlFor="requiredBlock" className="ml-2 block text-sm text-gray-700">
          Mark as required block
        </label>
      </div>
      
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
        >
          <X size={14} /> Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
        >
          <Check size={14} /> {isEditing ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
};

const StandardBlockItem: React.FC<{
  block: StandardBlock;
  isActive: boolean;
  endTime: Date | null;
  onSelect: (block: StandardBlock) => void;
  onEdit: (block: StandardBlock) => void;
  onDelete: (id: number) => void;
  onToggleRequired: (id: number) => void;
}> = ({ block, isActive, endTime, onSelect, onEdit, onDelete, onToggleRequired }) => {
  const now = new Date();
  const timeRemaining = block.required && isActive && endTime
    ? formatSimplifiedRemainingTime(endTime, now)
    : null;

  return (
    <li className={`group flex items-center justify-between gap-3 px-3 py-2 ${block.required ? 'bg-yellow-50' : 'bg-white'}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={() => onToggleRequired(block.id)}
          className={`${block.required ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-amber-500'} transition-colors`}
          title={block.required ? 'Remove required status' : 'Mark as required'}
        >
          {block.required ? <Star size={16} /> : <StarOff size={16} />}
        </button>
        <span className={`font-medium truncate ${block.required ? 'text-amber-700' : 'text-gray-800'}`}>{block.name}</span>
        {block.required && (
          <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isActive ? 'Active' : 'Inactive'}</span>
        )}
        {timeRemaining && (
          <span className="ml-2 text-xs text-blue-600 flex items-center gap-1">
            <Clock size={12} />
            {timeRemaining}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(block)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-500 p-1"
          title="Edit block"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
          title="Delete block"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={() => onSelect(block)}
          className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${block.required ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-green-100 hover:bg-green-200 text-green-700'} transition-colors`}
        >
          <PlusCircle size={14} /> Use
        </button>
      </div>
    </li>
  );
};

const StandardBlocksList: React.FC<{
  onSelectBlock: (block: StandardBlock) => void;
}> = ({ onSelectBlock }) => {
  const { standardBlocks, addStandardBlock, updateStandardBlock, removeStandardBlock, toggleRequiredStatus } = useStandardBlocks();
  const { blocks, currentTime } = useBlocker();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StandardBlock | null>(null);
  
  const handleAddBlock = (name: string, required?: boolean) => {
    addStandardBlock({ name, required });
    setShowAddForm(false);
  };
  
  const handleUpdateBlock = (name: string, required?: boolean) => {
    if (editingBlock) {
      updateStandardBlock(editingBlock.id, { name, required });
      setEditingBlock(null);
    }
  };
  
  const startEditing = (block: StandardBlock) => {
    setEditingBlock(block);
    setShowAddForm(false);
  };
  
  const cancelEditing = () => {
    setEditingBlock(null);
  };
  
  const cancelAdding = () => {
    setShowAddForm(false);
  };

  // Determine active blocks and sort order
  const activeBlocks = blocks.filter(
    b => currentTime >= b.startTime && currentTime < b.endTime
  );
  const activeBlockNames = activeBlocks.map(b => b.name);
  const activeAndUpcomingBlocks = blocks.filter(b => currentTime < b.endTime);

  const blocksWithStatus = standardBlocks.map(block => {
    const related = activeAndUpcomingBlocks.filter(b => b.name === block.name);
    const earliest = related.sort((a, b) => a.endTime.getTime() - b.endTime.getTime())[0];
    const endTime = earliest ? earliest.endTime : null;
    const isActive = activeBlockNames.includes(block.name);
    return { block, isActive, endTime };
  });

  const requiredBlocks = blocksWithStatus.filter(item => item.block.required);
  const activeRequiredCount = requiredBlocks.filter(item => item.isActive).length;

  const sortedBlocks = blocksWithStatus.sort((a, b) => {
    if (a.block.required && !b.block.required) return -1;
    if (!a.block.required && b.block.required) return 1;
    if (a.block.required && b.block.required) {
      if (!a.isActive && b.isActive) return -1;
      if (a.isActive && !b.isActive) return 1;
    }
    return a.block.name.localeCompare(b.block.name);
  });

  const sortedRequiredBlocks = sortedBlocks.filter(item => item.block.required);
  const sortedNonRequiredBlocks = sortedBlocks.filter(item => !item.block.required);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          Standard Blocks
          {requiredBlocks.length > 0 && (
            <span
              className={`text-sm px-2 py-0.5 rounded-full ${
                activeRequiredCount === requiredBlocks.length
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {activeRequiredCount}/{requiredBlocks.length} Required Active
            </span>
          )}
        </h3>
        
        {!showAddForm && !editingBlock && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-1"
          >
            <PlusCircle size={16} /> Add New
          </button>
        )}
      </div>
      
      {showAddForm && (
        <div className="mb-4">
          <StandardBlockForm
            onSubmit={handleAddBlock}
            onCancel={cancelAdding}
          />
        </div>
      )}
      
      {editingBlock && (
        <div className="mb-4">
          <StandardBlockForm
            initialName={editingBlock.name}
            initialRequired={editingBlock.required}
            onSubmit={handleUpdateBlock}
            onCancel={cancelEditing}
            isEditing
          />
        </div>
      )}
      
      {standardBlocks.length === 0 && !showAddForm ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
          <p className="text-gray-500">No standard blocks yet. Add some to quickly create new blocks.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedRequiredBlocks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-700 mb-2">Required Blocks</h4>
              <ul className="divide-y rounded-lg border overflow-hidden">
                {sortedRequiredBlocks.map(({ block, isActive, endTime }) => (
                  <StandardBlockItem
                    key={block.id}
                    block={block}
                    isActive={isActive}
                    endTime={endTime}
                    onSelect={onSelectBlock}
                    onEdit={startEditing}
                    onDelete={removeStandardBlock}
                    onToggleRequired={toggleRequiredStatus}
                  />
                ))}
              </ul>
            </div>
          )}
          {sortedNonRequiredBlocks.length > 0 && (
            <div>
              {sortedRequiredBlocks.length > 0 && (
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Standard Blocks</h4>
              )}
              <ul className="divide-y rounded-lg border overflow-hidden">
                {sortedNonRequiredBlocks.map(({ block, isActive, endTime }) => (
                  <StandardBlockItem
                    key={block.id}
                    block={block}
                    isActive={isActive}
                    endTime={endTime}
                    onSelect={onSelectBlock}
                    onEdit={startEditing}
                    onDelete={removeStandardBlock}
                    onToggleRequired={toggleRequiredStatus}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StandardBlocksList; 