import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, useWindowDimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { Technician } from '@/types';
import { userService } from '@/services/userService';
import { technicianService } from '@/services/technicianService';

export const TechnicianDetailScreen: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const params = (route.params || {}) as { id?: string | number; technician?: Technician };

    const [techData, setTechData] = useState<Technician | null>(params.technician || null);
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchMasPea();
            if (!techData && params.id) {
                await fetchTechnicianById(params.id);
            }
            setLoading(false);
        };
        init();
    }, [params.id]);

    // เมื่อกดปุ่ม Back ของเบราว์เซอร์ ให้ reload หน้า 1 ครั้ง
    // เพื่อให้ React Navigation resolve URL ไปยังหน้าที่ถูกต้อง
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handlePopState = () => {
                window.location.reload();
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, []);

    const fetchTechnicianById = async (id: string | number) => {
        try {
            // Fetch all and find by ID since there's no getById API
            const allTechs = await technicianService.getTechnicians();
            const found = allTechs.find(t => t.id.toString() === id.toString());
            if (found) setTechData(found);
        } catch (error) {
            console.error('Failed to fetch technician:', error);
        }
    };

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const getPeaName = (code?: string) => {
        if (!code) return '-';
        const pea = masPeaList.find(p => p.pea_code === code || p.PeaCode === code || p.code === code);
        return pea ? (pea.name_th || pea.NameTh) : '-';
    };

    if (loading) {
        return (
            <View style={styles.mainContainer}>
                <Header />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primaryPurple} />
                </View>
            </View>
        );
    }

    if (!techData) {
        return (
            <View style={styles.mainContainer}>
                <Header />
                <View style={styles.centered}>
                    <Text style={{ fontSize: 16, color: '#666' }}>ไม่พบข้อมูลช่างเทคนิค</Text>
                    <Text style={{ fontSize: 16, color: '#666', marginTop: 20 }}>กรุณากลับไปที่หน้าแผงควบคุมหลัก</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <Header />

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

                {/* Title */}
                <View style={styles.pageHeader}>
                    <Text style={styles.pageTitle}>รายละเอียดช่างเทคนิค</Text>
                </View>

                {/* Profile Card */}
                <View style={styles.card}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarLarge}>
                            <Text style={styles.avatarIconLarge}>👤</Text>
                        </View>
                        <View style={styles.profileTitleArea}>
                            <Text style={styles.profileName}>{techData?.first_name} {techData?.last_name}</Text>
                            <View style={styles.badgeContainer}>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleBadgeText}>ช่างเทคนิค</Text>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusDot}>●</Text>
                                    <Text style={styles.statusText}>ปกติ</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>ข้อมูลพนักงาน</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>รหัสช่าง</Text>
                                <Text style={styles.infoValue}>{techData.technician_code || '-'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>ชื่อผู้ใช้งาน (Username)</Text>
                                <Text style={styles.infoValue}>{techData.username || '-'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>อีเมล</Text>
                                <Text style={styles.infoValue}>{techData.email || '-'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>เบอร์โทรศัพท์</Text>
                                <Text style={styles.infoValue}>{techData.phone_number || '-'}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>ข้อมูลหน่วยงาน</Text>
                        <View style={styles.infoGrid}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>รหัสการไฟฟ้า</Text>
                                <Text style={styles.infoValue}>{techData.pea_code || '-'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>ชื่อการไฟฟ้า</Text>
                                <Text style={styles.infoValue}>{getPeaName(techData.pea_code)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: sizes.lg,
        paddingBottom: 60,
    },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: sizes.lg,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: sizes.lg,
        padding: 5,
    },
    backIcon: {
        fontSize: 20,
        color: colors.primaryPurple,
        marginRight: 4,
        fontWeight: 'bold',
    },
    backText: {
        fontSize: 16,
        color: colors.primaryPurple,
        fontWeight: 'bold',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: sizes.radiusLg,
        padding: sizes.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: sizes.xl,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: sizes.lg,
        borderWidth: 2,
        borderColor: colors.primaryPurple,
    },
    avatarIconLarge: {
        fontSize: 40,
    },
    profileTitleArea: {
        flex: 1,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10,
    },
    roleBadgeText: {
        color: '#1976d2',
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 15,
    },
    statusDot: {
        color: '#4caf50',
        fontSize: 10,
        marginRight: 4,
    },
    statusText: {
        color: '#2e7d32',
        fontSize: 12,
        fontWeight: '600',
    },
    infoSection: {
        marginBottom: sizes.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: sizes.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.primaryPurple,
        paddingLeft: 8,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    infoItem: {
        width: '50%',
        marginBottom: sizes.md,
        paddingRight: sizes.sm,
    },
    infoLabel: {
        fontSize: 14,
        color: '#888',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: sizes.md,
        marginBottom: sizes.lg,
    },
});
