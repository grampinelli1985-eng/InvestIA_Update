import { useState, useEffect, useRef } from 'react'
import { usePortfolioStore } from './store/portfolioStore'
import { useAlertStore } from './store/alertStore'
import { useNavigationStore } from './store/navigationStore'
import { useThemeStore, ThemeMode } from './store/themeStore'
import { marketService } from './services/marketService'
import { AppView } from './services/aiService'
import { useAuthStore } from './store/authStore'
import { AlertPopup, AlertNotification } from './components/AlertPopup'
import { LoginView } from './views/LoginView'
import { DashboardView } from './views/DashboardView'
import { PortfolioView } from './views/PortfolioView'
import { TransactionsView } from './views/TransactionsView'
import { InsightsView } from './views/InsightsView'
import { RadarView } from './views/RadarView'
import { GlobalPulseView } from './views/GlobalPulseView'
import { PriceMonitorView } from './views/PriceMonitorView'
import { RentabilidadeView } from './views/RentabilidadeView'
import {
    LayoutDashboard,
    Briefcase,
    Sparkles,
    Target,
    Globe,
    LineChart,
    ChevronRight,
    LogOut,
    Settings,
    Bell,
    Menu,
    List,
    Sun,
    Moon,
    Monitor,
    TrendingUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
    const currentView = useNavigationStore(state => state.currentView);
    const setCurrentView = useNavigationStore(state => state.setCurrentView);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const alerts = useAlertStore(state => state.alerts);
    const theme = useThemeStore(state => state.theme);
    const setTheme = useThemeStore(state => state.setTheme);
    const user = useAuthStore(state => state.user);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const logout = useAuthStore(state => state.logout);

    const [notifications, setNotifications] = useState<AlertNotification[]>([]);
    const lastNotifiedTickers = useRef<Set<string>>(new Set());

    // Carregamento inicial de preços apenas quando autenticado (ANTI-LOOP)
    useEffect(() => {
        if (!isAuthenticated) return;

        // Força o reset do loading state caso tenha ficado travado em cache/localStorage
        usePortfolioStore.setState({ isLoadingPrices: false });

        const store = usePortfolioStore.getState();
        store.refreshPrices("App_Mount_Auth");

    }, [isAuthenticated]);


    // Monitoramento global de alertas (preços)
    useEffect(() => {
        if (alerts.length === 0) return;

        const monitorAlerts = async () => {
            const tickers = [...alerts.map(a => a.ticker)];
            const hasUSStocks = alerts.some(a => /^[A-Z]+$/.test(a.ticker));
            if (hasUSStocks && !tickers.includes('USDBRL=X')) {
                tickers.push('USDBRL=X');
            }

            try {
                const quotes = await marketService.fetchQuotes(tickers);
                const dollarRate = quotes['USDBRL=X']?.price || 5.0;

                const newNotifications: AlertNotification[] = [];

                alerts.forEach((alert) => {
                    const quote = quotes[alert.ticker];
                    if (!quote) return;

                    let currentPrice = quote.price;

                    // Se for Stock (Ticker apenas letras), converte
                    if (/^[A-Z]+$/.test(alert.ticker)) {
                        currentPrice = currentPrice * dollarRate;
                    }

                    let triggered = false;

                    if (alert.type === 'COMPRA' && currentPrice <= alert.target) {
                        triggered = true;
                    } else if (alert.type === 'VENDA' && currentPrice >= alert.target) {
                        triggered = true;
                    }

                    // Only notify if triggered and not already notified in this session
                    const alertKey = `${alert.ticker}-${alert.type}-${alert.target}`;
                    if (triggered && !lastNotifiedTickers.current.has(alertKey)) {
                        newNotifications.push({
                            id: crypto.randomUUID(),
                            ticker: alert.ticker,
                            target: alert.target,
                            currentPrice,
                            type: alert.type
                        });
                        lastNotifiedTickers.current.add(alertKey);
                    }
                });

                if (newNotifications.length > 0) {
                    setNotifications(prev => [...prev, ...newNotifications]);
                }
            } catch (error) {
                console.error("Erro no monitoramento de alertas:", error);
            }
        };

        const interval = setInterval(monitorAlerts, 60000); // Check every minute
        monitorAlerts(); // Initial check

        return () => clearInterval(interval);
    }, [alerts]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme !== 'auto') {
            root.classList.add(theme);
        }
    }, [theme]);

    const handleCloseNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'transactions', label: 'Lançamentos', icon: <List className="text-blue-600 dark:text-blue-400" size={20} /> },
        { id: 'portfolio', label: 'Carteira', icon: <Briefcase size={20} /> },
        { id: 'rentabilidade', label: 'Rentabilidade', icon: <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} /> },
        { id: 'insights', label: 'Insights IA', icon: <Sparkles size={20} /> },
        { id: 'radar', label: 'Radar InvestIA', icon: <Target className="text-rose-600 dark:text-rose-400" size={20} /> },
        { id: 'global', label: 'Pulso Global', icon: <Globe className="text-emerald-600 dark:text-emerald-400" size={20} /> },
        { id: 'precos', label: 'Preços B3', icon: <LineChart className="text-amber-600 dark:text-amber-400" size={20} /> },
    ];

    if (!isAuthenticated) {
        return <LoginView />;
    }

    return (
        <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] flex overflow-hidden font-sans selection:bg-blue-500/30 transition-colors duration-300">
            <div className="bg-mesh" />

            {/* Price Alert Popups */}
            <AlertPopup
                notifications={notifications}
                onClose={handleCloseNotification}
                onViewDetail={() => setCurrentView('precos')}
            />

            {/* Futuristic Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 88 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                className="glass border-r border-[var(--border-subtle)] flex flex-col z-[60] shrink-0 relative"
            >
                <div className="p-6 mb-4 flex items-center gap-3">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl shrink-0 flex items-center justify-center shadow-xl shadow-blue-500/20 cursor-pointer"
                        onClick={() => setCurrentView('dashboard')}
                    >
                        <span className="text-white font-black text-xl">I</span>
                    </motion.div>
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="text-2xl font-black tracking-tighter text-[var(--text-primary)] brand-font"
                            >
                                Investia
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                <nav className="px-3 space-y-1 mt-2 overflow-y-auto no-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id as AppView)}
                            className={`w-full relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-colors group group ${currentView === item.id
                                ? 'text-blue-500 dark:text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {currentView === item.id && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)] rounded-2xl z-0"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <div className={`relative z-10 transition-transform duration-300 ${currentView === item.id ? 'scale-110 text-blue-400' : 'group-hover:scale-110'} shrink-0`}>
                                {item.icon}
                            </div>

                            <AnimatePresence mode="popLayout">
                                {isSidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, transition: { duration: 0.1 } }}
                                        className="text-sm font-bold flex-1 text-left truncate relative z-10"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {isSidebarOpen && currentView === item.id && (
                                <motion.div
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="relative z-10"
                                >
                                    <ChevronRight size={14} className="text-blue-400" />
                                </motion.div>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-4 shrink-0">
                    <button className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-all group">
                        <Settings size={20} className="shrink-0 group-hover:rotate-45 transition-transform" />
                        {isSidebarOpen && <span className="text-sm font-medium">Configurações</span>}
                    </button>

                    <div className="flex items-center gap-3 p-2 bg-[var(--border-subtle)] rounded-[2rem] border border-[var(--border-subtle)] overflow-hidden">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-200 to-white dark:from-slate-800 dark:to-slate-700 shrink-0 overflow-hidden border border-[var(--border-subtle)] p-0.5">
                            <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=Felix&backgroundColor=0f172a`} className="w-full h-full rounded-xl" alt="User" />
                        </div>
                        <AnimatePresence>
                            {isSidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="flex-1 overflow-hidden"
                                >
                                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">{user?.name || 'Gleidson'}</p>
                                    <p className="text-[9px] text-blue-500 dark:text-blue-400 truncate uppercase font-black tracking-widest">{user?.plan || 'Premium'} AI</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {isSidebarOpen && (
                            <LogOut
                                onClick={logout}
                                size={16}
                                className="text-[var(--text-secondary)] hover:text-rose-500 cursor-pointer shrink-0 mr-2 transition-colors"
                            />
                        )}
                    </div>
                </div>
            </motion.aside>

            {/* Content Container */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Sleek Header */}
                <header className="h-20 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]/40 backdrop-blur-xl flex items-center justify-between px-10 shrink-0 z-50 transition-colors duration-300">
                    <div className="flex items-center gap-6">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-[var(--text-secondary)] flex items-center justify-center border border-transparent hover:border-[var(--border-subtle)]"
                        >
                            <Menu size={20} />
                        </motion.button>
                        <div className="h-6 w-px bg-[var(--border-subtle)]" />
                        <h2 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">
                            SYSTEM // {menuItems.find(m => m.id === currentView)?.label}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 items-center">
                            {(['light', 'dark', 'auto'] as ThemeMode[]).map((m) => (
                                <motion.button
                                    key={m}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setTheme(m)}
                                    className={`p-2 rounded-xl transition-all ${theme === m ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-blue-500'}`}
                                >
                                    {m === 'light' && <Sun size={16} />}
                                    {m === 'dark' && <Moon size={16} />}
                                    {m === 'auto' && <Monitor size={16} />}
                                </motion.button>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative p-3 bg-[var(--border-subtle)] hover:bg-[var(--border-glow)] rounded-2xl transition-colors text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                            onClick={() => setCurrentView('insights')}
                        >
                            <Bell size={18} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] rounded-full" />
                        </motion.button>

                        <div className="h-10 w-px bg-[var(--border-subtle)]" />

                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Market Status</span>
                            {(() => {
                                const now = new Date();
                                const brTime = new Intl.DateTimeFormat('pt-BR', {
                                    timeZone: 'America/Sao_Paulo',
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: false
                                }).formatToParts(now);

                                const hour = parseInt(brTime.find(p => p.type === 'hour')?.value || '0');
                                const day = now.getDay();
                                const isOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;

                                return (
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isOpen
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                        <span className="text-[10px] font-black tracking-widest">{isOpen ? 'OPEN' : 'CLOSED'}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </header>

                {/* Fluid View Transitions */}
                <main className="flex-1 overflow-y-auto custom-scrollbar relative px-8 py-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentView}
                            initial={{ opacity: 0, y: 15, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.99, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                            className="w-full h-full"
                        >
                            {currentView === 'dashboard' && <DashboardView />}
                            {currentView === 'transactions' && <TransactionsView />}
                            {currentView === 'portfolio' && <PortfolioView />}
                            {currentView === 'insights' && <InsightsView />}
                            {currentView === 'radar' && <RadarView />}
                            {currentView === 'rentabilidade' && <RentabilidadeView />}
                            {currentView === 'global' && <GlobalPulseView />}
                            {currentView === 'precos' && <PriceMonitorView />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    )
}

export default App
