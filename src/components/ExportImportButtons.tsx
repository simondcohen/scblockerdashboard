import React, { ChangeEvent } from 'react';
import { storageService } from '../utils/storageService';
import { useNotifications } from '../context/NotificationContext';

const ExportImportButtons: React.FC = () => {
  const { notify } = useNotifications();

  const handleExport = () => {
    const data = JSON.stringify({ blocks: storageService.getBlocks(), standardBlocks: storageService.getStandardBlocks() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blocker-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.blocks || !Array.isArray(parsed.blocks) || !parsed.standardBlocks || !Array.isArray(parsed.standardBlocks)) {
          notify('Invalid file format', 'error');
          return;
        }

        await storageService.setBlocks(parsed.blocks);
        await storageService.setStandardBlocks(parsed.standardBlocks);

        notify('Data imported successfully', 'info');
      } catch (error) {
        console.error('Import error:', error);
        notify('Failed to import data', 'error');
      }
    };

    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleExport} className="px-2 py-1 text-xs text-blue-600 underline">Export</button>
      <label className="px-2 py-1 text-xs text-blue-600 underline cursor-pointer">
        Import
        <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
      </label>
    </div>
  );
};

export default ExportImportButtons;
