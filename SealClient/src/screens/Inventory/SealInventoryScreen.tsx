import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Image } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { Seal } from '@/types';
import { useNavigation } from '@react-navigation/native';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let bgColor: string = colors.bgLight;
    let textColor: string = colors.textLight;

    switch (status) {
        case 'พร้อมใช้งาน':
            bgColor = '#E8F5E9';
            textColor = '#2E7D32';
            break;
        case 'จ่าย':
        case 'ติดตั้งแล้ว':
            bgColor = '#E3F2FD';
            textColor = '#1976D2';
            break;
        case 'ใช้งานแล้ว':
            bgColor = '#F3E5F5';
            textColor = '#7B1FA2';
            break;
        case 'เสียหาย':
        case 'สูญหาย':
            bgColor = '#FFEBEE';
            textColor = '#C62828';
            break;
        default:
            bgColor = colors.bgLight;
            textColor = colors.textLight;
    }

    return (
        <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
            <Text style={[styles.statusText, { color: textColor }]}>{status}</Text>
        </View>
    );
};

export const SealInventoryScreen: React.FC = () => {
    const navigation = useNavigation();
    const [seals, setSeals] = useState<Seal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('สถานะทั้งหมด');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const statuses = [
        'สถานะทั้งหมด',
        'พร้อมใช้งาน',
        'จ่าย',
        'ติดตั้งแล้ว',
        'ใช้งานแล้ว'
    ];

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'พร้อมใช้งาน': return 'พร้อมใช้งาน (Ready)';
            case 'จ่าย': return 'จ่าย (Issued / Assigned)';
            case 'ติดตั้งแล้ว': return 'ติดตั้งแล้ว (Installed)';
            case 'ใช้งานแล้ว': return 'ใช้งานแล้ว (Used / Returned)';
            default: return status;
        }
    };

    useEffect(() => {
        fetchSeals();
    }, []);

    const fetchSeals = async () => {
        try {
            setLoading(true);
            const data = await sealService.getSeals();
            setSeals(data);
        } catch (error) {
            console.error('Error fetching seals:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSeals = useMemo(() => {
        return seals.filter(seal => {
            const matchesSearch = seal.seal_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (seal.installed_serial && seal.installed_serial.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = statusFilter === 'สถานะทั้งหมด' || seal.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [seals, searchQuery, statusFilter]);

    return (
        <View style={styles.mainContainer}>
            <Header />

            <View style={styles.content}>
                {/* Fixed Title Label (matching mockup) */}
                <View style={[styles.titleLabelContainer, { position: 'absolute', top: -15, left: 20, zIndex: 10 }]}>
                    <Text style={styles.titleLabelText}>📑 รายการซีลทั้งหมด</Text>
                </View>

                {/* Toolbar */}
                <View style={styles.toolbar}>
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหา Serial No., Barcode..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.filterContainer}>
                        <TouchableOpacity
                            style={styles.dropdownTrigger}
                            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Text style={styles.dropdownValue}>{getStatusLabel(statusFilter)}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        {isDropdownOpen && (
                            <View style={styles.dropdownMenu}>
                                {statuses.map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[
                                            styles.dropdownItem,
                                            statusFilter === s && styles.dropdownItemActive
                                        ]}
                                        onPress={() => {
                                            setStatusFilter(s);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            statusFilter === s && styles.dropdownItemTextActive
                                        ]}>
                                            {getStatusLabel(s)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => (navigation as any).navigate('Seals', { screen: 'CreateSeal' })}
                    >
                        <Text style={styles.addButtonText}>+ นำเข้าซีลใหม่</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tableHeader}>
                    <Text style={[styles.headerText, { flex: 2.5 }]}>SERIAL NUMBER</Text>
                    <Text style={[styles.headerText, { flex: 1.5 }]}>สถานะ</Text>
                    <Text style={[styles.headerText, { flex: 1.5 }]}>อัปเดตเมื่อ</Text>
                </View>

                {/* Table Body */}
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={colors.primaryPurple} />
                        </View>
                    ) : filteredSeals.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Text style={styles.emptyText}>ไม่พบข้อมูลซีล</Text>
                        </View>
                    ) : (
                        filteredSeals.map((seal) => (
                            <TouchableOpacity
                                key={seal.id}
                                style={styles.tableRow}
                                onPress={() => (navigation as any).navigate('SealHistory', { sealNumber: seal.seal_number })}
                            >
                                {/* Serial Number */}
                                <View style={[styles.cell, { flex: 2.5 }]}>
                                    <Text style={styles.serialText}>{seal.seal_number}</Text>
                                    <Text style={styles.batchText}>Batch: {seal.box_number || '-'}</Text>
                                </View>

                                {/* Status */}
                                <View style={[styles.cell, { flex: 1.5 }]}>
                                    <StatusBadge status={seal.status} />
                                </View>

                                {/* Updated Date */}
                                <View style={[styles.cell, { flex: 1.5 }]}>
                                    <Text style={styles.dateText}>
                                        {new Date(seal.updated_at || seal.created_at || Date.now()).toLocaleDateString('th-TH', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </Text>
                                    <Text style={styles.timeText}>
                                        {new Date(seal.updated_at || seal.created_at || Date.now()).toLocaleTimeString('th-TH', {
                                            hour: '2-digit', minute: '2-digit'
                                        })} น.
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>

                {/* Footer / Pagination Placeholder */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        แสดง {filteredSeals.length} รายการ
                    </Text>
                    <View style={styles.pagination}>
                        <TouchableOpacity style={styles.pageBtn}><Text>‹</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.pageBtn, styles.pageBtnActive]}><Text style={{ color: 'white' }}>1</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.pageBtn}><Text>›</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: colors.bgLight,
    },
    content: {
        flex: 1,
        margin: sizes.lg,
        backgroundColor: colors.white,
        borderRadius: sizes.radMd,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    titleLabelContainer: {
        backgroundColor: colors.primaryPurple,
        paddingHorizontal: sizes.md,
        paddingVertical: sizes.xs,
        borderRadius: sizes.radSm,
    },
    titleLabelText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: sizes.fontMd,
    },
    toolbar: {
        flexDirection: 'row',
        padding: sizes.md,
        paddingTop: sizes.xl,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        zIndex: 50, // Ensure toolbar is above table header
    },
    searchContainer: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: sizes.radSm,
        paddingHorizontal: sizes.sm,
        marginRight: sizes.md,
    },
    searchIcon: {
        marginRight: sizes.xs,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: sizes.fontSm,
    },
    filterContainer: {
        flex: 1.2,
        marginRight: sizes.md,
        position: 'relative',
        zIndex: 60, // Higher than toolbar siblings
    },
    dropdownTrigger: {
        height: 40,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: sizes.radSm,
        paddingHorizontal: sizes.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownValue: {
        fontSize: sizes.fontSm,
        color: '#444',
    },
    dropdownArrow: {
        fontSize: 10,
        color: '#999',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 45,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: sizes.radSm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 1000,
    },
    dropdownItem: {
        paddingVertical: sizes.sm,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    dropdownItemActive: {
        backgroundColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: sizes.fontSm,
        color: '#666',
    },
    dropdownItemTextActive: {
        color: colors.primaryPurple,
        fontWeight: 'bold',
    },
    addButton: {
        backgroundColor: colors.primaryPurple,
        paddingHorizontal: sizes.md,
        height: 40,
        justifyContent: 'center',
        borderRadius: sizes.radSm,
    },
    addButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: sizes.fontSm,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        paddingVertical: sizes.sm,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 2,
        borderBottomColor: '#eee',
    },
    headerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
    },
    scrollContent: {
        flexGrow: 1,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: sizes.md,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    cell: {
        justifyContent: 'center',
    },
    imagePlaceholder: {
        width: 36,
        height: 36,
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    serialText: {
        fontSize: sizes.fontSm,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    batchText: {
        fontSize: 10,
        color: '#999',
    },
    cellText: {
        fontSize: sizes.fontSm,
        color: '#444',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    dateText: {
        fontSize: 12,
        color: '#444',
    },
    timeText: {
        fontSize: 10,
        color: '#999',
    },
    actionIcon: {
        paddingHorizontal: 6,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: sizes.md,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    footerText: {
        fontSize: sizes.fontXs,
        color: '#666',
    },
    pagination: {
        flexDirection: 'row',
    },
    pageBtn: {
        width: 32,
        height: 32,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    pageBtnActive: {
        backgroundColor: colors.primaryPurple,
        borderColor: colors.primaryPurple,
    },
    centerContainer: {
        padding: sizes.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textLight,
    },
});
