import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            'react-native': 'react-native-web',
            '@': path.resolve(__dirname, './src'),
        },
        extensions: ['.web.js', '.js', '.web.jsx', '.jsx', '.web.ts', '.ts', '.web.tsx', '.tsx', '.json'],
    },
    server: {
        port: 3000,
        open: true,
    },
    optimizeDeps: {
        esbuildOptions: {
            resolveExtensions: ['.web.js', '.js', '.web.jsx', '.jsx', '.web.ts', '.ts', '.web.tsx', '.tsx'],
            loader: {
                '.js': 'jsx',
            },
        },
    },
});
