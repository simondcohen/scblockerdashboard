import React, { useState } from 'react';
import { Block } from '../types';
import { useFileStorage } from '../hooks/useFileStorage';
import { calculateRemainingTime, calculateProgress } from '../utils/timeUtils';
import { ShieldAlert, FileText } from 'lucide-react';
import { BlockActions } from './BlockActions';

interface ActiveBlocksListProps {
  blocks: Block[];
}

const ActiveBlocksList: React.FC<ActiveBlocksListProps> = ({ blocks }) => {
  const { currentTime } = useFileStorage();
  const [editingId, setEditingId] = useState<number | null>(null);
  
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm h-full">
      <h2 className="text-2xl font-bold mb-6 text-green-600 flex items-center gap-2">
        <ShieldAlert className="h-6 w-6" />
        Active Blocks <span className="ml-2 bg-green-100 text-green-800 text-sm rounded-full px-2 py-0.5">{blocks.length}</span>
      </h2>
      
      {blocks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          <p className="text-xl mb-2">No active blocks at the moment</p>
          <p className="text-gray-400">Click "Create New Block" to start blocking distractions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map(block => {
            const remaining = calculateRemainingTime(block.endTime, currentTime);
            const progress = calculateProgress(block.startTime, block.endTime, currentTime);
            
            return (
              <div 
                key={block.id} 
                className="bg-gray-50 border rounded-lg p-5 transition-all duration-300 hover:shadow-md"
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
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-grow">
                        <h3 className="font-bold text-xl">{block.name}</h3>
                        <p className="text-sm text-gray-600">
                          {block.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - 
                          {block.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                        {block.notes && (
                          <div className="mt-2 flex items-start gap-1.5">
                            <FileText size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 italic">{block.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">Time Remaining:</div>
                          <div className={`text-2xl font-bold ${
                            remaining.totalMinutes && remaining.totalMinutes < 10 
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }`}>
                            {remaining.text}
                          </div>
                        </div>
                        <BlockActions 
                          block={block}
                          onEditStart={() => setEditingId(block.id)}
                          onEditEnd={() => setEditingId(null)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all duration-1000 ${
                            remaining.totalMinutes && remaining.totalMinutes < 10 
                              ? 'bg-red-500'
                              : remaining.totalMinutes && remaining.totalMinutes < 30
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActiveBlocksList;