import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { auth } from "../services/firebase/firebaseReactNative";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useTheme } from "../context/ThemeProvider";

const AuthScreen = () => {
    const { theme } = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

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
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.colors.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="book" size={32} color="white" />
                    </View>
                    <Text style={[styles.title, { color: theme.colors.text, fontSize: theme.fontSize.xxl }]}>
                        Thoughts With God
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary, fontSize: theme.fontSize.md }]}>
                        {isSignUp ? 'Create your account to get started' : 'Welcome back! Please sign in'}
                    </Text>
                </View>

                {/* Form Card */}
                <View style={[
                    styles.formCard, 
                    { 
                        backgroundColor: theme.colors.card,
                        shadowColor: theme.colors.shadow,
                        borderColor: theme.colors.border
                    }
                ]}>
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: theme.colors.text, fontSize: theme.fontSize.sm }]}>
                            Email Address
                        </Text>
                        <View style={[styles.inputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[
                                    styles.textInput, 
                                    { color: theme.colors.text, fontSize: theme.fontSize.md }
                                ]}
                                placeholder="Enter your email"
                                placeholderTextColor={theme.colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: theme.colors.text, fontSize: theme.fontSize.sm }]}>
                            Password
                        </Text>
                        <View style={[styles.inputWrapper, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[
                                    styles.textInput, 
                                    { color: theme.colors.text, fontSize: theme.fontSize.md }
                                ]}
                                placeholder="Enter your password"
                                placeholderTextColor={theme.colors.textSecondary}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons 
                                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                                    size={20} 
                                    color={theme.colors.textSecondary} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.danger}15`, borderColor: theme.colors.danger }]}>
                            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.danger} />
                            <Text style={[styles.errorText, { color: theme.colors.danger, fontSize: theme.fontSize.sm }]}>
                                {error}
                            </Text>
                        </View>
                    )}

                    {/* Primary Action Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            { 
                                backgroundColor: isLoading ? theme.colors.border : theme.colors.primary,
                                shadowColor: theme.colors.shadow
                            }
                        ]}
                        onPress={handleAuthentication}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Ionicons 
                                    name={isSignUp ? "person-add-outline" : "log-in-outline"} 
                                    size={20} 
                                    color="white" 
                                    style={styles.buttonIcon}
                                />
                                <Text style={[styles.primaryButtonText, { fontSize: theme.fontSize.md }]}>
                                    {isSignUp ? "Create Account" : "Sign In"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Secondary Action Button */}
                    <TouchableOpacity
                        style={[
                            styles.secondaryButton,
                            { 
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border
                            }
                        ]}
                        onPress={toggleAuthMode}
                        disabled={isLoading}
                    >
                        <Text style={[
                            styles.secondaryButtonText, 
                            { color: theme.colors.text, fontSize: theme.fontSize.sm }
                        ]}>
                            {isSignUp ? "Already have an account? " : "Don't have an account? "}
                            <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                                {isSignUp ? "Sign In" : "Sign Up"}
                            </Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
        minHeight: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },
    formCard: {
        borderRadius: 16,
        padding: 24,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        height: '100%',
        fontWeight: '500',
    },
    eyeIcon: {
        padding: 4,
        marginLeft: 8,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
    },
    errorText: {
        marginLeft: 8,
        flex: 1,
        fontWeight: '500',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 12,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonIcon: {
        marginRight: 8,
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontWeight: '500',
        textAlign: 'center',
    },
    linkText: {
        fontWeight: '600',
    },
});

export default AuthScreen;