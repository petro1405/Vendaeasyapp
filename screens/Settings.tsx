
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ShopInfo, User as UserType } from '../types';
import { Store, Save, Upload, Phone, MapPin, FileText, CheckCircle2, Image as ImageIcon, LogOut, User, Lock, Users, Monitor, MessageSquare } from 'lucide-react';

interface SettingsProps {
  onUpdate: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onUpdate, onLogout }) => {
  const [info, setInfo] = useState<ShopInfo>(db.getShopInfo());
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const currentUser = db.getAuthUser();
  const isAdmin = currentUser?.role === 'admin';
  const registeredUsers = isAdmin ? db.getUsers() : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isAdmin) return;
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInfo(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setStatus('saving');
    db.saveShopInfo(info);
    
    setTimeout(() => {
      setStatus('saved');
      onUpdate();
      setTimeout(() => setStatus('idle'), 2000);
    }, 600);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-gray-800">Configurações</h2>
          <p className="text-xs text-gray-500 font-medium">Gerencie sua conta e dados da loja.</p>
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

      {/* User Info Card */}
      <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-[2rem] flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
          <User size={24} />
        </div>
        <div>
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Sessão Ativa</div>
          <div className="font-black text-indigo-900">{currentUser?.name}</div>
          <div className="text-[9px] text-indigo-600/60 font-bold uppercase tracking-tighter">Nível: {currentUser?.role}</div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-amber-700">
          <Lock size={20} />
          <p className="text-[10px] font-black uppercase leading-tight">Funcionalidades de administrador bloqueadas para seu perfil.</p>
        </div>
      )}

      {isAdmin && registeredUsers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-800 font-bold px-1">
            <Users size={18} />
            <h3>Operadores do Sistema</h3>
          </div>
          <div className="bg-white rounded-[2rem] border border-gray-100 divide-y overflow-hidden shadow-sm">
            {registeredUsers.map(user => (
              <div key={user.username} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                    <User size={14} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">{user.name}</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">@{user.username}</div>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                  {user.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 pb-24">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center p-6 bg-white border border-dashed border-gray-200 rounded-[2.5rem] space-y-4">
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
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logotipo da Empresa</div>
            {!isAdmin && <div className="text-[9px] text-amber-500 font-bold uppercase mt-1">Somente Leitura</div>}
          </div>
        </div>

        {/* Dados da Loja */}
        <div className={`space-y-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm ${!isAdmin ? 'opacity-70' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Store size={18} className="text-indigo-600" />
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Dados da Empresa</h3>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">Nome da Loja</label>
            <input 
              name="name"
              required
              disabled={!isAdmin}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
              value={info.name}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">CNPJ</label>
            <input 
              name="cnpj"
              required
              disabled={!isAdmin}
              placeholder="00.000.000/0001-00"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
              value={info.cnpj}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">Telefone / WhatsApp</label>
            <input 
              name="phone"
              required
              disabled={!isAdmin}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
              value={info.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">Endereço Completo</label>
            <input 
              name="address"
              required
              disabled={!isAdmin}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
              value={info.address}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Parâmetros de Impressão */}
        <div className={`space-y-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm ${!isAdmin ? 'opacity-70' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Monitor size={18} className="text-amber-500" />
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Parâmetros de Impressão</h3>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">Nome do PDV / Terminal</label>
            <input 
              name="pdvName"
              disabled={!isAdmin}
              placeholder="Ex: CAIXA-01"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
              value={info.pdvName || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">Mensagem do Rodapé</label>
            <textarea 
              name="receiptMessage"
              disabled={!isAdmin}
              rows={3}
              placeholder="Ex: Obrigado pela preferência! Guarde seu comprovante para trocas."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed resize-none"
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
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : status === 'saved' ? (
              <>Salvo com Sucesso <CheckCircle2 size={20} /></>
            ) : (
              <>Salvar Configurações <Save size={20} /></>
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default Settings;
