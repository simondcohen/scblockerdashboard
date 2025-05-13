import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Clock, ArrowRight } from 'lucide-react';
import { useBlocker } from '../context/BlockerContext';
import { useStandardBlocks } from '../context/StandardBlocksContext';
import { formatDateOnly, updateDateTimePart, formatDateForDateInput, formatTimeForTimeInput, updateDateAndTime } from '../utils/timeUtils';
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
  
  // Duration mode state
  const [useDuration, setUseDuration] = useState(false);
  const [duration, setDuration] = useState({
    days: 0,
    hours: 1,
    minutes: 0
  });
  
  const [formError, setFormError] = useState('');
  const [saveAsStandard, setSaveAsStandard] = useState(false);
  
  // Refs for inputs to manage focus
  const blockNameInputRef = useRef<HTMLInputElement>(null);
  
  // Track if form was previously shown - used to detect when showForm changes from false to true
  const prevShowFormRef = useRef<boolean>(false);
  
  // Initialize form values when it is first displayed (showForm changes from false to true)
  useEffect(() => {
    // Only run initialization when form transitions from hidden to visible
    if (showForm && !prevShowFormRef.current) {
      // Get the actual current system time
      const now = new Date();
      
      // Set the start time to the exact current time (no rounding)
      const later = new Date(now.getTime() + 3600000); // 1 hour later
      
      setStartTime(new Date(now)); // Create new Date objects to avoid mutation issues
      setEndTime(new Date(later));
      
      // Reset duration to default 1 hour
      setDuration({
        days: 0,
        hours: 1,
        minutes: 0
      });
      
      // Focus the block name input when form appears, but only do this once
      setTimeout(() => {
        if (blockNameInputRef.current) {
          blockNameInputRef.current.focus();
        }
      }, 100);
    }
    
    // Update previous showForm state
    prevShowFormRef.current = showForm;
  }, [showForm]);

  // Memoized function to calculate endTime based on startTime and duration
  const calculateEndTime = useCallback((start: Date | null, durationData: typeof duration) => {
    if (!start) return null;
    
    const durationMs = 
      (durationData.days * 24 * 60 * 60 * 1000) + 
      (durationData.hours * 60 * 60 * 1000) + 
      (durationData.minutes * 60 * 1000);
    
    return new Date(start.getTime() + durationMs);
  }, []);

  // Effect to update end time based on duration when in duration mode
  useEffect(() => {
    if (useDuration && startTime) {
      const newEndTime = calculateEndTime(startTime, duration);
      if (newEndTime) {
        setEndTime(newEndTime);
      }
    }
  }, [useDuration, startTime, duration, calculateEndTime]);
  
  // Effect to update duration when switching to duration mode
  useEffect(() => {
    if (useDuration && startTime && endTime) {
      const diffMs = endTime.getTime() - startTime.getTime();
      if (diffMs > 0) {
        const diffMinutes = Math.floor(diffMs / (60 * 1000));
        
        const days = Math.floor(diffMinutes / (24 * 60));
        const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
        const minutes = diffMinutes % 60;
        
        setDuration({ days, hours, minutes });
      }
    }
  }, [useDuration, startTime, endTime]);
  
  // Reset form
  const resetForm = () => {
    setBlockName('');
    setStartTime(null);
    setEndTime(null);
    setSaveAsStandard(false);
    setFormError('');
    setUseDuration(false);
    setDuration({
      days: 0,
      hours: 1,
      minutes: 0
    });
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
  
  // Handle duration input changes
  const handleDurationChange = (field: 'days' | 'hours' | 'minutes', value: number) => {
    setDuration(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Toggle between duration mode and direct end time selection
  const toggleDurationMode = () => {
    setUseDuration(!useDuration);
  };
  
  // Safe date/time update functions to ensure stable state
  const safelyUpdateStartDate = (dateString: string) => {
    const updated = updateDateAndTime(startTime, dateString, undefined);
    if (updated) {
      setStartTime(updated);
    }
  };
  
  const safelyUpdateStartTime = (timeString: string) => {
    const updated = updateDateAndTime(startTime, undefined, timeString);
    if (updated) {
      setStartTime(updated);
    }
  };
  
  const safelyUpdateEndDate = (dateString: string) => {
    const updated = updateDateAndTime(endTime, dateString, undefined);
    if (updated) {
      setEndTime(updated);
    }
  };
  
  const safelyUpdateEndTime = (timeString: string) => {
    const updated = updateDateAndTime(endTime, undefined, timeString);
    if (updated) {
      setEndTime(updated);
    }
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
      // Get the actual current system time for validation
      const now = new Date();
      
      // Check if start time is in the past - removing this validation
      // if (startTime < now) {
      //   setFormError('Start time can\'t be in the past');
      //   return;
      // }
      
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
    
    // Use the actual current system time
    const now = new Date();
    const later = new Date(now.getTime() + 3600000); // Default 1 hour later
    
    setStartTime(now);
    setEndTime(later);
    
    setShowForm(true);
  };
  
  // Helper functions for updating date or time parts
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value; // YYYY-MM-DD
    safelyUpdateStartDate(dateString);
  };
  
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value; // HH:MM
    safelyUpdateStartTime(timeString);
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value; // YYYY-MM-DD
    safelyUpdateEndDate(dateString);
  };
  
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value; // HH:MM
    safelyUpdateEndTime(timeString);
  };
  
  // Dynamic min date for start date and end date inputs
  const getMinStartDate = (): string => {
    // Return a date far in the past to allow any start date
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 10); // 10 years in the past
    return formatDateForDateInput(pastDate);
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
  
  // Function to set start time to current time
  const handleUseCurrentTime = () => {
    // Use the actual current system time
    const now = new Date();
    setStartTime(now);
    
    // If in duration mode, recalculate end time based on the new start time and current duration
    if (useDuration) {
      const newEndTime = calculateEndTime(now, duration);
      if (newEndTime) {
        setEndTime(newEndTime);
      }
    }
    // If not in duration mode and end time exists but is before the new start time
    else if (endTime && endTime <= now) {
      const later = new Date(now.getTime() + 3600000); // 1 hour later than current time
      setEndTime(later);
    }
  };
  
  // Render the form
  if (!showForm) {
    return (
      <div className="flex flex-col items-center">
        <button 
          onClick={toggleForm}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md w-full md:w-auto"
        >
          <Plus size={18} />
          <span>Add New Block</span>
        </button>
        
        <div className="mt-8 w-full">
          <StandardBlocksList onSelectBlock={handleSelectStandardBlock} />
        </div>
      </div>
    );
  }
  
  // If form is visible
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Add New Block</h2>
        <button 
          onClick={toggleForm}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Close form"
        >
          <X size={20} />
        </button>
      </div>
      
      {formError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
          {formError}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="blockName" className="block font-medium mb-1 text-gray-700">
            Block Name:
          </label>
          <input
            id="blockName"
            type="text"
            value={blockName}
            onChange={handleBlockNameChange}
            ref={blockNameInputRef}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
            placeholder="Enter a name for your block"
            autoComplete="off"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                <div className="flex gap-2">
                  <input
                    id="startTimeValue"
                    type="time"
                    value={formatTimeForTimeInput(startTime)}
                    onChange={handleStartTimeChange}
                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                    placeholder="Start Time"
                    autoComplete="off"
                    step="60"
                  />
                  <button
                    type="button"
                    onClick={handleUseCurrentTime}
                    className="flex items-center gap-1 px-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border transition-colors duration-200"
                    title="Use current time"
                  >
                    <Clock size={16} />
                    <span className="text-xs whitespace-nowrap">Set to Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-medium text-gray-700">
                {useDuration ? 'Duration:' : 'End Time:'}
              </label>
              <button
                type="button"
                onClick={toggleDurationMode}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                {useDuration ? 'Set End Time Directly' : 'Use Duration Instead'}
              </button>
            </div>
            
            {useDuration ? (
              <div className="flex flex-col space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="durationDays" className="block text-sm text-gray-600 mb-1">
                      Days:
                    </label>
                    <input
                      id="durationDays"
                      type="number"
                      min="0"
                      value={duration.days}
                      onChange={(e) => handleDurationChange('days', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Days"
                    />
                  </div>
                  <div>
                    <label htmlFor="durationHours" className="block text-sm text-gray-600 mb-1">
                      Hours:
                    </label>
                    <input
                      id="durationHours"
                      type="number"
                      min="0"
                      max="23"
                      value={duration.hours}
                      onChange={(e) => handleDurationChange('hours', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Hours"
                    />
                  </div>
                  <div>
                    <label htmlFor="durationMinutes" className="block text-sm text-gray-600 mb-1">
                      Minutes:
                    </label>
                    <input
                      id="durationMinutes"
                      type="number"
                      min="0"
                      max="59"
                      value={duration.minutes}
                      onChange={(e) => handleDurationChange('minutes', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 outline-none transition-shadow"
                      placeholder="Minutes"
                    />
                  </div>
                </div>
                
                <div className="mt-1 bg-gray-50 p-2 rounded border">
                  <div className="flex items-center gap-2 text-sm">
                    <span>End time will be</span>
                    <ArrowRight size={14} className="text-gray-500" />
                    <span className="font-medium">
                      {endTime ? formatDateForDateInput(endTime) : ''} at {formatTimeForTimeInput(endTime)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
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
                    step="60"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center cursor-pointer space-x-2">
            <input
              type="checkbox"
              checked={saveAsStandard}
              onChange={handleSaveAsStandardChange}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">Save as standard block for future use</span>
          </label>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={toggleForm}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Create Block
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBlockForm;