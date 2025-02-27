import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, useWindowDimensions } from 'react-native';
import verses from './data/combinedBible.json';
import RenderHtml from 'react-native-render-html';
import { User } from "firebase/auth"; // Import the User type
import { db, firebaseInstance } from "./firebaseConfig";
import { DocumentSnapshot, collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';

interface Verse {
    text: string;
    // ... other properties if needed
}

interface VerseDisplayProps {
    user: User | null; // Define the user prop
}

const VerseDisplay: React.FC<VerseDisplayProps> = ({ user }) => { // Use the interface
    const { width } = useWindowDimensions();
    const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
    const [verses, setVerses] = useState<Verse[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    //const [favoriteVerseID, setFavoriteVerseID] = useState<String | null>(null);

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

        if (user && currentVerse && firebaseInstance.isDbInitialized() &&db) { 
            const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
            const verseDocument = doc(favoritesCollection, currentVerse.text);

            const unsubscribe = onSnapshot(verseDocument, (doc: DocumentSnapshot) => {
                setIsFavorite(doc.exists);
            });

            return unsubscribe;
        } else {
            setIsFavorite(false);
        }
    }, [currentVerse, user]); 

    const handleNextVerse = () => {
        if (verses && verses.length > 0) {
            const randomIndex = Math.floor(Math.random() * verses.length);
            setCurrentVerse(verses[randomIndex]);
        }
    };

    const handleFavoritePress = async () => {
        if (!user || !currentVerse || !db) return;

        const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
        const verseDocument = doc(favoritesCollection, currentVerse.text);

        try {
            if (isFavorite) {
                await deleteDoc(verseDocument);
            } else {
                await setDoc(verseDocument, currentVerse);
            }
            setIsFavorite(!isFavorite);
        } catch(error) {
            console.error('Failed to update favorite status:', error);
        }

    }

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
                    {user && currentVerse  && (
                        <Button
                        title={isFavorite? 'Remove from Favorites' : 'Add to Favorites'}
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