import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { API_CONFIG, getApiUrl } from '../../config/api.config';
import { AuthService } from '../../services/AuthService';
import { TechnicianService } from '../../services/TechnicianService';

export default function CompanyTechnicianListScreen({ navigation }: any) {
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();

    const fetchTechnicians = async () => {
        setLoading(true);
        try {
            const token = await AuthService.getToken();
            
            // Get current user com_code to filter technicians by center
            const me = await TechnicianService.getMe().catch(() => null);
            let url = getApiUrl('/technician/list');
            
            if (me?.is_center && me?.com_code) {
                url += `?com_code=${me.com_code}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            console.log('Fetched Technicians:', data);
            
            // Filter out company itself if it appears in the technician list
            // We use both name and code to be safe, or check for is_center flag if available
            const filteredData = data.filter((tech: any) => 
                tech.technician_code !== '87654321' && 
                tech.is_center !== true &&
                !tech.first_name?.includes('บริษัท')
            );
            setTechnicians(filteredData);
        } catch (error) {
            console.error('Error fetching technicians:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('History', { 
                technicianId: item.id,
                technicianName: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username
            })}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="person" size={24} color="#6A0DAD" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.techName}>{item.first_name} {item.last_name}</Text>

                <View style={styles.metaRow}>
                    <Ionicons name="barcode-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>รหัสช่าง: <Text style={styles.boldText}>{item.technician_code}</Text></Text>
                </View>

                {item.company_name && (
                    <View style={styles.metaRow}>
                        <Ionicons name="business-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>บริษัท: {item.company_name}</Text>
                    </View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#BDBDBD" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <SafeAreaView edges={[]} style={styles.headerContent}>
                    <Text style={styles.headerTitle}>รายชื่อช่างปฏิบัติงาน</Text>
                    <Text style={styles.headerSubtitle}>รายชื่อบุคลากรช่างทั้งหมดในเครือข่าย</Text>
                </SafeAreaView>
            </View>

            {/* Content Section */}
            <View style={styles.body}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6A0DAD" />
                    </View>
                ) : (
                    <FlatList
                        data={technicians}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={loading} onRefresh={fetchTechnicians} colors={['#6A0DAD']} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={60} color="#E0E0E0" />
                                <Text style={styles.emptyText}>ไม่พบข้อมูลช่าง</Text>
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
    backButton: {
        position: 'absolute',
        left: 20,
        top: 0,
        padding: 5,
        zIndex: 1,
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
    },
    body: {
        flex: 1,
        marginTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 100,
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
    techName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    metaText: {
        color: '#757575',
        fontSize: 13,
    },
    boldText: {
        fontWeight: 'bold',
        color: '#6A0DAD',
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
});
