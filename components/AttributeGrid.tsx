
import React from 'react';
import { Attribute } from '../types';
import { CheckBadgeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface AttributeGridProps {
  attributes: Attribute[];
  recommendedAttributes?: string[];
  cachedAttributes?: string[]; // Attributes that have been analyzed
  selectedAttributes: string[]; // Currently selected attributes for multi-edit
  onToggleAttribute: (attr: Attribute) => void;
}

const CATEGORIES = ['结构', '细节', '图案', '材质', '风格'];

const AttributeGrid: React.FC<AttributeGridProps> = ({ 
  attributes, 
  recommendedAttributes = [], 
  cachedAttributes = [], 
  selectedAttributes = [],
  onToggleAttribute 
}) => {
  const grouped = CATEGORIES.map(cat => ({
    name: cat,
    items: attributes.filter(a => a.category === cat)
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6 pb-20"> {/* Extra padding for floating bar */}
      {grouped.map((group) => (
        <div key={group.name} className="animate-fade-in">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            {group.name}板块
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.items.map((attr) => {
              const isRecommended = recommendedAttributes.includes(attr.name);
              const isCached = cachedAttributes.includes(attr.name);
              const isSelected = selectedAttributes.includes(attr.name);
              
              return (
                <button
                  key={attr.name}
                  onClick={() => onToggleAttribute(attr)}
                  className={`
                    relative text-left p-3 rounded-lg border transition-all group overflow-hidden
                    ${isSelected 
                       ? 'bg-indigo-600 border-indigo-600 shadow-md ring-2 ring-indigo-200 ring-offset-1 transform scale-[1.02]' 
                       : isCached 
                         ? 'bg-indigo-50 border-indigo-400' 
                         : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md hover:bg-slate-50'
                    }
                    ${isRecommended && !isSelected && !isCached ? 'border-t-4 border-t-amber-400 border-x-slate-200 border-b-slate-200' : ''}
                  `}
                >
                  {isRecommended && !isSelected && !isCached && (
                     <div className="absolute top-0 right-0 bg-amber-400 text-white text-[9px] font-bold px-1.5 rounded-bl">
                       推荐
                     </div>
                  )}
                  
                  {isSelected ? (
                     <div className="absolute top-2 right-2 text-white">
                        <CheckCircleIconSolid className="w-5 h-5" />
                     </div>
                  ) : isCached ? (
                    <div className="absolute top-2 right-2 text-indigo-500">
                      <CheckBadgeIcon className="w-4 h-4" />
                    </div>
                  ) : null}

                  <span className={`block text-[10px] mb-0.5 ${isSelected ? 'text-indigo-200' : isCached ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
                    {attr.name}
                  </span>
                  <span className={`block text-sm font-semibold truncate pr-4 ${isSelected ? 'text-white' : isCached ? 'text-indigo-900' : 'text-slate-700 group-hover:text-indigo-700'}`}>
                    {attr.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttributeGrid;
