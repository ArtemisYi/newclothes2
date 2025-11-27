
import React, { useState, useEffect, useRef } from 'react';
import { Attribute, ModificationOption } from '../types';
import { getModificationSuggestions } from '../services/geminiService';
import { SparklesIcon, PencilIcon, PhotoIcon, XMarkIcon, ArrowPathIcon, CheckCircleIcon, Square2StackIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface ModificationModalProps {
  attributes: Attribute[];
  originalImage: string;
  critiqueContent?: string;
  cachedSuggestions?: ModificationOption[];
  onUpdateCache?: (suggestions: ModificationOption[]) => void;
  onClose: () => void;
  onGenerate: (prompt: string, modificationValue: string, refImage?: string, type?: 'ai' | 'text' | 'ref') => void;
  onBatchGenerate?: (selections: { prompt: string; value: string }[]) => void;
}

const ModificationModal: React.FC<ModificationModalProps> = ({ 
  attributes, 
  originalImage, 
  critiqueContent, 
  cachedSuggestions,
  onUpdateCache,
  onClose, 
  onGenerate,
  onBatchGenerate
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'text' | 'ref'>('ai');
  
  // Initialize with cached suggestions if available
  const [suggestions, setSuggestions] = useState<ModificationOption[]>(cachedSuggestions || []);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [guidancePrompt, setGuidancePrompt] = useState('');
  
  // Multi-select state
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>([]);
  
  const [customText, setCustomText] = useState('');
  const [refImage, setRefImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attributeNames = attributes.map(a => a.name).join(', ');

  useEffect(() => {
    // Only fetch if active tab is AI, we have NO suggestions, and it's not loading
    if (activeTab === 'ai' && suggestions.length === 0 && !loadingSuggestions) {
      fetchSuggestions();
    }
  }, [activeTab]);

  const fetchSuggestions = async (isRetry = false) => {
    setLoadingSuggestions(true);
    try {
      const result = await getModificationSuggestions(
        originalImage, 
        attributes.map(a => a.name), 
        critiqueContent,
        isRetry ? guidancePrompt : undefined
      );
      setSuggestions(result);
      setSelectedSuggestionIds([]); // Clear selections on new fetch
      if (onUpdateCache) {
        onUpdateCache(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRefImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateClick = (prompt: string, valueDescription: string, type: 'ai' | 'text' | 'ref') => {
    onGenerate(prompt, valueDescription, refImage || undefined, type);
  };

  const toggleSelection = (id: string) => {
    setSelectedSuggestionIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchGenerateClick = () => {
    if (onBatchGenerate) {
      const selections = suggestions
        .filter(s => selectedSuggestionIds.includes(s.id))
        .map(s => ({ prompt: s.imagePrompt, value: s.title }));
      onBatchGenerate(selections);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">联合改款</span>
              {attributeNames}
            </h3>
            <p className="text-xs text-slate-500 mt-1">针对选中属性进行整体协调设计</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <SparklesIcon className="w-4 h-4" /> 组合推荐 ({suggestions.length || 8})
          </button>
          <button 
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PencilIcon className="w-4 h-4" /> 自定义输入
          </button>
          <button 
            onClick={() => setActiveTab('ref')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'ref' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PhotoIcon className="w-4 h-4" /> 参考图改款
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 relative">
          {activeTab === 'ai' && (
            <div className="space-y-4 pb-16">
              {/* Guidance Input Area */}
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex gap-2 items-center mb-4">
                  <input 
                    type="text" 
                    value={guidancePrompt}
                    onChange={(e) => setGuidancePrompt(e.target.value)}
                    placeholder={`例如: 将${attributeNames}设计得更可爱...`}
                    className="flex-1 bg-white border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button 
                    onClick={() => fetchSuggestions(true)}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1 shrink-0"
                    disabled={loadingSuggestions}
                  >
                     <ArrowPathIcon className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                     {loadingSuggestions ? '生成中...' : (suggestions.length > 0 ? '重新生成' : '生成方案')}
                  </button>
              </div>

              {loadingSuggestions ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full mb-3"></div>
                  <p>正在构思整体协调方案...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {suggestions.map((opt) => {
                    const isSelected = selectedSuggestionIds.includes(opt.id);
                    return (
                      <div 
                        key={opt.id} 
                        onClick={() => toggleSelection(opt.id)} 
                        className={`
                          relative p-4 rounded-xl border cursor-pointer transition-all group
                          ${isSelected 
                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-md' 
                            : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm'
                          }
                        `}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-indigo-600">
                            <CheckCircleIconSolid className="w-6 h-6" />
                          </div>
                        )}
                        {!isSelected && (
                          <div className="absolute top-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100">
                            <CheckCircleIcon className="w-6 h-6" />
                          </div>
                        )}
                        <h4 className={`font-bold mb-1 ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>{opt.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed pr-6">{opt.description}</p>
                      </div>
                    );
                  })}
                  {suggestions.length === 0 && !loadingSuggestions && (
                     <p className="col-span-2 text-center text-slate-400 py-8">暂无推荐，请点击上方按钮生成。</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={`请输入您想如何修改 [ ${attributeNames} ]...\n例如：将图案变大并移动到中心，风格改为卡通。`}
                className="w-full h-32 p-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-sm"
              />
              <button
                disabled={!customText.trim()}
                onClick={() => handleGenerateClick(`Modify the ${attributeNames}: ${customText}`, customText.substring(0, 10) + '...', 'text')}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
              >
                生成效果图
              </button>
            </div>
          )}

          {activeTab === 'ref' && (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-indigo-400 transition-all"
              >
                {refImage ? (
                  <img src={refImage} alt="Reference" className="h-40 object-contain rounded-lg shadow-sm" />
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">点击上传参考图</p>
                    <p className="text-xs text-slate-400 mt-1">AI 将提取参考图的 [ {attributeNames} ] 特征</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefImageUpload} />
              </div>

              {refImage && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700">补充描述 (可选)</label>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="例如：保留参考图的材质，但颜色要稍微深一点"
                    className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
                  />
                  <button
                    onClick={() => handleGenerateClick(`Replace the ${attributeNames} with the style from the reference image. ${customText}`, '参考图改款', 'ref')}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    融合参考图生成
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Action Bar for Batch Generation */}
        {activeTab === 'ai' && selectedSuggestionIds.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-2xl z-10 animate-bounce-in">
             <button
               onClick={handleBatchGenerateClick}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-transform hover:scale-105"
             >
               <Square2StackIcon className="w-5 h-5" />
               批量生成 ({selectedSuggestionIds.length})
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModificationModal;
