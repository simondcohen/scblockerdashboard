import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, X, Check, Calendar, Clock, FileText } from 'lucide-react';
import { Block, BlockFormData } from '../types';
import { useBlocker } from '../context/BlockerContext';
import { formatDateTimeLocal, parseDateTimeLocal } from '../utils/timeUtils';

interface BlockActionsProps {
  block: Block;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  initialEditMode?: boolean;
  fullScreenEdit?: boolean;
}

export const BlockActions: React.FC<BlockActionsProps> = ({ 
  block, 
  onEditStart, 
  onEditEnd,
  initialEditMode = false,
  fullScreenEdit = false
}) => {
  const { removeBlock, updateBlock } = useBlocker();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState<BlockFormData>({
    name: block.name,
    startTime: formatDateTimeLocal(block.startTime),
    endTime: formatDateTimeLocal(block.endTime),
    notes: block.notes || ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialEditMode && !isEditing) {
      setIsEditing(true);
    }
  }, [initialEditMode]);

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(fullScreenEdit);
    onEditStart?.();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsExpanded(false);
    setError('');
    setFormData({
      name: block.name,
      startTime: formatDateTimeLocal(block.startTime),
      endTime: formatDateTimeLocal(block.endTime),
      notes: block.notes || ''
    });
    onEditEnd?.();
  };

  const handleSave = () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter a block name');
      return;
    }

    const start = parseDateTimeLocal(formData.startTime);
    const end = parseDateTimeLocal(formData.endTime);

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
      endTime: end,
      notes: formData.notes.trim()
    });

    setIsEditing(false);
    setIsExpanded(false);
    onEditEnd?.();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this block?')) {
      removeBlock(block.id);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (isEditing) {
    const editFormClasses = isExpanded 
      ? "fixed inset-0 bg-white bg-opacity-95 z-50 p-6 overflow-auto" 
      : "space-y-4";

    const headerClasses = isExpanded 
      ? "border-b pb-4 mb-6 flex justify-between items-center" 
      : "hidden";

    return (
      <div className={editFormClasses}>
        <div className={headerClasses}>
          <h2 className="text-xl font-bold">Edit Block</h2>
          {isExpanded && (
            <button 
              onClick={toggleExpand} 
              className="text-gray-500 hover:text-gray-700"
              title="Minimize editor"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="blockName" className="block text-sm font-medium text-gray-700">
              Block Name
            </label>
            <input
              id="blockName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none text-base"
              placeholder="Enter block name"
            />
          </div>

          <div className={`${isExpanded ? 'grid grid-cols-2 gap-6' : 'space-y-4'}`}>
            <div className="space-y-2">
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar size={16} /> Start Time
              </label>
              <input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                step="1"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none text-base"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock size={16} /> End Time
              </label>
              <input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                step="1"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="blockNotes" className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText size={16} /> Notes
            </label>
            <textarea
              id="blockNotes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none text-base"
              placeholder="Add optional notes about this block"
            />
          </div>
        </div>

        <div className={`${isExpanded ? 'mt-6 flex justify-between' : 'mt-5 flex justify-end gap-3'}`}>
          {!isExpanded && (
            <button
              type="button"
              onClick={toggleExpand}
              className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50"
              title="Expand editor"
            >
              Expand
            </button>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <Check size={16} /> Save
            </button>
          </div>
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