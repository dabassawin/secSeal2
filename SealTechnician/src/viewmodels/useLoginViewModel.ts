import { useState } from 'react';
import { AuthService } from '../services/AuthService';

export const useLoginViewModel = (onLoginSuccess: () => void) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async () => {
        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await AuthService.login(username, password);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        username,
        setUsername,
        password,
        setPassword,
        isLoading,
        error,
        login,
    };
};
