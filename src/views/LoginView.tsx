import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, UserPlus, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

export const LoginView = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const login = useAuthStore(state => state.login);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let authResponse;

            if (isLogin) {
                authResponse = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });
            } else {
                authResponse = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            full_name: formData.name,
                        }
                    }
                });
            }

            if (authResponse.error) throw authResponse.error;

            const { user: supaUser, session } = authResponse.data;

            if (supaUser && session) {
                login({
                    id: supaUser.id,
                    name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'Usuário',
                    email: supaUser.email || '',
                    plan: 'PREMIUM'
                }, session.access_token);
            }
        } catch (error: any) {
            console.error("Erro Supabase:", error);

            if (confirm(`Erro: ${error.message}. Deseja entrar em MODO DE DEMONSTRAÇÃO (dados locais)?`)) {
                const mockUser = {
                    id: 'demo-' + Date.now(),
                    name: formData.name || 'Usuário Demo',
                    email: formData.email || 'demo@investia.com',
                    plan: 'PREMIUM' as const
                };
                login(mockUser, 'demo-token');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-deep)] relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 p-6 z-10">
                {/* Lado Esquerdo: Branding / Welcome */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col justify-center space-y-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20">
                            <span className="text-white font-black text-4xl">I</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter brand-font text-[var(--text-primary)]">
                            Investia
                        </h1>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-4xl font-bold text-[var(--text-primary)] leading-tight">
                            Domine seus investimentos com <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                Inteligência Artificial.
                            </span>
                        </h2>
                        <p className="text-[var(--text-secondary)] text-lg font-medium max-w-md">
                            A plataforma definitiva para quem busca precisão técnica, análise fundamentalista clássica e monitoramento em tempo real.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl flex flex-col gap-2">
                            <ShieldCheck className="text-blue-500" size={24} />
                            <span className="text-sm font-bold">Segurança de Dados</span>
                            <span className="text-[10px] text-[var(--text-secondary)]">Sua carteira criptografada e protegida.</span>
                        </div>
                        <div className="p-4 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-2xl flex flex-col gap-2">
                            <Sparkles className="text-amber-500" size={24} />
                            <span className="text-sm font-bold">Insights IA</span>
                            <span className="text-[10px] text-[var(--text-secondary)]">Algoritmos avançados de valuation.</span>
                        </div>
                    </div>
                </motion.div>

                {/* Lado Direito: Formulário */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="w-full bg-[var(--card-bg)] border border-[var(--border-subtle)] shadow-3xl p-10 rounded-[3rem]">
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tighter">
                                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
                            </h3>
                            <p className="text-[var(--text-secondary)] text-xs font-medium">
                                {isLogin ? 'Acesse seu painel estratégico agora.' : 'Comece sua jornada para a liberdade financeira.'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 tracking-widest pl-1">Nome Completo</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pt-0 pointer-events-none text-[var(--text-secondary)] group-focus-within:text-blue-500 transition-colors">
                                                <UserPlus size={18} />
                                            </div>
                                            <input
                                                required
                                                type="text"
                                                className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm"
                                                placeholder="Como gostaria de ser chamado?"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 tracking-widest pl-1">E-mail</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pt-0 pointer-events-none text-[var(--text-secondary)] group-focus-within:text-blue-500 transition-colors">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm"
                                        placeholder="seu@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase mb-2 tracking-widest pl-1">Senha</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pt-0 pointer-events-none text-[var(--text-secondary)] group-focus-within:text-blue-500 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-sm"
                                        placeholder="············"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                                {isLogin && (
                                    <div className="flex justify-end mt-2">
                                        <button type="button" className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest">Esqueceu a senha?</button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {isLogin ? 'Entrar no Sistema' : 'Criar Conta Premium'}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-[var(--border-subtle)] text-center">
                            <p className="text-[var(--text-secondary)] text-sm font-medium">
                                {isLogin ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="ml-2 text-blue-500 font-bold hover:underline"
                                >
                                    {isLogin ? 'Cadastre-se agora' : 'Faça login'}
                                </button>
                            </p>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};
