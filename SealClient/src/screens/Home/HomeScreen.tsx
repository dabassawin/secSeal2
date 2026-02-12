import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, sizes } from '@/constants';

export const HomeScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to SealClient! 🚀</Text>
            <Text style={styles.subtitle}>Your React Native app is ready</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: sizes.lg,
    },
    title: {
        fontSize: sizes.fontXxl,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: sizes.md,
    },
    subtitle: {
        fontSize: sizes.fontLg,
        color: colors.textLight,
    },
});
