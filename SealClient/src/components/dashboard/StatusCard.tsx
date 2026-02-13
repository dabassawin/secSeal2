import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, sizes } from '@/constants';

interface StatusCardProps {
    title: string;
    count: string;
    color: string;
    onPress?: () => void;
}

import { TouchableOpacity } from 'react-native';

export const StatusCard: React.FC<StatusCardProps> = ({ title, count, color, onPress }) => {
    const Container = onPress ? TouchableOpacity : View;
    return (
        <Container style={[styles.container, { borderLeftColor: color }]} onPress={onPress}>
            <Text style={styles.title}>{title}</Text>
            <Text style={[styles.count, { color: color }]}>{count}</Text>
        </Container>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background,
        borderRadius: sizes.radiusSm,
        padding: sizes.md,
        borderLeftWidth: 4,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        marginBottom: sizes.md,
        // Responsive width management will be handled by parent container via flex
        flex: 1,
        minWidth: 200, // Ensure it doesn't get too small
        marginHorizontal: sizes.xs,
    },
    title: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
        marginBottom: sizes.xs,
    },
    count: {
        fontSize: sizes.fontXxl,
        fontWeight: 'bold',
    },
});
