import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, useWindowDimensions, Alert } from 'react-native';
import { db } from '../services/firebase/firebaseConfig';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import RenderHtml from 'react-native-render-html';
import { useFirebase } from '../context/FirebaseContext';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { auth } from '../services/firebase/firebaseReactNative'; 

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
    const { user: contextUser } = useFirebase();
    console.log('favorites screen user: ', contextUser);
    console.log('fav screen auth user: ', auth?.currentUser);
    
    //use the auth.currentUser as a fallback if contextUser is null
    const effectiveUser = contextUser || auth?.currentUser;
    
    const [favorites, setFavorites] = useState<Verse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!effectiveUser || !db) {
            setFavorites([]);
            setLoading(false);
            console.log('No user or database available');
            return;
        }
        
        console.log('Fetching favorites for user: ', effectiveUser.uid);
        const favoritesCollection = collection(db, `users/${effectiveUser.uid}/favorites`);

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
    }, [effectiveUser]);

    const handleRemoveFavorite = async (verseId: string) => {
        if (!effectiveUser || !db) return;
        
        try {
            const verseDoc = doc(db, `users/${effectiveUser.uid}/favorites`, verseId);
            await deleteDoc(verseDoc);
            console.log('Removed favorite:', verseId);
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    };

    const handleEditNote = async (verse: Verse) => {
        if (!effectiveUser || !db) return;
        
        Alert.prompt(
            'Edit Note',
            'Enter a note for this verse:',
            async (newNote) => {
                if (newNote !== null && db) {
                    try {
                        const verseDoc = doc(db, `users/${effectiveUser.uid}/favorites`, verse.id);
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

    if (!effectiveUser) {
        return <Text style={styles.message}>Please log in to view favorites.</Text>;
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Favorites for {effectiveUser.email}</Text>
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
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
});

export default FavoritesScreen;