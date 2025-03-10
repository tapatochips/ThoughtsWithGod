import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, useWindowDimensions } from 'react-native';
import versesData from '../data/combinedBible.json';
import RenderHtml from 'react-native-render-html';
import { db } from "../services/firebase/firebaseConfig";
import { DocumentSnapshot, collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeProvider';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import LogoutButton from '../components/auth/LogoutButton';

interface Verse {
    id?: string;
    text: string;
    bood_id: string;
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

    // Create tagged HTML for the verse text using theme font size
    const getTaggedVerseText = () => {
        if (!currentVerse) return '';
        
        const fontSize = getFontSize();
        
        return currentVerse.text.replace(
            /<p>/g, 
            `<p style="font-size: ${fontSize}px; line-height: ${fontSize * 1.5}px; color: ${theme.colors.text};">`
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.text }}>Loading Verse...</Text>
            </View>
        );
    }

    if (!verses || verses.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={{ color: theme.colors.text }}>No verses found.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { 
                backgroundColor: theme.colors.card,
                borderBottomColor: theme.colors.border 
            }]}>
                <TouchableOpacity 
                    style={styles.profileButton} 
                    onPress={navigateToProfile}
                >
                    <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
                        {userProfile?.username || user?.email?.split('@')[0] || 'Guest'}
                    </Text>
                </TouchableOpacity>
                <LogoutButton />
            </View>
            
            <View style={styles.verseContainer}>
                {currentVerse ? (
                    <>
                        <RenderHtml 
                            source={{ html: getTaggedVerseText() }} 
                            contentWidth={width} 
                            tagsStyles={{
                                p: { color: theme.colors.text }
                            }}
                        />
                        <Text style={[styles.verseReference, { 
                            color: theme.colors.secondary,
                            fontSize: theme.fontSize.sm 
                        }]}>
                            {currentVerse.book_name} {currentVerse.chapter}:{currentVerse.verse}
                        </Text>
                        
                        <View style={styles.actionButtonContainer}>
                            <TouchableOpacity 
                                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} 
                                onPress={handleNextVerse}
                            >
                                <Text style={styles.actionButtonText}>Next Verse</Text>
                            </TouchableOpacity>
                            
                            {user && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { 
                                        backgroundColor: isFavorite ? theme.colors.danger : theme.colors.success 
                                    }]}
                                    onPress={handleFavoritePress}
                                >
                                    <Text style={styles.actionButtonText}>
                                        {isFavorite ? 'Remove' : 'Favorite'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        
                        <View style={styles.navButtonContainer}>
                            <TouchableOpacity 
                                style={[styles.navButton, { backgroundColor: theme.colors.card }]} 
                                onPress={() => navigation.navigate('Favorites')}
                            >
                                <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                    My Favorites
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.navButton, { backgroundColor: theme.colors.card }]} 
                                onPress={() => navigation.navigate('PrayerBoard')}
                            >
                                <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                    Prayer Board
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={[styles.profileNavButton, { backgroundColor: theme.colors.card }]} 
                            onPress={navigateToProfile}
                        >
                            <Text style={[styles.navButtonText, { color: theme.colors.text }]}>
                                Profile Settings
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <Text style={{ color: theme.colors.text }}>No verse selected yet.</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
    },
    profileButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    verseContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    verseReference: {
        fontStyle: 'italic',
        marginBottom: 30,
        textAlign: 'center',
    },
    actionButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginHorizontal: 10,
    },
    actionButtonText: {
        color: 'white',
        marginLeft: 8,
        fontWeight: '600',
    },
    navButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        width: '45%',
        justifyContent: 'center',
    },
    profileNavButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        width: '80%', 
        justifyContent: 'center',
        marginTop: 15,
    },
    navButtonText: {
        marginLeft: 8,
        fontWeight: '500',
    },
});

export default VerseDisplay;