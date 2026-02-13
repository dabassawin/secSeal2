import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { Seal, Log } from '@/types';

const ActivityItem: React.FC<{ log: Log; isLast?: boolean }> = ({ log, isLast }) => {
    // Basic mapping of actions to icons/colors
    const getActionDetails = (action: string) => {
        if (action.includes('created') || action.includes('นำเข้า')) {
            return { icon: '📦', color: '#66bb6a', label: 'นำเข้าคลังสินค้า (Import)' };
        }
        if (action.includes('assigned') || action.includes('จ่าย')) {
            return { icon: '🚚', color: '#42a5f5', label: 'จ่ายให้พนักงาน (Assigned)' };
        }
        if (action.includes('used') || action.includes('ติดตั้ง')) {
            return { icon: '✅', color: '#ab47bc', label: 'ติดตั้งแล้ว (Installed)' };
        }
        return { icon: '📝', color: '#ffa726', label: 'การดำเนินงานอื่น ๆ' };
    };

    const details = getActionDetails(log.action);
    const date = new Date(log.timestamp || log.created_at || Date.now());

    return (
        <View style={styles.activityContainer}>
            <View style={styles.timelineColumn}>
                <View style={[styles.timelineIconContainer, { borderColor: details.color }]}>
                    <Text style={styles.timelineIconText}>{details.icon}</Text>
                </View>
                {!isLast && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>{details.label}</Text>
                    <Text style={styles.activityTime}>
                        {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })} - {date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </Text>
                </View>
                <Text style={styles.activityUser}>โดย: พนักงานระบบ (System)</Text>
                <View style={[styles.activityContent, { borderLeftColor: details.color }]}>
                    <Text style={styles.activityDescription}>💬 "{log.action}"</Text>
                </View>
            </View>
        </View>
    );
};

export const SealHistoryScreen: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { sealNumber } = route.params as { sealNumber: string };

    const [seal, setSeal] = useState<Seal | null>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [sealNumber]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [sealData, logData] = await Promise.all([
                sealService.getSealByNumber(sealNumber),
                sealService.getSealLogs(sealNumber)
            ]);
            setSeal(sealData);
            setLogs(logData);
        } catch (error) {
            console.error('Error fetching seal history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primaryPurple} />
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <Header />

            <ScrollView style={styles.scrollView}>
                <View style={styles.content}>
                    {/* Header Banner */}
                    <View style={styles.banner}>
                        <View style={styles.bannerLeft}>
                            <View style={styles.iconBox}>
                                <Text style={styles.iconBoxText}>🆔</Text>
                            </View>
                            <View style={styles.bannerInfo}>
                                <Text style={styles.bannerLabel}>SERIAL NUMBER</Text>
                                <Text style={styles.bannerValue}>{sealNumber}</Text>
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: '#4caf50' }]}>
                            <Text style={styles.statusBadgeText}>● สถานะปัจจุบัน: {seal?.status || 'พร้อมใช้งาน'}</Text>
                        </View>
                    </View>

                    {/* Metadata Grid */}
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>ประเภทซีล (Type)</Text>
                            <Text style={styles.gridValue}>Plastic Seal (Type A)</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>ล็อตการผลิต (Batch)</Text>
                            <Text style={styles.gridValue}>{seal?.box_number || 'B-01/2026'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>วันที่นำเข้า (Import Date)</Text>
                            <Text style={styles.gridValue}>
                                {new Date(seal?.created_at || Date.now()).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.gridLabel}>สถานที่ล่าสุด (Current Loc.)</Text>
                            <Text style={[styles.gridValue, { color: colors.primaryPurple }]}>🏠 คลังสินค้าหลัก</Text>
                        </View>
                    </View>

                    {/* Content Body */}
                    <View style={styles.body}>
                        {/* Timeline Section */}
                        <View style={styles.timelineSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>🕒 ประวัติการดำเนินการ (Activity Log)</Text>
                            </View>
                            {logs.length === 0 ? (
                                <Text style={styles.emptyText}>ยังไม่มีประวัติการดำเนินการสำหรับซีลนี้</Text>
                            ) : (
                                logs.map((log, index) => (
                                    <ActivityItem key={log.id} log={log} isLast={index === logs.length - 1} />
                                ))
                            )}
                        </View>

                        {/* Sidebar Info */}
                        <View style={styles.sidebar}>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoCardTitle}>รูปภาพซีล (ล่าสุด)</Text>
                                <View style={styles.imagePlaceholder}>
                                    <View style={styles.innerPlaceholder}>
                                        <Text style={styles.placeholderIcon}>🖼️</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.whiteBtn}>
                                    <Text style={styles.whiteBtnText}>ดูแลเลอรี่ทั้งหมด</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.infoCard}>
                                <Text style={styles.infoCardTitle}>QR Code / Barcode</Text>
                                <View style={styles.qrContainer}>
                                    <View style={styles.qrCodeBox}>
                                        <Text style={styles.qrTemplate}>🔳</Text>
                                    </View>
                                    <Text style={styles.qrText}>{sealNumber}</Text>
                                </View>
                                <TouchableOpacity style={styles.purpleBtn}>
                                    <Text style={styles.purpleBtnText}>🖨️ พิมพ์ Label</Text>
                                </TouchableOpacity>
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
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        margin: sizes.lg,
        backgroundColor: 'white',
        borderRadius: sizes.radMd,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    banner: {
        backgroundColor: colors.primaryPurple,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 30,
    },
    bannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 50,
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    iconBoxText: {
        fontSize: 24,
    },
    bannerInfo: {
        justifyContent: 'center',
    },
    bannerLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bannerValue: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
    },
    statusBadge: {
        backgroundColor: '#4caf50',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusBadgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    grid: {
        flexDirection: 'row',
        backgroundColor: '#fafafa',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    gridItem: {
        flex: 1,
    },
    gridLabel: {
        fontSize: 10,
        color: '#999',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    body: {
        flexDirection: 'row',
        padding: 25,
    },
    timelineSection: {
        flex: 2,
        paddingRight: 20,
    },
    sidebar: {
        flex: 1,
    },
    sectionHeader: {
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    activityContainer: {
        flexDirection: 'row',
    },
    timelineColumn: {
        alignItems: 'center',
        marginRight: 15,
    },
    timelineIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    timelineIconText: {
        fontSize: 16,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#eee',
        marginVertical: 4,
    },
    activityCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    activityTime: {
        fontSize: 12,
        color: '#999',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    activityUser: {
        fontSize: 13,
        color: '#666',
        marginBottom: 10,
    },
    activityContent: {
        backgroundColor: '#fafafa',
        padding: 10,
        borderRadius: 6,
        borderLeftWidth: 3,
    },
    activityDescription: {
        fontSize: 14,
        color: '#444',
        fontStyle: 'italic',
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        marginBottom: 20,
    },
    infoCardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        textAlign: 'center',
    },
    imagePlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
    },
    innerPlaceholder: {
        flex: 1,
        backgroundColor: colors.bgLight,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    placeholderIcon: {
        fontSize: 48,
        opacity: 0.2,
    },
    whiteBtn: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    whiteBtnText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 15,
        padding: 15,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
    },
    qrCodeBox: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    qrTemplate: {
        fontSize: 80,
    },
    qrText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    purpleBtn: {
        height: 40,
        backgroundColor: colors.primaryPurple,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    purpleBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 30,
        fontSize: 14,
    },
});
