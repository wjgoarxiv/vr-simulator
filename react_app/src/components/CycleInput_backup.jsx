import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CycleNavigation({ onPrevious, onNext, canGoPrevious, canGoNext }) {
  return (
    <div className="flex justify-center space-x-4">
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="btn-secondary flex items-center space-x-2 px-6 py-3"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>⏮️ Previous Cycle</span>
      </button>
      
      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="btn-secondary flex items-center space-x-2 px-6 py-3"
      >
        <span>Next Cycle ⏭️</span>
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
