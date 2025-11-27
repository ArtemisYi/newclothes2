
export interface Attribute {
  name: string;
  value: string;
  category: string; // '结构', '细节', '图案', '材质', '风格'
}

export interface DesignCritique {
  title: string;
  content: string;
}

export interface ModificationOption {
  id: string;
  title: string;
  description: string;
  imagePrompt: string;
}

export interface AnalysisResult {
  attributes: Attribute[];
  critique: DesignCritique;
  recommendedAttributes: string[];
}

export interface GalleryItem {
  id: string;
  originalImage: string;
  modifiedImage: string;
  suggestionTitle: string;
  timestamp: number;
  // State restoration
  modifiedAttributeName?: string;
  modifiedAttributeValue?: string;
  // Enhanced display metadata
  modificationType?: 'ai' | 'text' | 'ref';
  referenceImage?: string; 
}

export interface StyleMetric {
  attribute: string;
  value: number;
}

export interface MarketSettings {
  ageGroup: string; // e.g., "3m-2t", "5-7y"
  gender: 'boy' | 'girl' | 'neutral' | '';
}

export interface GarmentFeatures {
  category: string;
  hasHood: boolean;
  hasClosure: boolean; // zipper or buttons
}
