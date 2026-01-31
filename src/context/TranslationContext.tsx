import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Bible data
import kjvData from '../data/combinedBible.json';
import asvData from '../data/combinedBibleASV.json';

export interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
  info: string;
}

export interface Translation {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  data: Verse[];
}

// Available translations
const translations: Record<string, Translation> = {
  KJV: {
    id: 'KJV',
    name: 'King James Version',
    abbreviation: 'KJV',
    description: 'The classic 1611 King James translation',
    data: kjvData as Verse[],
  },
  ASV: {
    id: 'ASV',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    description: 'The 1901 American Standard Version',
    data: asvData as Verse[],
  },
};

interface TranslationContextType {
  currentTranslation: Translation;
  availableTranslations: Translation[];
  setTranslation: (translationId: string) => Promise<void>;
  getVerses: () => Verse[];
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const STORAGE_KEY = '@bible_translation';

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTranslationId, setCurrentTranslationId] = useState<string>('KJV');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved translation preference
  useEffect(() => {
    const loadSavedTranslation = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && translations[saved]) {
          setCurrentTranslationId(saved);
        }
      } catch (error) {
        console.error('Error loading translation preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedTranslation();
  }, []);

  const setTranslation = async (translationId: string) => {
    if (translations[translationId]) {
      setCurrentTranslationId(translationId);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, translationId);
      } catch (error) {
        console.error('Error saving translation preference:', error);
      }
    }
  };

  const getVerses = (): Verse[] => {
    return translations[currentTranslationId]?.data || [];
  };

  const value: TranslationContextType = {
    currentTranslation: translations[currentTranslationId],
    availableTranslations: Object.values(translations),
    setTranslation,
    getVerses,
    isLoading,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
