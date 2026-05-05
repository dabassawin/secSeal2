import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './src/views/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import CompanyNavigator from './src/navigation/CompanyNavigator';
import { AuthService } from './src/services/AuthService';
import { TechnicianService } from './src/services/TechnicianService';
import { parseJwt } from './src/utils/jwt';
import { useInAppNotification } from './src/hooks/useInAppNotification';
import { usePushNotifications } from './src/hooks/usePushNotifications';


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCenter, setIsCenter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [techId, setTechId] = useState<number | null>(null);

  // ✅ WebSocket แจ้งเตือนขณะอยู่ใน foreground
  useInAppNotification(techId);

  // ✅ ลงทะเบียน Expo Push Token สำหรับแจ้งเตือนตอนแอปปิด/background
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // ✅ เมื่อได้ push token และล็อกอินแล้ว → ส่ง token ไปอัปเดตที่ backend
  useEffect(() => {
    if (expoPushToken && isAuthenticated) {
      TechnicianService.updatePushToken(expoPushToken);
    }
  }, [expoPushToken, isAuthenticated]);

  const checkLoginStatus = async () => {
    try {
      const token = await AuthService.getToken();
      if (token) {
        // ✅ ถ้า token หมดอายุ (หลัง 90 วัน) → ล้างออกและให้ login ใหม่
        if (isTokenExpired(token)) {
          await AuthService.logout();
          return;
        }
        const centerStatus = await AuthService.getIsCenter();
        const payload = parseJwt(token);
        if (payload && payload.tech_id) {
          setTechId(payload.tech_id);
        }
        setIsCenter(centerStatus);
        setIsAuthenticated(true);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ ตรวจสอบ JWT token expiry ฝั่ง client โดยไม่ต้องเรียก API
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = parseJwt(token);
      if (!payload || !payload.exp) return true;
      return payload.exp < Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  };

  const handleLoginSuccess = async () => {
    const centerStatus = await AuthService.getIsCenter();
    const token = await AuthService.getToken();
    if (token) {
      const payload = parseJwt(token);
      if (payload && payload.tech_id) {
        setTechId(payload.tech_id);
      }
    }
    setIsCenter(centerStatus);
    setIsAuthenticated(true);

    // ✅ ส่ง push token ไปบันทึกที่ backend ทันทีหลัง login
    if (expoPushToken) {
      TechnicianService.updatePushToken(expoPushToken);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        isCenter ? (
          <CompanyNavigator onLogout={() => { setIsAuthenticated(false); setTechId(null); }} />
        ) : (
          <AppNavigator onLogout={() => { setIsAuthenticated(false); setTechId(null); }} />
        )
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
