import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header, StatusCard, ActionCard, LogList } from '@/components/dashboard';
import { logService } from '@/services/logService';
import { sealService } from '@/services/sealService';
import { SealReport } from '@/types';

export const HomeScreen: React.FC = () => {
    const [logs, setLogs] = React.useState<any[]>([]);
    const [stats, setStats] = React.useState<SealReport | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [logResponse, reportResponse] = await Promise.all([
                logService.getAllLogs(),
                sealService.getReport()
            ]);

            if (logResponse && logResponse.success) {
                // Combine all log types into a single array for the "Recent Logs" list
                const allLogs = [
                    ...logResponse.logs.created,
                    ...logResponse.logs.issued,
                    ...logResponse.logs.used,
                    ...logResponse.logs.returned,
                    ...logResponse.logs.other
                ].sort((a, b) => {
                    const dateA = new Date(a.timestamp || a.created_at || 0).getTime();
                    const dateB = new Date(b.timestamp || b.created_at || 0).getTime();
                    return dateB - dateA; // Sort descending
                });
                setLogs(allLogs);
            }

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
                    <Text style={styles.title}>ระบบจัดการซีลความปลอดภัย</Text>
                    <Text style={styles.subtitle}>ภาพรวมการดำเนินงานประจำวัน</Text>
                </View>

                {/* Status Cards Grid */}
                <View style={styles.gridContainer}>
                    <StatusCard
                        title="ซีลทั้งหมดในระบบ"
                        count={stats ? stats.total_seals.toLocaleString() : "-"}
                        color={colors.primaryPurple}
                    />
                    <StatusCard
                        title="พร้อมใช้งาน (ในคลัง)"
                        count={stats ? stats["พร้อมใช้งาน"].toLocaleString() : "-"}
                        color={colors.accentYellow}
                    />
                    <StatusCard
                        title="อยู่ระหว่างปฏิบัติงาน"
                        count={stats ? stats["จ่าย"].toLocaleString() : "-"}
                        color={colors.accentBlue}
                    />
                    <StatusCard
                        title="ติดตั้งเสร็จสิ้น (วันนี้)"
                        count={stats ? stats["ติดตั้งแล้ว"].toLocaleString() : "-"}
                        color={colors.accentGreen}
                    />
                </View>

                {/* Action Cards Grid */}
                <View style={styles.actionGridContainer}>
                    <ActionCard
                        title="สร้างซีลใหม่ (Batch)"
                        subtitle="สร้างรหัสซีลชุดใหม่เข้าสู่ระบบคลัง"
                        icon="➕"
                    />
                    <ActionCard
                        title="จัดการช่าง & จ่ายงาน"
                        subtitle="ลงทะเบียนช่างเทคนิค และมอบหมายซีล"
                        icon="👥"
                    />
                    <ActionCard
                        title="Logs & รายงาน"
                        subtitle="ตรวจสอบประวัติการใช้งานซีลทั้งหมด"
                        icon="📋"
                    />
                </View>

                {/* Recent Logs Section */}
                <LogList logs={logs} loading={loading} />

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
        marginHorizontal: -sizes.xs, // Negative margin to offset card margins
        marginBottom: sizes.lg,
    },
    actionGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -sizes.xs,
    },
});
