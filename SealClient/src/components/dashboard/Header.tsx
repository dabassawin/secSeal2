import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, sizes } from '@/constants';

export const Header: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                {/* Logo Placeholder */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoIcon}>🛡️</Text>
                </View>
                <Text style={styles.title}>SecuritySeal</Text>
            </View>
            <View style={styles.rightSection}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Admin Status</Text>
                </View>
                <Text style={styles.userName}>คุณสมชาย (Admin)</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.primaryPurple,
        paddingHorizontal: sizes.lg,
        paddingVertical: sizes.md,
        height: 60,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        marginRight: sizes.sm,
    },
    logoIcon: {
        fontSize: sizes.fontXl,
        color: colors.textDark,
    },
    title: {
        fontSize: sizes.fontLg,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: sizes.sm,
        paddingVertical: sizes.xs,
        borderRadius: sizes.radiusRound,
        marginRight: sizes.md,
    },
    statusText: {
        color: colors.textDark,
        fontSize: sizes.fontXs,
    },
    userName: {
        color: colors.textDark,
        fontSize: sizes.fontSm,
        fontWeight: '500',
    },
});
