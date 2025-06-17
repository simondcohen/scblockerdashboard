import React, { useState, useEffect } from 'react';
import { useBlocker } from '../context/BlockerContext';
import { formatDuration } from '../utils/timeUtils';
import { CheckCircle2, FileText, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BlockActions } from './BlockActions';

const HistoryPage: React.FC = () => {
  const { blocks, isLoading } = useBlocker();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  // Find all dates that have completed blocks
  useEffect(() => {
    const dates = new Set<string>();
    
    blocks.forEach(block => {
      if (block.endTime <= new Date()) {
        dates.add(block.endTime.toDateString());
      }
    });
    
    const sortedDates = Array.from(dates).map(dateStr => new Date(dateStr));
    sortedDates.sort((a, b) => b.getTime() - a.getTime()); // Sort descending
    
    setAvailableDates(sortedDates);
  }, [blocks]);

  // Navigate to previous date with blocks
  const goToPreviousDate = () => {
    const currentIndex = availableDates.findIndex(
      date => date.toDateString() === selectedDate.toDateString()
    );
    
    if (currentIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentIndex + 1]);
    }
  };

  // Navigate to next date with blocks
  const goToNextDate = () => {
    const currentIndex = availableDates.findIndex(
      date => date.toDateString() === selectedDate.toDateString()
    );
    
    if (currentIndex > 0) {
      setSelectedDate(availableDates[currentIndex - 1]);
    }
  };

  // Handle date selection change
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(event.target.value);
    setSelectedDate(newDate);
  };

  // Filter blocks for the selected date
  const filteredBlocks = blocks.filter(block =>
    block.endTime.toDateString() === selectedDate.toDateString() &&
    block.endTime <= new Date()
  ).sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const lastWeekBlocks = blocks.filter(b => b.endTime <= new Date() && b.endTime >= oneWeekAgo);
  const failedCount = lastWeekBlocks.filter(b => b.status === 'failed').length;
  const totalCount = lastWeekBlocks.length;

  // Show loading state while storage is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Block History</h2>
          <p className="text-gray-600">Fetching your completed blocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Block History</h2>
          <Link
            to="/"
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          {failedCount} failed out of {totalCount} blocks this week
        </div>
        
        {/* Date Navigation */}
        <div className="flex justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm">
          <button 
            onClick={goToPreviousDate}
            disabled={availableDates.findIndex(date => date.toDateString() === selectedDate.toDateString()) === availableDates.length - 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div className="flex items-center">
              <span className="text-xl font-medium">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <input 
                type="date" 
                value={selectedDate.toISOString().split('T')[0]} 
                onChange={handleDateChange}
                className="sr-only"
                id="date-picker"
              />
              <label 
                htmlFor="date-picker" 
                className="ml-2 cursor-pointer p-1 hover:bg-gray-100 rounded"
              >
                <Calendar className="h-4 w-4 text-gray-500" />
              </label>
            </div>
          </div>
          
          <button 
            onClick={goToNextDate}
            disabled={availableDates.findIndex(date => date.toDateString() === selectedDate.toDateString()) === 0}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Blocks for Selected Date */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-600 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Completed Blocks <span className="ml-2 bg-gray-100 text-gray-800 text-sm rounded-full px-2 py-0.5">{filteredBlocks.length}</span>
        </h2>
        
        {filteredBlocks.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No completed blocks on this date</p>
        ) : (
          <div className="space-y-3">
            {filteredBlocks.map(block => {
              const isFailed = block.status === 'failed';
              return (
              <div
                key={block.id}
                className={`${isFailed ? 'bg-red-50' : 'bg-gray-50'} p-3 rounded transition-all duration-200 hover:bg-gray-100`}
              >
                {editingId === block.id ? (
                  <BlockActions
                    block={block}
                    initialEditMode={true}
                    fullScreenEdit={true}
                    onEditStart={() => setEditingId(block.id)}
                    onEditEnd={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <div className="font-medium">{block.name}</div>
                      <div className="text-sm text-gray-600 flex justify-between items-center mt-1">
                        <span>
                          {block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} -
                          {block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span className={`text-xs rounded-full px-2 py-0.5 ${isFailed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {isFailed && block.failedAt ? `Failed after ${formatDuration(block.startTime, block.failedAt)}` : formatDuration(block.startTime, block.endTime)}
                        </span>
                      </div>
                      {block.notes && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <FileText size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600 italic">{block.notes}</p>
                        </div>
                      )}
                      {isFailed && block.failureReason && (
                        <div className="mt-1 text-sm text-red-700 italic">{block.failureReason}</div>
                      )}
                      {isFailed && block.failedAt && (
                        <div className="text-xs text-red-600">{formatDuration(block.failedAt, block.endTime)} remaining</div>
                      )}
                    </div>
                    <BlockActions
                      block={block}
                      onEditStart={() => setEditingId(block.id)}
                      onEditEnd={() => setEditingId(null)}
                    />
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage; 