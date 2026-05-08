import { useEffect, useRef } from 'react';
import { API_CONFIG } from '../config/api.config';

/**
 * Custom hook for real-time WebSocket updates in the Technician App
 * @param peaCode - The PEA code to listen for updates
 * @param onMessage - Callback function when a message is received
 */
export const useRealtime = (peaCode: string | undefined, onMessage: (msg: string) => void) => {
    const ws = useRef<WebSocket | null>(null);
    const isMounted = useRef<boolean>(false);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!peaCode) return;

        isMounted.current = true;

        const wsUrl = `ws://${API_CONFIG.SERVER_IP}:${API_CONFIG.SERVER_PORT}/ws/${peaCode}`;

        const connect = () => {
            // ไม่ reconnect ถ้า component ถูก unmount แล้ว
            if (!isMounted.current) return;

            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
            };

            socket.onmessage = (event) => {
                if (isMounted.current) {
                    onMessage(event.data);
                }
            };

            socket.onclose = () => {
                if (!isMounted.current) return;
                // Delay reconnection to avoid spamming the server
                reconnectTimer.current = setTimeout(() => {
                    connect();
                }, 5000);
            };

            socket.onerror = () => {
                // ไม่ log error เพราะ onclose จะถูกเรียกต่อและจัดการ reconnect อยู่แล้ว
                // การ log ซ้ำทุก reconnect cycle ทำให้ console เต็ม
                socket.close();
            };

            ws.current = socket;
        };

        connect();

        return () => {
            isMounted.current = false;
            // ยกเลิก timer reconnect ที่รอค้างอยู่
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
                reconnectTimer.current = null;
            }
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [peaCode]);

    return ws.current;
};
