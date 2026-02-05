
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VocabularyItem, Lesson, Category } from "../types";
import { HSK_STATIC_LESSONS, HSK_STATIC_VOCABULARY } from "../data/hskData";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase: SupabaseClient | null = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const enrichVocabularyWithAI = async (rawWords: string): Promise<VocabularyItem[]> => {
  const prompt = `Phân tích các từ Tiếng Trung sau: "${rawWords}". Trả về JSON array: word, pinyin, partOfSpeech, definitionVi, definitionEn, exampleZh, exampleVi.`;
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
    return results.map((item: any, idx: number) => ({ ...item, id: `${Date.now()}-${idx}` }));
  } catch (error) { 
    console.error("AI Enrichment Error:", error);
    return []; 
  }
};

export const saveCustomLesson = async (category: Category, lesson: Lesson, vocabulary: VocabularyItem[]) => {
  if (!supabase) return false;
  try {
    // Tạo ID dạng số (Integer) để tránh lỗi kiểu dữ liệu
    const lessonId = Date.now();

    // 1. Lưu bài học (Chỉ dùng các cột chắc chắn có trong bảng 'lessons')
    const { error: lessonError } = await supabase.from('lessons').upsert({
      id: lessonId,
      level: Number(category.level),
      number: Number(lesson.number),
      title: String(lesson.title),
      description: String(lesson.description || "")
    });
    
    if (lessonError) {
      console.error("Lỗi bảng lessons:", lessonError.message);
      return false;
    }

    // 2. Lưu từ vựng (Chuyển key sang snake_case để khớp với DB)
    const vocabToInsert = vocabulary.map(v => ({
      lesson_id: lessonId,
      word: v.word,
      pinyin: v.pinyin,
      part_of_speech: v.partOfSpeech,
      definition_vi: v.definitionVi,
      definition_en: v.definitionEn,
      example_zh: v.exampleZh,
      example_vi: v.exampleVi
    }));

    const { error: vocabError } = await supabase.from('vocabulary').insert(vocabToInsert);
    
    if (vocabError) {
      console.error("Lỗi bảng vocabulary:", vocabError.message);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Lỗi hệ thống khi lưu:", e);
    return false;
  }
};

export const fetchLessonsByCategory = async (category: Category): Promise<Lesson[]> => {
  const staticData = (category.level && HSK_STATIC_LESSONS[category.level]) ? HSK_STATIC_LESSONS[category.level] : [];
  if (!supabase) return staticData;
  const { data, error } = await supabase.from('lessons').select('*').eq('level', category.level).order('number', { ascending: true });
  if (error) return staticData;
  return [...staticData, ...data];
};

export const fetchVocabularyForLesson = async (lesson: Lesson): Promise<VocabularyItem[]> => {
  if (HSK_STATIC_VOCABULARY[lesson.id]) return HSK_STATIC_VOCABULARY[lesson.id];
  if (!supabase) return [];
  const { data } = await supabase.from('vocabulary').select('*').eq('lesson_id', lesson.id);
  return (data || []).map(item => ({
    id: item.id, word: item.word, pinyin: item.pinyin, partOfSpeech: item.part_of_speech,
    definitionVi: item.definition_vi, definitionEn: item.definition_en,
    exampleZh: item.example_zh, exampleVi: item.example_vi
  }));
};

export const getGlobalStats = async () => {
  if (!supabase) return { totalWords: 0, totalLessons: 0 };
  const { count: v } = await supabase.from('vocabulary').select('*', { count: 'exact', head: true });
  const { count: l } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
  return { totalWords: v || 0, totalLessons: l || 0 };
};

export const speakText = async (text: string, speed: number = 1.0) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      buffer.getChannelData(0).set(Array.from(dataInt16).map(v => v / 32768));
      const src = ctx.createBufferSource();
      src.buffer = buffer; src.playbackRate.value = speed;
      src.connect(ctx.destination); src.start();
    }
  } catch (e) {}
};

export const generateImageForWord = async (word: string, definition: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Minimalist educational illustration for "${word}" (${definition})` }] },
    });
    const base64 = response.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
    return base64 ? `data:image/png;base64,${base64}` : undefined;
  } catch (e) { return undefined; }
};
