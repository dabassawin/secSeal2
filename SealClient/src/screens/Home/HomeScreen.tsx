import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header, StatusCard, ActionCard } from '@/components/dashboard';
import { useAuth } from '@/context/AuthContext';

import { sealService } from '@/services/sealService';
import { SealReport } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { SealStatus } from '../../constants/status';

export const HomeScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [stats, setStats] = React.useState<SealReport | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchData();
    }, [user?.pea_code]);

    const fetchData = async () => {
        try {
            const reportResponse = await sealService.getReport(user?.pea_code);

            if (reportResponse) {
                setStats(reportResponse);
            }

        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

                <View style={styles.sectionHeader}>
                    <Text style={styles.title}>ระบบจัดการซีล</Text>
                    <Text style={styles.subtitle}>ภาพรวมการดำเนินงานประจำวัน</Text>
                </View>

                {/* Status Cards Grid */}
                <View style={styles.gridContainer}>
                    <StatusCard
                        title="ซีลทั้งหมดในคลัง"
                        count={stats ? stats.total_seals.toLocaleString() : "-"}
                        color={colors.primaryPurple}
                        onPress={() => (navigation as any).navigate('Inventory')}
                    />
                    <StatusCard
                        title="พร้อมใช้งาน (ในคลัง)"
                        count={stats ? stats[SealStatus.READY].toLocaleString() : "-"}
                        color={colors.accentYellow}
                    />
                    <StatusCard
                        title="อยู่ระหว่างปฏิบัติงาน"
                        count={stats ? stats[SealStatus.ISSUED].toLocaleString() : "-"}
                        color={colors.accentBlue}
                    />
                    <StatusCard
                        title="ติดตั้งเสร็จสิ้น (วันนี้)"
                        count={stats ? stats[SealStatus.INSTALLED].toLocaleString() : "-"}
                        color={colors.accentGreen}
                    />
                </View>

                {/* Action Cards Grid - Row 1 */}
                <View style={styles.actionGridContainer}>
                    <ActionCard
                        title="สร้างซีลใหม่ (Batch)"
                        subtitle="สร้างรหัสซีลชุดใหม่เข้าสู่ระบบคลัง"
                        icon="➕"
                        iconColor="#7c4dff"
                        iconBgColor="#ede7f6"
                        onPress={() => (navigation as any).navigate('Seals', { screen: 'CreateSeal' })}
                    />
                    <ActionCard
                        title="รายชื่อช่าง"
                        subtitle="ลงทะเบียนช่าง"
                        icon="👥"
                        iconColor="#5d4037"
                        iconBgColor="#efebe9"
                        onPress={() => (navigation as any).navigate('Technicians')}
                    />

                    <ActionCard
                        title="รายงานสรุปซีล"
                        subtitle="ดูรายงาน ตัวกรอง และส่งออกข้อมูล"
                        icon="📊"
                        iconColor="#1565c0"
                        iconBgColor="#e3f2fd"
                        onPress={() => (navigation as any).navigate('Report')}
                    />
                    {/* Action Cards Grid - Row 2 (Left Aligned) */}
                    <ActionCard
                        title="มอบหมายซีล (Assign)"
                        subtitle="จ่ายซีลให้ช่างเทคนิค"
                        icon="📦"
                        iconColor="#8d6e63"
                        iconBgColor="#d7ccc8"
                        onPress={() => (navigation as any).navigate('AssignSeal')}
                    />
                    <ActionCard
                        title="รับคืนซีล"
                        subtitle="ตรวจสอบและรับซีลคืนจากช่าง"
                        icon="📥"
                        iconColor="#c62828"
                        iconBgColor="#ffebee"
                        onPress={() => (navigation as any).navigate('ReturnVerification')}
                    />
                    {user?.role === 'admin' && (
                        <ActionCard
                            title="User Management"
                            subtitle="จัดการผู้ใช้งาน"
                            icon="👤"
                            iconColor="#2e7d32"
                            iconBgColor="#e8f5e9"
                            onPress={() => (navigation as any).navigate('CreateUser')}
                        />
                    )}

                    {/* Ghost items for left alignment when centered */}
                    <View style={{ width: '30%', minWidth: 250, marginHorizontal: sizes.xs }} />
                    <View style={{ width: '30%', minWidth: 250, marginHorizontal: sizes.xs }} />
                </View>



            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: colors.bgLight,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: sizes.lg,
    },
    sectionHeader: {
        marginBottom: sizes.lg,
    },
    title: {
        fontSize: sizes.fontXl,
        fontWeight: 'bold',
        color: colors.primaryPurple,
        marginBottom: sizes.xs,
    },
    subtitle: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -sizes.xs,
        marginBottom: sizes.lg,
    },
    actionGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -sizes.xs,
        justifyContent: 'center', // Centered grid
    },
});
