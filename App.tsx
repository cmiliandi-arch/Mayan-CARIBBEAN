
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

  const sendWhatsAppNotification = (order: Order, client: Client) => {
    const adminPhone = "+527771375797";
    const timeStr = new Date(order.deliveryTime!).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const text = `*MAYA CARIBBEAN - ENTREGA CONFIRMADA*%0A%0A` +
                 `*Cliente:* ${client.business}%0A` +
                 `*Producto:* ${order.productType === ProductType.ICE ? '🧊 Hielo' : '💧 Agua'}%0A` +
                 `*Cantidad:* ${order.quantity} unidades%0A` +
                 `*Pago:* ${order.paymentMethod}%0A` +
                 `*Total:* $${order.amount} MXN%0A` +
                 `*Hora:* ${timeStr}%0A%0A` +
                 `_Hecho pa' aguantar_`;
    
    console.log("Notificación WhatsApp (Admin):", text);
  };

  const handleDeliveryComplete = useCallback((orderId: string, data: Partial<Order>) => {
    const deliveryTime = Date.now();
    const durationMinutes = data.timestamp ? Math.floor((deliveryTime - data.timestamp) / 60000) : 0;
    const client = clients.find(c => c.id === data.clientId);

    if (!client) return;

    setOrders(prev => {
      const updatedOrder = { 
        ...data, 
        id: orderId, 
        status: OrderStatus.DELIVERED, 
        deliveryTime,
        durationMinutes
      } as Order;

      sendWhatsAppNotification(updatedOrder, client);
      return [...prev.filter(o => o.id !== orderId), updatedOrder];
    });

    // Descuento automático de inventario si es Hielo
    if (data.productType === ProductType.ICE && data.quantity) {
      const saleLog: InventoryLog = {
        id: `sale-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        quantity: data.quantity,
        type: 'SALE',
        reason: `Venta: ${client.business}`
      };
      setInventory(prev => [saleLog, ...prev]);
    }

    // Actualizar acumulado de cliente
    if (data.quantity) {
      setClients(prev => prev.map(c => 
        c.id === data.clientId 
          ? { ...c, totalBagsAccumulated: (c.totalBagsAccumulated || 0) + (data.quantity || 0) } 
          : c
      ));
      addNotification(`✅ ENTREGA: ${client.business}`);
    }
  }, [clients]);

  const handleAddClient = (clientData: Omit<Client, 'id' | 'totalBagsAccumulated'>) => {
    const newClient: Client = {
      ...clientData,
      id: `client-${Date.now()}`,
      totalBagsAccumulated: 0
    };
    setClients(prev => [...prev, newClient]);
    addNotification(`🤝 REGISTRO EXITOSO: ${newClient.business}`);
  };

  const handleAddInventory = (qty: number, type: 'PRODUCTION' | 'WASTE', reason?: string) => {
    const log: InventoryLog = {
      id: `inv-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      quantity: qty,
      type,
      reason
    };
    setInventory(prev => [log, ...prev]);
    addNotification(type === 'PRODUCTION' ? `🏭 INGRESO FÁBRICA: ${qty} bolsas` : `❄️ MERMA REGISTRADA: ${qty} bolsas`);
  };

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(m => m !== msg));
    }, 5000);
  };

  const handleCreateOrder = (order: Partial<Order>) => {
    if (!order.clientId || !order.productType) return;
    const unitPrice = getUnitPrice(order.clientId, order.productType);
    const amount = (order.quantity || 0) * unitPrice;

    const newOrder = {
      ...order,
      id: `ord-${Date.now()}`,
      status: OrderStatus.PENDING,
      timestamp: Date.now(),
      unitPrice,
      amount
    } as Order;
    setOrders(prev => [newOrder, ...prev]);
    addNotification(`🆕 NUEVO PEDIDO: ${clients.find(c => c.id === order.clientId)?.business}`);
  };

  const logout = () => {
    setCurrentUser(null);
    setLoginPhase('SELECTION');
    setPasswordInput('');
    setError('');
  };

  const handleLoginSubmit = () => {
    setError('');
    const normalizedInput = passwordInput.trim().toLowerCase();

    if (selectedRole === UserRole.ADMIN) {
      if (passwordInput === 'Chelimviajero') {
        setCurrentUser({ id: 'admin', name: 'Admin', role: UserRole.ADMIN });
      } else setError('Contraseña Incorrecta');
    } 
    else if (selectedRole === UserRole.WORKER) {
      if (selectedWorkerType === ProductType.ICE && passwordInput === 'FLEX7') {
        setCurrentUser({ id: 'w1', name: 'Repartidor Hielo', role: UserRole.WORKER });
      } else if (selectedWorkerType === ProductType.WATER && passwordInput === 'ALONSO77') {
        setCurrentUser({ id: 'w2', name: 'Repartidor Agua', role: UserRole.WORKER });
      } else setError('Contraseña de Ruta Incorrecta');
    }
    else if (selectedRole === UserRole.CUSTOMER) {
      const client = clients.find(c => c.business.toLowerCase().includes(normalizedInput));
      if (client) {
        setCurrentUser({ id: client.id, name: client.name, role: UserRole.CUSTOMER });
      } else setError('Negocio no registrado');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((note, idx) => (
          <div key={idx} className="bg-[#0a3a6b] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-l-8 border-[#26bba4] animate-bounce">
            <i className="fa-solid fa-circle-check text-[#26bba4]"></i>
            <p className="font-black text-sm uppercase tracking-tight">{note}</p>
          </div>
        ))}
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8 pb-24">
        {currentUser?.role === UserRole.ADMIN && (
          <AdminDashboard 
            clients={clients} 
            orders={orders} 
            inventory={inventory}
            priceConfig={priceConfig}
            setPriceConfig={setPriceConfig}
            onAddInventory={handleAddInventory}
            onAddClient={handleAddClient}
            onAddOrder={(clientId, productType, qty) => handleCreateOrder({ clientId, productType, quantity: qty })} 
            onLogout={logout}
          />
        )}
        {currentUser?.role === UserRole.WORKER && (
          <WorkerWizard 
            clients={clients} 
            getUnitPrice={getUnitPrice}
            onCompleteDelivery={handleDeliveryComplete} 
            onLogout={logout} 
          />
        )}
        {currentUser?.role === UserRole.CUSTOMER && (
          <CustomerPortal 
            client={clients.find(c => c.id === currentUser.id) || clients[0]} 
            orders={orders} 
            onNewOrder={() => handleCreateOrder({ clientId: currentUser.id, quantity: 10, productType: ProductType.ICE })} 
            onLogout={logout} 
          />
        )}

        {!currentUser && (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0a3a6b] to-[#041a31] text-white fixed inset-0 z-50 overflow-y-auto">
            <div className="text-center mb-8 max-w-sm w-full">
              <div className="relative w-48 h-48 mx-auto mb-6 drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500">
                <img 
                  src="https://images.unsplash.com/photo-1544413345-3f3603417646?q=80&w=1000&auto=format&fit=crop" 
                  alt="Ice Bag Maya Caribbean" 
                  className="w-full h-full object-cover rounded-[3rem] border-4 border-white/20"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#26bba4] px-6 py-2 rounded-full border-2 border-white shadow-xl">
                  <span className="font-black italic uppercase text-xs tracking-widest text-white">Maya Caribbean</span>
                </div>
              </div>
              <h1 className="text-4xl font-black italic uppercase text-white mb-1">
                Maya <span className="text-[#26bba4]">Caribbean</span>
              </h1>
              <div className="h-1 w-20 bg-[#26bba4] mx-auto mb-2 rounded-full"></div>
              <p className="text-blue-200 font-black uppercase text-sm tracking-[0.2em] italic">
                Hecho pa' aguantar
              </p>
            </div>

            <div className="w-full max-w-sm space-y-4">
              {loginPhase === 'SELECTION' && (
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => { setSelectedRole(UserRole.ADMIN); setLoginPhase('PASSWORD_ENTRY'); }} className="bg-[#0d4a86]/80 backdrop-blur-sm p-6 rounded-3xl flex items-center gap-4 border border-white/10 shadow-2xl active:scale-95 transition-all group hover:bg-[#0a3a6b]">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform"><i className="fa-solid fa-user-tie"></i></div>
                    <span className="text-lg font-black uppercase italic">Administrador</span>
                  </button>
                  <button onClick={() => setLoginPhase('WORKER_TYPE')} className="bg-[#0d4a86]/80 backdrop-blur-sm p-6 rounded-3xl flex items-center gap-4 border border-white/10 shadow-2xl active:scale-95 transition-all group hover:bg-[#0a3a6b]">
                    <div className="w-12 h-12 bg-[#26bba4] rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform"><i className="fa-solid fa-truck-ramp-box"></i></div>
                    <span className="text-lg font-black uppercase italic">Repartidor</span>
                  </button>
                  <button onClick={() => { setSelectedRole(UserRole.CUSTOMER); setLoginPhase('CUSTOMER_ENTRY'); }} className="bg-[#26bba4] p-6 rounded-3xl flex items-center gap-4 shadow-2xl active:scale-95 transition-all group hover:bg-[#1e9683]">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform"><i className="fa-solid fa-store"></i></div>
                    <span className="text-lg font-black uppercase italic">Soy Cliente</span>
                  </button>
                </div>
              )}

              {loginPhase === 'WORKER_TYPE' && (
                <div className="space-y-6 animate-slide-up">
                  <h2 className="text-center font-black italic text-xl uppercase tracking-tighter">¿Qué vas a repartir?</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => { setSelectedRole(UserRole.WORKER); setSelectedWorkerType(ProductType.ICE); setLoginPhase('PASSWORD_ENTRY'); }} className="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border-2 border-blue-400/30 flex flex-col items-center gap-2 active:bg-blue-400/20 transition-all hover:border-blue-400">
                      <i className="fa-solid fa-ice-cream text-4xl text-blue-300"></i>
                      <span className="text-xl font-black uppercase italic tracking-tighter">Hielo</span>
                    </button>
                    <button onClick={() => { setSelectedRole(UserRole.WORKER); setSelectedWorkerType(ProductType.WATER); setLoginPhase('PASSWORD_ENTRY'); }} className="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] border-2 border-[#26bba4]/30 flex flex-col items-center gap-2 active:bg-[#26bba4]/20 transition-all hover:border-[#26bba4]">
                      <i className="fa-solid fa-droplet text-4xl text-[#26bba4]"></i>
                      <span className="text-xl font-black uppercase italic tracking-tighter">Agua</span>
                    </button>
                  </div>
                  <button onClick={() => setLoginPhase('SELECTION')} className="w-full bg-blue-900/40 py-4 rounded-2xl text-blue-300 font-black uppercase text-sm mt-4 border border-blue-300/10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-arrow-left"></i> REGRESAR
                  </button>
                </div>
              )}

              {(loginPhase === 'PASSWORD_ENTRY' || loginPhase === 'CUSTOMER_ENTRY') && (
                <div className="bg-[#0d4a86]/90 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 space-y-6 animate-slide-up">
                  <h2 className="text-center font-black italic text-2xl uppercase tracking-tighter">{loginPhase === 'CUSTOMER_ENTRY' ? 'Tu Negocio' : 'Contraseña'}</h2>
                  <div className="space-y-4">
                    <input 
                      autoFocus 
                      type={loginPhase === 'CUSTOMER_ENTRY' ? 'text' : 'password'} 
                      placeholder={loginPhase === 'CUSTOMER_ENTRY' ? "Ej. Restaurante El Faro" : "••••"} 
                      className="w-full bg-blue-900/50 p-5 rounded-2xl border-2 border-white/10 text-center text-xl font-black focus:border-[#26bba4] outline-none placeholder:text-blue-300/30" 
                      value={passwordInput} 
                      onChange={(e) => setPasswordInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()} 
                    />
                    {error && <p className="text-rose-400 text-xs font-black text-center uppercase animate-pulse">{error}</p>}
                    <button onClick={handleLoginSubmit} className="w-full bg-[#26bba4] p-5 rounded-2xl font-black text-xl italic uppercase shadow-xl shadow-teal-900/40 active:scale-95 transition-transform">INGRESAR</button>
                    <button onClick={() => { setLoginPhase(selectedRole === UserRole.WORKER ? 'WORKER_TYPE' : 'SELECTION'); setPasswordInput(''); setError(''); }} className="w-full bg-blue-900/20 py-4 rounded-2xl text-blue-300 font-black uppercase text-sm flex items-center justify-center gap-2 border border-blue-300/5"><i className="fa-solid fa-arrow-left"></i> REGRESAR</button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-12 opacity-30 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Holbox Ice Hub v2.5</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
