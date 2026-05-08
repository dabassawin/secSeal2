import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { API_CONFIG } from '../config/api.config';

// กำหนดให้แสดงแจ้งเตือนแบบเด้งลงมาแม้ตอนที่กำลังเปิดแอปอยู่
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const useInAppNotification = (techId: number | null | undefined) => {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ขออนุญาตแสดงแจ้งเตือนบนเครื่อง
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    requestPermissions();

    if (!techId) return;

    const connect = () => {
      // ต่อ WebSocket ไปที่ช่องเฉพาะสำหรับช่างแต่ละคน
      const wsUrl = `ws://${API_CONFIG.SERVER_IP}:${API_CONFIG.SERVER_PORT}/ws/tech_${techId}`;
      const socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        if (typeof event.data === 'string' && event.data.startsWith('notification:')) {
          const parts = event.data.split(':');
          if (parts.length >= 3) {
            const title = parts[1];
            const body = parts.slice(2).join(':'); // เผื่อมี colon ใน body
            
            // สั่งให้แจ้งเตือนเด้งลงมา (Local Notification)
            Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
              },
              trigger: null, // trigger ทันที
            });
          }
        }
      };

      socket.onclose = () => {
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      socket.onerror = () => {
        socket.close();
      };

      ws.current = socket;
    };

    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [techId]);
};
