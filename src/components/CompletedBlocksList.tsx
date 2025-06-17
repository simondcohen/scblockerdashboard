import React, { useState } from 'react';
import { Block } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { CheckCircle2, FileText, History } from 'lucide-react';
import { BlockActions } from './BlockActions';
import { Link } from 'react-router-dom';

interface CompletedBlocksListProps {
  blocks: Block[];
}

const CompletedBlocksList: React.FC<CompletedBlocksListProps> = ({ blocks }) => {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-600 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5" />
        Completed Today <span className="ml-2 bg-gray-100 text-gray-800 text-sm rounded-full px-2 py-0.5">{blocks.length}</span>
      </h2>
      
      {blocks.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">No completed blocks today</p>
      ) : (
        <div className="space-y-3">
          {blocks.slice(0, 5).map(block => {
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
                          {isFailed && block.failedAt ?
                            `Failed after ${formatDuration(block.startTime, block.failedAt)}` :
                            formatDuration(block.startTime, block.endTime)}
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
            );
          })}
          
          {blocks.length > 5 && (
            <div className="text-xs text-gray-500 text-center pt-2">
              + {blocks.length - 5} more completed blocks
            </div>
          )}
        </div>
      )}
      
      {/* History button */}
      <div className="mt-4 pt-4 border-t">
        <Link 
          to="/history" 
          className="flex items-center justify-center w-full text-sm text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors"
        >
          <History className="h-4 w-4 mr-1" />
          View Complete History
        </Link>
      </div>
    </div>
  );
};

export default CompletedBlocksList;