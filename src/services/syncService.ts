import { supabase } from './supabase';
import { usePortfolioStore } from '../store/portfolioStore';
import { useAlertStore } from '../store/alertStore';

export const syncService = {
    // Busca dados do Supabase
    fetchUserData: async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_data')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 é "not found"
                throw error;
            }

            if (data) {
                usePortfolioStore.setState({
                    assets: data.portfolio || [],
                    dividends: data.dividends || []
                });
                useAlertStore.setState({ alerts: data.alerts || [] });
                return true;
            }
            return false;
        } catch (error) {
            console.error("Erro ao buscar dados do Supabase:", error);
            return false;
        }
    },

    // Salva dados no Supabase (Upsert)
    saveUserData: async (userId: string) => {
        if (!userId || userId.startsWith('demo-')) return;

        try {
            const portfolioState = usePortfolioStore.getState();
            const alertState = useAlertStore.getState();

            const { error } = await supabase
                .from('user_data')
                .upsert({
                    user_id: userId,
                    portfolio: portfolioState.assets,
                    dividends: portfolioState.dividends,
                    alerts: alertState.alerts,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
        } catch (error) {
            console.error("Erro ao salvar dados no Supabase:", error);
        }
    }
};
