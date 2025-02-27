import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator } from "react-native";
import { auth } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";

const AuthScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async () => {
        if (!auth) {
            console.log("Auth is not initialized yet.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log("User created successfully");
        } catch (err) {
            const errorMessage = (err as Error).message || "Error creating user";
            setError(errorMessage);
            console.error("Error creating user", err);
        } finally {
            setIsLoading(false);
        }
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
                <Button title="Sign Up" onPress={handleSignUp} />
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