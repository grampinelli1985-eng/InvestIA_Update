import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Alert {
    ticker: string;
    target: number;
    type: 'COMPRA' | 'VENDA';
}

interface AlertStore {
    alerts: Alert[];
    isAIMonitoringActive: boolean;
    addAlert: (alert: Alert) => void;
    updateAlert: (index: number, alert: Alert) => void;
    removeAlert: (index: number) => void;
    setAlerts: (alerts: Alert[]) => void;
    toggleAIMonitoring: () => void;
}

export const useAlertStore = create<AlertStore>()(
    persist(
        (set) => ({
            alerts: [
                { ticker: 'WRLD11', target: 88.00, type: 'COMPRA' },
                { ticker: 'BOVA11', target: 130.00, type: 'VENDA' },
                { ticker: 'IVVB11', target: 285.00, type: 'COMPRA' },
            ],
            isAIMonitoringActive: false,

            addAlert: (alert) => set((state) => ({
                alerts: [...state.alerts, alert]
            })),

            updateAlert: (index, alert) => set((state) => {
                const newAlerts = [...state.alerts];
                newAlerts[index] = alert;
                return { alerts: newAlerts };
            }),

            removeAlert: (index) => set((state) => ({
                alerts: state.alerts.filter((_, i) => i !== index)
            })),

            setAlerts: (alerts) => set({ alerts }),

            toggleAIMonitoring: () => set((state) => ({
                isAIMonitoringActive: !state.isAIMonitoringActive
            })),
        }),
        {
            name: 'investia-alerts-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
