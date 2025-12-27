
import React, { useState, useEffect, useCallback } from 'react';
import { UserRole, Client, Order, OrderStatus, User, ProductType, InventoryLog, PriceConfig, DEFAULT_PRICES } from './types';
import { MOCK_CLIENTS } from './constants';
import AdminDashboard from './views/AdminDashboard';
import WorkerWizard from './views/WorkerWizard';
import CustomerPortal from './views/CustomerPortal';

type LoginPhase = 'SELECTION' | 'PASSWORD_ENTRY' | 'WORKER_TYPE' | 'CUSTOMER_ENTRY';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryLog[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [priceConfig, setPriceConfig] = useState<PriceConfig>({
    general: DEFAULT_PRICES,
    specialPrices: {}
  });
  
  const [loginPhase, setLoginPhase] = useState<LoginPhase>('SELECTION');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedWorkerType, setSelectedWorkerType] = useState<ProductType | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  // Persistence Load
  useEffect(() => {
    const savedClients = localStorage.getItem('holbox_clients');
    const savedOrders = localStorage.getItem('holbox_orders');
    const savedInventory = localStorage.getItem('holbox_inventory');
    const savedPrices = localStorage.getItem('holbox_prices');
    
    if (savedClients) setClients(JSON.parse(savedClients));
    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedInventory) setInventory(JSON.parse(savedInventory));
    if (savedPrices) setPriceConfig(JSON.parse(savedPrices));
  }, []);

  // Persistence Save
  useEffect(() => {
    localStorage.setItem('holbox_clients', JSON.stringify(clients));
    localStorage.setItem('holbox_orders', JSON.stringify(orders));
    localStorage.setItem('holbox_inventory', JSON.stringify(inventory));
    localStorage.setItem('holbox_prices', JSON.stringify(priceConfig));
  }, [clients, orders, inventory, priceConfig]);

  const getUnitPrice = useCallback((clientId: string, product: ProductType) => {
    const special = priceConfig.specialPrices[clientId]?.[product];
    return special !== undefined ? special : priceConfig.general[product];
  }, [priceConfig]);

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(m => m !== msg));
    }, 5000);
  };

  const handleDeliveryComplete = useCallback((orderId: string, data: Partial<Order>) => {
    const deliveryTime = Date.now();
    const client = clients.find(c => c.id === data.clientId);
    if (!client) return;

    setOrders(prev => {
      const existing = prev.find(o => o.id === orderId);
      const updatedOrder = { 
        ...(existing || {}),
        ...data, 
        id: orderId, 
        status: OrderStatus.DELIVERED, 
        deliveryTime,
      } as Order;
      return [...prev.filter(o => o.id !== orderId), updatedOrder];
    });

    if (data.productType === ProductType.ICE && data.quantity) {
      setInventory(prev => [{
        id: `sale-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        quantity: data.quantity!,
        type: 'SALE',
        reason: `Venta: ${client.business}`
      }, ...prev]);
    }

    if (data.quantity) {
      setClients(prev => prev.map(c => 
        c.id === data.clientId ? { ...c, totalBagsAccumulated: (c.totalBagsAccumulated || 0) + data.quantity! } : c
      ));
      addNotification(`✅ ENTREGADO: ${client.business}`);
    }
  }, [clients]);

  const handleUpdateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    addNotification(`🚚 PEDIDO EN CAMINO`);
  }, []);

  const handleCreateOrder = (clientId: string, productType: ProductType, quantity: number) => {
    const unitPrice = getUnitPrice(clientId, productType);
    const amount = quantity * unitPrice;
    const client = clients.find(c => c.id === clientId);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      clientId,
      productType,
      quantity,
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      unitPrice,
      amount
    };
    
    setOrders(prev => [newOrder, ...prev]);
    addNotification(`🔔 NUEVO PEDIDO: ${client?.business}`);
  };

  const handleAddClient = (clientData: Omit<Client, 'id' | 'totalBagsAccumulated'>) => {
    setClients(prev => [...prev, { ...clientData, id: `client-${Date.now()}`, totalBagsAccumulated: 0 }]);
    addNotification(`🤝 CLIENTE REGISTRADO`);
  };

  const handleAddInventory = (qty: number, type: 'PRODUCTION' | 'WASTE', reason?: string) => {
    setInventory(prev => [{ id: `inv-${Date.now()}`, date: new Date().toISOString().split('T')[0], quantity: qty, type, reason }, ...prev]);
    addNotification(type === 'PRODUCTION' ? `🏭 CARGA FÁBRICA: ${qty}` : `❄️ MERMA: ${qty}`);
  };

  const logout = () => {
    setCurrentUser(null);
    setLoginPhase('SELECTION');
    setPasswordInput('');
    setSelectedWorkerType(null);
  };

  const handleLoginSubmit = () => {
    setError('');
    if (selectedRole === UserRole.ADMIN && passwordInput === 'Chelimviajero') {
      setCurrentUser({ id: 'admin', name: 'Admin', role: UserRole.ADMIN });
    } else if (selectedRole === UserRole.WORKER) {
      if (selectedWorkerType === ProductType.ICE && passwordInput === 'FLEX7') {
        setCurrentUser({ id: 'w-ice', name: 'Repartidor Hielo', role: UserRole.WORKER, currentRouteId: 'ICE' });
      } else if (selectedWorkerType === ProductType.WATER && passwordInput === 'ALONSO77') {
        setCurrentUser({ id: 'w-water', name: 'Repartidor Agua', role: UserRole.WORKER, currentRouteId: 'WATER' });
      } else setError('Contraseña de Ruta Incorrecta');
    } else if (selectedRole === UserRole.CUSTOMER) {
      const client = clients.find(c => c.business.toLowerCase().includes(passwordInput.trim().toLowerCase()));
      if (client) setCurrentUser({ id: client.id, name: client.name, role: UserRole.CUSTOMER });
      else setError('Negocio no registrado');
    } else if (passwordInput) setError('Credenciales Incorrectas');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((note, idx) => (
          <div key={idx} className="bg-[#0a3a6b] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-l-8 border-[#26bba4] animate-bounce">
            <i className="fa-solid fa-circle-check text-[#26bba4]"></i>
            <p className="font-black text-sm uppercase">{note}</p>
          </div>
        ))}
      </div>

      <main className="max-w-7xl mx-auto">
        {currentUser?.role === UserRole.ADMIN && (
          <AdminDashboard clients={clients} orders={orders} inventory={inventory} priceConfig={priceConfig} setPriceConfig={setPriceConfig} onAddInventory={handleAddInventory} onAddClient={handleAddClient} onAddOrder={handleCreateOrder} onLogout={logout} />
        )}
        {currentUser?.role === UserRole.WORKER && (
          <WorkerWizard clients={clients} orders={orders} workerType={currentUser.currentRouteId as ProductType} getUnitPrice={getUnitPrice} onCompleteDelivery={handleDeliveryComplete} onUpdateOrderStatus={handleUpdateOrderStatus} onLogout={logout} />
        )}
        {currentUser?.role === UserRole.CUSTOMER && (
          <CustomerPortal client={clients.find(c => c.id === currentUser.id)!} orders={orders} onNewOrder={handleCreateOrder} onLogout={logout} />
        )}

        {!currentUser && (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0a3a6b] to-[#041a31] text-white fixed inset-0 z-50 overflow-y-auto">
            <div className="text-center mb-8 max-w-sm w-full">
               <img src="https://images.unsplash.com/photo-1544413345-3f3603417646?q=80&w=300" alt="Ice" className="w-40 h-40 mx-auto mb-6 rounded-[3rem] border-4 border-white/20 shadow-2xl object-cover transform hover:rotate-6 transition-transform" />
               <h1 className="text-4xl font-black italic uppercase">Maya <span className="text-[#26bba4]">Caribbean</span></h1>
               <p className="text-blue-200 font-black uppercase text-[10px] tracking-[0.3em] mt-2">Hecho pa' aguantar</p>
            </div>

            <div className="w-full max-w-sm space-y-4">
              {loginPhase === 'SELECTION' && (
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => { setSelectedRole(UserRole.ADMIN); setLoginPhase('PASSWORD_ENTRY'); }} className="bg-[#0d4a86]/80 backdrop-blur-sm p-6 rounded-3xl flex items-center gap-4 border border-white/10 active:scale-95 transition-all">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-user-tie"></i></div>
                    <span className="text-lg font-black uppercase italic">Administrador</span>
                  </button>
                  <button onClick={() => setLoginPhase('WORKER_TYPE')} className="bg-[#0d4a86]/80 backdrop-blur-sm p-6 rounded-3xl flex items-center gap-4 border border-white/10 active:scale-95 transition-all">
                    <div className="w-12 h-12 bg-[#26bba4] rounded-2xl flex items-center justify-center"><i className="fa-solid fa-truck-ramp-box"></i></div>
                    <span className="text-lg font-black uppercase italic">Repartidor</span>
                  </button>
                  <button onClick={() => { setSelectedRole(UserRole.CUSTOMER); setLoginPhase('CUSTOMER_ENTRY'); }} className="bg-[#26bba4] p-6 rounded-3xl flex items-center gap-4 active:scale-95 transition-all">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><i className="fa-solid fa-store"></i></div>
                    <span className="text-lg font-black uppercase italic">Soy Cliente</span>
                  </button>
                </div>
              )}

              {loginPhase === 'WORKER_TYPE' && (
                <div className="space-y-6 animate-slide-up">
                  <h2 className="text-center font-black italic text-xl uppercase">¿Qué vas a repartir?</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setSelectedRole(UserRole.WORKER); setSelectedWorkerType(ProductType.ICE); setLoginPhase('PASSWORD_ENTRY'); }} className="bg-white/10 p-8 rounded-[2.5rem] border-2 border-blue-400/30 flex flex-col items-center gap-2 active:bg-blue-400/20">
                      <i className="fa-solid fa-snowflake text-4xl text-blue-300"></i>
                      <span className="text-xl font-black uppercase italic">Hielo</span>
                    </button>
                    <button onClick={() => { setSelectedRole(UserRole.WORKER); setSelectedWorkerType(ProductType.WATER); setLoginPhase('PASSWORD_ENTRY'); }} className="bg-white/10 p-8 rounded-[2.5rem] border-2 border-[#26bba4]/30 flex flex-col items-center gap-2 active:bg-[#26bba4]/20">
                      <i className="fa-solid fa-droplet text-4xl text-[#26bba4]"></i>
                      <span className="text-xl font-black uppercase italic">Agua</span>
                    </button>
                  </div>
                  <button onClick={() => setLoginPhase('SELECTION')} className="w-full text-blue-300 font-black uppercase text-xs mt-4">Regresar</button>
                </div>
              )}

              {(loginPhase === 'PASSWORD_ENTRY' || loginPhase === 'CUSTOMER_ENTRY') && (
                <div className="bg-[#0d4a86]/90 p-8 rounded-[3rem] shadow-2xl border border-white/10 space-y-6 animate-slide-up">
                  <h2 className="text-center font-black italic text-2xl uppercase">{loginPhase === 'CUSTOMER_ENTRY' ? 'Tu Negocio' : 'Contraseña'}</h2>
                  <div className="space-y-4">
                    <input autoFocus type={loginPhase === 'CUSTOMER_ENTRY' ? 'text' : 'password'} placeholder={loginPhase === 'CUSTOMER_ENTRY' ? "Ej. Restaurante Faro" : "••••"} className="w-full bg-blue-900/50 p-5 rounded-2xl border-2 border-white/10 text-center text-xl font-black outline-none focus:border-[#26bba4]" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()} />
                    {error && <p className="text-rose-400 text-[10px] font-black text-center uppercase">{error}</p>}
                    <button onClick={handleLoginSubmit} className="w-full bg-[#26bba4] p-5 rounded-2xl font-black text-xl italic uppercase">Ingresar</button>
                    <button onClick={() => { setLoginPhase(selectedRole === UserRole.WORKER ? 'WORKER_TYPE' : 'SELECTION'); setPasswordInput(''); setError(''); }} className="w-full text-blue-300 font-black uppercase text-[10px] tracking-widest">Regresar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
