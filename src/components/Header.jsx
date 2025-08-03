import React from 'react';
import { TrendingUp, Sun, Moon, Globe, RotateCcw } from 'lucide-react';
import { useLanguage, useTheme } from '../contexts/AppContext';
import { useVRContext } from '../App';

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { simulationStarted, resetSimulation } = useVRContext();

  const handleResetSimulation = () => {
    if (confirm('🔄 Reset Simulation\n\nThis will clear all simulation data and return to the initial setup screen.\n\nAre you sure you want to continue?')) {
      resetSimulation();
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🔄 {t('appTitle')}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('writtenBy')} <a href="https://woojingo.notion.site/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">Woojin Go</a>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Reset Button - Only show when simulation is started */}
            {simulationStarted && (
              <button
                onClick={handleResetSimulation}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg transition-colors duration-200"
                title="Reset simulation to initial state"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Language Toggle */}
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="en">English</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
            
            <div className="hidden md:block">
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 px-4 py-2 rounded-lg border border-primary-200 dark:border-primary-700">
                <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {t('appSubtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
