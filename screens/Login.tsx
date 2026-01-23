
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    setTimeout(() => {
      if (isRegisterMode) {
        const result = db.registerUser({
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
            setError('');
          }, 1500);
        } else {
          setError(result.message);
        }
        setIsLoading(false);
      } else {
        const user = db.login(username, password);
        if (user) {
          onLogin();
        } else {
          setError('Usuário ou senha incorretos.');
          setIsLoading(false);
        }
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-4 rotate-3 transform transition-transform hover:rotate-0">
             <span className="text-4xl font-black text-indigo-600">V</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">VendaEasy</h1>
          <p className="text-indigo-100 text-sm font-medium">
            {isRegisterMode ? 'Crie sua conta de acesso' : 'Gestão simplificada para sua loja'}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome Completo</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text"
                      required
                      placeholder="Ex: João Silva"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Tipo de Acesso</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('vendedor')}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        role === 'vendedor' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-gray-50 text-gray-400 border-gray-100'
                      }`}
                    >
                      Vendedor
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        role === 'admin' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-gray-50 text-gray-400 border-gray-100'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Usuário</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text"
                  required
                  placeholder="Nome de usuário"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="password"
                  required
                  placeholder="Sua senha"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 size={14} />
                {success}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isRegisterMode ? (
                  <>Cadastrar Agora <UserPlus size={18} /></>
                ) : (
                  <>Entrar <LogIn size={18} /></>
                )
              )}
            </button>
          </form>

          <div className="pt-2">
            <button 
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
                setSuccess('');
              }}
              className="w-full flex items-center justify-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest py-2 rounded-xl hover:bg-indigo-50 transition-all"
            >
              {isRegisterMode ? (
                <> <ChevronLeft size={14} /> Já tenho uma conta</>
              ) : (
                <> Criar nova conta <UserPlus size={14} /></>
              )}
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">
            {isRegisterMode ? 'Cadastro de Operador' : 'Acesso Restrito'} • V1.2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
