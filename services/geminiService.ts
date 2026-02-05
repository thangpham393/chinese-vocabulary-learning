
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VocabularyItem, Lesson } from "../types";
import { HSK_STATIC_LESSONS, HSK_STATIC_VOCABULARY } from "../data/hskData";

// Khởi tạo Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Khởi tạo Supabase Client an toàn
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Chỉ tạo client nếu có đủ tham số, tránh lỗi "supabaseUrl is required"
const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("Supabase configuration missing. App will run in static mode using local data.");
}

const IMAGE_CACHE_KEY = 'zw_v2_image_cache';

// AI Enrichment Logic
export const enrichVocabularyWithAI = async (rawWords: string): Promise<VocabularyItem[]> => {
  const prompt = `Bạn là một chuyên gia từ điển Tiếng Trung - Việt. 
  Tôi có danh sách các từ vựng sau: "${rawWords}"
  
  Hãy tra cứu và trả về một mảng JSON các đối tượng từ vựng với cấu trúc:
  {
    "word": "Chữ Hán",
    "pinyin": "Phiên âm có dấu",
    "partOfSpeech": "Từ loại (n, v, adj...)",
    "definitionVi": "Nghĩa tiếng Việt ngắn gọn",
    "definitionEn": "Short English definition",
    "exampleZh": "Câu ví dụ tiếng Trung",
    "exampleVi": "Dịch nghĩa câu ví dụ"
  }
  
  Yêu cầu: Chỉ trả về JSON array, không thêm văn bản giải thích.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              definitionVi: { type: Type.STRING },
              definitionEn: { type: Type.STRING },
              exampleZh: { type: Type.STRING },
              exampleVi: { type: Type.STRING },
            },
            required: ["word", "pinyin", "partOfSpeech", "definitionVi", "definitionEn", "exampleZh", "exampleVi"],
          },
        },
      },
    });

    const results = JSON.parse(response.text || "[]");
    return results.map((item: any, idx: number) => ({
      ...item,
      id: `custom-${Date.now()}-${idx}`,
    }));
  } catch (error) {
    console.error("AI Enrichment failed:", error);
    return [];
  }
};

// Supabase Storage Logic
export const saveCustomLesson = async (level: number, lesson: Lesson, vocabulary: VocabularyItem[]) => {
  if (!supabase) {
    alert("Không thể lưu: Thiếu cấu hình Supabase.");
    return false;
  }

  try {
    // 1. Lưu bài học (Upsert)
    const { error: lessonError } = await supabase
      .from('lessons')
      .upsert({
        id: lesson.id,
        level: level,
        number: lesson.number,
        title: lesson.title,
        description: lesson.description
      });

    if (lessonError) throw lessonError;

    // 2. Lưu từ vựng (Xóa cũ, thêm mới để đồng bộ)
    await supabase.from('vocabulary').delete().eq('lesson_id', lesson.id);
    
    const vocabToInsert = vocabulary.map(v => ({
      id: v.id,
      lesson_id: lesson.id,
      word: v.word,
      pinyin: v.pinyin,
      part_of_speech: v.partOfSpeech,
      definition_vi: v.definitionVi,
      definition_en: v.definitionEn,
      example_zh: v.exampleZh,
      example_vi: v.exampleVi,
      image_url: v.imageUrl
    }));

    const { error: vocabError } = await supabase
      .from('vocabulary')
      .insert(vocabToInsert);

    if (vocabError) throw vocabError;
    
    return true;
  } catch (error) {
    console.error("Supabase Save Error:", error);
    return false;
  }
};

export const deleteCustomLesson = async (level: number, lessonId: string) => {
  if (!supabase) return;
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId);
  
  if (error) console.error("Delete error:", error);
};

export const fetchLessonsForHSK = async (level: number): Promise<Lesson[]> => {
  const staticData = HSK_STATIC_LESSONS[level] || [];
  
  if (!supabase) return staticData;

  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('level', level)
    .order('number', { ascending: true });

  if (error) {
    console.error("Fetch Lessons Error:", error);
    return staticData;
  }

  return [...staticData, ...data].sort((a, b) => a.number - b.number);
};

export const fetchVocabularyForLesson = async (level: number, lesson: Lesson): Promise<VocabularyItem[]> => {
  // Ưu tiên dữ liệu tĩnh nếu có
  if (HSK_STATIC_VOCABULARY[lesson.id]) return HSK_STATIC_VOCABULARY[lesson.id];

  if (!supabase) return [];

  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .eq('lesson_id', lesson.id);

  if (error || !data) {
    console.error("Fetch Vocab Error:", error);
    return [];
  }

  // Map lại data từ snake_case sang camelCase
  return data.map(item => ({
    id: item.id,
    word: item.word,
    pinyin: item.pinyin,
    partOfSpeech: item.part_of_speech,
    definitionVi: item.definition_vi,
    definitionEn: item.definition_en,
    exampleZh: item.example_zh,
    exampleVi: item.example_vi,
    imageUrl: item.image_url
  }));
};

export const generateImageForWord = async (word: string, definition: string): Promise<string | undefined> => {
  const cached = localStorage.getItem(IMAGE_CACHE_KEY);
  const imgCache = cached ? JSON.parse(cached) : {};
  
  if (imgCache[word]) return imgCache[word];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist 2D icon for Chinese word "${word}" (${definition}). White background.` }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        imgCache[word] = base64;
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imgCache));
        return base64;
      }
    }
  } catch (e) {}
  return undefined;
};

// --- TTS Logic ---

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const speakText = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Hãy đọc to câu sau bằng tiếng Trung: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        audioContext,
        24000,
        1,
      );
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      return true;
    }
  } catch (error) {
    console.error("TTS failed:", error);
  }
  return false;
};
