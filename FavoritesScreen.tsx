import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, useWindowDimensions, FlatList, Alert } from 'react-native';
import { firebaseInstance, db } from './firebaseConfig';
import { collection, onSnapshot, doc, deleteDoc, Firestore, setDoc } from 'firebase/firestore';
import RenderHtml from 'react-native-render-html';
import { auth } from './firebaseReactNative';
import { Auth, User } from 'firebase/auth';
import { useFirebase } from './FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

interface Verse {
    id: string;
    text: string;
    note?: string;
    // ... other properties
}

interface FavoritesScreenProps {
    navigation: NavigationProp<ParamListBase>;
}

const FavoritesScreen: React.FC = () => {
    const { width } = useWindowDimensions();
    const { user } = useFirebase();
    const [favorites, setFavorites] = useState<any[]>([]);


    useEffect(() => {
        console.log('auth.currentUser:', auth?.currentUser);
        console.log('firebaseInstance.isDbInitialized():', firebaseInstance.isDbInitialized());
        console.log('db:', db);

        if (firebaseInstance.isDbInitialized() && db && auth?.currentUser) {
            const favoritesCollection = collection(db, `users/${auth?.currentUser.uid}/favorites`);
            console.log('Favorites collection path:', `users/${auth?.currentUser.uid}/favorites`);

            const unsubscribe = onSnapshot(favoritesCollection, (snapshot) => {
                const fetchedFavorites: Verse[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data() as Verse;
                    console.log('Document data:', doc.data());
                    fetchedFavorites.push({ ...data, id: doc.id });
                });
                setFavorites(fetchedFavorites);
                console.log('Fetched favorites:', fetchedFavorites);
            });

            return unsubscribe;
        }
    }, [auth]);

    const handleRemoveFavorite = async (verseId: string) => {
        if (auth?.currentUser && firebaseInstance.isDbInitialized() && firebaseInstance.db) {
            const verseDoc = doc(firebaseInstance.db, `users/${auth?.currentUser.uid}/favorites`, verseId);
            await deleteDoc(verseDoc);
        }
    };

    const handleEditNote = (verse: Verse) => {
        Alert.prompt(
            'Edit Note',
            'Enter a new note for this verse:',
            async (newNote) => {
                if (newNote !== null && firebaseInstance.db) {
                    const verseDoc = doc(firebaseInstance.db, `users/${auth?.currentUser?.uid}/favorites`, verse.id);
                    await setDoc(verseDoc, { ...verse, note: newNote }, { merge: true });
                }    
            },
                'plain-text',
                verse.note || '',
        );
    };

    return (
        <ScrollView style={styles.container}>
            {favorites.length > 0 ? (
                favorites.map((verse) => (
                    <View key={verse.id} style={styles.verseContainer}>
                        <RenderHtml source={{ html: verse.text }} contentWidth={width} />
                        {verse.note && <Text style={styles.noteText}>Note: {verse.note}</Text>}
                        <Button title="Edit Note" onPress={() => handleEditNote(verse)} />
                        <Button title="Remove from Favorites" onPress={() => handleRemoveFavorite(verse.id)} />
                    </View>
                ))
            ) : (
                <Text>No favorite verses yet.</Text>
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
        padding: 8,
    },
    noteText: {
        marginTop: 8,
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 16,
    },
});

export default FavoritesScreen;