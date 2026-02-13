
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Log } from '@/types';
import { colors, sizes } from '@/constants';

interface LogListProps {
    logs: Log[];
    loading?: boolean;
}

const LogItem: React.FC<{ log: Log }> = ({ log }) => {
    // Determine status color based on action keywords
    const getStatusColor = (action: string) => {
        if (action.includes('สร้าง') || action.includes('Created')) return colors.accentBlue;
        if (action.includes('จ่าย') || action.includes('Assigned')) return colors.accentYellow;
        if (action.includes('ติดตั้ง') || action.includes('Used')) return colors.accentGreen;
        if (action.includes('คืน') || action.includes('Returned')) return colors.primaryPurple;
        return colors.textLight;
    };

    const statusColor = getStatusColor(log.action);
    const date = new Date(log.timestamp || log.created_at || Date.now());
    const timeString = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    return (
        <View style={styles.logItem}>
            <View style={styles.logContent}>
                <Text style={styles.logId}>SEAL-{log.id.toString().padStart(4, '0')}</Text>
                <Text style={styles.logAction} numberOfLines={1}>{log.action}</Text>
            </View>
            <View style={styles.logMeta}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {log.action.split(' ')[0]}
                    </Text>
                </View>
                <Text style={styles.logTime}>{timeString} น.</Text>
            </View>
        </View>
    );
};

export const LogList: React.FC<LogListProps> = ({ logs, loading }) => {
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <Text>Loading logs...</Text>
            </View>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>ไม่พบประวัติการใช้งาน</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>บันทึกกิจกรรมล่าสุด (Recent Logs)</Text>
                <Text style={styles.viewAll}>ดูทั้งหมด →</Text>
            </View>

            {/* Header Row */}
            <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { flex: 2 }]}>รหัสซีล (ID)</Text>
                <Text style={[styles.headerText, { flex: 3 }]}>กิจกรรม</Text>
                <Text style={[styles.headerText, { flex: 2, textAlign: 'right' }]}>เวลา</Text>
            </View>

            {/* Log Items */}
            {logs.slice(0, 5).map((log) => ( // Show only first 5
                <LogItem key={log.id} log={log} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: sizes.xl,
        backgroundColor: colors.white,
        borderRadius: sizes.radMd,
        padding: sizes.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: sizes.md,
    },
    title: {
        fontSize: sizes.fontLg,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    viewAll: {
        fontSize: sizes.fontSm,
        color: colors.primaryPurple,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: sizes.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.bgLight,
        marginBottom: sizes.sm,
    },
    headerText: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
        fontWeight: 'bold',
    },
    centerContainer: {
        padding: sizes.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textLight,
    },
    logItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: sizes.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.bgLight,
    },
    logContent: {
        flex: 2,
    },
    logId: {
        fontSize: sizes.fontSm,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    logAction: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
        marginTop: 2,
    },
    logMeta: {
        flex: 3,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: sizes.sm,
        paddingVertical: 2,
        borderRadius: sizes.radSm,
        marginRight: sizes.md,
    },
    statusText: {
        fontSize: sizes.fontXs,
        fontWeight: 'bold',
    },
    logTime: {
        fontSize: sizes.fontSm,
        color: colors.textDark,
        width: 60,
        textAlign: 'right',
    },
});
