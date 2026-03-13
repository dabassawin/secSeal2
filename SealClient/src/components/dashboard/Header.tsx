import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, sizes } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import peaLogo from '../../assets/pea_logo.png';

export const Header: React.FC = () => {
    const { logout, user } = useAuth();
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} style={styles.menuButton}>
                    <Text style={styles.menuIcon}>☰</Text>
                </TouchableOpacity>
                {/* Logo Placeholder */}
                <TouchableOpacity
                    onPress={() => (navigation as any).navigate('Dashboard')}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                    <View style={styles.logoContainer}>
                        <Image source={peaLogo} style={styles.logoImage} resizeMode="contain" />
                    </View>
                    <Text style={styles.title}>SecuritySeal</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.rightSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.userName}>{user?.username || 'User'}</Text>
                    {user?.pea_name ? (
                        <Text style={styles.userPea}> ( {user.pea_name})</Text>
                    ) : null}
                </View>
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
    menuButton: {
        marginRight: sizes.md,
        padding: 4,
    },
    menuIcon: {
        fontSize: 24,
        color: colors.textDark,
        fontWeight: 'bold',
    },
    logoContainer: {
        marginRight: sizes.sm,
    },
    logoImage: {
        width: 32,
        height: 32,
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
        color: 'white',
        fontSize: sizes.fontMd,
        fontWeight: 'bold',
    },
    userPea: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: sizes.fontSm, // Increased size slightly to match better
        fontWeight: 'normal',
        marginLeft: 5, // Add spacing
        marginTop: 0, // Remove top margin
    },
});
