
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

// Enrich vocabulary list using Gemini AI to get structured data
export const enrichVocabularyWithAI = async (rawWords: string): Promise<VocabularyItem[]> => {
  const prompt = `Phân tích danh sách từ vựng Tiếng Trung sau: "${rawWords}". Trả về JSON array: word, pinyin, partOfSpeech, definitionVi, definitionEn, exampleZh, exampleVi.`;
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
  } catch (error) { return []; }
};

// Save custom lesson and vocabulary to Supabase
export const saveCustomLesson = async (category: Category, lesson: Lesson, vocabulary: VocabularyItem[]) => {
  if (!supabase) return false;
  try {
    // Chuyển ID sang số nếu có thể để tránh lỗi kiểu dữ liệu
    const numericId = typeof lesson.id === 'string' && lesson.id.includes('lesson-') 
      ? parseInt(lesson.id.replace('lesson-', '')) 
      : Date.now();

    const lessonPayload = {
      id: numericId,
      level: Number(category.level),
      number: Number(lesson.number),
      title: String(lesson.title),
      description: String(lesson.description || "")
    };

    const { error: lessonError } = await supabase.from('lessons').upsert(lessonPayload);
    
    if (lessonError) {
      console.error("SUPABASE ERROR (Lessons):", lessonError.message, lessonError.details);
      throw lessonError;
    }

    // Lưu từ vựng
    await supabase.from('vocabulary').delete().eq('lesson_id', numericId);
    const vocabToInsert = vocabulary.map(v => ({
      lesson_id: numericId,
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
      console.error("SUPABASE ERROR (Vocabulary):", vocabError.message);
      throw vocabError;
    }
    
    return true;
  } catch (e) {
    console.error("Critical Save Error:", e);
    return false;
  }
};

// Fetch lessons belonging to a category
export const fetchLessonsByCategory = async (category: Category): Promise<Lesson[]> => {
  const staticData = (category.level && HSK_STATIC_LESSONS[category.level]) ? HSK_STATIC_LESSONS[category.level] : [];
  if (!supabase) return staticData;
  const { data, error } = await supabase.from('lessons').select('*').eq('level', category.level).order('number', { ascending: true });
  if (error) return staticData;
  return [...staticData, ...data];
};

// Fetch all vocabulary items for a lesson
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

// Retrieve total counts for UI display
export const getGlobalStats = async () => {
  if (!supabase) return { totalWords: 0, totalLessons: 0 };
  const { count: v } = await supabase.from('vocabulary').select('*', { count: 'exact', head: true });
  const { count: l } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
  return { totalWords: v || 0, totalLessons: l || 0 };
};

// Generate image for a word using Gemini Image model
export const generateImageForWord = async (word: string, definition: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `An educational, high-quality minimalist illustration for the Chinese word "${word}" which means "${definition}". Simple clean style on a solid light background.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }
    return undefined;
  } catch (error) {
    console.error("Image generation failed:", error);
    return undefined;
  }
};

// Speak text using Gemini Text-to-Speech
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
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const decode = (base64Str: string) => {
        const binaryString = atob(base64Str);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };

      const decodeAudioData = async (
        data: Uint8Array,
        ctx: AudioContext,
        sampleRate: number,
        numChannels: number,
      ): Promise<AudioBuffer> => {
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
      };

      const audioBuffer = await decodeAudioData(decode(base64), outputAudioContext, 24000, 1);
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = speed;
      source.connect(outputAudioContext.destination);
      source.start();
    }
  } catch (e) {
    console.error("Speech generation error:", e);
  }
};
