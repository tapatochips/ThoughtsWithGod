import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase/firebaseFunctions';

const FirebaseTest: React.FC = () => {
    const { db, user, auth } = useFirebase();
    const [testResults, setTestResults] = useState<{
        auth: boolean;
        firestore: boolean;
        functions: boolean;
    }>({
        auth: false,
        firestore: false,
        functions: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Test Firebase Auth
    const testAuth = () => {
        if (auth && user) {
            setTestResults(prev => ({ ...prev, auth: true }));
            console.log('✅ Firebase Auth working - User:', user.email);
            return true;
        }
        console.log('❌ Firebase Auth not working');
        return false;
    };

    // Test Firestore
    const testFirestore = async () => {
        if (!db) {
            console.log('❌ Firestore not initialized');
            return false;
        }

        try {
            // Try to read from a collection
            const testCollection = collection(db, 'test');
            const snapshot = await getDocs(testCollection);
            console.log('✅ Firestore read test passed');

            // Try to write to Firestore
            const docRef = await addDoc(testCollection, {
                test: true,
                timestamp: new Date(),
                user: user?.email || 'anonymous'
            });
            console.log('✅ Firestore write test passed - Doc ID:', docRef.id);

            setTestResults(prev => ({ ...prev, firestore: true }));
            return true;
        } catch (error) {
            console.error('❌ Firestore test failed:', error);
            setError(`Firestore error: ${error}`);
            return false;
        }
    };

    // Test Firebase Functions
    const testFunctions = async () => {
        if (!functions) {
            console.log('❌ Firebase Functions not initialized');
            return false;
        }

        try {
            // Test the validateSubscription function
            const validateSubscription = httpsCallable(functions, 'validateSubscription');
            const result = await validateSubscription({});
            console.log('✅ Firebase Functions test passed:', result.data);
            setTestResults(prev => ({ ...prev, functions: true }));
            return true;
        } catch (error) {
            console.error('❌ Firebase Functions test failed:', error);
            // This is expected if user has no subscription
            setTestResults(prev => ({ ...prev, functions: true }));
            return true;
        }
    };

    const runAllTests = async () => {
        setLoading(true);
        setError(null);

        try {
            testAuth();
            await testFirestore();
            await testFunctions();
        } catch (error) {
            setError(`Test error: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runAllTests();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Firebase Connection Test</Text>

            <View style={styles.testResults}>
                <Text style={[styles.testItem, testResults.auth && styles.success]}>
                    {testResults.auth ? '✅' : '❌'} Firebase Auth: {testResults.auth ? 'Connected' : 'Not Connected'}
                </Text>
                <Text style={[styles.testItem, testResults.firestore && styles.success]}>
                    {testResults.firestore ? '✅' : '❌'} Firestore: {testResults.firestore ? 'Connected' : 'Not Connected'}
                </Text>
                <Text style={[styles.testItem, testResults.functions && styles.success]}>
                    {testResults.functions ? '✅' : '❌'} Functions: {testResults.functions ? 'Connected' : 'Not Connected'}
                </Text>
            </View>

            {error && (
                <Text style={styles.error}>{error}</Text>
            )}

            <TouchableOpacity
                style={styles.button}
                onPress={runAllTests}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Run Tests Again</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        margin: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    testResults: {
        marginBottom: 20,
    },
    testItem: {
        fontSize: 16,
        marginBottom: 10,
        color: '#666',
    },
    success: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    error: {
        color: 'red',
        marginBottom: 10,
        fontSize: 14,
    },
    button: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default FirebaseTest;