import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useAuth } from '../context/AuthContext';

const TechnicianHomeScreen = () => {
    const { logout, user } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Technician App</Text>
            <Text style={styles.subtitle}>Technician: {user?.username}</Text>

            <View style={styles.content}>
                <Text>My Assigned Seals will appear here.</Text>
            </View>

            <Button title="Logout" onPress={logout} color="#FF3B30" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 40,
    },
    content: {
        marginBottom: 40,
    },
});

export default TechnicianHomeScreen;
