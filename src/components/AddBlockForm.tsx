import React, { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { useBlocker } from '../context/BlockerContext';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { formatDateOnly, updateDateTimePart, formatDateForDateInput, formatTimeForTimeInput } from '../utils/timeUtils';
import StandardBlocksList from './StandardBlocksList';
import { StandardBlock } from '../types';

const AddBlockForm: React.FC = () => {
  const { addBlock, currentTime } = useBlocker();
  const { addStandardBlock } = useStandardBlocks();
  const [showForm, setShowForm] = useState(false);
  const [blockName, setBlockName] = useState('');
  
  // Date state using Date objects
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  
  const [formError, setFormError] = useState('');
  const [saveAsStandard, setSaveAsStandard] = useState(false);
  
  // Refs for inputs to manage focus
  const blockNameInputRef = useRef<HTMLInputElement>(null);
  
  // Update times whenever the form is shown
  useEffect(() => {
    if (showForm) {
      const now = new Date();
      
      // Ensure time is not in the past for default start
      if (now.getMinutes() > 45) { // If close to next hour, jump to next hour 00 min
        now.setHours(now.getHours() + 1, 0, 0, 0);
      } else { // Round to next 15-minute interval
        const minutes = Math.ceil(now.getMinutes() / 15) * 15;
        now.setMinutes(minutes, 0, 0);
      }
      
      const later = new Date(now.getTime() + 3600000); // 1 hour later
      
      setStartTime(new Date(now)); // Create new Date objects to avoid mutation issues
      setEndTime(new Date(later));
      
      // Focus the block name input when form appears
      setTimeout(() => {
        if (blockNameInputRef.current) {
          blockNameInputRef.current.focus();
        }
      }, 100);
    }
  }, [showForm]);
  
  // Reset form
  const resetForm = () => {
    setBlockName('');
    setStartTime(null);
    setEndTime(null);
    setSaveAsStandard(false);
    setFormError('');
  };
  
  // Toggle form visibility
  const toggleForm = () => {
    if (showForm) {
      resetForm();
    }
    setShowForm(!showForm);
  };

  // Input handlers
  const handleBlockNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBlockName(e.target.value);
  };
  
  const handleSaveAsStandardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaveAsStandard(e.target.checked);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormError('');
    
    if (!blockName.trim()) {
      setFormError('Please enter a block name');
      if (blockNameInputRef.current) {
        blockNameInputRef.current.focus();
      }
      return;
    }
    
    if (!startTime || !endTime) {
      setFormError('Please select start and end times');
      return;
    }
    
    try {
      if (endTime <= startTime) {
        setFormError('End time must be after start time');
        return;
      }
      
      addBlock({
        name: blockName.trim(),
        startTime: startTime,
        endTime: endTime
      });
      
      // Save as standard block if checkbox is checked
      if (saveAsStandard) {
        addStandardBlock({
          name: blockName.trim()
        });
      }
      
      resetForm();
      setShowForm(false);
    } catch (error) {
      setFormError('Error processing dates. Please try again.');
    }
  };

  // Handle selecting a standard block
  const handleSelectStandardBlock = (block: StandardBlock) => {
    setBlockName(block.name);
    
    const now = new Date();
    const later = new Date(now.getTime() + 3600000); // Default 1 hour later
    
    setStartTime(now);
    setEndTime(later);
    
    setShowForm(true);
  };
  
  // Helper functions for updating date or time parts
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value; // YYYY-MM-DD
    setStartTime(prevStartTime => {
      const newStartTime = prevStartTime ? new Date(prevStartTime) : new Date();
      if (dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        newStartTime.setFullYear(year, month - 1, day); // month is 0-indexed
        if (!prevStartTime) {
          const now = new Date();
          newStartTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
        }
      } else {
        return null;
      }
      return newStartTime;
    });
  };
  
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value; // HH:MM
    setStartTime(prevStartTime => {
      const newStartTime = prevStartTime ? new Date(prevStartTime) : new Date();
      if (timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        newStartTime.setHours(hours, minutes, 0, 0); // Reset seconds/ms
        if (!prevStartTime) {
          const today = new Date();
          newStartTime.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
        }
      } else {
        return null;
      }
      return newStartTime;
    });
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value; // YYYY-MM-DD
    setEndTime(prevEndTime => {
      const newEndTime = prevEndTime ? new Date(prevEndTime) : new Date();
      if (dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        newEndTime.setFullYear(year, month - 1, day); // month is 0-indexed
        if (!prevEndTime) {
          const now = new Date();
          newEndTime.setHours(now.getHours() + 1, now.getMinutes(), 0, 0);
        }
      } else {
        return null;
      }
      return newEndTime;
    });
  };
  
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value; // HH:MM
    setEndTime(prevEndTime => {
      const newEndTime = prevEndTime ? new Date(prevEndTime) : new Date();
      if (timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        newEndTime.setHours(hours, minutes, 0, 0); // Reset seconds/ms
        if (!prevEndTime) {
          const today = new Date();
          newEndTime.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
        }
      } else {
        return null;
      }
      return newEndTime;
    });
  };
  
  // Dynamic min time for end time input when date is the same as start date
  const getEndTimeMinString = (): string => {
    if (!startTime || !endTime) return '';
    
    const sameDate = 
      startTime.getFullYear() === endTime.getFullYear() &&
      startTime.getMonth() === endTime.getMonth() &&
      startTime.getDate() === endTime.getDate();
    
    return sameDate ? formatTimeForTimeInput(startTime) : '';
  };
  
  return (
    <div className="mb-8">
      <button
        onClick={toggleForm}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-sm"
        type="button"
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
      
      {!showForm && (
        <StandardBlocksList onSelectBlock={handleSelectStandardBlock} />
      )}
      
      {showForm && (
        <div className="mt-4 bg-white rounded-lg border shadow-sm p-6">
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
                onChange={handleBlockNameChange}
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                placeholder="e.g., Social Media Block"
                ref={blockNameInputRef}
                autoComplete="off"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700">
                  Start Time:
                </label>
                <div className="flex flex-col space-y-2">
                  <div className="mb-2">
                    <label htmlFor="startDate" className="block text-sm text-gray-600 mb-1">
                      Start Date:
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      value={formatDateForDateInput(startTime)}
                      onChange={handleStartDateChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Start Date"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label htmlFor="startTimeValue" className="block text-sm text-gray-600 mb-1">
                      Start Time:
                    </label>
                    <input
                      id="startTimeValue"
                      type="time"
                      value={formatTimeForTimeInput(startTime)}
                      onChange={handleStartTimeChange}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Start Time"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block font-medium mb-1 text-gray-700">
                  End Time:
                </label>
                <div className="flex flex-col space-y-2">
                  <div className="mb-2">
                    <label htmlFor="endDate" className="block text-sm text-gray-600 mb-1">
                      End Date:
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={formatDateForDateInput(endTime)}
                      onChange={handleEndDateChange}
                      min={formatDateForDateInput(startTime)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="End Date"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label htmlFor="endTimeValue" className="block text-sm text-gray-600 mb-1">
                      End Time:
                    </label>
                    <input
                      id="endTimeValue"
                      type="time"
                      value={formatTimeForTimeInput(endTime)}
                      onChange={handleEndTimeChange}
                      min={getEndTimeMinString()}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="End Time"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="saveAsStandard"
                type="checkbox"
                checked={saveAsStandard}
                onChange={handleSaveAsStandardChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="saveAsStandard" className="ml-2 block text-sm text-gray-700">
                Save as standard block
              </label>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm"
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