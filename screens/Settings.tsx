
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ShopInfo, User as UserType } from '../types';
import { Store, Save, Upload, Image as ImageIcon, LogOut, User, Lock, Users, Monitor, RefreshCcw, Download } from 'lucide-react';

interface SettingsProps {
  onUpdate: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onUpdate, onLogout }) => {
  const [info, setInfo] = useState<ShopInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<UserType[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [shopInfo, user] = await Promise.all([
        db.getShopInfo(),
        db.getAuthUser()
      ]);
      setInfo(shopInfo);
      setCurrentUser(user);
      if (user?.role === 'admin') {
        const users = await db.getUsers();
        setRegisteredUsers(users);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isAdmin || !info) return;
    const { name, value } = e.target;
    setInfo(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin || !info) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInfo(prev => prev ? ({ ...prev, logo: reader.result as string }) : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !info) return;
    setStatus('saving');
    await db.saveShopInfo(info);
    
    setTimeout(() => {
      setStatus('saved');
      onUpdate();
      setTimeout(() => setStatus('idle'), 2000);
    }, 600);
  };

  if (loading || !info) {
    return (
      <div className="flex justify-center p-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-800">Ajustes</h2>
          <p className="text-xs text-gray-500 font-medium">Configurações do sistema e banco de dados.</p>
        </div>
        <button 
          onClick={() => {
            if(confirm('Deseja realmente sair?')) onLogout();
          }}
          className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-[2rem] flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
          <User size={24} />
        </div>
        <div>
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Usuário Atual</div>
          <div className="font-black text-indigo-900">{currentUser?.name}</div>
          <div className="text-[9px] text-indigo-600/60 font-bold uppercase tracking-tighter">Nível: {currentUser?.role}</div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => db.exportData()}
            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-3xl gap-2 shadow-sm active:scale-95 transition-all"
          >
            <Download size={20} className="text-indigo-600" />
            <span className="text-[9px] font-black uppercase text-gray-400">Exportar Dados</span>
          </button>
          <button 
            onClick={() => db.resetDatabase()}
            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-3xl gap-2 shadow-sm active:scale-95 transition-all"
          >
            <RefreshCcw size={20} className="text-red-400" />
            <span className="text-[9px] font-black uppercase text-gray-400">Resetar App</span>
          </button>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-700">
          <Lock size={20} />
          <p className="text-[10px] font-black uppercase leading-tight">Painel administrativo restrito.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 pb-24">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center p-6 bg-white border border-dashed border-gray-200 rounded-[2.5rem] space-y-4 shadow-sm">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shadow-inner">
              {info.logo ? (
                <img src={info.logo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon size={32} className="text-gray-300" />
              )}
            </div>
            {isAdmin && (
              <label className="absolute -right-2 -bottom-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg cursor-pointer active:scale-90 transition-all">
                <Upload size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            )}
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marca da Empresa</div>
          </div>
        </div>

        <div className={`space-y-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm ${!isAdmin ? 'opacity-70' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Store size={18} className="text-indigo-600" />
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Dados da Loja</h3>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome Comercial</label>
            <input 
              name="name"
              required
              disabled={!isAdmin}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={info.name}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">CNPJ</label>
            <input 
              name="cnpj"
              required
              disabled={!isAdmin}
              placeholder="00.000.000/0001-00"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={info.cnpj}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Telefone / Whats</label>
            <input 
              name="phone"
              required
              disabled={!isAdmin}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={info.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Endereço</label>
            <input 
              name="address"
              required
              disabled={!isAdmin}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={info.address}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className={`space-y-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm ${!isAdmin ? 'opacity-70' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Monitor size={18} className="text-amber-500" />
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Recibo e Impressão</h3>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">ID do PDV</label>
            <input 
              name="pdvName"
              disabled={!isAdmin}
              placeholder="Ex: TERMINAL-01"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={info.pdvName || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Rodapé do Recibo</label>
            <textarea 
              name="receiptMessage"
              disabled={!isAdmin}
              rows={3}
              placeholder="Sua mensagem aqui..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              value={info.receiptMessage || ''}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {isAdmin && (
          <button 
            type="submit"
            disabled={status !== 'idle'}
            className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
              status === 'saved' ? 'bg-green-500 text-white shadow-green-100' : 'bg-indigo-600 text-white shadow-indigo-100'
            }`}
          >
            {status === 'saving' ? (
              <RefreshCcw className="animate-spin" size={20} />
            ) : status === 'saved' ? (
              <>Salvo com Sucesso <Save size={20} /></>
            ) : (
              <>Salvar Alterações <Save size={20} /></>
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default Settings;
