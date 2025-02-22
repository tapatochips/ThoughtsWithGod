import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

const AuthScreen = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSignUp = async () => {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            //user signed up
            console.log("user signed up");
            setError(null);
        } catch (err) {
            const errorMessage = (err as { message: string }).message || "Error creating user";
            setError(errorMessage);
            console.error("Error creating user", err);
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
            <Button title="Sign Up" onPress={handleSignUp} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        width: '100%',
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
});

export default AuthScreen;