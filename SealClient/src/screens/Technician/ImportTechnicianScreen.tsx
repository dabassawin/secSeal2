import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Header } from '@/components/dashboard';

export const ImportTechnicianScreen: React.FC = () => {
    return (
        <View style={styles.container}>
            <Header />
            <View style={styles.content}>
                <Text style={styles.title}>นำเข้าข้อมูลช่าง (Coming Soon)</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f7f9' },
    content: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#333' }
});
