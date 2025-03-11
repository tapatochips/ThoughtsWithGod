import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, useWindowDimensions, Alert } from 'react-native';
import { db } from '../services/firebase/firebaseConfig';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import RenderHtml from 'react-native-render-html';
import { useFirebase } from '../context/FirebaseContext';
import { useTheme } from '../context/ThemeProvider';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

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
            .replace(/<p[^>]*>/g, `<p style="font-size: ${fontSize}px; line-height: ${fontSize * 1.5}px; color: ${theme.colors.text};">`)
            .replace(/<span[^>]*>/g, `<span style="color: ${theme.colors.text};">`)
            .replace(/<div[^>]*>/g, `<div style="color: ${theme.colors.text};">`);
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.message, { color: theme.colors.text }]}>Loading favorites...</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.message, { color: theme.colors.text }]}>Please log in to view favorites.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {favorites.length > 0 ? (
                favorites.map((verse) => (
                    <View key={verse.id} style={[
                        styles.verseContainer, 
                        { 
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border
                        }
                    ]}>
                        <RenderHtml 
                            source={{ html: getThemedVerseText(verse.text) }} 
                            contentWidth={width} 
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
                                color: theme.colors.secondary,
                                fontSize: theme.fontSize.sm 
                            }
                        ]}>
                            {verse.book_name} {verse.chapter}:{verse.verse}
                        </Text>
                        {verse.note && (
                            <Text style={[
                                styles.noteText, 
                                { 
                                    color: theme.colors.text,
                                    backgroundColor: `${theme.colors.primary}20`,
                                    borderColor: theme.colors.border
                                }
                            ]}>
                                Note: {verse.note}
                            </Text>
                        )}
                        <View style={styles.buttonContainer}>
                            <Button 
                                title="Edit Note" 
                                onPress={() => handleEditNote(verse)}
                                color={theme.colors.primary}
                            />
                            <Button 
                                title="Remove" 
                                onPress={() => handleRemoveFavorite(verse.id)}
                                color={theme.colors.danger}
                            />
                        </View>
                    </View>
                ))
            ) : (
                <Text style={[styles.message, { color: theme.colors.text }]}>No favorite verses yet.</Text>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    verseContainer: {
        marginBottom: 16,
        borderWidth: 1,
        padding: 16,
        borderRadius: 8,
    },
    verseReference: {
        fontStyle: 'italic',
        marginVertical: 8,
    },
    noteText: {
        marginTop: 8,
        padding: 8,
        borderRadius: 4,
        borderWidth: 1,
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
    },
    message: {
        padding: 20,
        textAlign: 'center',
        fontSize: 16,
    },
});

export default FavoritesScreen;