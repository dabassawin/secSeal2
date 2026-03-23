import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    ActivityIndicator, Modal, FlatList, Platform, Image
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { technicianService } from '@/services/technicianService';
import { userService } from '@/services/userService';
import { masComService } from '@/services/masComService';
import { useAuth } from '@/context/AuthContext';
import { Technician } from '@/types';
import api from '@/services/api';

export const TechnicianListScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { user } = useAuth();

    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');

    const [masPeaList, setMasPeaList] = useState<any[]>([]);

    const getImageUrl = (path?: string) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseURL = api.defaults.baseURL || 'http://192.168.1.28:3000';
        return `${baseURL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    };

    // ──────────── Edit Modal State ────────────
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editTarget, setEditTarget] = useState<Technician | null>(null);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form data
    const emptyForm = {
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        username: '',
        password: '',
        comCode: '',
    };
    const [formData, setFormData] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [editProfileImage, setEditProfileImage] = useState<File | null>(null);
    const [editPreviewUri, setEditPreviewUri] = useState<string | null>(null);

    // MasCom selection for edit modal
    const [showComModal, setShowComModal] = useState(false);
    const [masComList, setMasComList] = useState<any[]>([]);
    const [searchComQuery, setSearchComQuery] = useState('');
    const [selectedComName, setSelectedComName] = useState('');

    // Status Modal
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
    const [statusModalMessage, setStatusModalMessage] = useState('');

    // Delete Confirm
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Technician | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            if (user?.pea_code) {
                fetchData();
                fetchMasPea();
                fetchMasCom();
            }
        }, [user?.pea_code, route.params?.com_code])
    );

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const fetchMasCom = async () => {
        try {
            const data = await masComService.getMasComs();
            setMasComList(data);
        } catch (error) {
            console.error('Failed to fetch MasCom:', error);
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
            const comCode = route.params?.com_code;
            
            // Log for debugging (remove in a real production environment eventually, 
            // but helpful to see in dev tools for web)
            if (Platform.OS === 'web') {
                console.log('[TechnicianList] Fetching data for com_code:', comCode, 'params:', route.params);
            }

            if (comCode) {
                // เข้ามาจากหน้าศูนย์งาน → ส่ง com_code ไปกรองที่ backend
                const data = await technicianService.getTechnicians(undefined, false, comCode);
                setTechnicians(data);
            } else {
                let peaPrefix = route.params?.pea_code;
                if (!peaPrefix && user?.pea_code) {
                    peaPrefix = user.pea_code.substring(0, 4);
                }
                const data = await technicianService.getTechnicians(peaPrefix, true);
                setTechnicians(data);
            }
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

            const peaName = getPeaName(tech.pea_code);
            const matchesPeaCode = companyFilter === '' || (tech.pea_code && tech.pea_code.toLowerCase().includes(companyFilter.toLowerCase()));
            const matchesPeaName = deptFilter === '' || (peaName && peaName.toLowerCase().includes(deptFilter.toLowerCase()));

            return matchesSearch && matchesPeaCode && matchesPeaName;
        });
    }, [technicians, searchQuery, companyFilter, deptFilter, masPeaList]);

    // ──────────── Edit Modal Handlers ────────────
    const openEditModal = (tech: Technician) => {
        setEditTarget(tech);
        setFormData({
            firstName: tech.first_name || '',
            lastName: tech.last_name || '',
            phoneNumber: tech.phone_number || '',
            email: tech.email || '',
            username: tech.username || '',
            password: '',
            comCode: tech.pea_code || '',
        });
        // Find company name from masCom or masPea
        const comMatch = masComList.find(c => c.com_code === tech.pea_code);
        const peaMatch = masPeaList.find(p => (p.pea_code || p.PeaCode) === tech.pea_code);
        setSelectedComName(
            comMatch ? (comMatch.name_th || '') :
            peaMatch ? (peaMatch.name_th || peaMatch.NameTh || '') :
            tech.company_name || ''
        );
        setFormErrors({});
        setShowPassword(false);
        setEditProfileImage(null);
        setEditPreviewUri(tech.profile_pic ? getImageUrl(tech.profile_pic) : null);
        setEditModalVisible(true);
    };

    const handlePickEditImage = () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png, image/jpeg';
            input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                        alert('ไฟล์ภาพมีขนาดใหญ่เกิน 2MB');
                        return;
                    }
                    setEditProfileImage(file);
                    setEditPreviewUri(URL.createObjectURL(file));
                }
            };
            input.click();
        } else {
            alert('รองรับการอัปโหลดบนเว็บเท่านั้นในขณะนี้');
        }
    };

    const validateForm = () => {
        const errs: Record<string, string> = {};
        if (!formData.firstName.trim()) errs.firstName = 'กรุณากรอกชื่อจริง';
        if (!formData.lastName.trim()) errs.lastName = 'กรุณากรอกนามสกุล';
        if (!formData.phoneNumber.trim()) {
            errs.phoneNumber = 'กรุณากรอกเบอร์โทรศัพท์';
        } else if (formData.phoneNumber.trim().length < 10) {
            errs.phoneNumber = 'ต้องมี 10 หลัก';
        }
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSaveEdit = async () => {
        if (!validateForm() || !editTarget) return;
        try {
            setSaving(true);
            const payload: any = {
                first_name: formData.firstName.trim(),
                last_name: formData.lastName.trim(),
                phone_number: formData.phoneNumber.trim(),
                email: formData.email.trim(),
                pea_code: formData.comCode,
                company_name: selectedComName,
            };
            if (formData.password.trim()) {
                payload.password = formData.password;
            }
            await technicianService.updateTechnician(editTarget.id, payload);

            if (editProfileImage) {
                try {
                    await technicianService.uploadProfilePic(editTarget.id, editProfileImage);
                } catch (imgErr) {
                    console.error('Failed to update profile picture', imgErr);
                }
            }

            showStatusModal('success', 'แก้ไขข้อมูลช่างเทคนิคเรียบร้อยแล้ว');
            setEditModalVisible(false);
            fetchData();
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

    // ──────────── Delete Handlers ────────────
    const confirmDelete = (tech: Technician) => {
        setDeleteTarget(tech);
        setDeleteModalVisible(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await technicianService.deleteTechnician(deleteTarget.id);
            setDeleteModalVisible(false);
            setDeleteTarget(null);
            showStatusModal('success', 'ลบช่างเทคนิคเรียบร้อยแล้ว');
            fetchData();
        } catch (error: any) {
            setDeleteModalVisible(false);
            showStatusModal('error', error?.response?.data?.error || 'ไม่สามารถลบช่างเทคนิคได้');
        }
    };

    // ──────────── MasCom picker helpers ────────────
    const filteredComs = masComList.filter(item => {
        const code = item.com_code || '';
        const nameTh = item.name_th || '';
        const nameEng = item.name_eng || '';
        const query = searchComQuery.toLowerCase();
        return code.toLowerCase().includes(query) || nameTh.includes(query) || nameEng.toLowerCase().includes(query);
    });

    const handleSelectCom = (item: any) => {
        const code = item.com_code || '';
        const nameTh = item.name_th || '';
        setFormData(prev => ({ ...prev, comCode: code }));
        setSelectedComName(nameTh);
        setShowComModal(false);
    };

    return (
        <View style={styles.mainContainer}>
            <Header />

            <View style={styles.content}>
                {(route.params?.center_name || route.params?.com_code) && (
                    <View style={styles.backContainer}>

                        <Text style={styles.centerTitle}>
                            บุคลากรประจำศูนย์: {route.params?.center_name || masComList.find(c => c.com_code === route.params?.com_code)?.name_th || route.params?.com_code || '...'}
                        </Text>
                    </View>
                )}

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
                            style={styles.importBtn}
                            onPress={() => (navigation as any).navigate('ImportTechnician')}
                        >
                            <Text style={styles.importBtnText}>📥 นำเข้าข้อมูล (CSV/Excel)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => (navigation as any).navigate('AddTechnician', {
                                com_code: route.params?.com_code,
                                center_name: route.params?.center_name
                            })}
                        >
                            <Text style={styles.addBtnText}>👤+ เพิ่มช่างใหม่</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* TABLE */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <View style={[styles.cell, { width: 80 }]}>
                            <Text style={styles.headerText}>#</Text>
                        </View>
                        <View style={[styles.cell, { flex: 10 }]}>
                            <Text style={styles.headerText}>ชื่อ - นามสกุล</Text>
                        </View>
                        <View style={[styles.cell, { flex: 15 }]}>
                            <Text style={styles.headerText}>รหัสช่าง / ID</Text>
                        </View>
                        <View style={[styles.cell, { flex: 15 }]}>
                            <Text style={styles.headerText}>รหัสการไฟฟ้า</Text>
                        </View>
                        <View style={[styles.cell, { flex: 10, paddingLeft: 20 }]}>
                            <Text style={styles.headerText}>ชื่อการไฟฟ้า</Text>
                        </View>
                        <View style={[styles.cell, { width: 220, alignItems: 'center' }]}>
                            <Text style={styles.headerText}>สถานะ</Text>
                        </View>
                        <View style={[styles.cell, { width: 180, alignItems: 'center' }]}>
                            <Text style={styles.headerText}>จัดการ</Text>
                        </View>
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
                                <TouchableOpacity
                                    key={tech.id}
                                    style={styles.tableRow}
                                    onPress={() => (navigation as any).navigate('TechnicianDetail', { id: tech.id, technician: tech })}
                                >
                                    <View style={[styles.cell, { width: 80, flexDirection: 'row', alignItems: 'center' }]}>
                                        <Text style={[styles.cellText, { width: 30 }]}>{index + 1}</Text>
                                        <View style={styles.avatar}>
                                            {tech.profile_pic ? (
                                                <Image source={{ uri: getImageUrl(tech.profile_pic) || '' }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                                            ) : (
                                                <Text style={styles.avatarText}>👤</Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={[styles.cell, { flex: 10 }]}>
                                        <Text style={styles.techName}>{tech.first_name} {tech.last_name}</Text>
                                        <Text style={styles.techEmail}>{tech.username || tech.email}</Text>
                                    </View>

                                    <View style={[styles.cell, { flex: 15 }]}>
                                        <View style={styles.codeBadge}>
                                            <Text style={styles.codeText}>{tech.technician_code}</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.cell, { flex: 15 }]}>
                                        <Text style={styles.cellText}>{tech.pea_code || '-'}</Text>
                                    </View>

                                    <View style={[styles.cell, { flex: 10, paddingLeft: 20 }]}>
                                        <Text style={styles.cellText}>{getPeaName(tech.pea_code) || '-'}</Text>
                                    </View>

                                    <View style={[styles.cell, { width: 220, alignItems: 'center' }]}>
                                        <View style={styles.statusBadge}>
                                            <Text style={styles.statusDot}>●</Text>
                                            <Text style={styles.statusText}>ปกติ</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.cell, { width: 180, flexDirection: 'row', justifyContent: 'center' }]}>
                                        <TouchableOpacity
                                            style={styles.actionIcon}
                                            onPress={() => (navigation as any).navigate('TechnicianDetail', { id: tech.id, technician: tech })}
                                        >
                                            <Text style={{ fontSize: 16 }}>👁️</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionIcon, { marginLeft: 6 }]}
                                            onPress={(e) => { e.stopPropagation?.(); openEditModal(tech); }}
                                        >
                                            <Text style={{ fontSize: 16 }}>📝</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionIcon, { marginLeft: 6 }]}
                                            onPress={(e) => { e.stopPropagation?.(); confirmDelete(tech); }}
                                        >
                                            <Text style={{ fontSize: 16 }}>🗑️</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
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

            {/* ═══════════════════════════════════════════════ */}
            {/* EDIT TECHNICIAN MODAL                          */}
            {/* ═══════════════════════════════════════════════ */}
            <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.formModalContent}>
                        {/* Header */}
                        <View style={styles.formModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 20, marginRight: 8 }}>🔧</Text>
                                <Text style={styles.formModalTitle}>แก้ไขข้อมูลช่างเทคนิค</Text>
                            </View>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: 'rgba(255,255,255,0.8)' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ overflow: 'visible' }}>
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <TouchableOpacity style={{
                                    width: 100, height: 100, borderRadius: 50, backgroundColor: '#f8f9fa',
                                    borderWidth: 2, borderColor: '#eee', borderStyle: 'dashed',
                                    justifyContent: 'center', alignItems: 'center', position: 'relative'
                                }} onPress={handlePickEditImage} activeOpacity={0.8}>
                                    {editPreviewUri ? (
                                        <Image source={{ uri: editPreviewUri }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                                    ) : (
                                        <Text style={{ fontSize: 32, opacity: 0.2 }}>📷</Text>
                                    )}
                                    <View style={{
                                        position: 'absolute', bottom: 0, right: 0, width: 28, height: 28,
                                        borderRadius: 14, backgroundColor: '#c0a060', justifyContent: 'center',
                                        alignItems: 'center', borderWidth: 2, borderColor: 'white'
                                    }}>
                                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: -2 }}>+</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Technician Code (read-only) */}
                            <View style={[styles.formRow, { zIndex: 50 }]}>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>รหัสช่าง (Technician ID)</Text>
                                    <TextInput
                                        style={[styles.formInput, styles.formInputDisabled]}
                                        value={editTarget?.technician_code || ''}
                                        editable={false}
                                    />
                                </View>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>ชื่อผู้ใช้ (Username)</Text>
                                    <TextInput
                                        style={[styles.formInput, styles.formInputDisabled]}
                                        value={formData.username}
                                        editable={false}
                                    />
                                </View>
                            </View>

                            {/* Row 1: FirstName + LastName */}
                            <View style={styles.formRow}>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>ชื่อจริง <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={[styles.formInput, formErrors.firstName && styles.formInputError]}
                                        placeholder="เช่น สมชาย"
                                        placeholderTextColor="#bbb"
                                        value={formData.firstName}
                                        onChangeText={t => setFormData(p => ({ ...p, firstName: t }))}
                                    />
                                    {formErrors.firstName && <Text style={styles.formError}>{formErrors.firstName}</Text>}
                                </View>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>นามสกุล <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={[styles.formInput, formErrors.lastName && styles.formInputError]}
                                        placeholder="เช่น ใจดี"
                                        placeholderTextColor="#bbb"
                                        value={formData.lastName}
                                        onChangeText={t => setFormData(p => ({ ...p, lastName: t }))}
                                    />
                                    {formErrors.lastName && <Text style={styles.formError}>{formErrors.lastName}</Text>}
                                </View>
                            </View>

                            {/* Row 2: Phone + Email */}
                            <View style={styles.formRow}>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>เบอร์โทรศัพท์ <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={[styles.formInput, formErrors.phoneNumber && styles.formInputError]}
                                        placeholder="08x-xxx-xxxx"
                                        placeholderTextColor="#bbb"
                                        value={formData.phoneNumber}
                                        onChangeText={t => setFormData(p => ({ ...p, phoneNumber: t.replace(/[^0-9]/g, '') }))}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                    />
                                    {formErrors.phoneNumber && <Text style={styles.formError}>{formErrors.phoneNumber}</Text>}
                                </View>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>อีเมล (ถ้ามี)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="example@email.com"
                                        placeholderTextColor="#bbb"
                                        value={formData.email}
                                        onChangeText={t => setFormData(p => ({ ...p, email: t }))}
                                        keyboardType="email-address"
                                    />
                                </View>
                            </View>

                            {/* Row 3: Work Center */}
                            <View style={[styles.formRow, { zIndex: 30 }]}>
                                <View style={styles.formField}>
                                    <Text style={styles.formLabel}>ศูนย์งาน (Work Center)</Text>
                                    <TouchableOpacity
                                        style={[styles.formInput, styles.formDropdownBtn]}
                                        onPress={() => { setSearchComQuery(''); setShowComModal(true); }}
                                    >
                                        <Text style={{ color: formData.comCode ? '#333' : '#bbb', flex: 1 }} numberOfLines={1}>
                                            {formData.comCode ? `${formData.comCode} - ${selectedComName}` : '-- เลือกศูนย์งาน --'}
                                        </Text>
                                        <Text>▼</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.formField} />
                            </View>

                            {/* Row 4: Password */}
                            <View style={[styles.formRow, { zIndex: 10 }]}>
                                <View style={[styles.formField, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>
                                        รหัสผ่าน (Password)
                                        <Text style={{ fontWeight: 'normal', color: '#999', fontSize: 12 }}> (ปล่อยว่างไว้หากไม่ต้องการเปลี่ยนรหัส)</Text>
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TextInput
                                            style={[styles.formInput, { flex: 1 }]}
                                            placeholder="กำหนดรหัสผ่านใหม่..."
                                            placeholderTextColor="#bbb"
                                            value={formData.password}
                                            onChangeText={t => setFormData(p => ({ ...p, password: t }))}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                                            <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '🙈'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Footer buttons */}
                        <View style={styles.formModalFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
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

            {/* ═══════ MASCOM SELECTION MODAL ═══════ */}
            <Modal visible={showComModal} animationType="slide" transparent onRequestClose={() => setShowComModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.peaModalContent}>
                        <View style={styles.peaModalHeader}>
                            <Text style={styles.peaModalTitle}>เลือกศูนย์งาน</Text>
                            <TouchableOpacity onPress={() => setShowComModal(false)}>
                                <Text style={{ fontSize: 22, color: '#999' }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.peaSearchInput}
                            placeholder="ค้นหา (รหัส, ชื่อ)..."
                            value={searchComQuery}
                            onChangeText={setSearchComQuery}
                        />
                        <ScrollView style={{ flex: 1 }}>
                            {filteredComs.map((item, idx) => {
                                const code = item.com_code || '';
                                const nameTh = item.name_th || '';
                                return (
                                    <TouchableOpacity key={item.id || idx} style={styles.peaItem} onPress={() => handleSelectCom(item)}>
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
                            คุณต้องการลบช่าง "{deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : ''}" ใช่หรือไม่?{'\n'}การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
                                <Text style={styles.statusBtnText}>ลบช่าง</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    backContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: sizes.md,
    },
    backBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        marginRight: 10,
    },
    backBtnText: {
        color: '#333',
        fontWeight: 'bold',
    },
    centerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primaryPurple,
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
        width: 34,
        height: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
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

    // ──── Modal Shared ────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ──── Form Modal ────
    formModalContent: {
        width: '90%',
        maxWidth: 680,
        maxHeight: '90%',
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    formModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 18,
        backgroundColor: colors.primaryPurple,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    formModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },

    formRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginTop: 18,
        gap: 16,
    },
    formField: {
        flex: 1,
        position: 'relative' as any,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    required: {
        color: '#F44336',
    },
    formInput: {
        height: 44,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 14,
        fontSize: 14,
        backgroundColor: '#fafafa',
        color: '#333',
    },
    formInputError: {
        borderColor: '#F44336',
    },
    formInputDisabled: {
        backgroundColor: '#f0f0f0',
        color: '#999',
    },
    formDropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    formError: {
        color: '#F44336',
        fontSize: 11,
        marginTop: 3,
    },
    eyeBtn: {
        marginLeft: -40,
        padding: 8,
    },

    // Modal Footer
    formModalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        paddingHorizontal: 24,
        paddingVertical: 18,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cancelBtn: {
        height: 44,
        paddingHorizontal: 24,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 14,
    },
    saveBtn: {
        height: 44,
        paddingHorizontal: 24,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primaryPurple,
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },

    // ──── PEA/Com Modal ────
    peaModalContent: {
        width: '80%',
        maxWidth: 600,
        height: '70%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    peaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    peaModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    peaSearchInput: {
        height: 44,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 14,
        fontSize: 14,
        backgroundColor: '#fafafa',
        marginBottom: 10,
    },
    peaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    peaItemCode: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.primaryPurple,
        width: 80,
    },
    peaItemName: {
        fontSize: 13,
        color: '#333',
        flex: 1,
    },

    // ──── Status Modal ────
    statusModalContent: {
        width: 360,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    statusIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    statusMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    statusBtn: {
        width: '100%',
        height: 46,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
