import { useEffect, useRef } from 'react';
import { API_CONFIG } from '../config/api.config';

/**
 * Custom hook for real-time WebSocket updates in the Technician App
 * @param peaCode - The PEA code to listen for updates
 * @param onMessage - Callback function when a message is received
 */
export const useRealtime = (peaCode: string | undefined, onMessage: (msg: string) => void) => {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!peaCode) return;

        const wsUrl = `ws://${API_CONFIG.SERVER_IP}:${API_CONFIG.SERVER_PORT}/ws/${peaCode}`;

        const connect = () => {
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
            };

            socket.onmessage = (event) => {
                onMessage(event.data);
            };

            socket.onclose = (e) => {
                // Delay reconnection to avoid spamming the server
                setTimeout(() => {
                    if (peaCode) connect();
                }, 5000);
            };

            socket.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                socket.close();
            };

            ws.current = socket;
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [peaCode]);

    return ws.current;
};
