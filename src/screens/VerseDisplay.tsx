import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  useWindowDimensions,
  Animated,
  Platform
} from 'react-native';
import versesData from '../data/combinedBible.json';
import RenderHtml from 'react-native-render-html';
import { db } from "../services/firebase/firebaseReactNative";
import { DocumentSnapshot, collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeProvider';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import LogoutButton from '../components/auth/LogoutButton';
import { Ionicons } from '@expo/vector-icons';

interface Verse {
    id?: string;
    text: string;
    book_id: string;
    book_name: string;
    chapter: number;
    info: string;
    verse: number;
}

interface VerseDisplayProps {
    navigation: NavigationProp<ParamListBase>;
}

const VerseDisplay: React.FC<VerseDisplayProps> = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const { user, userProfile, db: contextDb } = useFirebase();
    const { theme } = useTheme();
    const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
    const [verses, setVerses] = useState<Verse[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];
    
    // Use either db from props or from context
    const effectiveDb = db || contextDb;

    useEffect(() => {
        try {
            const versesArray = versesData as Verse[];
            setVerses(versesArray);
            if (versesArray && versesArray.length > 0) {
              const initialIndex = Math.floor(Math.random() * versesArray.length);
              setCurrentVerse(versesArray[initialIndex]);
            }
          } catch (err) {
            console.error('Failed to import verses:', err);
          } finally {
            setLoading(false);
          }
    }, []);

    // Fade in effect when verse changes
    useEffect(() => {
      if (currentVerse) {
        // Reset opacity to 0
        fadeAnim.setValue(0);
        // Then fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    }, [currentVerse, fadeAnim]);

    useEffect(() => {
        if (!user || !currentVerse || !effectiveDb) {
            setIsFavorite(false);
            return;
        }

        // Create a consistent ID for the verse
        const verseId = currentVerse.id || `${currentVerse.book_name}-${currentVerse.chapter}-${currentVerse.verse}`;
        
        const favoritesCollection = collection(effectiveDb, `users/${user.uid}/favorites`);
        const verseDocument = doc(favoritesCollection, verseId);

        const unsubscribe = onSnapshot(verseDocument, (docSnapshot: DocumentSnapshot) => {
            setIsFavorite(docSnapshot.exists());
        }, (error) => {
            console.error("Error listening to favorites:", error);
        });

        return unsubscribe;
    }, [user, currentVerse, effectiveDb]); 

    const handleNextVerse = () => {
        if (verses && verses.length > 0) {
            const randomIndex = Math.floor(Math.random() * verses.length);
            setCurrentVerse(verses[randomIndex]);
        }
    };

    const handleFavoritePress = async () => {
        if (!user || !currentVerse || !effectiveDb) {
            console.log('Missing user, currentVerse, or db. Cannot update favorites.');
            return;
        }
        
        // Create a consistent ID for the verse
        const verseId = currentVerse.id || `${currentVerse.book_name}-${currentVerse.chapter}-${currentVerse.verse}`;
        
        try {
            const favoritesCollection = collection(effectiveDb, `users/${user.uid}/favorites`);
            const verseDocument = doc(favoritesCollection, verseId);

            if (!isFavorite) {
              // Include the ID in the saved document
              const verseToSave = { 
                ...currentVerse,
                id: verseId
              };
              
              await setDoc(verseDocument, verseToSave);
              console.log('Favorite added with id:', verseId);
            } else {
              await deleteDoc(verseDocument);
              console.log('Favorite removed with id:', verseId);
            }
        } catch (error) {
            console.error('Failed to update favorite status:', error);
        }
    };

    const navigateToProfile = () => {
        navigation.navigate('ProfileSetup');
    };

    // Get font size based on user preference
    const getFontSize = () => {
        const fontSizeName = userProfile?.preferences?.fontSize || 'medium';
        switch (fontSizeName) {
            case 'small':
                return theme.fontSize.sm;
            case 'large':
                return theme.fontSize.lg;
            default:
                return theme.fontSize.md;
        }
    };

    // Create tagged HTML for the verse text using dynamic font size
    const getTaggedVerseText = () => {
        if (!currentVerse) return '';
        
        const fontSize = getFontSize();
        
        // Replace all text-containing elements to ensure proper theme colors
        return currentVerse.text
            .replace(/<p[^>]*>/g, `<p style="font-size: ${fontSize}px; line-height: ${fontSize * 1.6}px; color: ${theme.colors.text}; margin-bottom: ${theme.spacing.md}px;">`)
            .replace(/<span[^>]*>/g, `<span style="color: ${theme.colors.text};">`)
            .replace(/<div[^>]*>/g, `<div style="color: ${theme.colors.text};">`);
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.text }}>Loading Verse...</Text>
            </View>
        );
    }

    if (!verses || verses.length === 0) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.text }}>No verses found.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { 
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.divider,
                ...getShadowStyle(theme)
            }]}>
                <TouchableOpacity 
                    style={styles.profileButton} 
                    onPress={navigateToProfile}
                >
                    <View style={[styles.avatarCircle, {backgroundColor: theme.colors.primary}]}>
                        <Text style={styles.avatarText}>{userProfile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'G'}</Text>
                    </View>
                    <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
                        {userProfile?.username || user?.email?.split('@')[0] || 'Guest'}
                    </Text>
                </TouchableOpacity>
                <LogoutButton />
            </View>
            
            <Animated.ScrollView 
                style={[styles.scrollContainer, { opacity: fadeAnim }]}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {currentVerse ? (
                    <>
                        <View style={[styles.verseCard, { 
                            backgroundColor: theme.colors.card,
                            ...getShadowStyle(theme),
                        }]}>
                            <RenderHtml 
                                source={{ html: getTaggedVerseText() }} 
                                contentWidth={width - theme.spacing.lg * 2} 
                                tagsStyles={{
                                    p: { color: theme.colors.text },
                                    span: { color: theme.colors.text },
                                    div: { color: theme.colors.text },
                                    h1: { color: theme.colors.text },
                                    h2: { color: theme.colors.text },
                                    h3: { color: theme.colors.text },
                                    h4: { color: theme.colors.text },
                                    h5: { color: theme.colors.text },
                                    h6: { color: theme.colors.text },
                                    li: { color: theme.colors.text },
                                    a: { color: theme.colors.primary }
                                }}
                                baseStyle={{ color: theme.colors.text, fontSize: getFontSize() }}
                            />
                            <Text style={[styles.verseReference, { 
                                color: theme.colors.textSecondary,
                                fontSize: getFontSize(),
                                borderTopColor: theme.colors.divider 
                            }]}>
                                {currentVerse.book_name} {currentVerse.chapter}:{currentVerse.verse}
                            </Text>
                        </View>
                        
                        <View style={styles.actionButtonContainer}>
                            <TouchableOpacity 
                                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} 
                                onPress={handleNextVerse}
                            >
                                <Ionicons name="refresh-outline" size={20} color="white" />
                                <Text style={styles.actionButtonText}>Next Verse</Text>
                            </TouchableOpacity>
                            
                            {user && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { 
                                        backgroundColor: isFavorite ? theme.colors.danger : theme.colors.success 
                                    }]}
                                    onPress={handleFavoritePress}
                                >
                                    <Ionicons 
                                        name={isFavorite ? "heart" : "heart-outline"} 
                                        size={20} 
                                        color="white" 
                                    />
                                    <Text style={styles.actionButtonText}>
                                        {isFavorite ? 'Remove' : 'Favorite'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        
                        <View style={styles.navButtonsSection}>
                            <Text style={[styles.sectionTitle, {color: theme.colors.textSecondary}]}>
                                Navigate
                            </Text>
                            
                            <View style={styles.navButtonContainer}>
                                <TouchableOpacity 
                                    style={[styles.navButton, { 
                                        backgroundColor: theme.colors.surface,
                                        ...getShadowStyle(theme)
                                    }]} 
                                    onPress={() => navigation.navigate('Favorites')}
                                >
                                    <Ionicons name="bookmark-outline" size={20} color={theme.colors.primary} />
                                    <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                        My Favorites
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.navButton, { 
                                        backgroundColor: theme.colors.surface,
                                        ...getShadowStyle(theme)
                                    }]} 
                                    onPress={() => navigation.navigate('PrayerBoard')}
                                >
                                    <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                                    <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                        Prayer Board
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.navButton, { 
                                        backgroundColor: theme.colors.surface,
                                        ...getShadowStyle(theme)
                                    }]} 
                                    onPress={() => navigation.navigate('BibleReader')}
                                >
                                    <Ionicons name="library-outline" size={20} color={theme.colors.primary} />
                                    <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                        Read the Bible
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Biblical Discussions Button */}
                            <TouchableOpacity 
                                style={[styles.profileNavButton, { 
                                    backgroundColor: theme.colors.surface,
                                    ...getShadowStyle(theme),
                                    marginBottom: 12
                                }]} 
                                onPress={() => navigation.navigate('BiblicalDiscussions')}
                            >
                                <Ionicons name="book-outline" size={22} color={theme.colors.primary} />
                                <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                    Biblical Discussions
                                </Text>
                            </TouchableOpacity>

                            {/* Add button for subscription */}
                            <TouchableOpacity 
                              style={[styles.profileNavButton, { 
                                backgroundColor: theme.colors.surface,
                                ...getShadowStyle(theme),
                                marginBottom: 12  // Add some spacing
                              }]} 
                              onPress={() => navigation.navigate('Subscription')}
                            >
                              <Ionicons name="star-outline" size={22} color={theme.colors.primary} />
                              <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                Support us here!
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.profileNavButton, { 
                                    backgroundColor: theme.colors.surface,
                                    ...getShadowStyle(theme)
                                }]} 
                                onPress={navigateToProfile}
                            >
                                <Ionicons name="settings-outline" size={22} color={theme.colors.primary} />
                                <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                    Profile Settings
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <Text style={{ color: theme.colors.text }}>No verse selected yet.</Text>
                )}
            </Animated.ScrollView>
        </View>
    );
};

// Helper function for consistent shadow styling
const getShadowStyle = (theme: any) => {
    if (Platform.OS === 'ios') {
        return {
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.8,
            shadowRadius: 5,
        };
    } else {
        return {
            elevation: 4,
        };
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    profileButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    welcomeText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 32,
    },
    verseCard: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    verseReference: {
        fontStyle: 'italic',
        marginTop: 16,
        paddingTop: 16,
        textAlign: 'right',
        borderTopWidth: 1,
    },
    actionButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 32,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 50,
        marginHorizontal: 8,
        minWidth: 140,
    },
    actionButtonText: {
        color: 'white',
        marginLeft: 8,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 12,
        paddingLeft: 8,
    },
    navButtonsSection: {
        marginTop: 8,
    },
    navButtonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        width: '48%',
        marginBottom: 8,
    },
    profileNavButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    navButtonText: {
        marginLeft: 12,
        fontWeight: '500',
    },
});

export default VerseDisplay;