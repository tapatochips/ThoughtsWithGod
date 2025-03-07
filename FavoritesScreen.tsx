import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, useWindowDimensions, Alert } from 'react-native';
import { db } from './firebaseConfig';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import RenderHtml from 'react-native-render-html';
import { useFirebase } from './FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { auth } from './firebaseReactNative';

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
    const { user } = useFirebase();
    const [favorites, setFavorites] = useState<Verse[]>([]);
    const [loading, setLoading] = useState(true);

    console.log("favorites screen user: ", user);
    console.log("fav screen auth user: ", auth?.currentUser);

    const currentUser = user || auth?.currentUser;
    console.log('fav screen user fallback: ', currentUser);

    useEffect(() => {
        if (!user || !db) {
            setFavorites([]);
            setLoading(false);
            return;
        }

        const favoritesCollection = collection(db, `users/${user.uid}/favorites`);
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
    }, [currentUser]);

    const handleRemoveFavorite = async (verseId: string) => {
        if (!user || !db) return;
        
        try {
            // Using a non-null assertion (!!) since we've already checked if db is null
            const verseDoc = doc(db, `users/${user.uid}/favorites`, verseId);
            await deleteDoc(verseDoc);
            console.log('Removed favorite:', verseId);
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    };

    const handleEditNote = async (verse: Verse) => {
        if (!user || !db) return;
        
        Alert.prompt(
            'Edit Note',
            'Enter a new note for this verse:',
            async (newNote) => {
                if (newNote !== null && db) {  // Adding an extra check for db here
                    try {
                        const verseDoc = doc(db, `users/${user.uid}/favorites`, verse.id);
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

    if (loading) {
        return <Text style={styles.message}>Loading favorites...</Text>;
    }

    if (!user) {
        return <Text style={styles.message}>Please log in to view favorites.</Text>;
    }

    return (
        <ScrollView style={styles.container}>
            {favorites.length > 0 ? (
                favorites.map((verse) => (
                    <View key={verse.id} style={styles.verseContainer}>
                        <RenderHtml source={{ html: verse.text }} contentWidth={width} />
                        <Text style={styles.verseReference}>
                            {verse.book_name} {verse.chapter}:{verse.verse}
                        </Text>
                        {verse.note && <Text style={styles.noteText}>Note: {verse.note}</Text>}
                        <View style={styles.buttonContainer}>
                            <Button title="Edit Note" onPress={() => handleEditNote(verse)} />
                            <Button title="Remove" onPress={() => handleRemoveFavorite(verse.id)} />
                        </View>
                    </View>
                ))
            ) : (
                <Text style={styles.message}>No favorite verses yet.</Text>
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
        borderColor: '#ccc',
        padding: 16,
        borderRadius: 8,
    },
    verseReference: {
        fontSize: 14,
        fontStyle: 'italic',
        marginVertical: 8,
    },
    noteText: {
        marginTop: 8,
        fontStyle: 'italic',
        color: '#555',
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