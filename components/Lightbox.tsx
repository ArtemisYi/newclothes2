
import React, { useState } from 'react';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  ArrowPathRoundedSquareIcon,
  SparklesIcon,
  Square2StackIcon
} from '@heroicons/react/24/outline';
import { generateComparisonAnalysis } from '../services/geminiService';

interface LightboxProps {
  image: string;
  originalImage?: string;
  title: string;
  onClose: () => void;
  onContinueEdit?: (newImage: string) => void;
}

const Lightbox: React.FC<LightboxProps> = ({ image, originalImage, title, onClose, onContinueEdit }) => {
  const [showComparison, setShowComparison] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // If no original image is provided, disable comparison logic
  const canCompare = !!originalImage;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 bg-slate-900/50 backdrop-blur-md">
        <h3 className="text-white/90 font-medium text-lg">{title}</h3>
        <div className="flex gap-3">
          {onContinueEdit && (
             <button 
               onClick={() => onContinueEdit(image)}
               className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-full transition-colors flex items-center gap-2 shadow-lg"
             >
               <ArrowPathRoundedSquareIcon className="w-4 h-4" />
               以此继续改款
             </button>
          )}
          
          <a 
            href={image} 
            download={`restyle-${Date.now()}.png`}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="下载"
          >
            <ArrowDownTrayIcon className="w-6 h-6" />
          </a>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto flex w-full h-full bg-slate-900 relative">
         <div className={`m-auto flex items-center justify-center p-8 w-full h-full relative`}>
            {showComparison && canCompare ? (
              // Comparison Mode (Side by Side)
              <div className="flex w-full h-full items-center justify-center gap-4 px-4 relative">
                 <div className="flex-1 h-full flex flex-col items-center justify-center relative">
                   <span className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md z-10">当前图</span>
                   <img src={image} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10" alt="Modified" />
                 </div>
                 
                 {/* Center Divider Area */}
                 <div className="w-[1px] h-2/3 bg-white/20 relative flex items-center justify-center">
                 </div>

                 <div className="flex-1 h-full flex flex-col items-center justify-center relative">
                    <span className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md z-10">原图</span>
                    <img src={originalImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10" alt="Original" />
                 </div>
              </div>
            ) : (
              // Normal Mode
              <img 
                src={image} 
                alt={title} 
                className="max-w-full max-h-full object-contain shadow-2xl"
              />
            )}
         </div>
      </div>

      {/* Footer Controls (Cleaned) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-slate-800 px-6 py-3 rounded-full border border-slate-700 shadow-xl">
          
          {canCompare && (
            <button
               onClick={() => setShowComparison(!showComparison)}
               className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${showComparison ? 'bg-indigo-600 text-white' : 'text-white/80 hover:bg-white/10'}`}
            >
               <Square2StackIcon className="w-4 h-4" />
               {showComparison ? '退出对比' : '对比原图'}
            </button>
          )}
      </div>
    </div>
  );
};

export default Lightbox;
