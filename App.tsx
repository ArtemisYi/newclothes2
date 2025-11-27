import React, { useState, useRef } from 'react';
import { analyzeClothingImage, generateModifiedImage, removeBackground, reanalyzeSpecificAttributes, setGeminiApiKey } from './services/geminiService';
import { AnalysisResult, GalleryItem, Attribute, MarketSettings, ModificationOption } from './types';
import LoadingOverlay from './components/LoadingOverlay';
import AttributeGrid from './components/AttributeGrid';
import ModificationModal from './components/ModificationModal';
import Lightbox from './components/Lightbox';
import ModelGenerationView from './components/ModelGenerationView';
import GalleryComparisonModal from './components/GalleryComparisonModal';
import { 
  CloudArrowUpIcon, 
  SparklesIcon, 
  SwatchIcon, 
  PhotoIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  TrashIcon,
  CheckCircleIcon,
  UserIcon,
  CalendarIcon,
  ScissorsIcon,
  MagnifyingGlassPlusIcon,
  ArrowLeftIcon,
  XMarkIcon,
  RectangleStackIcon,
  CursorArrowRaysIcon,
  PaintBrushIcon,
  KeyIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

type Tab = 'design' | 'model';

const App: React.FC = () => {
  // --- API Key State ---
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  // --- Navigation State ---
  const [activeTab, setActiveTab] = useState<Tab>('design');

  // --- Workflow State ---
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [marketSettings, setMarketSettings] = useState<MarketSettings>({ ageGroup: '', gender: '' });

  // --- Main Data State ---
  const [rawImage, setRawImage] = useState<string | null>(null); // Stores the original upload forever
  const [originalImage, setOriginalImage] = useState<string | null>(null); // Stores the current working image
  
  // Model Studio Data
  const [modelInitialImage, setModelInitialImage] = useState<string | null>(null);

  // Background Removal State
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [showBgInstruction, setShowBgInstruction] = useState(false);
  const [bgInstructionText, setBgInstructionText] = useState('');
  
  // Background Target Selection
  const [isSelectingBgTarget, setIsSelectingBgTarget] = useState(false);
  const [isRetryingBg, setIsRetryingBg] = useState(false); // Differentiate between initial run and retry

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Suggestions Cache
  const [suggestionCache, setSuggestionCache] = useState<Record<string, ModificationOption[]>>({});
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Selection State (Multi-Select)
  const [selectedAttributes, setSelectedAttributes] = useState<Attribute[]>([]);
  const [showModificationModal, setShowModificationModal] = useState(false);

  // Gallery Comparison State
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [showStep1Lightbox, setShowStep1Lightbox] = useState(false);
  
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleSetApiKey = () => {
    const key = apiKeyInput.trim().replace(/\s/g, ''); // Remove all spaces
    const url = baseUrlInput.trim();
    if (key) {
      setGeminiApiKey(key, url || undefined);
      setIsApiKeySet(true);
      resetAll(); // Reset state to ensure fresh start with new key
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setRawImage(result);
        setOriginalImage(result);
        // Reset everything else
        setAnalysisResult(null);
        setSuggestionCache({});
        setGeneratedImage(null);
        setSelectedAttributes([]);
        setShowModificationModal(false);
        setCurrentStep(1); 
        setShowBgInstruction(false);
        setBgInstructionText('');
        setIsSelectingBgTarget(false);
        setIsCompareMode(false);
        setSelectedCompareIds([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const initiateBgRemoval = (isRetry: boolean = false) => {
    setIsRetryingBg(isRetry);
    setIsSelectingBgTarget(true);
  };

  const handleConfirmBgRemovalTarget = async (targetType?: string) => {
    setIsSelectingBgTarget(false);
    if (!rawImage) return;

    setIsProcessingBg(true);
    try {
      const instruction = isRetryingBg && bgInstructionText ? bgInstructionText : undefined;
      const newBg = await removeBackground(rawImage, instruction, targetType);
      setOriginalImage(newBg); 
      setShowBgInstruction(false);
    } catch (e) {
      alert("转换白底图失败，请重试");
    } finally {
      setIsProcessingBg(false);
    }
  };

  const handleConfirmBg = () => {
    setCurrentStep(2);
  };

  const handleStartAnalysis = async () => {
    if (!originalImage) return;
    setCurrentStep(3); // Move to workspace
    setIsAnalyzing(true);
    setSuggestionCache({}); // Clear previous suggestions on new analysis
    setSelectedAttributes([]);
    try {
      const result = await analyzeClothingImage(originalImage, marketSettings);
      setAnalysisResult(result);
    } catch (error) {
      alert("分析图片失败，请检查 API Key / Base URL 或网络连接。");
      setCurrentStep(2); // Go back if failed
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSwitchImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleToggleAttribute = (attr: Attribute) => {
    setSelectedAttributes(prev => {
      const exists = prev.find(a => a.name === attr.name);
      if (exists) {
        return prev.filter(a => a.name !== attr.name);
      } else {
        return [...prev, attr];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedAttributes([]);
  };

  const handleOpenModification = () => {
    if (selectedAttributes.length > 0) {
      setShowModificationModal(true);
    }
  };

  const getCacheKey = (attrs: Attribute[]) => {
    return attrs.map(a => a.name).sort().join('|');
  };

  const handleSuggestionCacheUpdate = (attrs: Attribute[], suggestions: ModificationOption[]) => {
    const key = getCacheKey(attrs);
    setSuggestionCache(prev => ({
      ...prev,
      [key]: suggestions
    }));
  };

  const handleGenerate = async (prompt: string, modificationValue: string, refImage?: string, type?: 'ai' | 'text' | 'ref') => {
    if (!originalImage || selectedAttributes.length === 0) return;
    
    // modificationValue is the Title (e.g. "Vintage Embroidery")
    // modifiedNames is the Attribute List (e.g. "Pattern, Craft")
    const modifiedNames = selectedAttributes.map(a => a.name).join(', ');
    
    // Reset selection state after triggering generation
    setSelectedAttributes([]); 
    setShowModificationModal(false);

    setIsGenerating(true);
    setGeneratedImage(null);
    
    try {
      const newImage = await generateModifiedImage(originalImage, prompt, refImage);
      setGeneratedImage(newImage);
      
      const newItem: GalleryItem = {
        id: Date.now().toString(),
        originalImage: originalImage,
        modifiedImage: newImage,
        suggestionTitle: modificationValue, // The Specific Title (e.g. "French Collar")
        timestamp: Date.now(),
        modifiedAttributeName: modifiedNames, // The Attribute Names (e.g. "Collar")
        modifiedAttributeValue: modificationValue,
        modificationType: type,
        referenceImage: refImage
      };
      setGallery(prev => [newItem, ...prev]);
      // Update the temporary lightbox item used for immediate viewing
      setLightboxItem(newItem);
      
    } catch (error) {
      alert("生成图片失败，请重试。");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchGenerate = async (selections: { prompt: string; value: string }[]) => {
    if (!originalImage || selectedAttributes.length === 0) return;

    const modifiedNames = selectedAttributes.map(a => a.name).join(', ');
    
    // Close modal and clear selection immediately
    setSelectedAttributes([]); 
    setShowModificationModal(false);
    setIsGenerating(true); // Set global loading
    
    // Generate all in parallel
    const promises = selections.map(async (sel) => {
      try {
        const newImage = await generateModifiedImage(originalImage, sel.prompt);
        return {
          id: Date.now().toString() + Math.random().toString(),
          originalImage: originalImage,
          modifiedImage: newImage,
          suggestionTitle: sel.value,
          timestamp: Date.now(),
          modifiedAttributeName: modifiedNames,
          modifiedAttributeValue: sel.value,
          modificationType: 'ai' as const,
        };
      } catch (e) {
        console.error("Batch item failed", e);
        return null;
      }
    });

    try {
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null) as GalleryItem[];
      
      if (validResults.length > 0) {
        setGallery(prev => [...validResults, ...prev]);
        setGeneratedImage(validResults[0].modifiedImage); // Show the first one as "current"
        setLightboxItem(validResults[0]); // Open first one
      } else {
        alert("批量生成失败");
      }
    } catch (e) {
      alert("批量生成过程出错");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteGalleryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确认要删除这张设计图吗？此操作无法撤销。")) {
      setGallery(prev => prev.filter(item => item.id !== id));
      if (lightboxItem?.id === id) setLightboxItem(null);
      if (selectedCompareIds.includes(id)) {
        setSelectedCompareIds(prev => prev.filter(i => i !== id));
      }
    }
  };

  const handleNavigateToModel = (image: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModelInitialImage(image);
    setActiveTab('model');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueEditing = async (newOriginalImage: string) => {
    const item = gallery.find(g => g.modifiedImage === newOriginalImage);
    setIsAnalyzing(true);
    setLightboxItem(null); 
    setCurrentStep(3); 

    try {
        let updatedAnalysis = analysisResult;

        if (analysisResult && item?.modifiedAttributeName) {
            const modifiedNames = item.modifiedAttributeName.split(',').map(s => s.trim());
            const newAttributesData = await reanalyzeSpecificAttributes(newOriginalImage, modifiedNames);
            const mergedAttributes = analysisResult.attributes.map(attr => {
                const foundNew = newAttributesData.find(na => na.name === attr.name);
                if (foundNew) {
                    return { ...attr, value: foundNew.value };
                }
                return attr;
            });
            updatedAnalysis = { ...analysisResult, attributes: mergedAttributes };
        }

        setAnalysisResult(updatedAnalysis);
        setRawImage(newOriginalImage);
        setOriginalImage(newOriginalImage);
        setSuggestionCache({}); 
        setGeneratedImage(null);
        setSelectedAttributes([]);
        setIsCompareMode(false);
        setSelectedCompareIds([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (e) {
        console.error("Failed to re-analyze attributes", e);
        alert("属性更新失败，将使用原属性表继续。");
        setRawImage(newOriginalImage);
        setOriginalImage(newOriginalImage);
        setSuggestionCache({});
    } finally {
        setIsAnalyzing(false);
    }
  };

  const resetAll = () => {
    setRawImage(null);
    setOriginalImage(null);
    setAnalysisResult(null);
    setSuggestionCache({});
    setGeneratedImage(null);
    setSelectedAttributes([]);
    setShowModificationModal(false);
    setCurrentStep(1);
    setMarketSettings({ ageGroup: '', gender: '' });
    setShowBgInstruction(false);
    setBgInstructionText('');
    setIsSelectingBgTarget(false);
    setIsCompareMode(false);
    setSelectedCompareIds([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openGeneratedLightbox = () => {
    const item = gallery.find(g => g.modifiedImage === generatedImage);
    if (item) {
        setLightboxItem(item);
    }
  };

  const toggleCompareMode = () => {
    setIsCompareMode(!isCompareMode);
    setSelectedCompareIds([]);
  };

  const toggleCompareSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedCompareIds.includes(id)) {
      setSelectedCompareIds(prev => prev.filter(i => i !== id));
    } else {
      if (selectedCompareIds.length >= 4) {
        alert("最多只能对比 4 张图片");
        return;
      }
      setSelectedCompareIds(prev => [...prev, id]);
    }
  };

  const renderStepIndicator = () => (
    <div className="max-w-3xl mx-auto mb-8 px-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-10" />
        <div className={`flex flex-col items-center gap-2 bg-slate-50 px-2 ${currentStep >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>1</div>
          <span className="text-xs font-medium">图像处理</span>
        </div>
        <div className={`flex flex-col items-center gap-2 bg-slate-50 px-2 ${currentStep >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>2</div>
          <span className="text-xs font-medium">市场设定</span>
        </div>
        <div className={`flex flex-col items-center gap-2 bg-slate-50 px-2 ${currentStep >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>3</div>
          <span className="text-xs font-medium">分析与改款</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {!isApiKeySet && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                 <KeyIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">API Key Authentication</h2>
              <p className="text-slate-500 mb-6 text-sm text-center">
                本应用需配置 Google Gemini API Key。
                <br/>支持官方 Key (AIza...) 或 OpenAI 格式中转 Key (sk-...)。
              </p>
              
              <div className="space-y-4 mb-6">
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <KeyIcon className="h-5 w-5 text-slate-400" />
                   </div>
                   <input 
                     type="password"
                     value={apiKeyInput}
                     onChange={(e) => setApiKeyInput(e.target.value)}
                     placeholder="输入 API Key (sk-...)"
                     className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-sm"
                   />
                </div>

                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <GlobeAltIcon className="h-5 w-5 text-slate-400" />
                   </div>
                   <input 
                     type="text"
                     value={baseUrlInput}
                     onChange={(e) => setBaseUrlInput(e.target.value)}
                     placeholder="代理地址 (可选, 如 https://api.openai.com)"
                     className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono text-sm"
                   />
                   <p className="text-[10px] text-slate-400 mt-1 pl-1">
                     * 如果使用 'sk-' 开头的 Key，通常需要配置中转商提供的 Base URL。
                   </p>
                </div>
              </div>
              
              <button 
                 onClick={handleSetApiKey}
                 disabled={!apiKeyInput.trim()}
                 className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                 验证并进入
              </button>
           </div>
        </div>
      )}

      {isProcessingBg && <LoadingOverlay message="正在提取服装主体并转换为 1:1 白底平铺图..." />}
      
      {isSelectingBgTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <RectangleStackIcon className="w-5 h-5 text-indigo-500" />
                  请选择需要提取的目标
                </h3>
                <button onClick={() => setIsSelectingBgTarget(false)} className="text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                为了获得最佳的平铺图效果，请告诉 AI 这张图中你主要想分析哪件衣服。
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                 <button 
                   onClick={() => handleConfirmBgRemovalTarget('Top/Upper Garment')}
                   className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold transition-all flex flex-col items-center gap-2"
                 >
                   <span className="text-2xl">👕</span>
                   上装 (Top)
                 </button>
                 <button 
                   onClick={() => handleConfirmBgRemovalTarget('Bottom/Pants/Skirt')}
                   className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold transition-all flex flex-col items-center gap-2"
                 >
                   <span className="text-2xl">👖</span>
                   下装 (Bottom)
                 </button>
                 <button 
                   onClick={() => handleConfirmBgRemovalTarget('Full Body/Dress')}
                   className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold transition-all flex flex-col items-center gap-2"
                 >
                   <span className="text-2xl">👗</span>
                   全身/连身裙
                 </button>
                 <button 
                   onClick={() => handleConfirmBgRemovalTarget()}
                   className="p-4 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-500 font-medium transition-all flex flex-col items-center gap-2"
                 >
                   <span className="text-2xl">✨</span>
                   自动识别 (Skip)
                 </button>
              </div>
           </div>
        </div>
      )}

      {lightboxItem && (
        <Lightbox 
          image={lightboxItem.modifiedImage} 
          originalImage={lightboxItem.originalImage}
          title={lightboxItem.suggestionTitle} 
          onClose={() => setLightboxItem(null)} 
          onContinueEdit={handleContinueEditing}
        />
      )}

      {showStep1Lightbox && originalImage && (
        <Lightbox 
          image={originalImage}
          originalImage={rawImage || undefined}
          title="抠图效果检查 (左:白底 | 右:原图)"
          onClose={() => setShowStep1Lightbox(false)}
        />
      )}
      
      {showCompareModal && (
        <GalleryComparisonModal 
           items={gallery.filter(g => selectedCompareIds.includes(g.id))}
           onClose={() => setShowCompareModal(false)}
        />
      )}

      {showModificationModal && selectedAttributes.length > 0 && originalImage && (
        <ModificationModal 
          attributes={selectedAttributes}
          originalImage={originalImage}
          critiqueContent={analysisResult?.critique.content}
          cachedSuggestions={suggestionCache[getCacheKey(selectedAttributes)]}
          onUpdateCache={(suggestions) => handleSuggestionCacheUpdate(selectedAttributes, suggestions)}
          onClose={() => setShowModificationModal(false)}
          onGenerate={handleGenerate}
          onBatchGenerate={handleBatchGenerate}
        />
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2" onClick={resetAll}>
            <SwatchIcon className="w-6 h-6 text-indigo-600 cursor-pointer" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 cursor-pointer">
              FashionReStyle AI
            </h1>
            <button 
               onClick={(e) => { e.stopPropagation(); setIsApiKeySet(false); }}
               className="ml-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
               title="更换 API Key"
            >
               <KeyIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex bg-slate-100 p-1 rounded-lg">
               <button 
                 onClick={() => setActiveTab('design')}
                 className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'design' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
               >
                 设计工坊
               </button>
               <button 
                 onClick={() => setActiveTab('model')}
                 className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'model' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
               >
                 模特生成
               </button>
            </nav>
            {rawImage && activeTab === 'design' && (
              <button 
                onClick={resetAll}
                className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                重新开始
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="py-8">
        {activeTab === 'model' ? (
          <ModelGenerationView 
            initialClothingImage={modelInitialImage}
            marketSettings={marketSettings}
          />
        ) : (
          <div className="max-w-6xl mx-auto px-4">
            {renderStepIndicator()}

            {currentStep === 1 && (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                  {originalImage ? '预处理与检查' : '上传设计原图'}
                </h2>
                <div className={`
                  relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center h-[400px] mb-8
                  ${originalImage ? 'border-indigo-200 bg-slate-50' : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100/50 cursor-pointer'}
                `}>
                  {originalImage ? (
                      <div className="relative w-full h-full p-4 group">
                        <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
                        <button 
                          onClick={() => { resetAll(); }}
                          className="absolute top-4 right-4 bg-white/80 p-2 rounded-full hover:bg-white text-slate-500 hover:text-red-500 shadow-sm transition-all z-10"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 pointer-events-none">
                          <button 
                            onClick={() => setShowStep1Lightbox(true)}
                            className="bg-white/90 text-indigo-600 px-4 py-2 rounded-full shadow-lg font-semibold flex items-center gap-2 pointer-events-auto transform hover:scale-105 transition-transform"
                          >
                            <MagnifyingGlassPlusIcon className="w-5 h-5" />
                            放大检查细节
                          </button>
                        </div>
                      </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-center p-8 w-full h-full flex flex-col items-center justify-center cursor-pointer"
                    >
                      <CloudArrowUpIcon className="w-12 h-12 text-indigo-500 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-700">点击上传图片</h3>
                      <p className="text-slate-500 text-sm mt-2">支持 JPG, PNG</p>
                    </div>
                  )}
                  <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                </div>

                {originalImage && (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      {rawImage === originalImage ? (
                        <>
                          <button 
                            onClick={() => initiateBgRemoval(false)}
                            className="flex-1 py-3 px-4 bg-white border border-indigo-200 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <ScissorsIcon className="w-5 h-5" />
                            智能转白底图
                          </button>
                          <button 
                            onClick={handleConfirmBg}
                            className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                          >
                            确认原图，下一步
                            <ArrowPathIcon className="w-4 h-4 rotate-[-90deg]" />
                          </button>
                        </>
                      ) : (
                        <>
                            <button 
                              onClick={() => initiateBgRemoval(true)}
                              className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                            >
                              <ArrowPathIcon className="w-5 h-5" />
                              不满意? 重新转换
                            </button>
                            <button 
                              onClick={handleConfirmBg}
                              className="flex-1 py-3 px-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                              确认效果，下一步
                            </button>
                        </>
                      )}
                    </div>
                    {isRetryingBg && rawImage !== originalImage && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">额外修图指令 (可选)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={bgInstructionText}
                            onChange={(e) => setBgInstructionText(e.target.value)}
                            placeholder="例如: 保留褶皱细节，不要裁剪太紧..."
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <img src={originalImage!} alt="Thumb" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">目标市场设定</h2>
                      <p className="text-sm text-slate-500">针对美国童装市场进行精准分析</p>
                    </div>
                </div>
                <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-indigo-500" />
                        年龄段 (可选)
                      </label>
                      <input 
                        type="text" 
                        placeholder="例如: 3m-2t, 5-6y, 8-10y"
                        value={marketSettings.ageGroup}
                        onChange={(e) => setMarketSettings({...marketSettings, ageGroup: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-indigo-500" />
                        性别定位 (可选)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'boy', label: '男童 Boy' },
                          { id: 'girl', label: '女童 Girl' },
                          { id: 'neutral', label: '中性 Neutral' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setMarketSettings({...marketSettings, gender: opt.id as any})}
                            className={`py-3 rounded-xl border font-medium text-sm transition-all ${
                              marketSettings.gender === opt.id 
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                </div>
                <div className="flex gap-4">
                  <button
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-4 bg-white text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    上一步
                  </button>
                  <button 
                      onClick={handleStartAnalysis}
                      className="flex-1 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-transform hover:scale-[1.01] flex items-center justify-center gap-2"
                  >
                    <SparklesIcon className="w-6 h-6" />
                    开始全维度分析
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-12 animate-fade-in pb-24">
                <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    返回市场设定
                  </button>
                </div>

                <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5 space-y-6">
                    <div className={`relative rounded-2xl border-2 border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center h-[500px]`}>
                      <img 
                        src={originalImage!} 
                        alt="Original" 
                        className="w-full h-full object-contain" 
                      />
                      <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md">
                        基准参考图
                      </div>
                      <button 
                        onClick={handleSwitchImage}
                        className="absolute top-4 right-4 bg-white/90 hover:bg-white text-indigo-600 shadow-sm border border-indigo-100 px-3 py-1.5 rounded-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        切换
                      </button>
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>

                    {(generatedImage || isGenerating) && (
                      <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-100/50 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-indigo-50/30 flex items-center gap-2">
                          <PhotoIcon className="w-5 h-5 text-indigo-500" />
                          <h3 className="font-bold text-slate-700">生成结果</h3>
                        </div>
                        <div className="h-[500px] flex items-center justify-center bg-slate-50 relative p-4">
                          {isGenerating ? (
                            <LoadingOverlay message="AI 设计师正在绘图中..." />
                          ) : generatedImage && (
                            <div 
                              className="relative group w-full h-full cursor-zoom-in"
                              onClick={openGeneratedLightbox}
                            >
                              <img 
                                src={generatedImage} 
                                alt="Generated" 
                                className="w-full h-full object-contain rounded-lg"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md">点击全屏预览</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-7 flex flex-col h-full">
                    {isAnalyzing && (
                      <div className="flex-1 rounded-2xl overflow-hidden relative shadow-sm border border-slate-100 bg-white min-h-[500px]">
                        <LoadingOverlay message="正在分析新设计的属性..." />
                      </div>
                    )}

                    {!isAnalyzing && analysisResult && (
                      <div className="space-y-8 pb-10">
                        <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 shadow-sm">
                          <div className="flex items-start gap-3">
                            <DocumentTextIcon className="w-6 h-6 text-amber-600 mt-1 shrink-0" />
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-amber-900">{analysisResult.critique.title}</h3>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">US Market Critique</span>
                              </div>
                              <p className="text-sm text-amber-800/80 leading-relaxed whitespace-pre-line">
                                {analysisResult.critique.content}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                            全属性分析与改款
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full flex items-center gap-1">
                               <CursorArrowRaysIcon className="w-3.5 h-3.5" />
                               可多选
                            </span>
                          </h3>
                          <AttributeGrid 
                            attributes={analysisResult.attributes} 
                            recommendedAttributes={analysisResult.recommendedAttributes}
                            cachedAttributes={Object.keys(suggestionCache).flatMap(k => k.split('|'))}
                            selectedAttributes={selectedAttributes.map(a => a.name)}
                            onToggleAttribute={handleToggleAttribute}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {gallery.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                              <SwatchIcon className="w-6 h-6 text-slate-400" />
                              设计历史
                          </h2>
                          <button 
                             onClick={toggleCompareMode}
                             className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border flex items-center gap-2 ${isCompareMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                          >
                             <RectangleStackIcon className="w-4 h-4" />
                             {isCompareMode ? '退出对比' : '多图对比'}
                          </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {gallery.map((item) => (
                          <div 
                            key={item.id} 
                            className="group relative bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={(e) => {
                               if (isCompareMode) {
                                  toggleCompareSelection(item.id, e);
                               } else {
                                  setLightboxItem(item);
                               }
                            }}
                          >
                            <div className="aspect-[3/4] overflow-hidden bg-slate-100 relative">
                              <img 
                                src={item.modifiedImage} 
                                alt={item.suggestionTitle}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none p-2">
                                {item.modificationType === 'ref' && item.referenceImage ? (
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white/50 mb-1">
                                    <img src={item.referenceImage} className="w-full h-full object-cover" alt="ref" />
                                  </div>
                                ) : (
                                  <SparklesIcon className="w-6 h-6 text-white mb-1" />
                                )}
                                <span className="text-white text-[10px] font-medium text-center leading-tight">
                                  {item.modifiedAttributeName || 'Design'}
                                </span>
                              </div>
                            </div>
                            
                            {isCompareMode && (
                                <div className="absolute top-2 left-2 z-20">
                                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedCompareIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white/80 border-slate-300'}`}>
                                      {selectedCompareIds.includes(item.id) && <CheckCircleIconSolid className="w-4 h-4 text-white" />}
                                   </div>
                                </div>
                            )}
                            
                            {!isCompareMode && (
                              <button
                                onClick={(e) => handleDeleteGalleryItem(item.id, e)}
                                className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-20 shadow-sm"
                                title="删除"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}

                            {!isCompareMode && (
                              <button
                                onClick={(e) => handleNavigateToModel(item.modifiedImage, e)}
                                className="absolute bottom-2 right-2 p-1.5 bg-white/90 text-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-50 z-20 shadow-sm flex items-center gap-1 px-3 text-xs font-bold"
                                title="模特试穿"
                              >
                                <UserIcon className="w-3 h-3" />
                                试穿
                              </button>
                            )}

                            <div className="p-3">
                              <p className="text-xs font-semibold text-slate-700 truncate" title={item.suggestionTitle}>
                                {item.suggestionTitle}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  
                  {selectedAttributes.length > 0 && !showModificationModal && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-bounce-in border border-slate-700">
                       <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                            {selectedAttributes.length}
                          </span>
                          <span className="text-sm font-medium">已选择属性</span>
                       </div>
                       
                       <div className="h-4 w-[1px] bg-slate-600"></div>

                       <div className="flex items-center gap-3">
                         <button 
                           onClick={handleClearSelection}
                           className="text-xs text-slate-400 hover:text-white transition-colors"
                         >
                           清空
                         </button>
                         <button 
                           onClick={handleOpenModification}
                           className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-900/50 flex items-center gap-1.5"
                         >
                           <PaintBrushIcon className="w-4 h-4" />
                           开始联合改款
                         </button>
                       </div>
                    </div>
                  )}

                  {isCompareMode && selectedCompareIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-bounce-in">
                       <span className="text-sm font-bold">{selectedCompareIds.length} 张已选</span>
                       <button 
                         onClick={() => setShowCompareModal(true)}
                         disabled={selectedCompareIds.length < 2}
                         className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-full text-sm font-bold transition-colors"
                       >
                         开始对比
                       </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;