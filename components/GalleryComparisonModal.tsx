
import React from 'react';
import { GalleryItem } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface GalleryComparisonModalProps {
  items: GalleryItem[];
  onClose: () => void;
}

const GalleryComparisonModal: React.FC<GalleryComparisonModalProps> = ({ items, onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/95 backdrop-blur-md flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h3 className="text-xl font-bold text-white">方案对比 ({items.length})</h3>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <div className={`grid gap-6 h-full ${items.length === 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
           {items.map(item => (
             <div key={item.id} className="flex flex-col h-full bg-slate-800 rounded-2xl overflow-hidden border border-white/10">
                <div className="flex-1 relative bg-black/20 p-4 flex items-center justify-center">
                   <img src={item.modifiedImage} className="max-w-full max-h-full object-contain shadow-lg" alt={item.suggestionTitle} />
                </div>
                <div className="p-4 bg-slate-800 border-t border-white/5">
                   <h4 className="text-white font-bold text-sm text-center">{item.suggestionTitle}</h4>
                   <p className="text-slate-400 text-xs text-center mt-1">{item.modifiedAttributeValue || '无具体描述'}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryComparisonModal;
