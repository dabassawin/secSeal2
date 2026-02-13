import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { logService } from '@/services/logService';
import { Log } from '@/types';

// Helper to group logs by date
const groupLogsByDate = (logs: Log[]) => {
    const groups: { [key: string]: Log[] } = {};

    logs.forEach(log => {
        const date = new Date(log.timestamp || log.created_at || Date.now());
        const dateStr = date.toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Add "วันนี้" or "เมื่อวาน" for better UX
        const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        let displayDate = dateStr;
        if (dateStr === today) displayDate = `วันนี้ - ${dateStr}`;
        else if (dateStr === yesterday) displayDate = `เมื่อวาน - ${dateStr}`;

        if (!groups[displayDate]) {
            groups[displayDate] = [];
        }
        groups[displayDate].push(log);
    });

    return Object.keys(groups).map(date => ({
        date,
        data: groups[date]
    }));
};

const LogRow: React.FC<{ log: Log, isLast: boolean }> = ({ log, isLast }) => {
    const date = new Date(log.timestamp || log.created_at || Date.now());
    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const getIcon = (action: string) => {
        if (action.includes('สร้าง') || action.includes('Created')) return '📦';
        if (action.includes('จ่าย') || action.includes('Assigned')) return '👥';
        if (action.includes('ติดตั้ง') || action.includes('Used')) return '🛠️';
        if (action.includes('คืน') || action.includes('Returned')) return '↩️';
        return '📄';
    };

    return (
        <View style={styles.logRowContainer}>
            {/* Timeline Column */}
            <View style={styles.timelineColumn}>
                <View style={styles.timeLabelContainer}>
                    <Text style={styles.timeText}>{timeString}</Text>
                </View>
                <View style={styles.timelineNodeContainer}>
                    <View style={styles.nodeDot} />
                    {!isLast && <View style={styles.nodeLine} />}
                </View>
            </View>

            {/* Content Column */}
            <View style={styles.contentColumn}>
                <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>{getIcon(log.action)}</Text>
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.actionText}>{log.action}</Text>
                    <Text style={styles.metadataText}>
                        Seal ID: {log.id.toString().padStart(4, '0')} • User ID: {log.user_id}
                    </Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <Text style={styles.moreIcon}>⋮</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export const AuditLogScreen: React.FC = () => {
    const [allLogs, setAllLogs] = useState<Log[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await logService.getAllLogs();
            if (response && response.success) {
                const combined = [
                    ...response.logs.created,
                    ...response.logs.issued,
                    ...response.logs.used,
                    ...response.logs.returned,
                    ...response.logs.other
                ].sort((a, b) => {
                    const dateA = new Date(a.timestamp || a.created_at || 0).getTime();
                    const dateB = new Date(b.timestamp || b.created_at || 0).getTime();
                    return dateB - dateA;
                });
                setAllLogs(combined);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        if (!searchQuery) return allLogs;
        const query = searchQuery.toLowerCase();
        return allLogs.filter(log =>
            log.action.toLowerCase().includes(query) ||
            log.id.toString().includes(query)
        );
    }, [allLogs, searchQuery]);

    const groupedLogs = useMemo(() => groupLogsByDate(filteredLogs), [filteredLogs]);

    return (
        <View style={styles.mainContainer}>
            <Header />

            {/* Search Bar - Chrome Inspired */}
            <View style={styles.searchBarWrapper}>
                <View style={styles.searchBarContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาตามชื่อกิจกรรม หรือ รหัสซีล..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={colors.textLight}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primaryPurple} />
                        <Text style={styles.loadingText}>กำลังดึงข้อมูลกิจกรรม...</Text>
                    </View>
                ) : groupedLogs.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>ไม่พบข้อมูลที่ค้นหา</Text>
                    </View>
                ) : (
                    groupedLogs.map((group, gIndex) => (
                        <View key={group.date} style={styles.dateGroup}>
                            <Text style={styles.dateHeader}>{group.date}</Text>
                            <View style={styles.groupCard}>
                                {group.data.map((log, lIndex) => (
                                    <LogRow
                                        key={log.id}
                                        log={log}
                                        isLast={lIndex === group.data.length - 1}
                                    />
                                ))}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: colors.bgLight,
    },
    searchBarWrapper: {
        paddingHorizontal: sizes.lg,
        paddingVertical: sizes.md,
        backgroundColor: colors.bgLight,
        alignItems: 'center',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef1f7',
        width: '100%',
        maxWidth: 800,
        borderRadius: sizes.radiusRound,
        paddingHorizontal: sizes.md,
        height: 48,
        borderWidth: 1,
        borderColor: '#dee2e6',
    },
    searchIcon: {
        fontSize: 16,
        marginRight: sizes.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: sizes.fontMd,
        color: colors.text,
        height: '100%',
    },
    clearIcon: {
        fontSize: 18,
        color: colors.textLight,
        padding: 4,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: sizes.lg,
        paddingBottom: sizes.xl,
        alignItems: 'center',
    },
    dateGroup: {
        width: '100%',
        maxWidth: 850,
        marginTop: sizes.lg,
    },
    dateHeader: {
        fontSize: sizes.fontMd,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: sizes.sm,
        marginLeft: sizes.xs,
    },
    groupCard: {
        backgroundColor: colors.white,
        borderRadius: sizes.radiusMd,
        paddingVertical: sizes.sm,
        // Card Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    logRowContainer: {
        flexDirection: 'row',
        paddingHorizontal: sizes.md,
        minHeight: 60,
    },
    timelineColumn: {
        width: 80,
        flexDirection: 'row',
    },
    timeLabelContainer: {
        width: 60,
        justifyContent: 'center',
    },
    timeText: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
    },
    timelineNodeContainer: {
        width: 20,
        alignItems: 'center',
    },
    nodeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#cbd5e0',
        marginTop: 26, // Center with text height approx
    },
    nodeLine: {
        width: 1.5,
        flex: 1,
        backgroundColor: '#edf2f7',
    },
    contentColumn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: sizes.sm,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 4,
        backgroundColor: colors.bgLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: sizes.md,
    },
    iconText: {
        fontSize: 16,
    },
    textContainer: {
        flex: 1,
    },
    actionText: {
        fontSize: sizes.fontMd,
        fontWeight: '500',
        color: colors.primaryPurple,
    },
    metadataText: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
        marginTop: 2,
    },
    moreButton: {
        padding: 8,
    },
    moreIcon: {
        fontSize: 20,
        color: colors.textLight,
        fontWeight: 'bold'
    },
    centerContainer: {
        marginTop: sizes.xxl,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: sizes.md,
        color: colors.textLight,
    },
    emptyText: {
        fontSize: sizes.fontLg,
        color: colors.textLight,
    }
});
