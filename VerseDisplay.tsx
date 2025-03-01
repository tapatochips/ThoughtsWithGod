import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, useWindowDimensions, Alert } from 'react-native';
import verses from './data/combinedBible.json';
import versesData from './data/combinedBible.json';
//console.log('versesData: ', versesData);
import RenderHtml from 'react-native-render-html';
import { User } from "firebase/auth";
import { db, firebaseInstance } from "./firebaseConfig";
import { DocumentSnapshot, collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
import { NavigationProp, ParamListBase } from '@react-navigation/native';



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
    }, []); // Empty dependency array for initial load

    useEffect(() => {
        if (user && currentVerse && currentVerse.id && firebaseInstance.isDbInitialized() && db) {
            const verseId = currentVerse.id || `${currentVerse.book_name}-${currentVerse.chapter}-${currentVerse.verse}`
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
        console.log('user: ', user);
        console.log('currentVerse: ', currentVerse);
        if (!user || !currentVerse || !currentVerse.id || !db) return;
        
        const verseId = currentVerse.id || `${currentVerse.book_name}-${currentVerse.chapter}-${currentVerse.verse}`;
        const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
        console.log('fav collection ref: ', favoritesCollection.path);
        const verseDocument = doc(favoritesCollection, currentVerse.id);

        try {
            if (!isFavorite) {
              console.log('Adding to favorites:', currentVerse, 'with id:', verseId);
              await setDoc(verseDocument, { ...currentVerse, id: verseId });
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
                    <Button title="Next Verse" onPress={handleNextVerse} />
                    {user && currentVerse && (
                        <Button
                            title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            onPress={handleFavoritePress}
                        />
                    )}
                    <Button title="View Favorites" onPress={() => navigation.navigate('Favorites')}></Button>
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