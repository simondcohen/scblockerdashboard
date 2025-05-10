import React from 'react';
import { Clock } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">Tech Blocker</h1>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Tech Blocker
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;