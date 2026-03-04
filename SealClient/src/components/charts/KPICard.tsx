import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, sizes } from '@/constants';

interface KPICardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color: string;
    bgColor?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, color, bgColor }) => {
    const bg = bgColor || color + '15';

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            <View style={styles.row}>
                <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                    <Text style={styles.icon}>{icon}</Text>
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={[styles.value, { color }]}>{value}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: 200,
        backgroundColor: 'white',
        borderRadius: sizes.radiusMd,
        padding: sizes.md,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        marginHorizontal: sizes.xs,
        marginBottom: sizes.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 22,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
        fontWeight: '600',
        marginBottom: 2,
    },
    value: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
        marginTop: 2,
    },
});
