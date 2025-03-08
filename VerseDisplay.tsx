import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, useWindowDimensions } from 'react-native';
import versesData from './data/combinedBible.json';
import RenderHtml from 'react-native-render-html';
import { db } from "./firebaseConfig";
import { DocumentSnapshot, collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import LogoutButton from './LogoutButton';

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
    const { user, db: contextDb } = useFirebase();
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

    const navigateToPrayerBoard = () => {
        navigation.navigate('PrayerBoard');
    };

    if (loading) {
        return <Text>Loading Verse...</Text>;
    }

    if (!verses || verses.length === 0) {
        return <Text>No verses found.</Text>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>
                    Welcome, {user?.email?.split('@')[0] || 'Guest'}
                </Text>
                <LogoutButton />
            </View>
            
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
                        <View style={styles.buttonGroup}>
                            <Button title="View Favorites" onPress={() => navigation.navigate('Favorites')} />
                            <Button title="Prayer Board" onPress={navigateToPrayerBoard} />
                        </View>
                    </>
                ) : (
                    <Text>No verse selected yet.</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    welcomeText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    verseContainer: {
        padding: 20,
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
    buttonGroup: {
        marginTop: 20,
        width: '100%',
    },
});

export default VerseDisplay;