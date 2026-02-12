import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppView } from '../services/aiService';

interface NavigationState {
    currentView: AppView;
    setCurrentView: (view: AppView) => void;
}

export const useNavigationStore = create<NavigationState>()(
    persist(
        (set) => ({
            currentView: 'dashboard',
            setCurrentView: (view) => set({ currentView: view }),
        }),
        {
            name: 'investia-navigation-storage',
        }
    )
);
