import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useWindowDimensions, 
  Alert,
  Platform, 
  ActivityIndicator
} from 'react-native';
import { db } from '../services/firebase/firebaseConfig';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import RenderHtml from 'react-native-render-html';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeProvider';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface Verse {
    id: string;
    text: string;
    book_name: string;
    chapter: number;
    verse: number;
    note?: string;
    // ... other properties
}

interface FavoritesScreenProps {
    navigation: NavigationProp<ParamListBase>;
}

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
    const { width } = useWindowDimensions();
    const { user, userProfile, db: contextDb } = useFirebase();
    const { theme } = useTheme();
    const [favorites, setFavorites] = useState<Verse[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Use either db from props or from context
    const effectiveDb = db || contextDb;

    useEffect(() => {
        if (!user || !effectiveDb) {
            setFavorites([]);
            setLoading(false);
            return;
        }

        const favoritesCollection = collection(effectiveDb, `users/${user.uid}/favorites`);
        console.log('Fetching favorites from:', `users/${user.uid}/favorites`);

        const unsubscribe = onSnapshot(
            favoritesCollection, 
            (snapshot) => {
                const fetchedFavorites: Verse[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data() as Verse;
                    fetchedFavorites.push({
                        ...data,
                        id: doc.id
                    });
                });
                setFavorites(fetchedFavorites);
                setLoading(false);
                console.log('Fetched favorites count:', fetchedFavorites.length);
            },
            (error) => {
                console.error("Error fetching favorites:", error);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [user, effectiveDb]);

    const handleRemoveFavorite = async (verseId: string) => {
        if (!user || !effectiveDb) return;
        
        try {
            const verseDoc = doc(effectiveDb, `users/${user.uid}/favorites`, verseId);
            await deleteDoc(verseDoc);
            console.log('Removed favorite:', verseId);
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    };

    const handleEditNote = async (verse: Verse) => {
        if (!user || !effectiveDb) return;
        
        Alert.prompt(
            'Edit Note',
            'Enter a note for this verse:',
            async (newNote) => {
                if (newNote !== null && effectiveDb) {
                    try {
                        const verseDoc = doc(effectiveDb, `users/${user.uid}/favorites`, verse.id);
                        await setDoc(verseDoc, { ...verse, note: newNote }, { merge: true });
                        console.log('Updated note for:', verse.id);
                    } catch (error) {
                        console.error('Failed to update note:', error);
                    }
                }
            },
            'plain-text',
            verse.note || ''
        );
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

    // Prepare verse text for proper rendering in current theme
    const getThemedVerseText = (text: string) => {
        if (!text) return '';
        
        const fontSize = getFontSize();
        
        // Replace all text-containing elements to ensure proper theme colors
        return text
            .replace(/<p[^>]*>/g, `<p style="font-size: ${fontSize}px; line-height: ${fontSize * 1.6}px; color: ${theme.colors.text}; margin-bottom: ${theme.spacing.md}px;">`)
            .replace(/<span[^>]*>/g, `<span style="color: ${theme.colors.text};">`)
            .replace(/<div[^>]*>/g, `<div style="color: ${theme.colors.text};">`);
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.message, { color: theme.colors.text, marginTop: theme.spacing.md }]}>
                    Loading favorites...
                </Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <Ionicons name="person-circle-outline" size={48} color={theme.colors.primary} />
                <Text style={[styles.message, { color: theme.colors.text, marginTop: theme.spacing.md }]}>
                    Please log in to view favorites.
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {favorites.length > 0 ? (
                <>
                    <Text style={[styles.headerText, { color: theme.colors.text }]}>
                        You have {favorites.length} favorite {favorites.length === 1 ? 'verse' : 'verses'}
                    </Text>
                    <ScrollView 
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollViewContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {favorites.map((verse) => (
                            <View key={verse.id} style={[
                                styles.verseContainer, 
                                { 
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.border,
                                    ...getShadowStyle(theme)
                                }
                            ]}>
                                <RenderHtml 
                                    source={{ html: getThemedVerseText(verse.text) }} 
                                    contentWidth={width - (theme.spacing.lg * 2) - (theme.spacing.md * 2)}
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
                                    baseStyle={{ color: theme.colors.text }}
                                />
                                <Text style={[
                                    styles.verseReference, 
                                    { 
                                        color: theme.colors.textSecondary,
                                        fontSize: theme.fontSize.sm,
                                        borderTopColor: theme.colors.divider 
                                    }
                                ]}>
                                    {verse.book_name} {verse.chapter}:{verse.verse}
                                </Text>
                                
                                {verse.note && (
                                    <View style={[
                                        styles.noteContainer, 
                                        { 
                                            backgroundColor: `${theme.colors.primary}10`,
                                            borderLeftColor: theme.colors.primary
                                        }
                                    ]}>
                                        <Text style={[
                                            styles.noteText, 
                                            { color: theme.colors.text }
                                        ]}>
                                            {verse.note}
                                        </Text>
                                    </View>
                                )}
                                
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.actionButton, 
                                            { backgroundColor: theme.colors.surface }
                                        ]} 
                                        onPress={() => handleEditNote(verse)}
                                    >
                                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                                        <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                                            {verse.note ? "Edit Note" : "Add Note"}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={[
                                            styles.actionButton, 
                                            { backgroundColor: `${theme.colors.danger}15` }
                                        ]} 
                                        onPress={() => handleRemoveFavorite(verse.id)}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                                        <Text style={[styles.actionButtonText, { color: theme.colors.danger }]}>
                                            Remove
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="bookmark-outline" size={64} color={theme.colors.secondary} />
                    <Text style={[styles.emptyMessage, { color: theme.colors.text }]}>
                        No favorite verses yet
                    </Text>
                    <Text style={[styles.emptySubMessage, { color: theme.colors.textSecondary }]}>
                        Your favorite verses will appear here
                    </Text>
                    <TouchableOpacity 
                        style={[styles.backButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.navigate('VerseDisplay')}
                    >
                        <Text style={styles.backButtonText}>Go to Verses</Text>
                    </TouchableOpacity>
                </View>
            )}
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
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        paddingBottom: 24,
    },
    verseContainer: {
        marginBottom: 20,
        borderRadius: 16,
        padding: 16,
        borderWidth: 0,
    },
    verseReference: {
        fontStyle: 'italic',
        marginTop: 16,
        paddingTop: 16,
        textAlign: 'right',
        borderTopWidth: 1,
    },
    noteContainer: {
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
    },
    noteText: {
        fontStyle: 'italic',
        fontSize: 15,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 0.48,
    },
    actionButtonText: {
        marginLeft: 8,
        fontWeight: '500',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyMessage: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 8,
    },
    emptySubMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 50,
    },
    backButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});

export default FavoritesScreen;