import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useBlocker } from '../context/BlockerContext';
import { formatDateTimeLocal } from '../utils/timeUtils';

const AddBlockForm: React.FC = () => {
  const { addBlock } = useBlocker();
  const [showForm, setShowForm] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formError, setFormError] = useState('');
  
  // Initialize default times
  useEffect(() => {
    const now = new Date();
    const later = new Date(now.getTime() + 3600000); // 1 hour later
    setStartTime(formatDateTimeLocal(now));
    setEndTime(formatDateTimeLocal(later));
  }, []);
  
  // Reset form
  const resetForm = () => {
    setBlockName('');
    setFormError('');
    const now = new Date();
    const later = new Date(now.getTime() + 3600000);
    setStartTime(formatDateTimeLocal(now));
    setEndTime(formatDateTimeLocal(later));
  };
  
  // Toggle form visibility
  const toggleForm = () => {
    if (showForm) {
      resetForm();
    }
    setShowForm(!showForm);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormError('');
    
    if (!blockName.trim()) {
      setFormError('Please enter a block name');
      return;
    }
    
    if (!startTime || !endTime) {
      setFormError('Please select start and end times');
      return;
    }
    
    // Create Date objects in local timezone
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setFormError('Invalid date format');
      return;
    }
    
    if (end <= start) {
      setFormError('End time must be after start time');
      return;
    }
    
    addBlock({
      name: blockName.trim(),
      startTime: start,
      endTime: end
    });
    
    resetForm();
    setShowForm(false);
  };
  
  return (
    <div className="mb-8">
      <button
        onClick={toggleForm}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-sm"
      >
        {showForm ? (
          <>
            <X size={18} /> Cancel
          </>
        ) : (
          <>
            <Plus size={18} /> Create New Block
          </>
        )}
      </button>
      
      {showForm && (
        <div className="mt-4 bg-white rounded-lg border shadow-sm p-6 animate-fade-in">
          <h3 className="text-xl font-semibold mb-4">Create New Block</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-600 border border-red-200 rounded px-4 py-2 text-sm">
                {formError}
              </div>
            )}
            
            <div>
              <label htmlFor="blockName" className="block font-medium mb-1 text-gray-700">
                Block Name:
              </label>
              <input
                id="blockName"
                type="text"
                value={blockName}
                onChange={(e) => setBlockName(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                placeholder="e.g., Social Media Block"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startTime" className="block font-medium mb-1 text-gray-700">
                  Start Time:
                </label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>
              
              <div>
                <label htmlFor="endTime" className="block font-medium mb-1 text-gray-700">
                  End Time:
                </label>
                <input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded transition-colors duration-200 shadow-sm"
              >
                Create Block
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddBlockForm;