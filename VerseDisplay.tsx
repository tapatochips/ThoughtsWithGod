import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, useWindowDimensions } from 'react-native';
import versesData from './data/combinedBible.json';
import RenderHtml from 'react-native-render-html';
import { User } from "firebase/auth";
import { db } from "./firebaseConfig";
import { DocumentSnapshot, collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';

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
    user: User | null;
    navigation: any;
}

const VerseDisplay: React.FC<VerseDisplayProps> = ({ user, navigation }) => {
    const { width } = useWindowDimensions();
    const [currentVerse, setCurrentVerse] = useState<Verse | null>(null);
    const [verses, setVerses] = useState<Verse[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);

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
        if (!user || !currentVerse || !db) {
            setIsFavorite(false);
            return;
        }

        // Create a consistent ID for the verse
        const verseId = currentVerse.id || `${currentVerse.book_name}-${currentVerse.chapter}-${currentVerse.verse}`;
        
        const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
        const verseDocument = doc(favoritesCollection, verseId);

        const unsubscribe = onSnapshot(verseDocument, (docSnapshot: DocumentSnapshot) => {
            setIsFavorite(docSnapshot.exists());
        }, (error) => {
            console.error("Error listening to favorites:", error);
        });

        return unsubscribe;
    }, [user, currentVerse]); 

    const handleNextVerse = () => {
        if (verses && verses.length > 0) {
            const randomIndex = Math.floor(Math.random() * verses.length);
            setCurrentVerse(verses[randomIndex]);
        }
    };

    const handleFavoritePress = async () => {
        if (!user || !currentVerse || !db) return;
        
        // Create a consistent ID for the verse
        const verseId = currentVerse.id || `${currentVerse.book_name}-${currentVerse.chapter}-${currentVerse.verse}`;
        
        const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
        const verseDocument = doc(favoritesCollection, verseId);

        try {
            if (!isFavorite) {
              // Include the ID in the saved document
              const verseToSave = { 
                ...currentVerse,
                id: verseId
              };
              
              console.log('Adding to favorites:', verseToSave);
              await setDoc(verseDocument, verseToSave);
              console.log('Favorite added with id:', verseId);
            } else {
              await deleteDoc(verseDocument);
              console.log('Favorite removed with id:', verseId);
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
                    <Text style={styles.verseReference}>
                        {currentVerse.book_name} {currentVerse.chapter}:{currentVerse.verse}
                    </Text>
                    <Button title="Next Verse" onPress={handleNextVerse} />
                    {user && (
                        <Button
                            title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            onPress={handleFavoritePress}
                        />
                    )}
                    <Button title="View Favorites" onPress={() => navigation.navigate('Favorites')} />
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
        backgroundColor: '#f0f0f0',
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