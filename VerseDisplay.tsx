import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, useWindowDimensions } from 'react-native';
import verses from './data/combinedBible.json';
import RenderHtml from 'react-native-render-html';
import { User } from "firebase/auth"; // Import the User type
import { db } from "./firebase";

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

        if (user) { // Now you have access to the user object, and TypeScript knows about it
            console.log("User logged in:", user.uid);
            // You can use user.uid to fetch user-specific data from Firestore, etc.
        }
    }, [currentVerse, user]); // Add user to the dependency array

    const handleNextVerse = () => {
        if (verses && verses.length > 0) {
            const randomIndex = Math.floor(Math.random() * verses.length);
            setCurrentVerse(verses[randomIndex]);
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