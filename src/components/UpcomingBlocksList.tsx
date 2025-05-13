import React, { useState } from 'react';
import { Block } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { CalendarClock, FileText } from 'lucide-react';
import { BlockActions } from './BlockActions';

interface UpcomingBlocksListProps {
  blocks: Block[];
}

const UpcomingBlocksList: React.FC<UpcomingBlocksListProps> = ({ blocks }) => {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-blue-600 flex items-center gap-2">
        <CalendarClock className="h-5 w-5" />
        Upcoming Blocks <span className="ml-2 bg-blue-100 text-blue-800 text-sm rounded-full px-2 py-0.5">{blocks.length}</span>
      </h2>
      
      {blocks.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">No scheduled blocks</p>
      ) : (
        <div className="space-y-3">
          {blocks.slice(0, 5).map(block => {
            const isToday = block.startTime.toDateString() === new Date().toDateString();
            const startTimeDisplay = isToday 
              ? block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
              : block.startTime.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
                ' at ' + 
                block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            
            return (
              <div 
                key={block.id} 
                className="bg-gray-50 p-3 rounded transition-all duration-200 hover:bg-gray-100"
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
                        <span>Starts: {startTimeDisplay}</span>
                        <span className="text-xs bg-gray-200 rounded-full px-2 py-0.5">
                          {formatDuration(block.startTime, block.endTime)}
                        </span>
                      </div>
                      {block.notes && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <FileText size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600 italic">{block.notes}</p>
                        </div>
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
            );
          })}
          
          {blocks.length > 5 && (
            <div className="text-xs text-gray-500 text-center pt-2">
              + {blocks.length - 5} more upcoming blocks
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UpcomingBlocksList;