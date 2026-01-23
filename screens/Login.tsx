
import React, { useState } from 'react';
import { db } from '../db';
import { User as UserIcon, Lock, LogIn, AlertCircle, UserPlus, ShieldCheck, ChevronLeft, CheckCircle2 } from 'lucide-react';

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

    try {
      if (isRegisterMode) {
        const result = await db.registerUser({
          username,
          name,
          role,
          password
        });
        
        if (result.success) {
          setSuccess(result.message);
          setTimeout(() => {
            setIsRegisterMode(false);
            setSuccess('');
          }, 1500);
        } else {
          setError(result.message);
        }
      } else {
        // Firebase Auth usa email. Vamos mockar email a partir do username para o VendaEasy
        const email = `${username.toLowerCase()}@venda-easy.com`;
        const user = await db.login(email, password);
        if (user) {
          onLogin();
        } else {
          setError('Usuário não encontrado no banco de dados.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.code === 'auth/user-not-found' ? 'Usuário não cadastrado.' : 
             err.code === 'auth/wrong-password' ? 'Senha incorreta.' : 
             err.message || 'Falha na conexão com Firebase.');
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
          <p className="text-indigo-100 text-sm font-medium">Cloud Edition • Firebase Auth</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome Completo</label>
                  <input 
                    type="text" required placeholder="Ex: João Silva"
                    className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tipo de Acesso</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRole('vendedor')} className={`py-3 rounded-xl text-[10px] font-black uppercase border ${role === 'vendedor' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>Vendedor</button>
                    <button type="button" onClick={() => setRole('admin')} className={`py-3 rounded-xl text-[10px] font-black uppercase border ${role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400'}`}>Admin</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" required placeholder="Nome de usuário"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="password" required placeholder="Mínimo 6 caracteres"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && <div className="text-red-500 bg-red-50 p-3 rounded-xl text-xs font-bold flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
            {success && <div className="text-green-600 bg-green-50 p-3 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle2 size={14}/>{success}</div>}

            <button disabled={isLoading} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-50">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 
                (isRegisterMode ? <>Cadastrar <UserPlus size={18} /></> : <>Entrar <LogIn size={18} /></>)}
            </button>
          </form>

          <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="w-full text-indigo-600 font-black text-[10px] uppercase tracking-widest py-2">
            {isRegisterMode ? 'Já tenho uma conta' : 'Criar nova conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
