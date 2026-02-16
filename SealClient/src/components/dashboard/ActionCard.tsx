import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, sizes } from '@/constants';

interface ActionCardProps {
    title: string;
    subtitle: string;
    icon: string; // Placeholder for now, can be an icon component later
    onPress?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({ title, subtitle, icon, onPress }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{icon}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        borderRadius: sizes.radiusMd,
        padding: sizes.lg,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        marginBottom: sizes.md,
        minWidth: 250, // Keep for responsiveness
        width: '30%', // Force 3 per row on large screens
        marginHorizontal: sizes.xs,
        height: 200,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.bgLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: sizes.md,
    },
    icon: {
        fontSize: 30,
        color: colors.primaryPurple,
    },
    title: {
        fontSize: sizes.fontMd,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: sizes.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
        textAlign: 'center',
    },
});
