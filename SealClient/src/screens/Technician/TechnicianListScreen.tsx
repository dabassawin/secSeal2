import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { technicianService } from '@/services/technicianService';
import { Technician } from '@/types';

export const TechnicianListScreen: React.FC = () => {
    const navigation = useNavigation();

    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState('ทุกบริษัท / สังกัด');
    const [deptFilter, setDeptFilter] = useState('ทุกแผนก');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await technicianService.getTechnicians();
            setTechnicians(data);
        } catch (error) {
            console.error('Error fetching technicians:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTechs = useMemo(() => {
        return technicians.filter(tech => {
            const matchesSearch =
                (tech.first_name + ' ' + tech.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
                tech.technician_code.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCompany = companyFilter === 'ทุกบริษัท / สังกัด' || tech.company_name === companyFilter;
            const matchesDept = deptFilter === 'ทุกแผนก' || tech.department === deptFilter;

            return matchesSearch && matchesCompany && matchesDept;
        });
    }, [technicians, searchQuery, companyFilter, deptFilter]);

    // Unique companies and departments for filters
    const companies = useMemo(() => ['ทุกบริษัท / สังกัด', ...new Set(technicians.map(t => t.company_name).filter(Boolean))], [technicians]);
    const departments = useMemo(() => ['ทุกแผนก', ...new Set(technicians.map(t => t.department).filter(Boolean))], [technicians]);

    return (
        <View style={styles.mainContainer}>
            <Header />

            <View style={styles.content}>
                {/* TOOLBAR */}
                <View style={styles.toolbar}>
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหาชื่อ, รหัสช่าง..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.filterContainer}>
                        <View style={styles.filterItem}>
                            <Text style={styles.filterValue}>{companyFilter}</Text>
                            <Text style={styles.arrow}>▼</Text>
                        </View>
                        <View style={[styles.filterItem, { marginLeft: sizes.sm }]}>
                            <Text style={styles.filterValue}>{deptFilter}</Text>
                            <Text style={styles.arrow}>▼</Text>
                        </View>
                    </View>

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={styles.importBtn}
                            onPress={() => (navigation as any).navigate('ImportTechnician')}
                        >
                            <Text style={styles.importBtnText}>📥 นำเข้าข้อมูล (CSV/Excel)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => (navigation as any).navigate('AddTechnician')}
                        >
                            <Text style={styles.addBtnText}>👤+ เพิ่มช่างใหม่</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TABLE */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, { flex: 0.5 }]}>#</Text>
                        <Text style={[styles.headerText, { flex: 2.5 }]}>ชื่อ - นามสกุล</Text>
                        <Text style={[styles.headerText, { flex: 1.5 }]}>รหัสช่าง / ID</Text>
                        <Text style={[styles.headerText, { flex: 2 }]}>บริษัท / สังกัด</Text>
                        <Text style={[styles.headerText, { flex: 2 }]}>แผนก / ทีม</Text>
                        <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>สถานะ</Text>
                        <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>จัดการ</Text>
                    </View>

                    <ScrollView style={styles.scrollBody}>
                        {loading ? (
                            <ActivityIndicator style={{ marginTop: 50 }} color={colors.primaryPurple} />
                        ) : filteredTechs.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>ไม่พบข้อมูลช่างเทคนิค</Text>
                            </View>
                        ) : (
                            filteredTechs.map((tech, index) => (
                                <View key={tech.id} style={styles.tableRow}>
                                    <Text style={[styles.cellText, { flex: 0.5 }]}>{index + 1}</Text>

                                    <View style={[styles.cell, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>👤</Text>
                                        </View>
                                        <View style={{ marginLeft: 10 }}>
                                            <Text style={styles.techName}>{tech.first_name} {tech.last_name}</Text>
                                            <Text style={styles.techEmail}>{tech.username || tech.email}</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.cell, { flex: 1.5 }]}>
                                        <View style={styles.codeBadge}>
                                            <Text style={styles.codeText}>{tech.technician_code}</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.cell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                                        <Text style={{ marginRight: 5 }}>🏢</Text>
                                        <Text style={styles.cellText}>{tech.company_name || '-'}</Text>
                                    </View>

                                    <View style={[styles.cell, { flex: 2 }]}>
                                        <Text style={styles.cellText}>{tech.department || '-'}</Text>
                                    </View>

                                    <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                                        <View style={styles.statusBadge}>
                                            <Text style={styles.statusDot}>●</Text>
                                            <Text style={styles.statusText}>ปกติ</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.cell, { flex: 1.2, flexDirection: 'row', justifyContent: 'center' }]}>
                                        <TouchableOpacity style={styles.actionIcon}>
                                            <Text style={{ fontSize: 16 }}>👁️</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionIcon, { marginLeft: 10 }]}>
                                            <Text style={{ fontSize: 16 }}>📝</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {/* FOOTER */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>แสดง {filteredTechs.length} จาก {technicians.length} คน</Text>
                        <View style={styles.pagination}>
                            <TouchableOpacity style={styles.pageBtn}><Text>‹</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.pageBtn, styles.activePageBtn]}>
                                <Text style={{ color: 'white' }}>1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pageBtn}><Text>›</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    content: {
        flex: 1,
        padding: sizes.lg,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: sizes.lg,
        zIndex: 10,
    },
    searchContainer: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: sizes.radSm,
        paddingHorizontal: sizes.md,
        height: 44,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    filterContainer: {
        flex: 2,
        flexDirection: 'row',
        marginLeft: sizes.md,
    },
    filterItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderRadius: sizes.radSm,
        paddingHorizontal: sizes.md,
        height: 44,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    filterValue: {
        fontSize: 14,
        color: '#666',
    },
    arrow: {
        fontSize: 10,
        color: '#999',
    },
    buttonGroup: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginLeft: sizes.md,
    },
    importBtn: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: colors.primaryPurple,
        height: 44,
        paddingHorizontal: sizes.md,
        borderRadius: sizes.radSm,
        justifyContent: 'center',
        marginRight: sizes.sm,
    },
    importBtnText: {
        color: colors.primaryPurple,
        fontWeight: 'bold',
        fontSize: 13,
    },
    addBtn: {
        backgroundColor: colors.primaryPurple,
        height: 44,
        paddingHorizontal: sizes.md,
        borderRadius: sizes.radSm,
        justifyContent: 'center',
    },
    addBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    tableContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: sizes.radMd,
        overflow: 'hidden',
        borderTopWidth: 4,
        borderTopColor: colors.primaryPurple,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#fcfcfc',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollBody: {
        flex: 1,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    cell: {
        justifyContent: 'center',
    },
    cellText: {
        fontSize: 14,
        color: '#666',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
    },
    techName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    techEmail: {
        fontSize: 12,
        color: '#999',
    },
    codeBadge: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#ececec',
    },
    codeText: {
        fontSize: 12,
        color: '#666',
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
    actionIcon: {
        padding: 5,
    },
    emptyContainer: {
        padding: 50,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    footerText: {
        fontSize: 13,
        color: '#999',
    },
    pagination: {
        flexDirection: 'row',
    },
    pageBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        marginLeft: 8,
    },
    activePageBtn: {
        backgroundColor: colors.primaryPurple,
        borderColor: colors.primaryPurple,
    },
});
