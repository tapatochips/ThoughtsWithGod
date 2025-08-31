import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeProvider';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  updateDoc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { NavigationProp, ParamListBase, RouteProp } from '@react-navigation/native';
import versesData from '../data/combinedBible.json';

interface Verse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
  info: string;
}

interface BookInfo {
  book_id: string;
  book_name: string;
  chapters: number;
}

interface ReadingProgress {
  book_id: string;
  book_name: string;
  chapter: number;
  verse?: number;
  lastRead: any;
  userId: string;
}

interface FavoriteVerse {
  id: string;
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
  note?: string;
  createdAt: any;
  userId: string;
}

const BibleReader: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const { user, db } = useFirebase();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentBook, setCurrentBook] = useState('GEN');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Extract unique books from verses data
  useEffect(() => {
    const versesArray = versesData as Verse[];
    const bookMap = new Map<string, BookInfo>();
    
    versesArray.forEach(verse => {
      if (!bookMap.has(verse.book_id)) {
        bookMap.set(verse.book_id, {
          book_id: verse.book_id,
          book_name: verse.book_name,
          chapters: 0
        });
      }
      const book = bookMap.get(verse.book_id)!;
      if (verse.chapter > book.chapters) {
        book.chapters = verse.chapter;
      }
    });

    const booksArray = Array.from(bookMap.values());
    setBooks(booksArray);
    
    // Handle navigation parameters
    const params = route?.params;
    if (params?.book && params?.chapter) {
      const targetBook = booksArray.find(b => b.book_name === params.book);
      if (targetBook) {
        setCurrentBook(targetBook.book_id);
        setCurrentChapter(params.chapter);
      }
    }
  }, [route?.params]);

  // Load verses for current book/chapter
  useEffect(() => {
    const versesArray = versesData as Verse[];
    const filteredVerses = versesArray.filter(
      verse => verse.book_id === currentBook && verse.chapter === currentChapter
    );
    setVerses(filteredVerses);
    setLoading(false);
  }, [currentBook, currentChapter]);

  // Load user's reading progress
  useEffect(() => {
    if (!db || !user) return;

    const progressRef = doc(db, `users/${user.uid}/readingProgress/current`);
    const unsubscribe = onSnapshot(progressRef, (doc) => {
      if (doc.exists()) {
        setReadingProgress(doc.data() as ReadingProgress);
      }
    });

    return unsubscribe;
  }, [db, user]);

  // Load user's favorites
  useEffect(() => {
    if (!db || !user) return;

    const favoritesRef = collection(db, `users/${user.uid}/favoriteVerses`);
    const unsubscribe = onSnapshot(favoritesRef, (snapshot) => {
      const favoriteIds = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data() as FavoriteVerse;
        favoriteIds.add(`${data.book_id}-${data.chapter}-${data.verse}`);
      });
      setFavorites(favoriteIds);
    });

    return unsubscribe;
  }, [db, user]);

  // Update reading progress
  const updateReadingProgress = async (bookId: string, bookName: string, chapter: number, verse?: number) => {
    if (!db || !user) return;

    try {
      const progressRef = doc(db, `users/${user.uid}/readingProgress/current`);
      await setDoc(progressRef, {
        book_id: bookId,
        book_name: bookName,
        chapter: chapter,
        verse: verse || 1,
        lastRead: Timestamp.now(),
        userId: user.uid
      });
    } catch (error) {
      console.error('Error updating reading progress:', error);
    }
  };

  // Navigate to book/chapter
  const navigateToChapter = (bookId: string, chapter: number) => {
    const book = books.find(b => b.book_id === bookId);
    if (book) {
      setCurrentBook(bookId);
      setCurrentChapter(chapter);
      updateReadingProgress(bookId, book.book_name, chapter);
    }
  };

  // Navigate to previous/next chapter
  const navigatePrevNext = (direction: 'prev' | 'next') => {
    const currentBookInfo = books.find(b => b.book_id === currentBook);
    if (!currentBookInfo) return;

    if (direction === 'next') {
      if (currentChapter < currentBookInfo.chapters) {
        navigateToChapter(currentBook, currentChapter + 1);
      } else {
        // Move to next book
        const currentBookIndex = books.findIndex(b => b.book_id === currentBook);
        if (currentBookIndex < books.length - 1) {
          const nextBook = books[currentBookIndex + 1];
          navigateToChapter(nextBook.book_id, 1);
        }
      }
    } else {
      if (currentChapter > 1) {
        navigateToChapter(currentBook, currentChapter - 1);
      } else {
        // Move to previous book's last chapter
        const currentBookIndex = books.findIndex(b => b.book_id === currentBook);
        if (currentBookIndex > 0) {
          const prevBook = books[currentBookIndex - 1];
          navigateToChapter(prevBook.book_id, prevBook.chapters);
        }
      }
    }
  };

  // Toggle verse selection
  const toggleVerseSelection = (verse: Verse) => {
    const verseId = `${verse.book_id}-${verse.chapter}-${verse.verse}`;
    const newSelected = new Set(selectedVerses);
    
    if (newSelected.has(verseId)) {
      newSelected.delete(verseId);
    } else {
      newSelected.add(verseId);
    }
    
    setSelectedVerses(newSelected);
    
    if (newSelected.size === 0 && selectionMode) {
      setSelectionMode(false);
    }
  };

  // Start selection mode
  const startSelectionMode = (verse: Verse) => {
    setSelectionMode(true);
    toggleVerseSelection(verse);
  };

  // Add selected verses to favorites
  const addToFavorites = async () => {
    if (!db || !user || selectedVerses.size === 0) return;

    try {
      const promises = Array.from(selectedVerses).map(async (verseId) => {
        const [bookId, chapter, verseNum] = verseId.split('-');
        const verse = verses.find(v => 
          v.book_id === bookId && 
          v.chapter === parseInt(chapter) && 
          v.verse === parseInt(verseNum)
        );
        
        if (verse) {
          const favoriteRef = doc(db, `users/${user.uid}/favoriteVerses`, verseId);
          await setDoc(favoriteRef, {
            id: verseId,
            book_id: verse.book_id,
            book_name: verse.book_name,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verse.text,
            createdAt: Timestamp.now(),
            userId: user.uid
          });
        }
      });

      await Promise.all(promises);
      setSelectedVerses(new Set());
      setSelectionMode(false);
      Alert.alert('Success', 'Verses added to favorites!');
    } catch (error) {
      console.error('Error adding to favorites:', error);
      Alert.alert('Error', 'Failed to add verses to favorites');
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (verse: Verse) => {
    if (!db || !user) return;

    try {
      const verseId = `${verse.book_id}-${verse.chapter}-${verse.verse}`;
      const favoriteRef = doc(db, `users/${user.uid}/favoriteVerses`, verseId);
      await deleteDoc(favoriteRef);
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  // Go to reading progress
  const goToReadingProgress = () => {
    if (readingProgress) {
      navigateToChapter(readingProgress.book_id, readingProgress.chapter);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading Bible...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="person-circle-outline" size={48} color={theme.colors.primary} />
        <Text style={[styles.message, { color: theme.colors.text, marginTop: 16 }]}>
          Please log in to use the Bible Reader.
        </Text>
      </View>
    );
  }

  const currentBookInfo = books.find(b => b.book_id === currentBook);
  const chapters = Array.from({ length: currentBookInfo?.chapters || 0 }, (_, i) => i + 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        backgroundColor={theme.colors.card} 
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
      />
      
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.divider
      }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => setShowBookSelector(true)}
          >
            <Text style={[styles.bookName, { color: theme.colors.primary }]}>
              {currentBookInfo?.book_name}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => setShowChapterSelector(true)}
          >
            <Text style={[styles.chapterText, { color: theme.colors.primary }]}>
              Chapter {currentChapter}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {readingProgress && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: `${theme.colors.success}20` }]}
              onPress={goToReadingProgress}
            >
              <Ionicons name="bookmark" size={18} color={theme.colors.success} />
            </TouchableOpacity>
          )}
          
          {selectionMode && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}20` }]}
              onPress={addToFavorites}
              disabled={selectedVerses.size === 0}
            >
              <Ionicons name="heart" size={18} color={theme.colors.primary} />
              <Text style={[styles.selectionCount, { color: theme.colors.primary }]}>
                {selectedVerses.size}
              </Text>
            </TouchableOpacity>
          )}
          
          {selectionMode && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: `${theme.colors.danger}20` }]}
              onPress={() => {
                setSelectionMode(false);
                setSelectedVerses(new Set());
              }}
            >
              <Ionicons name="close" size={18} color={theme.colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Navigation */}
      <View style={[styles.navigation, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={[styles.navArrow, { opacity: currentBook === books[0]?.book_id && currentChapter === 1 ? 0.3 : 1 }]}
          onPress={() => navigatePrevNext('prev')}
          disabled={currentBook === books[0]?.book_id && currentChapter === 1}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
          <Text style={[styles.navText, { color: theme.colors.primary }]}>Previous</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navArrow, { opacity: currentBook === books[books.length - 1]?.book_id && currentChapter === books[books.length - 1]?.chapters ? 0.3 : 1 }]}
          onPress={() => navigatePrevNext('next')}
          disabled={currentBook === books[books.length - 1]?.book_id && currentChapter === books[books.length - 1]?.chapters}
        >
          <Text style={[styles.navText, { color: theme.colors.primary }]}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Verses */}
      <ScrollView 
        style={styles.versesContainer}
        contentContainerStyle={styles.versesContent}
        showsVerticalScrollIndicator={false}
      >
        {verses.map((verse) => {
          const verseId = `${verse.book_id}-${verse.chapter}-${verse.verse}`;
          const isSelected = selectedVerses.has(verseId);
          const isFavorite = favorites.has(verseId);
          
          return (
            <TouchableOpacity
              key={verseId}
              style={[
                styles.verseContainer,
                { 
                  backgroundColor: isSelected ? `${theme.colors.primary}15` : theme.colors.card,
                  borderLeftColor: isFavorite ? theme.colors.warning : 'transparent'
                }
              ]}
              onPress={() => selectionMode ? toggleVerseSelection(verse) : null}
              onLongPress={() => !selectionMode ? startSelectionMode(verse) : null}
              activeOpacity={0.7}
            >
              <View style={styles.verseHeader}>
                <Text style={[styles.verseNumber, { color: theme.colors.primary }]}>
                  {verse.verse}
                </Text>
                
                {isFavorite && (
                  <TouchableOpacity onPress={() => removeFromFavorites(verse)}>
                    <Ionicons name="heart" size={16} color={theme.colors.warning} />
                  </TouchableOpacity>
                )}
              </View>
              
              <RenderHtml
                contentWidth={width - 80}
                source={{ html: verse.text }}
                tagsStyles={{
                  body: {
                    fontSize: 16,
                    lineHeight: 24,
                    color: theme.colors.text,
                    margin: 0,
                    padding: 0,
                  },
                  em: {
                    fontStyle: 'italic',
                    color: theme.colors.textSecondary,
                  }
                }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Book Selector Modal */}
      <Modal
        visible={showBookSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.divider }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Book
              </Text>
              <TouchableOpacity onPress={() => setShowBookSelector(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={books}
              keyExtractor={(item) => item.book_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { 
                      backgroundColor: item.book_id === currentBook ? `${theme.colors.primary}15` : 'transparent' 
                    }
                  ]}
                  onPress={() => {
                    navigateToChapter(item.book_id, 1);
                    setShowBookSelector(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: theme.colors.text }]}>
                    {item.book_name}
                  </Text>
                  <Text style={[styles.chaptersText, { color: theme.colors.textSecondary }]}>
                    {item.chapters} chapters
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Chapter Selector Modal */}
      <Modal
        visible={showChapterSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChapterSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.divider }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Chapter - {currentBookInfo?.book_name}
              </Text>
              <TouchableOpacity onPress={() => setShowChapterSelector(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.chapterGrid}>
              {chapters.map((chapter) => (
                <TouchableOpacity
                  key={chapter}
                  style={[
                    styles.chapterButton,
                    { 
                      backgroundColor: chapter === currentChapter ? theme.colors.primary : `${theme.colors.primary}15`,
                      borderColor: theme.colors.primary
                    }
                  ]}
                  onPress={() => {
                    navigateToChapter(currentBook, chapter);
                    setShowChapterSelector(false);
                  }}
                >
                  <Text style={[
                    styles.chapterButtonText,
                    { color: chapter === currentChapter ? 'white' : theme.colors.primary }
                  ]}>
                    {chapter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 16,
  },
  bookName: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 4,
  },
  chapterText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  selectionCount: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  versesContainer: {
    flex: 1,
  },
  versesContent: {
    padding: 16,
  },
  verseContainer: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalItemText: {
    fontSize: 16,
    flex: 1,
  },
  chaptersText: {
    fontSize: 12,
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  chapterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 40,
    alignItems: 'center',
  },
  chapterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BibleReader;