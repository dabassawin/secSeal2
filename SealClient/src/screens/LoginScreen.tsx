import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isStaff, setIsStaff] = useState(true); // Toggle between Staff and Technician
    const { login, isLoading } = useAuth();

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            await login(username, password, isStaff ? 'staff' : 'technician');
        } catch (error) {
            Alert.alert('Login Failed', 'Invalid credentials or network error');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>SecSeal System</Text>

            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, isStaff && styles.activeToggle]}
                    onPress={() => setIsStaff(true)}
                >
                    <Text style={[styles.toggleText, isStaff && styles.activeToggleText]}>Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, !isStaff && styles.activeToggle]}
                    onPress={() => setIsStaff(false)}
                >
                    <Text style={[styles.toggleText, !isStaff && styles.activeToggleText]}>Technician</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>{isStaff ? 'Username / Employee ID' : 'Technician Username'}</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Login as {isStaff ? 'Staff' : 'Technician'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 40,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        marginBottom: 30,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeToggle: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    toggleText: {
        fontWeight: '600',
        color: '#666',
    },
    activeToggleText: {
        color: '#007AFF',
    },
    form: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    label: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
        marginTop: 12,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default LoginScreen;
