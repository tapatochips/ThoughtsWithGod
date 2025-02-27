import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, useWindowDimensions } from 'react-native';
import verses from './data/combinedBible.json';
import RenderHtml from 'react-native-render-html';
import { User } from "firebase/auth";
import { db, firebaseInstance } from "./firebaseConfig";
import { DocumentSnapshot, collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';

interface Verse {
    id: string;
    text: string;
    // ... other properties if needed
}

interface VerseDisplayProps {
    user: User | null;
}

const VerseDisplay: React.FC<VerseDisplayProps> = ({ user }) => {
    const { width } = useWindowDimensions();
    const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
    const [verses, setVerses] = useState<Verse[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);

    useEffect(() => {
        try {
            const importedVerses: Verse[] = require('./data/combinedBible.json');
            setVerses(importedVerses);
            if (importedVerses && importedVerses.length > 0) {
                const initialIndex = Math.floor(Math.random() * importedVerses.length);
                setCurrentVerse(importedVerses[initialIndex]);
            }
        } catch (err) {
            console.error('Failed to import verses:', err);
        } finally {
            setLoading(false);
        }
    }, []); // Empty dependency array for initial load

    useEffect(() => {
        if (user && currentVerse && currentVerse.id && firebaseInstance.isDbInitialized() && db) {
            const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
            const verseDocument = doc(favoritesCollection, currentVerse.id);

            const unsubscribe = onSnapshot(verseDocument, (doc: DocumentSnapshot) => {
                setIsFavorite(doc.exists);
            });

            return unsubscribe;
        } else {
            setIsFavorite(false);
        }
    }, [user, currentVerse]); // Dependency array with user and currentVerse

    const handleNextVerse = () => {
        if (verses && verses.length > 0) {
            const randomIndex = Math.floor(Math.random() * verses.length);
            setCurrentVerse(verses[randomIndex]);
        }
    };

    const handleFavoritePress = async () => {
        if (!user || !currentVerse || !currentVerse.id || !db) return;

        const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
        const verseDocument = doc(favoritesCollection, currentVerse.id);

        try {
            if (isFavorite) {
                await deleteDoc(verseDocument);
            } else {
                await setDoc(verseDocument, currentVerse);
            }
            setIsFavorite(!isFavorite);
        } catch (error) {
            console.error('Failed to update favorite status:', error);
        }
    };

    if (loading) {
        return <Text>Loading Verse...</Text>;
    }

    if (!verses || verses.length === 0) {
        return <Text>No verses found.</Text>;
    }

    return (
        <View style={styles.verseContainer}>
            {currentVerse ? (
                <>
                    <RenderHtml source={{ html: currentVerse.text }} contentWidth={width} />
                    <Button title="Next Verse" onPress={handleNextVerse} />
                    {user && currentVerse && (
                        <Button
                            title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            onPress={handleFavoritePress}
                        />
                    )}
                </>
            ) : (
                <Text>No verse selected yet.</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    verseContainer: {
        padding: 20,
        backgroundColor: 'f0f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    verseText: {
        fontSize: 20,
        fontFamily: 'serif',
        lineHeight: 28,
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    verseReference: {
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 20,
        textAlign: 'center',
    },
});

export default VerseDisplay;