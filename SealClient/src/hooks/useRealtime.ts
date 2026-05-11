import { useEffect, useRef } from 'react';

import api from '@/services/api';

const getWsBaseUrl = () => {
    const base = (api.defaults.baseURL || '').replace(/\/$/, '');
    if (!base) return '';
    if (base.startsWith('https://')) return base.replace('https://', 'wss://');
    if (base.startsWith('http://')) return base.replace('http://', 'ws://');
    return base;
};

export const useRealtime = (peaCode: string | undefined, onMessage: (msg: string) => void) => {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!peaCode) return;

        const connect = () => {
            const wsBase = getWsBaseUrl();
            if (!wsBase) return;

            const socket = new WebSocket(`${wsBase}/ws/${peaCode}`);

            socket.onopen = () => {
            };

            socket.onmessage = (event) => {
                onMessage(event.data);
            };

            socket.onclose = () => {
                setTimeout(connect, 3000);
            };

            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
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
