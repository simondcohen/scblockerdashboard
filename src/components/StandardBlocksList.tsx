import React, { useState, useCallback } from 'react';
import { Trash2, Edit, Check, X, PlusCircle } from 'lucide-react';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { StandardBlock } from '../types';

interface StandardBlockFormProps {
  onSubmit: (name: string) => void;
  onCancel: () => void;
  initialName?: string;
  isEditing?: boolean;
}

const StandardBlockForm: React.FC<StandardBlockFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialName = '', 
  isEditing = false 
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter a block name');
      return;
    }

    onSubmit(name.trim());
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
  onSelect: (block: StandardBlock) => void;
  onEdit: (block: StandardBlock) => void;
  onDelete: (id: number) => void;
}> = ({ block, onSelect, onEdit, onDelete }) => {
  return (
    <div className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium text-gray-800">{block.name}</h4>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(block)}
            className="text-gray-500 hover:text-blue-500 transition-colors p-1"
            title="Edit block"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(block.id)}
            className="text-gray-500 hover:text-red-500 transition-colors p-1"
            title="Delete block"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <button
        onClick={() => onSelect(block)}
        className="w-full bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded text-sm transition-colors flex items-center justify-center gap-1"
      >
        <PlusCircle size={14} /> Use Block
      </button>
    </div>
  );
};

const StandardBlocksList: React.FC<{
  onSelectBlock: (block: StandardBlock) => void;
}> = ({ onSelectBlock }) => {
  const { standardBlocks, addStandardBlock, updateStandardBlock, removeStandardBlock } = useStandardBlocks();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StandardBlock | null>(null);
  
  const handleAddBlock = (name: string) => {
    addStandardBlock({ name });
    setShowAddForm(false);
  };
  
  const handleUpdateBlock = (name: string) => {
    if (editingBlock) {
      updateStandardBlock(editingBlock.id, { name });
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
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Standard Blocks</h3>
        
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {standardBlocks.map((block) => (
            <StandardBlockItem
              key={block.id}
              block={block}
              onSelect={onSelectBlock}
              onEdit={startEditing}
              onDelete={removeStandardBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StandardBlocksList; 