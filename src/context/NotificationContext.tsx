import React, { createContext, useContext, useState } from 'react';

export interface Notification {
  id: number;
  message: string;
  type?: 'info' | 'warning' | 'error';
}

interface NotificationContextValue {
  notify: (message: string, type?: 'info' | 'warning' | 'error') => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const remove = (id: number) => setNotifs(n => n.filter(nf => nf.id !== id));

  const notify = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const id = Date.now();
    setNotifs(n => [...n, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-2 right-2 space-y-2 z-50">
        {notifs.map(n => (
          <div
            key={n.id}
            className={`px-3 py-2 rounded shadow text-white ${
              n.type === 'error' ? 'bg-red-600' : n.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
            }`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
