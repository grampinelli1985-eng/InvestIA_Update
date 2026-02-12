import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
    id: string;
    name: string;
    email: string;
    plan: 'FREE' | 'PREMIUM';
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    token: string | null;
    login: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            token: null,

            login: (user, token) => set({
                user,
                token,
                isAuthenticated: true
            }),

            logout: () => {
                // Ao deslogar, limpamos dados sensíveis
                set({ user: null, token: null, isAuthenticated: false });
                localStorage.removeItem('investia-auth-storage');
            }
        }),
        {
            name: 'investia-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
