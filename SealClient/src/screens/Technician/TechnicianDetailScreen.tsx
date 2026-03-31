import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Dimensions, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Technician } from '@/types';
import { userService } from '@/services/userService';
import { technicianService } from '@/services/technicianService';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/dashboard';
import api from '@/services/api';

const { width } = Dimensions.get('window');

export const TechnicianDetailScreen: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { user } = useAuth();
    const params = (route.params || {}) as { id?: string | number; technician?: any };

    const initialTechData = params.technician && typeof params.technician === 'object' && params.technician.id ? params.technician as Technician : null;
    const [techData, setTechData] = useState<Technician | null>(initialTechData);
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [seals, setSeals] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            if (!user?.pea_code) return;
            setLoading(true);
            await fetchMasPea();
            
            let searchId = params.id || initialTechData?.id;
            
            const currentDataValid = techData && typeof techData === 'object' && (techData as any).id;
            if (!currentDataValid && params.id) {
                const matchedId = await fetchTechnicianById(params.id);
                if (matchedId) searchId = matchedId;
            }
            if (searchId) {
                await fetchSeals(searchId);
            }
            setLoading(false);
        };
        init();
    }, [params.id, user?.pea_code]);

    const fetchTechnicianById = async (id: string | number) => {
        try {
            const peaPrefix = user?.pea_code ? user.pea_code.substring(0, 4) : undefined;
            let allTechs = await technicianService.getTechnicians(peaPrefix, !!peaPrefix);
            let found = allTechs.find(t => t.id.toString() === id.toString() || (t.technician_code && t.technician_code.toString() === id.toString()));
            
            if (!found && peaPrefix) {
                allTechs = await technicianService.getTechnicians();
                found = allTechs.find(t => t.id.toString() === id.toString() || (t.technician_code && t.technician_code.toString() === id.toString()));
            }

            if (found) {
                setTechData(found);
                return found.id;
            }
        } catch (error) {
            console.error('Failed to fetch technician:', error);
        }
        return null;
    };

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const fetchSeals = async (id: string | number) => {
        try {
            const data = await technicianService.getTechnicianSeals(id);
            const holdingSeals = data.filter(s => s.status !== 'ใช้งานแล้ว' && s.status !== 'พร้อมใช้งาน');
            setSeals(holdingSeals);
        } catch (e: any) {
            console.error('Error fetching seals:', e);
        }
    };

    const getStatusStyle = (status?: string) => {
        switch (status) {
            case 'จ่าย': return { bg: '#E3F2FD', text: '#1976D2' };
            case 'ติดตั้งแล้ว': return { bg: '#E8F5E9', text: '#388E3C' };
            case 'รอยืนยัน': return { bg: '#FFF3E0', text: '#F57C00' };
            default: return { bg: '#F3F4F6', text: '#4B5563' };
        }
    };

    const getPeaName = (code?: string) => {
        if (!code) return '-';
        const pea = masPeaList.find(p => p.pea_code === code || p.PeaCode === code || p.code === code);
        return pea ? (pea.name_th || pea.NameTh) : '-';
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    };

    if (loading) {
        return (
            <View style={styles.mainContainer}>
                <Header />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#4A0E4E" />
                </View>
            </View>
        );
    }

    if (!techData) {
        return (
            <View style={styles.mainContainer}>
                <Header />
                <View style={styles.centered}>
                    <Text style={{ fontSize: 18, color: '#333', fontWeight: 'bold' }}>ไม่พบข้อมูลช่างเทคนิค</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                         <Text style={{ color: '#4A0E4E' }}>← กลับ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <Header />

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={[styles.headerTitle, { marginLeft: 0 }]}>Technician Portal</Text>
                </View>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatarLargeContainer}>
                            {techData?.profile_pic ? (
                                <Image
                                    source={{ uri: techData.profile_pic.startsWith('http') ? techData.profile_pic : `${api.defaults.baseURL}${techData.profile_pic}` }}
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text style={styles.avatarLargeText}>👨‍🔧</Text>
                            )}
                            <View style={styles.statusBadgeOnImg}>
                                <Text style={styles.statusBadgeDot}>●</Text>
                                <Text style={styles.statusBadgeText}>ปกติ</Text>
                            </View>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{techData?.first_name} {techData?.last_name}</Text>
                            <Text style={styles.profileRole}>Senior Field Technician</Text>
                            <View style={styles.badgeRow}>
                                <View style={styles.blueBadge}><Text style={styles.blueBadgeText}>Active Duty</Text></View>
                                <View style={styles.greyBadge}><Text style={styles.greyBadgeText}>Region 5</Text></View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 2 Columns */}
                <View style={styles.columnsContainer}>
                    {/* Personal Info */}
                    <View style={[styles.infoCard, { flex: width > 768 ? 1 : undefined, marginRight: width > 768 ? 20 : 0 }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.headerAccent} />
                            <Text style={styles.cardTitle}>ข้อมูลส่วนตัว</Text>
                        </View>
                        <View style={styles.infoGridRow}>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>EMPLOYEE ID</Text>
                                <Text style={styles.infoValue}>{techData?.technician_code || '-'}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>USERNAME</Text>
                                <Text style={styles.infoValue}>{techData?.username || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.infoItemFull}>
                            <Text style={styles.infoLabel}>EMAIL</Text>
                            <Text style={styles.infoValue}>{techData?.email || '-'}</Text>
                        </View>
                        <View style={styles.phoneBox}>
                            <View>
                                <Text style={styles.infoLabel}>เบอร์โทรศัพท์</Text>
                                <Text style={styles.phoneValue}>{techData?.phone_number || '-'}</Text>
                            </View>
                            <Text style={{ fontSize: 20, color: '#4A0E4E' }}>📞</Text>
                        </View>
                    </View>

                    {/* Org Info */}
                    <View style={[styles.infoCard, { flex: width > 768 ? 1 : undefined }]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.headerAccent} />
                            <Text style={styles.cardTitle}>ข้อมูลองค์กร</Text>
                        </View>
                        <View style={styles.orgBox}>
                            <Text style={styles.infoLabel}>PEA CODE (รหัสหน่วยงาน)</Text>
                            <Text style={styles.orgValue}>🏦 {techData?.pea_code || '-'}</Text>
                        </View>
                        <View style={styles.orgBox}>
                            <Text style={styles.infoLabel}>ชื่อหน่วยงาน</Text>
                            <Text style={styles.orgValue}>📍 {getPeaName(techData?.pea_code)}</Text>
                        </View>
                        <Text style={styles.orgNote}>ⓘ สังกัดเขต 5 (ภาคตะวันออกเฉียงเหนือ)</Text>
                    </View>
                </View>

                {/* Seals Held */}
                <View style={styles.sealsCard}>
                    <View style={styles.sealsHeader}>
                        <View style={styles.cardHeaderRow}>
                            <View style={styles.headerAccent} />
                            <Text style={styles.cardTitle}>ซีลที่ถืออยู่</Text>
                        </View>
                        <View style={styles.sealCountBox}>
                            <Text style={styles.sealCountIcon}>📦</Text>
                            <View>
                                <Text style={styles.sealCountLabel}>จำนวนซีลทั้งหมด</Text>
                                <Text style={styles.sealCountValue}>{seals.length} <Text style={styles.sealCountUnit}>รายการ</Text></Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.sealListLabel}>รายการซีลทั้งหมด</Text>
                    {seals.length === 0 ? (
                        <Text style={styles.noSealsText}>ไม่มีซีลที่ถืออยู่</Text>
                    ) : (
                        seals.map((seal, index) => (
                            <TouchableOpacity
                                key={seal.id || index}
                                style={styles.sealListItem}
                                activeOpacity={0.7}
                                onPress={() => {
                                    (navigation as any).navigate('Inventory', {
                                        screen: 'SealHistory',
                                        params: { sealNumber: seal.seal_number || seal.SealNumber }
                                    });
                                }}
                            >
                                <View style={styles.sealNumberGroup}>
                                    <Text style={styles.sealDot}>●</Text>
                                    <Text style={styles.sealNumberText}>#{seal.seal_number || seal.SealNumber}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(seal.status || seal.Status).bg, marginLeft: 8 }]}>
                                        <Text style={[styles.statusText, { color: getStatusStyle(seal.status || seal.Status).text }]}>{seal.status || seal.Status}</Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={styles.sealDateText}>เบิกเมื่อ: {formatDate(seal.issued_at || seal.created_at)}</Text>
                                    <Text style={{ marginLeft: 8, color: '#A0AEC0', fontSize: 16 }}>›</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#F7F8FA',
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBEB',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backIcon: {
        fontSize: 20,
        marginRight: 10,
        color: '#4A0E4E',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4A0E4E',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 22,
        marginLeft: 16,
    },
    smallAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 60,
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 30,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    profileRow: {
        flexDirection: width > 768 ? 'row' : 'column',
        alignItems: width > 768 ? 'center' : 'flex-start',
    },
    avatarLargeContainer: {
        width: 120,
        height: 120,
        borderRadius: 16,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 24,
        position: 'relative',
        marginBottom: width > 768 ? 0 : 20,
    },
    avatarLargeText: {
        fontSize: 60,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    statusBadgeOnImg: {
        position: 'absolute',
        bottom: -10,
        right: -10,
        backgroundColor: '#E8F5E9',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'white',
    },
    statusBadgeDot: {
        color: '#4CAF50',
        fontSize: 10,
        marginRight: 4,
    },
    statusBadgeText: {
        color: '#2E7D32',
        fontSize: 12,
        fontWeight: 'bold',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4A0E4E',
        marginBottom: 6,
    },
    profileRole: {
        fontSize: 16,
        color: '#718096',
        fontWeight: '500',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
    },
    blueBadge: {
        backgroundColor: '#EBF8FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 10,
    },
    blueBadgeText: {
        color: '#3182CE',
        fontSize: 12,
        fontWeight: 'bold',
    },
    greyBadge: {
        backgroundColor: '#F7FAFC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    greyBadgeText: {
        color: '#A0AEC0',
        fontSize: 12,
        fontWeight: 'bold',
    },
    editBtn: {
        backgroundColor: '#4A0E4E',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: width > 768 ? 0 : 20,
    },
    editBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    columnsContainer: {
        flexDirection: width > 768 ? 'row' : 'column',
        marginBottom: 20,
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: width > 768 ? 0 : 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerAccent: {
        width: 4,
        height: 20,
        backgroundColor: '#4A0E4E',
        borderRadius: 2,
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4A0E4E',
    },
    infoGridRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    infoItem: {
        flex: 1,
    },
    infoItemFull: {
        marginBottom: 20,
    },
    infoLabel: {
        fontSize: 12,
        color: '#A0AEC0',
        fontWeight: 'bold',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        color: '#1A202C',
        fontWeight: '500',
    },
    phoneBox: {
        backgroundColor: '#F7FAFC',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    phoneValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    orgBox: {
        backgroundColor: '#F7FAFC',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    orgValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2D3748',
        marginTop: 4,
    },
    orgNote: {
        fontSize: 12,
        color: '#A0AEC0',
        marginTop: 4,
    },
    sealsCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sealsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sealCountBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    sealCountIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    sealCountLabel: {
        fontSize: 11,
        color: '#718096',
        fontWeight: 'bold',
    },
    sealCountValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4A0E4E',
    },
    sealCountUnit: {
        fontSize: 14,
        color: '#718096',
        fontWeight: 'normal',
    },
    sealListLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2D3748',
        marginBottom: 16,
    },
    noSealsText: {
        fontSize: 14,
        color: '#A0AEC0',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },
    sealListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        padding: 16,
        borderRadius: 8,
        marginBottom: 10,
    },
    sealNumberGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sealDot: {
        color: '#4CAF50',
        fontSize: 10,
        marginRight: 10,
    },
    sealNumberText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    sealDateText: {
        fontSize: 13,
        color: '#718096',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});
