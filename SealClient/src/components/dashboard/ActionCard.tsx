import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors, sizes } from '@/constants';

interface ActionCardProps {
    title: string;
    subtitle: string;
    icon: string;
    onPress?: () => void;
    iconColor?: string;
    iconBgColor?: string;
}

export const ActionCard: React.FC<ActionCardProps> = ({
    title,
    subtitle,
    icon,
    onPress,
    iconColor = colors.primaryPurple,
    iconBgColor = colors.bgLight
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Pressable
            style={[
                styles.container,
                isHovered && styles.containerHovered
            ]}
            onPress={onPress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
        </Pressable>
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
        minWidth: 250,
        width: '30%',
        marginHorizontal: sizes.xs,
        height: 200,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    containerHovered: {
        transform: Platform.OS === 'web' ? [{ scale: 1.02 }] : [],
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        borderColor: colors.primaryPurple,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: sizes.md,
    },
    icon: {
        fontSize: 30,
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
