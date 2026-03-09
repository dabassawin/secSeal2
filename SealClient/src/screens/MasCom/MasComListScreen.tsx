import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { masComService } from '@/services/masComService';
import { userService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

export const MasComListScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useAuth();

    const [centers, setCenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');

    const [masPeaList, setMasPeaList] = useState<any[]>([]);

    useFocusEffect(
        React.useCallback(() => {
            if (user?.pea_code) {
                fetchData();
                fetchMasPea();
            }
        }, [user?.pea_code])
    );

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const getPeaName = (code?: string) => {
        if (!code) return '';
        const pea = masPeaList.find(p => p.pea_code === code || p.PeaCode === code || p.code === code);
        return pea ? (pea.name_th || pea.NameTh) : '';
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await masComService.getMasComs();

            // Filter by user's PEA code prefix (4 digits)
            const peaPrefix = user?.pea_code ? user.pea_code.substring(0, 4) : '';
            const filteredData = data.filter((c: any) => c.pea_code && c.pea_code.startsWith(peaPrefix));

            setCenters(filteredData);
        } catch (error) {
            console.error('Error fetching MasComs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCenters = useMemo(() => {
        return centers.filter(center => {
            const nameTh = center.name_th || center.NameTh || '';
            const nameEng = center.name_eng || center.NameEng || '';
            const code = center.com_code || center.ComCode || '';
            const pCode = center.pea_code || center.PeaCode || '';

            const matchesSearch =
                nameTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
                nameEng.toLowerCase().includes(searchQuery.toLowerCase()) ||
                code.toLowerCase().includes(searchQuery.toLowerCase());

            const peaName = getPeaName(pCode);
            const matchesPeaCode = companyFilter === '' || pCode.toLowerCase().includes(companyFilter.toLowerCase());
            const matchesPeaName = deptFilter === '' || (peaName && peaName.toLowerCase().includes(deptFilter.toLowerCase()));

            return matchesSearch && matchesPeaCode && matchesPeaName;
        });
    }, [centers, searchQuery, companyFilter, deptFilter, masPeaList]);

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
                            placeholder="ค้นหาชื่อ, รหัสศูนย์งาน..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.filterContainer}>
                        <View style={styles.filterItem}>
                            <TextInput
                                style={styles.filterInput}
                                placeholder="ระบุรหัสการไฟฟ้า"
                                value={companyFilter}
                                onChangeText={setCompanyFilter}
                            />
                        </View>
                        <View style={[styles.filterItem, { marginLeft: sizes.sm }]}>
                            <TextInput
                                style={styles.filterInput}
                                placeholder="ระบุชื่อการไฟฟ้า"
                                value={deptFilter}
                                onChangeText={setDeptFilter}
                            />
                        </View>
                    </View>

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => (navigation as any).navigate('AddMasCom')}
                        >
                            <Text style={styles.addBtnText}>🏢+ เพิ่มศูนย์งานใหม่</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TABLE */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, { flex: 0.5 }]}>#</Text>
                        <Text style={[styles.headerText, { flex: 2.5 }]}>ชื่อศูนย์งาน</Text>
                        <Text style={[styles.headerText, { flex: 1.5 }]}>รหัสศูนย์งาน</Text>
                        <Text style={[styles.headerText, { flex: 2 }]}>รหัสการไฟฟ้า</Text>
                        <Text style={[styles.headerText, { flex: 1.5 }]}>ชื่อการไฟฟ้า</Text>
                        <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>จัดการ</Text>
                    </View>

                    <ScrollView style={styles.scrollBody}>
                        {loading ? (
                            <ActivityIndicator style={{ marginTop: 50 }} color={colors.primaryPurple} />
                        ) : filteredCenters.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>ไม่พบข้อมูลศูนย์งาน</Text>
                            </View>
                        ) : (
                            filteredCenters.map((center, index) => {
                                const cId = center.id || center.Id || index;
                                const cCode = center.com_code || center.ComCode;
                                const cNameTh = center.name_th || center.NameTh;
                                const cNameEng = center.name_eng || center.NameEng;
                                const cPeaCode = center.pea_code || center.PeaCode;

                                return (
                                    <TouchableOpacity
                                        key={cId}
                                        style={styles.tableRow}
                                        onPress={() => (navigation as any).navigate('TechnicianList', { pea_code: cPeaCode, com_code: cCode, center_name: cNameTh })}
                                    >
                                        <Text style={[styles.cellText, { flex: 0.5 }]}>{index + 1}</Text>

                                        <View style={[styles.cell, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>🏢</Text>
                                            </View>
                                            <View style={{ marginLeft: 10 }}>
                                                <Text style={styles.techName}>{cNameTh}</Text>
                                                <Text style={styles.techEmail}>{cNameEng}</Text>
                                            </View>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <View style={styles.codeBadge}>
                                                <Text style={styles.codeText}>{cCode}</Text>
                                            </View>
                                        </View>

                                        <View style={[styles.cell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                                            <Text style={{ marginRight: 5 }}>⚡</Text>
                                            <Text style={styles.cellText}>{cPeaCode || '-'}</Text>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <Text style={styles.cellText}>{getPeaName(cPeaCode) || '-'}</Text>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.2, flexDirection: 'row', justifyContent: 'center' }]}>
                                            <TouchableOpacity
                                                style={styles.actionIcon}
                                            >
                                                <Text style={{ fontSize: 16 }}>👁️</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.actionIcon, { marginLeft: 10 }]}>
                                                <Text style={{ fontSize: 16 }}>�</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })
                        )}
                    </ScrollView>

                    {/* FOOTER */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>แสดง {filteredCenters.length} จาก {centers.length} รายการ</Text>
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
        </View >
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
    filterInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    buttonGroup: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginLeft: sizes.md,
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
