import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    ActivityIndicator, Modal, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { userService, UserResponse } from '@/services/userService';

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
const ITEMS_PER_PAGE = 10;
const ROLES = [
    { label: '-- เลือกสิทธิ์ --', value: '' },
    { label: 'Admin (ผู้ดูแลระบบ)', value: 'admin' },
    { label: 'Storekeeper (เจ้าหน้าที่คลัง)', value: 'storekeeper' },
    { label: 'User', value: 'user' },
];

const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
        case 'admin':
            return { label: 'Admin', bg: '#FFF3E0', color: '#E65100', borderColor: '#FFB74D' };
        case 'storekeeper':
            return { label: 'Storekeeper', bg: '#E3F2FD', color: '#1565C0', borderColor: '#64B5F6' };
        default:
            return { label: role || 'User', bg: '#F3E5F5', color: '#6A1B9A', borderColor: '#CE93D8' };
    }
};

const getInitial = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
};

const getAvatarColor = (role: string) => {
    switch (role?.toLowerCase()) {
        case 'admin': return '#E65100';
        case 'storekeeper': return '#1565C0';
        default: return '#6A1B9A';
    }
};

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────
export const UserManagementScreen: React.FC = () => {
    // Data
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [peaFilter, setPeaFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // PEA Picker
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [filteredPeaList, setFilteredPeaList] = useState<any[]>([]);
    const [showPeaModal, setShowPeaModal] = useState(false);
    const [peaSearchText, setPeaSearchText] = useState('');
    const [selectedPeaDisplay, setSelectedPeaDisplay] = useState('');

    // Role picker
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [showFilterRoleDropdown, setShowFilterRoleDropdown] = useState(false);
    const [showFilterPeaDropdown, setShowFilterPeaDropdown] = useState(false);

    // Status Modal
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
    const [statusModalMessage, setStatusModalMessage] = useState('');

    // Delete Confirm
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<UserResponse | null>(null);

    // Show/Hide Password
    const [showPassword, setShowPassword] = useState(false);

    // Form data
    const emptyForm = {
        username: '',
        fullName: '',
        role: '',
        peaCode: '',
        peaShort: '',
        peaName: '',
        password: '',
        isActive: true,
    };
    const [formData, setFormData] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // ──────────── Data fetching ────────────
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers();
            setUsers(data || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data || []);
            setFilteredPeaList(data || []);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
            fetchMasPea();
        }, [])
    );

    // ──────────── Computed / Filters ────────────
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const fullName = `${u.title_s_desc || ''} ${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
            const matchesSearch =
                !searchQuery ||
                fullName.includes(searchQuery.toLowerCase()) ||
                (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(u.emp_id || '').includes(searchQuery);

            const matchesRole = !roleFilter || (u.role || '').toLowerCase() === roleFilter.toLowerCase();
            const matchesPea = !peaFilter || (u.pea_code || '').includes(peaFilter) || (u.pea_name || '').toLowerCase().includes(peaFilter.toLowerCase());

            return matchesSearch && matchesRole && matchesPea;
        });
    }, [users, searchQuery, roleFilter, peaFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const stats = useMemo(() => ({
        total: users.length,
        admin: users.filter(u => u.role?.toLowerCase() === 'admin').length,
        storekeeper: users.filter(u => u.role?.toLowerCase() === 'storekeeper').length,
        active: users.filter(u => u.is_active !== false).length,
    }), [users]);

    // ──────────── Modal Handlers ────────────
    const openCreateModal = () => {
        setFormData(emptyForm);
        setFormErrors({});
        setSelectedPeaDisplay('');
        setIsEditMode(false);
        setShowPassword(false);
        setModalVisible(true);
    };

    const openEditModal = (user: UserResponse) => {
        setFormData({
            username: user.username || '',
            fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
            role: user.role || '',
            peaCode: user.pea_code || '',
            peaShort: user.pea_short || '',
            peaName: user.pea_name || '',
            password: '',
            isActive: user.is_active !== false,
        });
        setSelectedPeaDisplay(user.pea_name ? `${user.pea_code} - ${user.pea_name}` : '');
        setFormErrors({});
        setIsEditMode(true);
        setShowPassword(false);
        setModalVisible(true);
    };

    const validateForm = () => {
        const errs: Record<string, string> = {};
        if (!formData.username.trim()) errs.username = 'กรุณากรอกรหัสพนักงาน';
        if (!formData.fullName.trim()) errs.fullName = 'กรุณากรอกชื่อ-นามสกุล';
        if (!formData.role) errs.role = 'กรุณาเลือกสิทธิ์การใช้งาน';
        if (!formData.peaCode) errs.peaCode = 'กรุณาเลือกสังกัด';
        if (!isEditMode && !formData.password.trim()) errs.password = 'กรุณากำหนดรหัสผ่าน';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        try {
            setSaving(true);
            const nameParts = formData.fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            if (isEditMode) {
                const payload: any = {
                    first_name: firstName,
                    last_name: lastName,
                    role: formData.role,
                    pea_code: formData.peaCode,
                    pea_short: formData.peaShort,
                    pea_name: formData.peaName,
                    is_active: formData.isActive,
                };
                if (formData.password.trim()) {
                    payload.password = formData.password;
                }
                await userService.updateUser(formData.username, payload);
                showStatusModal('success', 'แก้ไขข้อมูลผู้ใช้เรียบร้อยแล้ว');
            } else {
                // Parse numeric value from username, or generate a random 5-digit ID as fallback
                const fallbackId = Math.floor(Math.random() * 90000) + 10000;
                const parsedEmpId = parseInt(formData.username.replace(/\D/g, '')) || fallbackId;

                await userService.createUser({
                    emp_id: parsedEmpId,
                    title_s_desc: '',
                    first_name: firstName,
                    last_name: lastName,
                    username: formData.username,
                    email: `${formData.username}@pea.co.th`,
                    role: formData.role,
                    password: formData.password,
                    is_active: formData.isActive,
                    pea_code: formData.peaCode,
                    pea_short: formData.peaShort,
                    pea_name: formData.peaName,
                });
                showStatusModal('success', 'เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว');
            }
            setModalVisible(false);
            fetchUsers();
        } catch (error: any) {
            showStatusModal('error', error?.response?.data?.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    };

    const showStatusModal = (type: 'success' | 'error', msg: string) => {
        setStatusModalType(type);
        setStatusModalMessage(msg);
        setStatusModalVisible(true);
    };

    const confirmDelete = (user: UserResponse) => {
        setDeleteTarget(user);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await userService.deleteUser(deleteTarget.username);
            setDeleteModalVisible(false);
            setDeleteTarget(null);
            showStatusModal('success', 'ลบผู้ใช้งานเรียบร้อยแล้ว');
            fetchUsers();
        } catch (error: any) {
            setDeleteModalVisible(false);
            showStatusModal('error', error?.response?.data?.error || 'ไม่สามารถลบผู้ใช้งานได้');
        }
    };

    // ──────────── PEA picker helpers ────────────
    const handleSearchPea = (text: string) => {
        setPeaSearchText(text);
        if (text) {
            const filtered = masPeaList.filter(item => {
                const code = item.pea_code || item.PeaCode || '';
                const nameTh = item.name_th || item.NameTh || '';
                return code.includes(text) || nameTh.includes(text);
            });
            setFilteredPeaList(filtered);
        } else {
            setFilteredPeaList(masPeaList);
        }
    };

    const handleSelectPea = (item: any) => {
        const code = item.pea_code || item.PeaCode || '';
        const nameTh = item.name_th || item.NameTh || '';
        const nameEng = item.name_eng || item.NameEng || '';
        setFormData(prev => ({ ...prev, peaCode: code, peaShort: nameEng, peaName: nameTh }));
        setSelectedPeaDisplay(`${code} - ${nameTh}`);
        setShowPeaModal(false);
    };

    // ──────────── Unique PEA list for filter dropdown ────────────
    const uniquePeaOptions = useMemo(() => {
        const seen = new Set<string>();
        return users.reduce<{ code: string; name: string }[]>((acc, u) => {
            if (u.pea_code && !seen.has(u.pea_code)) {
                seen.add(u.pea_code);
                acc.push({ code: u.pea_code, name: u.pea_name || u.pea_code });
            }
            return acc;
        }, []);
    }, [users]);

    // ──────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────
    return (
        <View style={styles.mainContainer}>
            <Header />

            <ScrollView style={styles.content} nestedScrollEnabled>
                {/* ═══════ STAT CARDS ═══════ */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { borderLeftColor: colors.primaryPurple }]}>
                        <View style={styles.statInfo}>
                            <Text style={styles.statLabel}>ผู้ใช้งานทั้งหมด</Text>
                            <Text style={[styles.statValue, { color: colors.primaryPurple }]}>{stats.total}</Text>
                        </View>
                        <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
                            <Text style={{ fontSize: 22 }}>👥</Text>
                        </View>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#E65100' }]}>
                        <View style={styles.statInfo}>
                            <Text style={styles.statLabel}>ผู้ดูแลระบบ (Admin)</Text>
                            <Text style={[styles.statValue, { color: '#E65100' }]}>{stats.admin}</Text>
                        </View>
                        <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={{ fontSize: 22 }}>👤</Text>
                        </View>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#1565C0' }]}>
                        <View style={styles.statInfo}>
                            <Text style={styles.statLabel}>เจ้าหน้าที่คลัง (Storekeeper)</Text>
                            <Text style={[styles.statValue, { color: '#1565C0' }]}>{stats.storekeeper}</Text>
                        </View>
                        <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Text style={{ fontSize: 22 }}>📋</Text>
                        </View>
                    </View>
                    <View style={[styles.statCard, { borderLeftColor: '#2E7D32' }]}>
                        <View style={styles.statInfo}>
                            <Text style={styles.statLabel}>ใช้งานอยู่ (Active)</Text>
                            <Text style={[styles.statValue, { color: '#2E7D32' }]}>{stats.active}</Text>
                        </View>
                        <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={{ fontSize: 22 }}>✅</Text>
                        </View>
                    </View>
                </View>

                {/* ═══════ TOOLBAR ═══════ */}
                <View style={styles.toolbar}>
                    {/* Search */}
                    <View style={styles.searchBox}>
                        <Text style={{ marginRight: 8 }}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหาชื่อ, รหัสพนักงาน..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={t => { setSearchQuery(t); setCurrentPage(1); }}
                        />
                    </View>

                    {/* Role filter */}
                    <View style={styles.filterDropdownWrap}>
                        <TouchableOpacity
                            style={styles.filterDropdownBtn}
                            onPress={() => { setShowFilterRoleDropdown(!showFilterRoleDropdown); setShowFilterPeaDropdown(false); }}
                        >
                            <Text style={{ color: roleFilter ? '#333' : '#999', flex: 1, fontSize: 13 }}>
                                {roleFilter ? ROLES.find(r => r.value === roleFilter)?.label : 'ทุกสิทธิ์การใช้งาน (All Roles)'}
                            </Text>
                            <Text>▼</Text>
                        </TouchableOpacity>
                        {showFilterRoleDropdown && (
                            <View style={styles.dropdownList}>
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setRoleFilter(''); setShowFilterRoleDropdown(false); setCurrentPage(1); }}>
                                    <Text style={styles.dropdownItemText}>ทุกสิทธิ์การใช้งาน (All Roles)</Text>
                                </TouchableOpacity>
                                {ROLES.filter(r => r.value).map(r => (
                                    <TouchableOpacity key={r.value} style={styles.dropdownItem} onPress={() => { setRoleFilter(r.value); setShowFilterRoleDropdown(false); setCurrentPage(1); }}>
                                        <Text style={styles.dropdownItemText}>{r.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* PEA filter */}
                    <View style={styles.filterDropdownWrap}>
                        <TouchableOpacity
                            style={styles.filterDropdownBtn}
                            onPress={() => { setShowFilterPeaDropdown(!showFilterPeaDropdown); setShowFilterRoleDropdown(false); }}
                        >
                            <Text style={{ color: peaFilter ? '#333' : '#999', flex: 1, fontSize: 13 }}>
                                {peaFilter || 'ทุกสังกัด กฟภ.'}
                            </Text>
                            <Text>▼</Text>
                        </TouchableOpacity>
                        {showFilterPeaDropdown && (
                            <View style={styles.dropdownList}>
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setPeaFilter(''); setShowFilterPeaDropdown(false); setCurrentPage(1); }}>
                                    <Text style={styles.dropdownItemText}>ทุกสังกัด กฟภ.</Text>
                                </TouchableOpacity>
                                {uniquePeaOptions.map(p => (
                                    <TouchableOpacity key={p.code} style={styles.dropdownItem} onPress={() => { setPeaFilter(p.name); setShowFilterPeaDropdown(false); setCurrentPage(1); }}>
                                        <Text style={styles.dropdownItemText}>{p.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Add button */}
                    <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
                        <Text style={styles.addBtnText}>👤+ เพิ่มผู้ใช้งาน</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══════ TABLE ═══════ */}
                <View style={styles.tableContainer}>
                    {/* Header Row */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, { flex: 2.5 }]}>ข้อมูลผู้ใช้ (USER)</Text>
                        <Text style={[styles.headerText, { flex: 1.2, textAlign: 'center' }]}>สิทธิ์ (ROLE)</Text>
                        <Text style={[styles.headerText, { flex: 1.5 }]}>สังกัด (PEA CODE)</Text>
                        <Text style={[styles.headerText, { flex: 1.3, textAlign: 'center' }]}>สถานะ (STATUS)</Text>
                        <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>จัดการ (ACTIONS)</Text>
                    </View>

                    {/* Body */}
                    {loading ? (
                        <ActivityIndicator style={{ marginVertical: 60 }} color={colors.primaryPurple} size="large" />
                    ) : paginatedUsers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
                            <Text style={styles.emptyText}>ไม่พบข้อมูลผู้ใช้งาน</Text>
                        </View>
                    ) : (
                        paginatedUsers.map((u) => {
                            const badge = getRoleBadge(u.role);
                            const isActive = u.is_active !== false;
                            const displayName = `${u.title_s_desc || ''} ${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;

                            return (
                                <View key={u.id} style={styles.tableRow}>
                                    {/* User info */}
                                    <View style={[styles.cell, { flex: 2.5, flexDirection: 'row', alignItems: 'center' }]}>
                                        <View style={[styles.avatar, { backgroundColor: getAvatarColor(u.role) }]}>
                                            <Text style={styles.avatarText}>{getInitial(u.first_name)}</Text>
                                        </View>
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={styles.userName}>{displayName}</Text>
                                            <Text style={styles.userSub}>EMP-{String(u.emp_id).padStart(5, '0')}</Text>
                                        </View>
                                    </View>

                                    {/* Role badge */}
                                    <View style={[styles.cell, { flex: 1.2, alignItems: 'center' }]}>
                                        <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.borderColor }]}>
                                            <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                                        </View>
                                    </View>

                                    {/* PEA */}
                                    <View style={[styles.cell, { flex: 1.5 }]}>
                                        <Text style={styles.cellText}>{u.pea_name || u.pea_code || '-'}</Text>
                                    </View>

                                    {/* Status */}
                                    <View style={[styles.cell, { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                                        <View style={[styles.statusDot, { backgroundColor: isActive ? '#4CAF50' : '#9E9E9E' }]} />
                                        <Text style={[styles.statusText, { color: isActive ? '#2E7D32' : '#757575' }]}>
                                            {isActive ? 'ใช้งานปกติ' : 'ระงับการใช้งาน'}
                                        </Text>
                                    </View>

                                    {/* Actions */}
                                    <View style={[styles.cell, { flex: 1, flexDirection: 'row', justifyContent: 'center' }]}>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => openEditModal(u)}
                                        >
                                            <Text style={{ fontSize: 16 }}>✏️</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.deleteBtn]}
                                            onPress={() => confirmDelete(u)}
                                        >
                                            <Text style={{ fontSize: 16 }}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}

                    {/* Footer / Pagination */}
                    <View style={styles.tableFooter}>
                        <Text style={styles.footerText}>
                            แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} จาก {filteredUsers.length} รายการ
                        </Text>
                        <View style={styles.pagination}>
                            <TouchableOpacity
                                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                                onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                <Text style={{ color: currentPage === 1 ? '#ccc' : '#333' }}>‹</Text>
                            </TouchableOpacity>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                                Math.max(0, currentPage - 3),
                                currentPage + 2
                            ).map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.pageBtn, p === currentPage && styles.pageBtnActive]}
                                    onPress={() => setCurrentPage(p)}
                                >
                                    <Text style={{ color: p === currentPage ? 'white' : '#333', fontWeight: p === currentPage ? 'bold' : 'normal' }}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                                onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <Text style={{ color: currentPage === totalPages ? '#ccc' : '#333' }}>›</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* ═══════════════════════════════════════════════ */}
            {/* CREATE / EDIT MODAL                            */}
            {/* ═══════════════════════════════════════════════ */}
            <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.formModalContent}>
                        {/* Header */}
                        <View style={styles.formModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 20, marginRight: 8 }}>👤</Text>
                                <Text style={styles.formModalTitle}>
                                    {isEditMode ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้งานใหม่'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: '#999' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ overflow: 'visible' }}>
                            {/* Row 1: Username + FullName */}
                            <View style={styles.formRow}>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>รหัสพนักงาน (Username) <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={[
                                            styles.formInput,
                                            formErrors.username && styles.formInputError,
                                            isEditMode && styles.formInputDisabled,
                                        ]}
                                        placeholder="เช่น EMP-00123"
                                        placeholderTextColor="#bbb"
                                        value={formData.username}
                                        onChangeText={t => setFormData(p => ({ ...p, username: t }))}
                                        editable={!isEditMode}
                                    />
                                    {formErrors.username && <Text style={styles.formError}>{formErrors.username}</Text>}
                                </View>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>ชื่อ - นามสกุล <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={[styles.formInput, formErrors.fullName && styles.formInputError]}
                                        placeholder="ชื่อจริง นามสกุล"
                                        placeholderTextColor="#bbb"
                                        value={formData.fullName}
                                        onChangeText={t => setFormData(p => ({ ...p, fullName: t }))}
                                    />
                                    {formErrors.fullName && <Text style={styles.formError}>{formErrors.fullName}</Text>}
                                </View>
                            </View>

                            {/* Row 2: Role + PEA */}
                            <View style={[styles.formRow, { zIndex: 30 }]}>
                                <View style={[styles.formField, { zIndex: 20 }]}>
                                    <Text style={styles.formLabel}>สิทธิ์การใช้งาน (Role) <Text style={styles.required}>*</Text></Text>
                                    <TouchableOpacity
                                        style={[styles.formInput, styles.formDropdownBtn, formErrors.role && styles.formInputError]}
                                        onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                                    >
                                        <Text style={{ color: formData.role ? '#333' : '#bbb', flex: 1 }}>
                                            {ROLES.find(r => r.value === formData.role)?.label || '-- เลือกสิทธิ์ --'}
                                        </Text>
                                        <Text>▼</Text>
                                    </TouchableOpacity>
                                    {showRoleDropdown && (
                                        <View style={[styles.dropdownList, { top: 72 }]}>
                                            {ROLES.filter(r => r.value).map(r => (
                                                <TouchableOpacity key={r.value} style={styles.dropdownItem} onPress={() => { setFormData(p => ({ ...p, role: r.value })); setShowRoleDropdown(false); }}>
                                                    <Text style={styles.dropdownItemText}>{r.label}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                    {formErrors.role && <Text style={styles.formError}>{formErrors.role}</Text>}
                                </View>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>สังกัด (PEA Code) <Text style={styles.required}>*</Text></Text>
                                    <TouchableOpacity
                                        style={[styles.formInput, styles.formDropdownBtn, formErrors.peaCode && styles.formInputError]}
                                        onPress={() => { setPeaSearchText(''); setFilteredPeaList(masPeaList); setShowPeaModal(true); }}
                                    >
                                        <Text style={{ color: selectedPeaDisplay ? '#333' : '#bbb', flex: 1 }} numberOfLines={1}>
                                            {selectedPeaDisplay || '-- เลือกสังกัด --'}
                                        </Text>
                                        <Text>▼</Text>
                                    </TouchableOpacity>
                                    {formErrors.peaCode && <Text style={styles.formError}>{formErrors.peaCode}</Text>}
                                </View>
                            </View>

                            {/* Row 3: Password */}
                            <View style={[styles.formRow, { zIndex: 10 }]}>
                                <View style={[styles.formField, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>
                                        รหัสผ่าน (Password) {!isEditMode && <Text style={styles.required}>*</Text>}
                                        {isEditMode && <Text style={{ fontWeight: 'normal', color: '#999', fontSize: 12 }}> (ปล่อยว่างไว้หากไม่ต้องการเปลี่ยนรหัส)</Text>}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.formInput, formErrors.password && styles.formInputError, { flex: 1 }]}
                                            placeholder="กำหนดรหัสผ่าน..."
                                            placeholderTextColor="#bbb"
                                            value={formData.password}
                                            onChangeText={t => setFormData(p => ({ ...p, password: t }))}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                                            <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🙈'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {formErrors.password && <Text style={styles.formError}>{formErrors.password}</Text>}
                                </View>
                            </View>

                            {/* Row 4: Active Toggle */}
                            <View style={[styles.formRow, { marginTop: 5, zIndex: 5 }]}>
                                <TouchableOpacity
                                    style={styles.toggleRow}
                                    onPress={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
                                >
                                    <View style={[styles.toggleTrack, formData.isActive && styles.toggleTrackActive]}>
                                        <View style={[styles.toggleThumb, formData.isActive && styles.toggleThumbActive]} />
                                    </View>
                                    <Text style={styles.toggleLabel}>เปิดใช้งานบัญชีนี้ (Active)</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        {/* Footer buttons */}
                        <View style={styles.formModalFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={{ color: 'white', fontSize: 16, marginRight: 6 }}>💾</Text>
                                        <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ═══════ PEA SELECTION MODAL ═══════ */}
            <Modal visible={showPeaModal} animationType="slide" transparent onRequestClose={() => setShowPeaModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.peaModalContent}>
                        <View style={styles.peaModalHeader}>
                            <Text style={styles.peaModalTitle}>เลือกสังกัด</Text>
                            <TouchableOpacity onPress={() => setShowPeaModal(false)}>
                                <Text style={{ fontSize: 22, color: '#999' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.peaSearchInput}
                            placeholder="ค้นหา (รหัส, ชื่อ)..."
                            value={peaSearchText}
                            onChangeText={handleSearchPea}
                        />
                        <ScrollView style={{ flex: 1 }}>
                            {filteredPeaList.map((item, idx) => {
                                const code = item.pea_code || item.PeaCode || '';
                                const nameTh = item.name_th || item.NameTh || '';
                                return (
                                    <TouchableOpacity key={item.id || idx} style={styles.peaItem} onPress={() => handleSelectPea(item)}>
                                        <Text style={styles.peaItemCode}>{code}</Text>
                                        <Text style={styles.peaItemName}>{nameTh}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ═══════ STATUS MODAL ═══════ */}
            <Modal visible={statusModalVisible} animationType="fade" transparent onRequestClose={() => setStatusModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={[styles.statusIconCircle, { backgroundColor: statusModalType === 'success' ? '#E8F5E9' : '#FFEBEE' }]}>
                            <Text style={{ fontSize: 36 }}>{statusModalType === 'success' ? '✅' : '❌'}</Text>
                        </View>
                        <Text style={styles.statusTitle}>{statusModalType === 'success' ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}</Text>
                        <Text style={styles.statusMessage}>{statusModalMessage}</Text>
                        <TouchableOpacity
                            style={[styles.statusBtn, { backgroundColor: statusModalType === 'success' ? colors.primaryPurple : '#F44336' }]}
                            onPress={() => setStatusModalVisible(false)}
                        >
                            <Text style={styles.statusBtnText}>ตกลง</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ═══════ DELETE CONFIRM MODAL ═══════ */}
            <Modal visible={deleteModalVisible} animationType="fade" transparent onRequestClose={() => setDeleteModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={[styles.statusIconCircle, { backgroundColor: '#FFEBEE' }]}>
                            <Text style={{ fontSize: 36 }}>⚠️</Text>
                        </View>
                        <Text style={styles.statusTitle}>ยืนยันการลบ</Text>
                        <Text style={styles.statusMessage}>
                            คุณต้องการลบผู้ใช้ "{deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : ''}" ใช่หรือไม่?{'\n'}การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </Text>
                        <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.statusBtn, { flex: 1, backgroundColor: '#E0E0E0' }]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={[styles.statusBtnText, { color: '#333' }]}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.statusBtn, { flex: 1, backgroundColor: '#F44336' }]}
                                onPress={handleDelete}
                            >
                                <Text style={styles.statusBtnText}>ลบผู้ใช้</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ──────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f5f7f9' },
    content: { flex: 1, padding: sizes.lg },

    // Stat cards
    statsRow: { flexDirection: 'row', marginBottom: sizes.lg, gap: 16 },
    statCard: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'white', borderRadius: 12, padding: 18,
        borderLeftWidth: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    statInfo: {},
    statLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
    statValue: { fontSize: 28, fontWeight: 'bold' },
    statIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },

    // Toolbar
    toolbar: { flexDirection: 'row', alignItems: 'center', marginBottom: sizes.lg, gap: 12, zIndex: 20 },
    searchBox: {
        flex: 2, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 14, height: 44,
        borderWidth: 1, borderColor: '#e0e0e0',
    },
    searchInput: { flex: 1, fontSize: 13, color: '#333' },

    filterDropdownWrap: { flex: 1.2, position: 'relative' as any, zIndex: 20 },
    filterDropdownBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 14, height: 44,
        borderWidth: 1, borderColor: '#e0e0e0',
    },
    dropdownList: {
        position: 'absolute' as any, top: 48, left: 0, right: 0,
        backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
        zIndex: 100, maxHeight: 220,
    },
    dropdownItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    dropdownItemText: { fontSize: 13, color: '#333' },

    addBtn: {
        backgroundColor: colors.primaryPurple, height: 44, paddingHorizontal: 20,
        borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    },
    addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    // Table
    tableContainer: {
        flex: 1, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden',
        borderTopWidth: 4, borderTopColor: colors.primaryPurple,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    },
    tableHeader: {
        flexDirection: 'row', backgroundColor: '#FAFAFA',
        paddingVertical: 14, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    headerText: { fontSize: 12, fontWeight: 'bold', color: '#666', textTransform: 'uppercase' as any },
    tableRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 20,
        borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    cell: { justifyContent: 'center' as any },
    cellText: { fontSize: 13, color: '#555' },

    // Avatar
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    userName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    userSub: { fontSize: 11, color: '#999', marginTop: 2 },

    // Role badge
    roleBadge: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
        borderWidth: 1, alignSelf: 'center' as any,
    },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },

    // Status
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, fontWeight: '500' },

    // Actions
    actionBtn: {
        width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F5F5F5', marginHorizontal: 3,
    },
    deleteBtn: {
        ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
    },

    // Footer / Pagination
    tableFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0',
    },
    footerText: { fontSize: 13, color: '#999' },
    pagination: { flexDirection: 'row', gap: 6 },
    pageBtn: {
        width: 34, height: 34, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6,
    },
    pageBtnActive: { backgroundColor: colors.primaryPurple, borderColor: colors.primaryPurple },
    pageBtnDisabled: { opacity: 0.4 },

    emptyContainer: { padding: 60, alignItems: 'center' },
    emptyText: { color: '#999', fontSize: 15 },

    // ──── Modal Shared ────
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center',
    },

    // ──── Form Modal ────
    formModalContent: {
        width: '90%', maxWidth: 680, maxHeight: '90%',
        backgroundColor: 'white', borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10,
    },
    formModalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 24, paddingVertical: 18,
        backgroundColor: colors.primaryPurple, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    },
    formModalTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },

    formRow: { flexDirection: 'row', paddingHorizontal: 24, marginTop: 18, gap: 16 },
    formField: { flex: 1, position: 'relative' as any },
    formLabel: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 },
    required: { color: '#F44336' },
    formInput: {
        height: 44, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
        paddingHorizontal: 14, fontSize: 14, backgroundColor: '#fafafa', color: '#333',
    },
    formInputError: { borderColor: '#F44336' },
    formInputDisabled: { backgroundColor: '#f0f0f0', color: '#999' },
    formDropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    formError: { color: '#F44336', fontSize: 11, marginTop: 3 },
    eyeBtn: { marginLeft: -40, padding: 8 },

    // Toggle
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 6 },
    toggleTrack: {
        width: 48, height: 26, borderRadius: 13,
        backgroundColor: '#E0E0E0', justifyContent: 'center', padding: 3,
    },
    toggleTrackActive: { backgroundColor: '#4CAF50' },
    toggleThumb: {
        width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
    },
    toggleThumbActive: { alignSelf: 'flex-end' as any },
    toggleLabel: { fontSize: 14, color: '#333', marginLeft: 10, fontWeight: '500' },

    // Modal Footer
    formModalFooter: {
        flexDirection: 'row', justifyContent: 'flex-end', gap: 12,
        paddingHorizontal: 24, paddingVertical: 18,
        borderTopWidth: 1, borderTopColor: '#f0f0f0',
    },
    cancelBtn: {
        height: 44, paddingHorizontal: 24, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5',
    },
    cancelBtnText: { color: '#666', fontWeight: 'bold', fontSize: 14 },
    saveBtn: {
        height: 44, paddingHorizontal: 24, borderRadius: 8,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.primaryPurple,
    },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    // ──── PEA Modal ────
    peaModalContent: {
        width: '80%', maxWidth: 600, height: '70%',
        backgroundColor: 'white', borderRadius: 12, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10,
    },
    peaModalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
    },
    peaModalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryPurple },
    peaSearchInput: {
        height: 44, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
        paddingHorizontal: 14, fontSize: 14, backgroundColor: '#fafafa', marginBottom: 10,
    },
    peaItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 10,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    peaItemCode: { fontSize: 13, fontWeight: 'bold', color: colors.primaryPurple, width: 80 },
    peaItemName: { fontSize: 13, color: '#333', flex: 1 },

    // ──── Status Modal ────
    statusModalContent: {
        width: 360, backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10,
    },
    statusIconCircle: {
        width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    statusTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    statusMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    statusBtn: {
        width: '100%', height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    },
    statusBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});
