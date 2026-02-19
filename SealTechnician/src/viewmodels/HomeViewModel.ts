import { useState, useEffect } from 'react';
import { TechnicianService, Seal } from '../services/TechnicianService';

export const useHomeViewModel = () => {
    const [seals, setSeals] = useState<Seal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSeals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await TechnicianService.getAssignedSeals();
            setSeals(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load seals');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSeals();
    }, []);

    return {
        seals,
        isLoading,
        error,
        fetchSeals
    };
};
