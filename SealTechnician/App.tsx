import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import LoginScreen from './src/views/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import CompanyNavigator from './src/navigation/CompanyNavigator';
import { AuthService } from './src/services/AuthService';
import { parseJwt } from './src/utils/jwt';


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCenter, setIsCenter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    checkLoginStatus();
  }, []);



  const checkLoginStatus = async () => {
    try {
      const token = await AuthService.getToken();
      if (token) {
        // ✅ ถ้า token หมดอายุ (หลัง 90 วัน) → ล้างออกและให้ login ใหม่
        // ป้องกัน error loop แทนที่จะเอา token หมดอายุไปเข้าแอป
        if (isTokenExpired(token)) {
          await AuthService.logout();
          return; // isAuthenticated ยังเป็น false → แสดงหน้า Login
        }
        const centerStatus = await AuthService.getIsCenter();
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
    setIsCenter(centerStatus);
    setIsAuthenticated(true);
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
          <CompanyNavigator onLogout={() => setIsAuthenticated(false)} />
        ) : (
          <AppNavigator onLogout={() => setIsAuthenticated(false)} />
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
