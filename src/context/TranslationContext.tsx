import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TranslationId } from '../services/bible/types';

// Which translation is selected. The verses themselves are loaded per book
// through loadBook() in services/bible/bibleData.

export interface Translation {
  id: TranslationId;
  name: string;
  abbreviation: string;
  description: string;
}

// Available translations
const translations: Record<TranslationId, Translation> = {
  KJV: {
    id: 'KJV',
    name: 'King James Version',
    abbreviation: 'KJV',
    description: 'The classic 1611 King James translation',
  },
  ASV: {
    id: 'ASV',
    name: 'American Standard Version',
    abbreviation: 'ASV',
    description: 'The 1901 American Standard Version',
  },
};

const isTranslationId = (value: string): value is TranslationId => value in translations;

interface TranslationContextType {
  currentTranslation: Translation;
  availableTranslations: Translation[];
  setTranslation: (translationId: TranslationId) => Promise<void>;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const STORAGE_KEY = '@bible_translation';

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTranslationId, setCurrentTranslationId] = useState<TranslationId>('KJV');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved translation preference
  useEffect(() => {
    const loadSavedTranslation = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && isTranslationId(saved)) {
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

  const setTranslation = async (translationId: TranslationId) => {
    setCurrentTranslationId(translationId);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, translationId);
    } catch (error) {
      console.error('Error saving translation preference:', error);
    }
  };

  const value: TranslationContextType = {
    currentTranslation: translations[currentTranslationId],
    availableTranslations: Object.values(translations),
    setTranslation,
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
