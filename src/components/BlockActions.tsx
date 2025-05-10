import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, X, Check } from 'lucide-react';
import { Block, BlockFormData } from '../types';
import { useBlocker } from '../context/BlockerContext';
import { formatDateTimeLocal } from '../utils/timeUtils';

interface BlockActionsProps {
  block: Block;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  initialEditMode?: boolean;
}

export const BlockActions: React.FC<BlockActionsProps> = ({ 
  block, 
  onEditStart, 
  onEditEnd,
  initialEditMode = false 
}) => {
  const { removeBlock, updateBlock } = useBlocker();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [formData, setFormData] = useState<BlockFormData>({
    name: block.name,
    startTime: formatDateTimeLocal(block.startTime),
    endTime: formatDateTimeLocal(block.endTime)
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialEditMode && !isEditing) {
      setIsEditing(true);
    }
  }, [initialEditMode]);

  const handleEdit = () => {
    setIsEditing(true);
    onEditStart?.();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setFormData({
      name: block.name,
      startTime: formatDateTimeLocal(block.startTime),
      endTime: formatDateTimeLocal(block.endTime)
    });
    onEditEnd?.();
  };

  const handleSave = () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter a block name');
      return;
    }

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Invalid date format');
      return;
    }

    if (end <= start) {
      setError('End time must be after start time');
      return;
    }

    updateBlock(block.id, {
      name: formData.name.trim(),
      startTime: start,
      endTime: end
    });

    setIsEditing(false);
    onEditEnd?.();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this block?')) {
      removeBlock(block.id);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
            placeholder="Block name"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
            />
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <X size={16} /> Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1 text-sm text-green-600 hover:text-green-800"
          >
            <Check size={16} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleEdit}
        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
        title="Edit block"
      >
        <Edit2 size={16} />
      </button>
      <button
        onClick={handleDelete}
        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
        title="Delete block"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};