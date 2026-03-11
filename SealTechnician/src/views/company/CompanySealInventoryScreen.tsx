import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useHomeViewModel } from '../../viewmodels/HomeViewModel';
import { Seal } from '../../services/TechnicianService';

export default function CompanySealInventoryScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { activeSeals, isLoading, fetchSeals } = useHomeViewModel();
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        fetchSeals();
    }, []);

    const onRefresh = useCallback(() => {
        fetchSeals();
    }, []);

    const displayedSeals = activeSeals.filter(
        seal => seal.seal_number.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderItem = ({ item }: { item: Seal }) => {
        return (
            <View style={styles.card}>
                <View style={styles.iconContainer}>
                    <Ionicons
                        name="cube-outline"
                        size={24}
                        color="#6A0DAD"
                    />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.sealNumber}>{item.seal_number}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons
                            name="time-outline"
                            size={14}
                            color="#757575"
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.metaText}>สถานะ: พร้อมจ่าย</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <SafeAreaView edges={[]} style={styles.headerContent}>
                    <Text style={styles.headerTitle}>คลังซีลบริษัท</Text>
                    <Text style={styles.headerSubtitle}>
                        รายการซีลทั้งหมดในคลัง ({activeSeals.length} รายการ)
                    </Text>
                </SafeAreaView>
            </View>

            {/* Content Section */}
            <View style={styles.body}>
                {/* Search Box */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#9E9E9E" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาเบอร์ซีลในคลัง..."
                        value={searchText}
                        onChangeText={setSearchText}
                        autoCapitalize="characters"
                    />
                    {searchText !== '' && (
                        <TouchableOpacity onPress={() => setSearchText('')}>
                            <Ionicons name="close-circle" size={20} color="#9E9E9E" />
                        </TouchableOpacity>
                    )}
                </View>

                {isLoading && !activeSeals.length ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6A0DAD" />
                    </View>
                ) : (
                    <FlatList
                        data={displayedSeals}
                        keyExtractor={(item) => item.seal_number}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={['#6A0DAD']} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="cube-outline" size={60} color="#E0E0E0" />
                                <Text style={styles.emptyText}>ไม่มีซีลในคลัง</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#6A0DAD', // Purple
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerSubtitle: {
        color: '#E0B0FF',
        fontSize: 14,
        textAlign: 'center',
    },
    body: {
        flex: 1,
        marginTop: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginHorizontal: 20,
        marginBottom: 10,
        marginTop: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        height: 50,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    iconContainer: {
        width: 50,
        height: 50,
        backgroundColor: '#F3E5F5',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    sealNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        color: '#757575',
        fontSize: 13,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#9E9E9E',
        fontSize: 16,
        marginTop: 16,
    },
    assignButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
