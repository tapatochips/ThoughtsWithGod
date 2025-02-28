import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, useWindowDimensions } from 'react-native';
import { firebaseInstance } from './firebaseConfig';
import { collection, onSnapshot, doc, deleteDoc, Firestore } from 'firebase/firestore';
import RenderHtml from 'react-native-render-html';
import { auth } from './firebaseReactNative';
import { Auth } from 'firebase/auth';

interface Verse {
    id: string;
    text: string;
    // ... other properties
}

const FavoritesScreen = () => {
    const { width } = useWindowDimensions();
    const [favorites, setFavorites] = useState<Verse[]>([]);


    useEffect(() => {
        if (auth.currentUser && firebaseInstance.isDbInitialized()) {
            const favoritesCollection = collection(db, `users/${auth.currentUser.uid}/favorites`);

            const unsubscribe = onSnapshot(favoritesCollection, (snapshot) => {
                const fetchedFavorites: Verse[] = [];
                snapshot.forEach((doc) => {
                    fetchedFavorites.push(doc.data() as Verse);
                });
                setFavorites(fetchedFavorites);
            });

            return unsubscribe;
        }
    }, []);

    const handleRemoveFavorite = async (verseId: string) => {
        if (auth.currentUser && firebaseInstance.isDbInitialized()) {
            const verseDoc = doc(firebaseInstance.db, `users/${auth.currentUser.uid}/favorites`, verseId);
            await deleteDoc(verseDoc);
        }
    };

    return (
        <ScrollView style={styles.container}>
            {favorites.length > 0 ? (
                favorites.map((verse) => (
                    <View key={verse.id} style={styles.verseContainer}>
                        <RenderHtml source={{ html: verse.text }} contentWidth={width} />
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
});

export default FavoritesScreen;