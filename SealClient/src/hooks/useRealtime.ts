import { useEffect, useRef } from 'react';

// Use the same base IP as your API
const WS_BASE_URL = 'ws://192.168.1.37:3000';

export const useRealtime = (peaCode: string | undefined, onMessage: (msg: string) => void) => {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!peaCode) return;

        const connect = () => {
            const socket = new WebSocket(`${WS_BASE_URL}/ws/${peaCode}`);

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
