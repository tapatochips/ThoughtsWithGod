import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native";
import { auth } from "../services/firebase/firebaseReactNative";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const AuthScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(true);

    const handleAuthentication = async () => {
        if (!auth) {
            console.log("Auth is not initialized yet.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
                console.log("User created successfully.");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                console.log("User signed in successfully.");
            }
        } catch (err) {
            const errorMessage =(err as Error).message || (isSignUp ? "Failed to create user" : "Failed to sign in");
            setError(errorMessage);
            console.error(isSignUp ? "Failed to create user:" : "Failed to sign in:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAuthMode = () => {
        setIsSignUp(!isSignUp);
    };

    return (
        <View style={styles.container}>
            <Text>Thoughts With God</Text>
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry={true}
                value={password}
                onChangeText={setPassword}
            />
            {isLoading ? (
                <ActivityIndicator />
            ) : (
                <View>
                    <Button title={isSignUp ? "Sign Up" : "Sign In"} onPress={handleAuthentication} />
                    <Button title={isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"} onPress={toggleAuthMode} />
                </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
    },
    input: {
        height: 40,
        borderColor: "gray",
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 8,
        width: '100%',
    },
    errorText: {
        color: "red",
        marginTop: 8,
    },
});

export default AuthScreen;