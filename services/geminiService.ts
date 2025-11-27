import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, ModificationOption, MarketSettings, GarmentFeatures, Attribute } from "../types";

const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

// Initialize as null to enforce manual key setting
let ai: GoogleGenAI | null = null;

export const setGeminiApiKey = (key: string, baseUrl?: string) => {
  if (!key) return;
  
  const options: any = { apiKey: key };
  if (baseUrl) {
    // Remove trailing slash if present to avoid double slashes in SDK path construction
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    options.baseUrl = cleanUrl;
  }
  
  ai = new GoogleGenAI(options);
};

// Helper to check if AI is initialized
const ensureAiInitialized = () => {
  if (!ai) {
    throw new Error("请先输入有效的 Gemini API Key 才能使用 AI 功能。");
  }
  return ai;
};

export const removeBackground = async (base64Image: string, instruction?: string, targetType?: string): Promise<string> => {
  const client = ensureAiInitialized();
  
  let prompt = `
    TASK: Create a professional e-commerce product image from the input photo.
    
    OUTPUT SPECIFICATIONS:
    1. STYLE: **FLAT LAY** photography (The garment must look like it is laid flat on a table). 
       - DO NOT use "Ghost Mannequin" style (do not make it look like an invisible person is wearing it).
       - DO NOT show any body parts, models, or hangers.
    2. BACKGROUND: Pure White (#FFFFFF).
    3. ASPECT RATIO: **1:1 SQUARE**. The garment should be centered with appropriate padding.
    
    TARGET FOCUS:
    ${targetType ? `Strictly focus on extracting and processing the **${targetType}**.` : 'Identify the main clothing item.'}
    If there are multiple items (e.g., a model wearing a top and pants), ONLY process the ${targetType || 'main item'} and ignore the rest.

    ${instruction ? `USER INSTRUCTION: ${instruction}` : ''}
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("Failed to remove background");
  } catch (error) {
    console.error("Background removal failed:", error);
    throw error;
  }
};

export const analyzeClothingImage = async (
  base64Image: string, 
  settings?: MarketSettings
): Promise<AnalysisResult> => {
  const client = ensureAiInitialized();
  
  const marketContext = `
    Target Market Context: US Children's Wear Market (美国童装市场).
    Target Age Group: ${settings?.ageGroup || "Unspecified (General Kids)"}.
    Target Gender: ${settings?.gender === 'boy' ? 'Boy' : settings?.gender === 'girl' ? 'Girl' : settings?.gender === 'neutral' ? 'Neutral/Unisex' : 'Unspecified'}.
  `;

  const prompt = `
    你是一位针对美国市场的资深童装设计师。请对这张服装图片进行深度技术分析。
    
    ${marketContext}

    任务 1: 属性提取。请严格按照以下 23 个维度进行分析，并提取具体特征值：
    1.版型(Fit) 2.肩型(Shoulder) 3.季节(Season) 4.袖口(Cuffs) 5.领型(Collar) 
    6.闭合方式(Closure) 7.纽扣材质(Button Material) 8.纽扣颜色(Button Color) 
    9.图案类型(Pattern Type) 10.图案位置(Pattern Pos) 11.图案覆盖率(Coverage) 
    12.图案风格(Pattern Style) 13.图案节奏(Pattern Rhythm) 14.主色(Main Color) 
    15.辅助色(Sub Color) 16.配色关系(Color Relation) 17.工艺(Craft) 18.针法(Stitch) 
    19.材质(Material) 20.厚度(Thickness) 21.口袋(Pocket) 22.风格标签(Style Tag) 
    23.情绪标签(Mood Tag)

    请根据属性性质将它们归类为：'结构', '细节', '图案', '材质', '风格' 中的一种。

    任务 2: 设计评估报告 (Critique)。
    请简要分析当前款式的设计语言。
    
    ***重点关注 (US Market Focus)***:
    - 安全性 (Safety): 是否存在绳带过长、小部件脱落风险 (CPSC regulations)。
    - 舒适性 & 穿脱便利性 (Comfort & Wearability): 对于设定年龄段是否方便穿脱（如领口大小、开档设计）。
    - 市场趋势 (US Trends): 是否符合当前美国童装审美。
    
    请指出 2-3 个设计上的局限性或缺点。语言要专业且犀利。
    
    格式强制要求：
    1. 评估内容必须分点叙述，每一点之间请使用换行符分隔。
    2. 在报告内容的最后，必须另起段落，明确列出 2-3 个具体的“推荐改款方向”。
       格式范例：
       "推荐改款方向：
       • 主色：建议修改为[具体颜色]以符合春季趋势
       • 领型：建议修改为[具体领型]以增加安全性
       • 材质：建议修改为[具体材质]提升舒适度"

    任务 3: 推荐改款属性 (Recommended Attributes)。
    基于评估报告，从上述 23 个属性中明确指出哪几个属性最需要修改。

    请以 JSON 格式返回。
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            attributes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ["name", "value", "category"],
              },
            },
            critique: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
              },
              required: ["title", "content"],
            },
            recommendedAttributes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of attribute names that are recommended for modification"
            }
          },
          required: ["attributes", "critique", "recommendedAttributes"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const reanalyzeSpecificAttributes = async (
  base64Image: string,
  targetAttributes: string[]
): Promise<Attribute[]> => {
  const client = ensureAiInitialized();
  const prompt = `
    任务：基于这张新的服装图片，请重新鉴定以下属性的具体值：
    [ ${targetAttributes.join(', ')} ]
    
    请仔细观察图片，给出这些属性现在最准确的描述（例如：如果颜色变了，请返回新颜色；如果领型变了，请返回新领型）。
    只返回列表中的属性。
    
    Return JSON format.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            attributes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ["name", "value", "category"],
              },
            },
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.attributes || [];
    }
    return [];
  } catch (error) {
    console.error("Re-analysis failed:", error);
    return [];
  }
};

export const detectGarmentFeatures = async (base64Image: string): Promise<GarmentFeatures> => {
  const client = ensureAiInitialized();
  const prompt = `
    Analyze this clothing item image.
    Identify if it has specific structural features relevant to wearing style.
    
    Return a JSON object with:
    1. category: Short string (e.g., "Hoodie", "T-Shirt", "Jacket", "Cardigan", "Dress").
    2. hasHood: boolean (true if it has a hood).
    3. hasClosure: boolean (true if it has a zipper or buttons that allow it to be worn open, like a jacket or cardigan. False for pullovers).
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            hasHood: { type: Type.BOOLEAN },
            hasClosure: { type: Type.BOOLEAN },
          },
          required: ["category", "hasHood", "hasClosure"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GarmentFeatures;
    }
    throw new Error("Failed to detect features");
  } catch (error) {
    console.error("Feature detection failed:", error);
    return { category: 'Unknown', hasHood: false, hasClosure: false };
  }
};

export const getModificationSuggestions = async (
  base64Image: string, 
  attributeNames: string[], 
  critiqueContext?: string,
  customInstruction?: string
): Promise<ModificationOption[]> => {
  const client = ensureAiInitialized();
  const attributesStr = attributeNames.join(", ");
  
  let prompt = `
    针对这张服装图片，用户希望对以下属性进行**联合改款设计**: [ ${attributesStr} ]。
    
    任务：请提供 8 个截然不同且具有设计感的改款方案。
    
    重要要求：
    1. **整体协调性 (Cohesion)**: 你必须作为一个整体来思考这些属性的修改。例如，如果同时修改"图案类型"和"图案位置"，它们必须互相匹配，构成一个完整的设计逻辑。
    2. **专注性**: 只修改 [ ${attributesStr} ] 这些部分。
  `;

  if (customInstruction) {
    prompt += `
      USER DIRECTION (High Priority): The user specifically wants ideas related to: "${customInstruction}".
      Make sure at least 4-5 options specifically address this direction while modifying the selected attributes.
    `;
  }

  if (critiqueContext) {
    prompt += `
      Context from Design Critique:
      ${critiqueContext}
      
      INSTRUCTION: Consider the critique recommendations for these specific attributes if applicable.
    `;
  }

  prompt += `
    IMPORTANT: 
    生成的 imagePrompt 必须包含极其严格的负面约束，确保只修改 "${attributesStr}"，而保持其他所有部分（如版型、主色、姿势、背景、其他细节）完全不变。
    
    对于每个方案：
    1. title: 简短的中文标题 (如"复古小熊刺绣" 或 "法式方领+泡泡袖")。
    2. description: 一句话中文描述改款效果，说明这几个属性是如何变化的。
    3. imagePrompt: 详细的英文绘图指令。Structure: "Change ONLY the [ ${attributesStr} ] to [new cohesive design]. Keep the rest of the garment, color, fabric, pose, and background EXACTLY the same. Do NOT change attributes not listed here."

    返回 JSON 数组 (8 items).
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
            },
            required: ["id", "title", "description", "imagePrompt"],
          },
        },
      },
    });

    if (response.text) {
      const suggestions = JSON.parse(response.text) as ModificationOption[];
      return suggestions.map((s, i) => ({ ...s, id: i.toString() }));
    }
    throw new Error("No suggestions generated");
  } catch (error) {
    console.error("Suggestions failed:", error);
    throw error;
  }
};

export const generateModifiedImage = async (
  base64Original: string,
  prompt: string,
  base64Ref?: string
): Promise<string> => {
  const client = ensureAiInitialized();
  
  const parts: any[] = [
    { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Original) } },
  ];

  if (base64Ref) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Ref) } });
    prompt += " Use the second image as a visual reference for style/material/pattern.";
  }

  parts.push({ text: prompt });

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Modification failed:", error);
    throw error;
  }
};

export const generateOnModelImage = async (
  clothingImage: string,
  prompt: string,
  refModelImage: string | undefined,
  marketSettings: MarketSettings,
  aspectRatio: string
): Promise<string> => {
  const client = ensureAiInitialized();

  const parts: any[] = [
    { inlineData: { mimeType: "image/jpeg", data: cleanBase64(clothingImage) } },
  ];

  if (refModelImage) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64(refModelImage) } });
  }

  const marketPrompt = `
    Target Audience: ${marketSettings.ageGroup || 'Kids'} ${marketSettings.gender || ''}.
    Task: Generate a high-quality fashion model photo wearing this garment.
    ${refModelImage ? 'Use the second image as the reference for the model pose and background.' : ''}
    ${prompt}
  `;

  parts.push({ text: marketPrompt });

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio as any
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No model image generated");
  } catch (error) {
    console.error("Model generation failed:", error);
    throw error;
  }
};

export const generateComparisonAnalysis = async (
  originalImage: string,
  modifiedImage: string
): Promise<string> => {
  const client = ensureAiInitialized();
  const prompt = `
    Compare these two images (Original vs Modified).
    Describe the key design changes made in the modified version (second image) compared to the original (first image).
    Focus on: Color, Pattern, Structure, and Detail.
    Keep it concise (under 100 words).
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(originalImage) } },
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(modifiedImage) } },
          { text: prompt },
        ],
      },
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Comparison analysis failed:", error);
    return "Analysis failed.";
  }
};