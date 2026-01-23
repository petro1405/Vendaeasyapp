
import React, { useState } from 'react';
import { db } from '../db';
import { User as UserIcon, Lock, LogIn, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'vendedor'>('vendedor');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Sanitização para evitar erros de e-mail inválido
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    console.log(`[Login] Tentando ${isRegisterMode ? 'Registro' : 'Login'} para: ${sanitizedUsername}`);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('O nome completo é obrigatório para registro.');
          setIsLoading(false);
          return;
        }
        
        const result = await db.registerUser({
          username: sanitizedUsername,
          name,
          role,
          password
        });
        
        if (result.success) {
          console.log("[Login] Registro bem sucedido");
          setSuccess(result.message);
          setTimeout(() => {
            setIsRegisterMode(false);
            setSuccess('');
          }, 1500);
        } else {
          console.error("[Login] Falha no registro:", result.message);
          setError(result.message);
        }
      } else {
        const email = `${sanitizedUsername}@venda-easy.com`;
        console.log(`[Login] Chamando db.login com e-mail: ${email}`);
        
        const user = await db.login(email, password);
        
        if (user) {
          console.log("[Login] Login bem sucedido, usuário:", user.name);
          onLogin();
        } else {
          console.warn("[Login] Usuário não retornado após login");
          setError('Erro ao carregar dados do usuário. Tente novamente.');
        }
      }
    } catch (err: any) {
      console.error("[Login] Erro capturado no handleSubmit:", err);
      
      // Mapeamento de erros comuns do Firebase Auth
      if (err.code === 'auth/invalid-email') {
        setError('O nome de usuário inserido é inválido.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Usuário ou senha incorretos.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Falha de conexão. Verifique sua internet.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Tente novamente mais tarde.');
      } else {
        setError(err.message || 'Erro inesperado. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-4">
             <span className="text-4xl font-black text-indigo-600">V</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">VendaEasy</h1>
          <p className="text-indigo-100 text-sm font-medium">Cloud Edition • Firebase Stable</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome Completo</label>
                  <input 
                    type="text" required placeholder="Ex: João Silva"
                    className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tipo de Acesso</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRole('vendedor')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${role === 'vendedor' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Vendedor</button>
                    <button type="button" onClick={() => setRole('admin')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${role === 'admin' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>Admin</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" required placeholder="Seu usuário"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="password" required placeholder="Sua senha"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 bg-red-50 p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-in slide-in-from-top-1">
                <AlertCircle className="shrink-0 mt-0.5" size={14}/>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="text-green-600 bg-green-50 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={14}/>
                <span>{success}</span>
              </div>
            )}

            <button 
              disabled={isLoading} 
              type="submit"
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isRegisterMode ? (
                  <>Cadastrar <UserPlus size={18} /></>
                ) : (
                  <>Entrar <LogIn size={18} /></>
                )
              )}
            </button>
          </form>

          <button 
            type="button"
            onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); setSuccess(''); }} 
            className="w-full text-indigo-600 font-black text-[10px] uppercase tracking-widest py-2 hover:opacity-70 transition-opacity"
          >
            {isRegisterMode ? 'Já tenho uma conta' : 'Criar nova conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
