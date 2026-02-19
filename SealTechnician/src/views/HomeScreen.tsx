import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useHomeViewModel } from '../viewmodels/HomeViewModel';
import { Seal } from '../services/TechnicianService';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { seals, isLoading, error, fetchSeals } = useHomeViewModel();

    const onRefresh = useCallback(() => {
        fetchSeals();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'พร้อมใช้งาน': return '#4CAF50'; // Green
            case 'จ่าย': return '#2196F3';       // Blue
            case 'ติดตั้งแล้ว': return '#FF9800'; // Orange
            case 'ใช้งานแล้ว': return '#9E9E9E';  // Grey
            default: return '#757575';
        }
    };

    const renderSealItem = ({ item }: { item: Seal }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.sealNumber}>{item.seal_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.label}>ID: <Text style={styles.value}>{item.id}</Text></Text>
                {item.installed_serial && (
                    <Text style={styles.label}>Installed on: <Text style={styles.value}>{item.installed_serial}</Text></Text>
                )}
            </View>
            {/* Action Buttons Placeholder */}
            <View style={styles.actionRow}>
                {item.status === 'จ่าย' && (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9800' }]}>
                        <Text style={styles.actionButtonText}>Install</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Seals</Text>
                <Text style={styles.headerSubtitle}>{seals.length} Assigned</Text>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={fetchSeals} style={styles.retryButton}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={seals}
                renderItem={renderSealItem}
                keyExtractor={(item) => item.seal_number}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={['#4c669f']} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No assigned seals found.</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#4c669f',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 4,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#e0e0e0',
        marginTop: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sealNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardBody: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 4,
    },
    value: {
        color: '#333',
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginLeft: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
    retryButton: {
        padding: 10,
        backgroundColor: '#eee',
        borderRadius: 5,
    },
    retryText: {
        color: '#333',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
});
