
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { ShopInfo, User as UserType, PasswordResetRequest } from '../types';
import { Store, Save, Upload, Image as ImageIcon, LogOut, User, Lock, Users, Monitor, RefreshCcw, Download, Shield, ShieldAlert, ArrowLeftRight, Trash2, KeyRound, CheckCircle2, AlertCircle, ShieldQuestion, X } from 'lucide-react';

interface SettingsProps {
  onUpdate: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onUpdate, onLogout }) => {
  const [info, setInfo] = useState<ShopInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<UserType[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);

  // Password Change States
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passStatus, setPassStatus] = useState<{ type: 'success' | 'error' | 'idle', msg: string }>({ type: 'idle', msg: '' });

  const isAdmin = currentUser?.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    const [shopInfo, user] = await Promise.all([
      db.getShopInfo(),
      db.getAuthUser()
    ]);
    setInfo(shopInfo);
    setCurrentUser(user);
    if (user?.role === 'admin') {
      const [users, requests] = await Promise.all([
        db.getUsers(),
        db.getResetRequests()
      ]);
      setRegisteredUsers(users);
      setResetRequests(requests);
    }
    setLoading(false);
  };

  useEffect(() => {
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

  const handlePassChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus({ type: 'idle', msg: '' });

    if (newPass !== confirmPass) {
      setPassStatus({ type: 'error', msg: 'As senhas não coincidem.' });
      return;
    }

    if (newPass.length < 6) {
      setPassStatus({ type: 'error', msg: 'A senha deve ter pelo menos 6 dígitos.' });
      return;
    }

    const result = await db.changePassword(currentPass, newPass);
    if (result.success) {
      setPassStatus({ type: 'success', msg: result.message });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassStatus({ type: 'idle', msg: '' }), 3000);
    } else {
      setPassStatus({ type: 'error', msg: result.message });
    }
  };

  const toggleUserRole = async (user: UserType) => {
    if (!isAdmin || user.uid === currentUser?.uid) return;
    const newRole = user.role === 'admin' ? 'vendedor' : 'admin';
    if (confirm(`Deseja alterar o cargo de ${user.name} para ${newRole.toUpperCase()}?`)) {
      await db.updateUserRole(user.uid!, newRole);
      const updatedUsers = await db.getUsers();
      setRegisteredUsers(updatedUsers);
    }
  };

  const handleDeleteUser = async (user: UserType) => {
    if (!isAdmin || user.uid === currentUser?.uid) return;
    if (confirm(`ATENÇÃO: Deseja realmente EXCLUIR o usuário ${user.name}? Ele perderá acesso ao sistema imediatamente.`)) {
      await db.deleteUser(user.uid!);
      const updatedUsers = await db.getUsers();
      setRegisteredUsers(updatedUsers);
    }
  };

  const handleResolveReset = async (req: PasswordResetRequest) => {
    if (!isAdmin) return;
    
    const targetUser = registeredUsers.find(u => u.username === req.username);
    if (!targetUser) {
      alert(`Usuário "@${req.username}" não encontrado na base de dados ativa.`);
      return;
    }

    if (confirm(`Autorizar redefinição para ${targetUser.name} (@${req.username})? O usuário será excluído para permitir um novo registro.`)) {
      try {
        await db.resolvePasswordReset(req.id, targetUser.uid!);
        alert("Reset autorizado. Informe ao usuário que ele pode se registrar novamente.");
        loadData();
      } catch (err: any) {
        alert("Erro ao autorizar reset: " + err.message);
      }
    }
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
          <p className="text-xs text-gray-500 font-medium">Configurações do sistema e equipe.</p>
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
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Meu Perfil</div>
          <div className="font-black text-indigo-900">{currentUser?.name}</div>
          <div className="text-[9px] text-indigo-600/60 font-bold uppercase tracking-tighter flex items-center gap-1">
            {currentUser?.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
            Cargo: {currentUser?.role}
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={18} className="text-indigo-600" />
          <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Minha Segurança</h3>
        </div>
        <form onSubmit={handlePassChange} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Senha Atual</label>
            <input 
              type="password" required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              value={currentPass} onChange={(e) => setCurrentPass(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Nova Senha</label>
              <input 
                type="password" required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newPass} onChange={(e) => setNewPass(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Confirmar</label>
              <input 
                type="password" required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
              />
            </div>
          </div>
          {passStatus.type !== 'idle' && (
            <div className={`p-2 rounded-xl text-[10px] font-bold flex items-center gap-2 ${passStatus.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {passStatus.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {passStatus.msg}
            </div>
          )}
          <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
            Atualizar Senha
          </button>
        </form>
      </div>

      {isAdmin && resetRequests.length > 0 && (
        <div className="space-y-4 bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShieldQuestion size={18} className="text-amber-600" />
            <h3 className="text-sm font-black uppercase text-amber-800 tracking-tight">Solicitações de Senha</h3>
          </div>
          <div className="space-y-2">
            {resetRequests.map(req => {
              const u = registeredUsers.find(user => user.username === req.username);
              return (
                <div key={req.id} className="flex items-center justify-between p-4 bg-white rounded-3xl shadow-sm border border-amber-200">
                  <div className="flex-1">
                    <div className="text-xs font-black text-gray-800">{u?.name || "Usuário Desconhecido"}</div>
                    <div className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">@{req.username}</div>
                    <div className="text-[8px] text-gray-400 font-bold uppercase mt-1">Solicitado em: {new Date(req.date).toLocaleDateString()}</div>
                  </div>
                  <button 
                    onClick={() => handleResolveReset(req)}
                    className="px-5 py-2.5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-amber-200 active:scale-95"
                  >
                    Autorizar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-indigo-600" />
            <h3 className="text-sm font-black uppercase text-gray-800 tracking-tight">Gestão de Equipe</h3>
          </div>
          
          <div className="space-y-3">
            {registeredUsers.map(user => (
              <div key={user.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                    {user.role === 'admin' ? <Shield size={14} /> : <User size={14} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">{user.name}</div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{user.role}</div>
                  </div>
                </div>
                
                {user.uid !== currentUser?.uid && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleUserRole(user)}
                      className="p-2 text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                      title="Alterar Cargo"
                    >
                      <ArrowLeftRight size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user)}
                      className="p-2 text-red-500 hover:bg-white rounded-xl transition-all shadow-sm active:scale-90"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
          <ShieldAlert size={20} />
          <p className="text-[10px] font-black uppercase leading-tight">Painel administrativo restrito.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 pb-24">
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
