import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, useWindowDimensions } from 'react-native';
import verses from './data/combinedBible.json';
import RenderHtml from 'react-native-render-html';

interface Verse {
    text: string;
    // ... other properties if needed
}




const VerseDisplay = () => {
    const width = useWindowDimensions();
    const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
    const [verses, setVerses] = useState<Verse[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const importedVerses: Verse[] = require('./data/combinedBible.json'); // Type the import
            setVerses(importedVerses);
            // Set the initial verse after loading:
            if (importedVerses && importedVerses.length > 0) {
                const initialIndex = Math.floor(Math.random() * importedVerses.length);
                setCurrentVerse(importedVerses[initialIndex]);
            }
        } catch (err) {
            console.error('Failed to import verses:', err);
        } finally {
            setLoading(false);
        }
    }, []);

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
                    <RenderHtml source={{ html: currentVerse.text }} contentWidth={width.width}/>                    {/* Display other verse properties if available */}
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