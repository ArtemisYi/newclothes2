
import React, { useState, useRef, useEffect } from 'react';
import { MarketSettings, GarmentFeatures, GalleryItem } from '../types';
import { generateOnModelImage, detectGarmentFeatures } from '../services/geminiService';
import LoadingOverlay from './LoadingOverlay';
import Lightbox from './Lightbox';
import { 
  PhotoIcon, 
  ArrowUpTrayIcon, 
  SparklesIcon, 
  UserIcon,
  GlobeAmericasIcon,
  SunIcon,
  HomeIcon,
  LockClosedIcon,
  LockOpenIcon,
  CloudIcon,
  BriefcaseIcon,
  FaceSmileIcon,
  SwatchIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface ModelGenerationViewProps {
  initialClothingImage?: string | null;
  marketSettings: MarketSettings;
}

const ModelGenerationView: React.FC<ModelGenerationViewProps> = ({ initialClothingImage, marketSettings }) => {
  const [clothingImage, setClothingImage] = useState<string | null>(initialClothingImage || null);
  const [mode, setMode] = useState<'auto' | 'ref'>('auto');
  const [refModelImage, setRefModelImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  
  // Aspect Ratio
  const [aspectRatio, setAspectRatio] = useState<string>('3:4');
  
  // Feature Analysis State
  const [features, setFeatures] = useState<GarmentFeatures | null>(null);
  const [isAnalyzingFeatures, setIsAnalyzingFeatures] = useState(false);

  // Styling Options for Auto Mode
  const [envOption, setEnvOption] = useState<'outdoor' | 'indoor'>('outdoor');
  const [wearOption, setWearOption] = useState<'closed' | 'open'>('closed');
  const [hoodOption, setHoodOption] = useState<'down' | 'up'>('down');
  
  // Outfit Coordination
  const [innerOption, setInnerOption] = useState<'tshirt' | 'shirt' | 'turtleneck' | 'none'>('tshirt');
  const [bottomOption, setBottomOption] = useState<'jeans' | 'slacks' | 'skirt' | 'shorts' | 'sweatpants'>('jeans');
  const [shoeOption, setShoeOption] = useState<'sneakers' | 'boots' | 'leather' | 'sandals'>('sneakers');

  // Pose
  const [poseOption, setPoseOption] = useState<'standing' | 'walking' | 'pocket' | 'side' | 'sitting'>('standing');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  
  // Gallery System
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const clothingInputRef = useRef<HTMLInputElement>(null);
  const refModelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialClothingImage) {
      setClothingImage(initialClothingImage);
    }
  }, [initialClothingImage]);

  useEffect(() => {
    setFeatures(null);
  }, [clothingImage]);

  const handleImageUpload = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeFeatures = async () => {
    if (!clothingImage) return;
    setIsAnalyzingFeatures(true);
    try {
      const detected = await detectGarmentFeatures(clothingImage);
      setFeatures(detected);
    } catch (e) {
      alert("特征识别失败，请重试");
    } finally {
      setIsAnalyzingFeatures(false);
    }
  };

  const handleGenerate = async () => {
    if (!clothingImage) return;
    
    setIsGenerating(true);
    setGeneratedResult(null);

    let finalPrompt = prompt;
    
    if (mode === 'auto') {
      const styleInstructions = [];
      
      if (envOption === 'outdoor') {
        styleInstructions.push("Environment: Outdoor setting with natural sunlight (park, street, or garden).");
      } else {
        styleInstructions.push("Environment: Clean Indoor Studio setting or cozy home interior.");
      }

      if (features?.hasClosure) {
        if (wearOption === 'open') {
          styleInstructions.push("Wearing Style: The garment is worn OPEN/UNZIPPED/UNBUTTONED, showing the inner layer clearly. Casual look.");
        } else {
          styleInstructions.push("Wearing Style: The garment is fully ZIPPED UP or BUTTONED UP (Closed).");
        }
      }

      if (features?.hasHood) {
        if (hoodOption === 'up') {
          styleInstructions.push("Hood Style: The hood is UP, worn over the model's head.");
        } else {
          styleInstructions.push("Hood Style: The hood is DOWN (resting on back).");
        }
      }

      if (innerOption !== 'none') {
        styleInstructions.push(`Inner Layer: Wearing a simple ${innerOption} underneath.`);
      }
      
      styleInstructions.push(`Bottoms: Wearing matching ${bottomOption} that complement the top.`);
      styleInstructions.push(`Shoes: Wearing stylish ${shoeOption} suitable for kids.`);

      const poseMap: Record<string, string> = {
        standing: "standing naturally, facing camera, full body shot",
        walking: "walking forward dynamically, fashion runway style",
        pocket: "standing with hands in pockets, cool confident attitude",
        side: "standing in side profile view, showcasing the side of the garment",
        sitting: "sitting casually on a block or steps, relaxed pose"
      };
      styleInstructions.push(`Pose: Model is ${poseMap[poseOption]}.`);

      finalPrompt = `${styleInstructions.join(' ')} ${prompt}`;
    }

    try {
      const result = await generateOnModelImage(
        clothingImage,
        finalPrompt,
        mode === 'ref' ? (refModelImage || undefined) : undefined,
        marketSettings,
        aspectRatio
      );
      setGeneratedResult(result);
      
      // Add to Gallery
      const newItem: GalleryItem = {
        id: Date.now().toString(),
        originalImage: clothingImage,
        modifiedImage: result,
        suggestionTitle: mode === 'auto' ? `Auto Model (${marketSettings.gender || 'Child'})` : 'Ref Model Try-on',
        timestamp: Date.now(),
        modificationType: mode === 'ref' ? 'ref' : 'ai',
        referenceImage: mode === 'ref' ? refModelImage! : undefined,
        modifiedAttributeValue: finalPrompt.substring(0, 50) + '...' // Store snippet of prompt
      };
      setGallery(prev => [newItem, ...prev]);
      
    } catch (e) {
      alert("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteGalleryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确认要删除这张图片吗？")) {
      setGallery(prev => prev.filter(item => item.id !== id));
      if (lightboxItem?.id === id) setLightboxItem(null);
    }
  };

  const renderOptionGroup = (label: string, value: string, setter: (val: any) => void, options: {id: string, label: string}[]) => (
    <div className="col-span-2 animate-fade-in">
      <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button 
            key={opt.id}
            onClick={() => setter(opt.id)}
            className={`flex-1 min-w-[80px] py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
              value === opt.id 
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                : 'border-slate-200 text-slate-600 hover:border-indigo-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fade-in pb-20">
      
      {lightboxItem && (
        <Lightbox 
          image={lightboxItem.modifiedImage}
          originalImage={clothingImage || undefined}
          title={lightboxItem.suggestionTitle}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Configuration */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Clothing Image */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PhotoIcon className="w-5 h-5 text-indigo-500" />
              服装原图
            </h3>
            <div 
              onClick={() => clothingInputRef.current?.click()}
              className={`
                aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                ${clothingImage ? 'border-indigo-200 bg-slate-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
              `}
            >
              {clothingImage ? (
                <img src={clothingImage} alt="Clothing" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-4">
                  <ArrowUpTrayIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs text-slate-500">上传服装平铺图/白底图</span>
                </div>
              )}
              <input type="file" ref={clothingInputRef} onChange={handleImageUpload(setClothingImage)} className="hidden" accept="image/*" />
            </div>
          </div>

          {/* 2. Generation Mode */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-500" />
              生成配置
            </h3>
            
            {/* Aspect Ratio */}
            <div className="mb-6">
               <label className="text-xs font-bold text-slate-500 mb-2 block uppercase flex items-center gap-1">
                 <ArrowsPointingOutIcon className="w-3.5 h-3.5" /> 画幅比例
               </label>
               <div className="grid grid-cols-4 gap-2">
                 {[
                   {id: '1:1', label: '1:1 正方'},
                   {id: '3:4', label: '3:4 人像'},
                   {id: '9:16', label: '9:16 全屏'},
                   {id: '16:9', label: '16:9 宽屏'},
                 ].map(r => (
                   <button
                     key={r.id}
                     onClick={() => setAspectRatio(r.id)}
                     className={`py-2 rounded-lg border text-[10px] font-bold transition-all ${
                       aspectRatio === r.id
                         ? 'bg-indigo-600 text-white border-indigo-600'
                         : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                     }`}
                   >
                     {r.label}
                   </button>
                 ))}
               </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
               <button 
                 onClick={() => setMode('auto')}
                 className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'auto' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
               >
                 自动匹配
               </button>
               <button 
                 onClick={() => setMode('ref')}
                 className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'ref' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
               >
                 参考图试穿
               </button>
            </div>

            {mode === 'auto' ? (
              <div className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-start gap-2">
                     <GlobeAmericasIcon className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                     <div>
                       <h4 className="font-bold text-indigo-900 text-sm">美国童装市场标准</h4>
                       <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                         AI 将自动生成符合 <span className="font-bold mx-1">{marketSettings.ageGroup || 'General'}</span> 
                         年龄段的 <span className="font-bold mx-1">{marketSettings.gender === 'boy' ? '男孩' : marketSettings.gender === 'girl' ? '女孩' : '儿童'}</span> 模特。
                       </p>
                     </div>
                  </div>
                </div>

                {/* Feature Detection Trigger */}
                {!features && !isAnalyzingFeatures && (
                  <button
                    onClick={handleAnalyzeFeatures}
                    disabled={!clothingImage}
                    className="w-full py-3 bg-white border border-indigo-200 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    ✨ 识别特征以解锁更多选项
                  </button>
                )}

                {isAnalyzingFeatures && (
                   <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 font-medium py-3">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      正在分析服装结构...
                   </div>
                )}
                
                {/* --- BASIC OPTIONS --- */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">基础环境</label>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setEnvOption('outdoor')}
                         className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${envOption === 'outdoor' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                       >
                         <SunIcon className="w-4 h-4" /> 户外自然
                       </button>
                       <button 
                         onClick={() => setEnvOption('indoor')}
                         className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${envOption === 'indoor' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                       >
                         <HomeIcon className="w-4 h-4" /> 室内影棚
                       </button>
                    </div>
                  </div>

                  {features?.hasClosure && (
                    <div className="col-span-2 animate-fade-in">
                       <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">穿搭状态</label>
                       <div className="flex gap-2">
                        <button 
                          onClick={() => setWearOption('closed')}
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${wearOption === 'closed' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                        >
                          <LockClosedIcon className="w-4 h-4" /> 闭合/扣好
                        </button>
                        <button 
                          onClick={() => setWearOption('open')}
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${wearOption === 'open' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                        >
                          <LockOpenIcon className="w-4 h-4" /> 敞开穿着
                        </button>
                      </div>
                    </div>
                  )}

                  {features?.hasHood && (
                    <div className="col-span-2 animate-fade-in">
                       <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">连帽状态</label>
                       <div className="flex gap-2">
                        <button 
                          onClick={() => setHoodOption('down')}
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${hoodOption === 'down' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                        >
                          <ArrowUpTrayIcon className="w-4 h-4 rotate-180" /> 放下帽子
                        </button>
                        <button 
                          onClick={() => setHoodOption('up')}
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 ${hoodOption === 'up' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                        >
                          <CloudIcon className="w-4 h-4" /> 戴上帽子
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* --- OUTFIT & POSE --- */}
                <div className="border-t border-slate-200 pt-4 mt-4 grid grid-cols-2 gap-4">
                    <h4 className="col-span-2 font-bold text-slate-700 text-sm flex items-center gap-2">
                      <BriefcaseIcon className="w-4 h-4 text-indigo-500" />
                      全身搭配与姿势
                    </h4>

                    {renderOptionGroup('内搭选择', innerOption, setInnerOption, [
                      { id: 'tshirt', label: 'T恤' },
                      { id: 'shirt', label: '衬衫' },
                      { id: 'turtleneck', label: '高领' },
                      { id: 'none', label: '无/默认' },
                    ])}

                    {renderOptionGroup('下装搭配', bottomOption, setBottomOption, [
                      { id: 'jeans', label: '牛仔裤' },
                      { id: 'slacks', label: '休闲裤' },
                      { id: 'skirt', label: '裙装' },
                      { id: 'shorts', label: '短裤' },
                      { id: 'sweatpants', label: '运动裤' },
                    ])}

                    {renderOptionGroup('鞋履搭配', shoeOption, setShoeOption, [
                      { id: 'sneakers', label: '运动鞋' },
                      { id: 'boots', label: '靴子' },
                      { id: 'leather', label: '皮鞋' },
                      { id: 'sandals', label: '凉鞋' },
                    ])}

                    <div className="col-span-2 mt-2">
                      <label className="text-xs font-bold text-slate-500 mb-2 block uppercase flex items-center gap-1">
                        <FaceSmileIcon className="w-3.5 h-3.5" /> 模特姿势
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                         {[
                           {id: 'standing', label: '自然站立'},
                           {id: 'walking', label: '动态行走'},
                           {id: 'pocket', label: '双手插兜'},
                           {id: 'side', label: '侧身展示'},
                           {id: 'sitting', label: '休闲坐姿'},
                         ].map(p => (
                            <button
                              key={p.id}
                              onClick={() => setPoseOption(p.id as any)}
                              className={`flex-none px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${
                                poseOption === p.id
                                  ? 'bg-indigo-600 text-white shadow-md'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                              }`}
                            >
                              {p.label}
                            </button>
                         ))}
                      </div>
                    </div>
                </div>

              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  onClick={() => refModelInputRef.current?.click()}
                  className={`
                    h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                    ${refModelImage ? 'border-indigo-200 bg-slate-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
                  `}
                >
                  {refModelImage ? (
                    <img src={refModelImage} alt="Ref Model" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <UserIcon className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-500 text-center">上传人物参考图<br/>(保留姿势/背景)</p>
                    </>
                  )}
                  <input type="file" ref={refModelInputRef} onChange={handleImageUpload(setRefModelImage)} className="hidden" accept="image/*" />
                </div>
              </div>
            )}
            
            <div className="mt-6 space-y-3">
              <label className="text-sm font-semibold text-slate-700">补充描述 (可选)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：背景有气球，或者模特拿着冰淇淋..."
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 outline-none resize-none h-20"
              />
              <button
                disabled={!clothingImage || isGenerating}
                onClick={handleGenerate}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    生成中...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    开始生成模特展示图
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Result & Gallery */}
        <div className="lg:col-span-8 space-y-8">
           {/* Current Result */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[600px] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                   <PhotoIcon className="w-5 h-5 text-indigo-500" />
                   当前生成结果
                 </h3>
                 {generatedResult && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                      生成成功
                    </span>
                 )}
              </div>

              <div className="flex-1 bg-slate-50 relative flex items-center justify-center p-8">
                {isGenerating && (
                   <LoadingOverlay message="AI 摄影师正在拍摄中... (约需 10-15 秒)" />
                )}
                
                {!isGenerating && generatedResult ? (
                   <div 
                     className="relative h-full w-full flex items-center justify-center group cursor-zoom-in"
                     onClick={() => setLightboxItem({
                       id: 'current', 
                       originalImage: clothingImage!, 
                       modifiedImage: generatedResult, 
                       suggestionTitle: '当前生成结果', 
                       timestamp: Date.now() 
                     })}
                   >
                     <img src={generatedResult} alt="Generated Model" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                     <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="bg-white/90 text-slate-800 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                           <EyeIcon className="w-5 h-5" /> 点击全屏查看
                        </span>
                     </div>
                   </div>
                ) : !isGenerating && (
                   <div className="text-center text-slate-400">
                      <UserIcon className="w-20 h-20 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">等待生成</p>
                      <p className="text-sm">请在左侧上传服装并配置参数</p>
                   </div>
                )}
              </div>
           </div>

           {/* Model Gallery */}
           {gallery.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <SwatchIcon className="w-5 h-5 text-slate-400" />
                    生成历史
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {gallery.map((item) => (
                    <div 
                      key={item.id} 
                      className="group relative bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer aspect-[3/4]"
                      onClick={() => setLightboxItem(item)}
                    >
                      <img 
                        src={item.modifiedImage} 
                        alt={item.suggestionTitle}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      
                      {/* CENTER OVERLAY FOR INFO */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none p-2">
                        {item.modificationType === 'ref' && item.referenceImage ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white/50 mb-1">
                            <img src={item.referenceImage} className="w-full h-full object-cover" alt="ref" />
                          </div>
                        ) : (
                          <SparklesIcon className="w-6 h-6 text-white mb-1" />
                        )}
                        <span className="text-white text-[10px] font-medium text-center leading-tight line-clamp-2">
                          {item.suggestionTitle}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteGalleryItem(item.id, e)}
                        className="absolute top-2 right-2 p-2 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-20 shadow-sm"
                        title="删除"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
           )}
        </div>
      </div>
    </div>
  );
};

export default ModelGenerationView;
