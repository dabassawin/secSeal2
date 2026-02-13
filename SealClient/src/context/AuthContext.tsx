import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService, User } from '../services/authService';
import { setAuthToken } from '../services/api';

interface AuthContextType {
    user: User | null;
    role: 'staff' | 'technician' | null;
    isLoading: boolean;
    login: (username: string, password: string, type: 'staff' | 'technician') => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'staff' | 'technician' | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAuthData = async () => {
            try {
                const token = await authService.getToken();
                const storedRole = await authService.getUserRole() as 'staff' | 'technician' | null;

                if (token && storedRole) {
                    setAuthToken(token);
                    setRole(storedRole);
                    // Only implementing basic restore. Ideally, verify token or fetch user profile here.
                    setUser({ id: 0, username: 'Restored User', role: storedRole });
                }
            } catch (e) {
                console.error('Failed to load auth data', e);
            } finally {
                setIsLoading(false);
            }
        };

        loadAuthData();
    }, []);

    const login = async (username: string, password: string, type: 'staff' | 'technician') => {
        try {
            setIsLoading(true);
            let userData: User;

            if (type === 'staff') {
                userData = await authService.loginStaff(username, password);
                setRole('staff');
            } else {
                userData = await authService.loginTechnician(username, password);
                setRole('technician');
            }

            setUser(userData);
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
            setUser(null);
            setRole(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
