import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { useNavigation } from '@react-navigation/native';

export const CreateSealScreen: React.FC = () => {
    const navigation = useNavigation();
    const [sealNumber, setSealNumber] = useState('');
    const [count, setCount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!sealNumber || !count) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const countNum = parseInt(count);
        if (isNaN(countNum) || countNum <= 0) {
            Alert.alert('Error', 'Count must be a valid number greater than 0');
            return;
        }

        setLoading(true);
        try {
            const response = await sealService.createSeal({
                seal_number: sealNumber,
                count: countNum
            });

            if (response && response.data) { // Assuming response.data contains the success message/data
                Alert.alert('Success', 'Seals created successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                // Fallback if response structure is different, though sealService handles errors usually
                Alert.alert('Success', 'Seals created successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create seals');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>สร้างซีลใหม่ (Batch)</Text>
                    <Text style={styles.subtitle}>ระบบจะทำการสร้าง Serial Number ให้อัตโนมัติตามจำนวนที่ระบุ</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>เลขซีลเริ่มต้น (Start Seal Number)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex. F0001"
                            value={sealNumber}
                            onChangeText={setSealNumber}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>จำนวน (Count)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex. 100"
                            value={count}
                            onChangeText={setCount}
                            keyboardType="numeric"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>ยืนยันการสร้าง</Text>
                        )}
                    </TouchableOpacity>
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
    container: {
        padding: sizes.md,
        flex: 1,
    },
    card: {
        backgroundColor: '#fff',
        padding: sizes.lg,
        borderRadius: sizes.radiusMd,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    title: {
        fontSize: sizes.fontLg,
        fontWeight: 'bold',
        color: colors.primaryPurple,
        marginBottom: sizes.xs,
    },
    subtitle: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
        marginBottom: sizes.lg,
    },
    formGroup: {
        marginBottom: sizes.md,
    },
    label: {
        fontSize: sizes.fontSm,
        color: colors.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: sizes.radiusMd,
        padding: 12,
        fontSize: sizes.fontMd,
        backgroundColor: '#fafafa',
    },
    button: {
        backgroundColor: colors.primaryPurple,
        padding: 14,
        borderRadius: sizes.radiusMd,
        alignItems: 'center',
        marginTop: sizes.md,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: sizes.fontMd,
    },
});
