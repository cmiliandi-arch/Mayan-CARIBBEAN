
import React, { useMemo, useState } from 'react';
import { Client, Order, PaymentMethod, OrderStatus, ProductType, InventoryLog, ClientClassification, PriceConfig } from '../types';
import HolboxMap from '../components/HolboxMap';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AdminDashboardProps {
  clients: Client[];
  orders: Order[];
  inventory: InventoryLog[];
  priceConfig: PriceConfig;
  setPriceConfig: React.Dispatch<React.SetStateAction<PriceConfig>>;
  onAddInventory: (qty: number, type: 'PRODUCTION' | 'WASTE', reason?: string) => void;
  onAddClient: (client: Omit<Client, 'id' | 'totalBagsAccumulated'>) => void;
  onAddOrder: (clientId: string, productType: ProductType, qty: number) => void;
  onLogout: () => void;
}

const COLORS = ['#26bba4', '#0a3a6b', '#F59E0B', '#6366F1'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  clients, orders, inventory, priceConfig, setPriceConfig,
  onAddInventory, onAddClient, onAddOrder, onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'PENDING' | 'INVENTORY' | 'MAP' | 'CLIENTS' | 'CONFIG'>('STATS');
  const [statsPeriod, setStatsPeriod] = useState<'DIARIO' | 'MENSUAL'>('DIARIO');
  const [qtyInput, setQtyInput] = useState('');
  const [selectedClientForPrice, setSelectedClientForPrice] = useState<string | null>(null);

  const [clientForm, setClientForm] = useState<Omit<Client, 'id' | 'totalBagsAccumulated'>>({
    business: '',
    name: '',
    phone: '',
    lat: 21.526,
    lng: -87.376,
    avgMonthlyPurchase: 0,
    classification: ClientClassification.REGULAR
  });

  const analysis = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filterByDate = (arr: any[], from: Date, to: Date = new Date()) => 
      arr.filter(x => {
        const d = new Date(x.timestamp || x.deliveryTime || x.date);
        return d >= from && d <= to;
      });

    const calculateTotals = (items: Order[]) => {
      const res = { total: 0, ice: 0, water: 0, bags: 0, waste: 0, cash: 0, credit: 0, card: 0, transfer: 0 };
      items.forEach(o => {
        res.total += o.amount;
        if (o.productType === ProductType.ICE) res.ice += o.amount;
        else res.water += o.amount;
        res.bags += o.quantity;
        
        if (o.paymentMethod === PaymentMethod.CASH) res.cash += o.amount;
        else if (o.paymentMethod === PaymentMethod.CREDIT) res.credit += o.amount;
        else if (o.paymentMethod === PaymentMethod.CARD) res.card += o.amount;
        else if (o.paymentMethod === PaymentMethod.TRANSFER) res.transfer += o.amount;
      });
      return res;
    };

    const delivered = orders.filter(o => o.status === OrderStatus.DELIVERED);
    const dailyOrders = delivered.filter(o => new Date(o.deliveryTime!).toISOString().split('T')[0] === todayStr);
    const monthlyOrders = filterByDate(delivered, last30Days);

    const dayTotals = calculateTotals(dailyOrders);
    const monthTotals = calculateTotals(monthlyOrders);

    const currentTotals = statsPeriod === 'DIARIO' ? dayTotals : monthTotals;

    const totalProd = inventory.filter(i => i.type === 'PRODUCTION').reduce((a, b) => a + b.quantity, 0);
    const totalWaste = inventory.filter(i => i.type === 'WASTE').reduce((a, b) => a + b.quantity, 0);
    const totalSold = delivered.filter(o => o.productType === ProductType.ICE).reduce((a, b) => a + b.quantity, 0);
    const stock = totalProd - totalSold - totalWaste;

    const weekDays = [...Array(7)].map((_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const ds = d.toISOString().split('T')[0];
      const dayOrders = delivered.filter(o => new Date(o.deliveryTime!).toISOString().split('T')[0] === ds);
      return { name: d.toLocaleDateString('es-MX', { weekday: 'short' }), total: dayOrders.reduce((a, b) => a + b.amount, 0) };
    });

    const topClient = clients.map(c => ({ 
      ...c, 
      vol: monthlyOrders.filter(o => o.clientId === c.id).reduce((a, b) => a + b.quantity, 0)
    })).sort((a, b) => b.vol - a.vol)[0];

    return { 
      currentTotals, weekDays, stock, topClient
    };
  }, [orders, inventory, clients, statsPeriod]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== OrderStatus.DELIVERED), [orders]);

  const handlePriceUpdate = (type: ProductType, val: number) => {
    setPriceConfig(prev => ({ ...prev, general: { ...prev.general, [type]: val } }));
  };

  const handleSpecialPrice = (clientId: string, type: ProductType, val: string) => {
    const numVal = parseInt(val);
    setPriceConfig(prev => {
      const newSpecial = { ...(prev.specialPrices[clientId] || {}) };
      if (isNaN(numVal)) delete newSpecial[type];
      else newSpecial[type] = numVal;
      
      const newSpecialPrices = { ...prev.specialPrices };
      if (Object.keys(newSpecial).length === 0) delete newSpecialPrices[clientId];
      else newSpecialPrices[clientId] = newSpecial;

      return { ...prev, specialPrices: newSpecialPrices };
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-6">
          <button onClick={onLogout} className="bg-slate-100 text-slate-500 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex items-center gap-4">
            <img 
              src="https://raw.githubusercontent.com/diego-maya-caribbean/assets/main/maya-caribbean-logo.png" 
              alt="Logo" 
              className="h-12 w-auto"
              onError={(e) => e.currentTarget.src = "https://images.unsplash.com/photo-1544413345-3f3603417646?q=80&w=100"}
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-[#0a3a6b] italic uppercase">Maya Caribbean</h1>
              <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest italic">Cerebro de Operaciones</p>
            </div>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'STATS', label: 'Reportes' },
            { id: 'PENDING', label: 'Pendientes' },
            { id: 'CLIENTS', label: 'Clientes' },
            { id: 'INVENTORY', label: 'Producción' },
            { id: 'CONFIG', label: 'Precios' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[90px] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-white text-[#0a3a6b] shadow-sm' : 'text-slate-400'}`}>
              {tab.label}
              {tab.id === 'PENDING' && activeOrders.length > 0 && (
                <span className="ml-2 bg-rose-500 text-white w-4 h-4 rounded-full inline-flex items-center justify-center text-[8px]">{activeOrders.length}</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'STATS' && (
        <div className="space-y-6">
          <div className="flex bg-white p-2 rounded-2xl shadow-sm w-fit mx-auto border border-slate-100">
            {['DIARIO', 'MENSUAL'].map(p => (
              <button key={p} onClick={() => setStatsPeriod(p as any)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${statsPeriod === p ? 'bg-[#0a3a6b] text-white' : 'text-slate-400'}`}>{p}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0a3a6b] p-6 rounded-[2rem] text-white shadow-lg">
              <p className="text-white/60 text-[9px] font-black uppercase mb-1">Venta {statsPeriod}</p>
              <p className="text-3xl font-black italic">${analysis.currentTotals.total.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-l-8 border-[#26bba4] shadow-sm">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Bolsas Totales</p>
              <p className="text-2xl font-black text-[#26bba4] italic">{analysis.currentTotals.bags}u</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-l-8 border-amber-500 shadow-sm">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Stock Fábrica</p>
              <p className="text-2xl font-black text-amber-500 italic">{analysis.stock}u</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-l-8 border-rose-500 shadow-sm">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Cliente VIP</p>
              <p className="text-lg font-black text-rose-500 italic uppercase truncate leading-none">{analysis.topClient?.business || '---'}</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-4">
             <div className="p-4 bg-emerald-50 rounded-2xl"><p className="text-[10px] font-black text-emerald-600 uppercase">Efectivo</p><p className="text-xl font-black text-[#0a3a6b]">${analysis.currentTotals.cash}</p></div>
             <div className="p-4 bg-blue-50 rounded-2xl"><p className="text-[10px] font-black text-blue-600 uppercase">Tarjeta</p><p className="text-xl font-black text-[#0a3a6b]">${analysis.currentTotals.card}</p></div>
             <div className="p-4 bg-indigo-50 rounded-2xl"><p className="text-[10px] font-black text-indigo-600 uppercase">SPEI</p><p className="text-xl font-black text-[#0a3a6b]">${analysis.currentTotals.transfer}</p></div>
             <div className="p-4 bg-rose-50 rounded-2xl"><p className="text-[10px] font-black text-rose-600 uppercase">Crédito</p><p className="text-xl font-black text-[#0a3a6b]">${analysis.currentTotals.credit}</p></div>
          </div>
        </div>
      )}

      {activeTab === 'PENDING' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6 flex items-center gap-3">
              <i className="fa-solid fa-bell-concierge text-[#26bba4]"></i> Monitoreo de Pedidos en Vivo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeOrders.length > 0 ? (
                activeOrders.map(o => {
                  const client = clients.find(c => c.id === o.clientId);
                  return (
                    <div key={o.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${o.status === OrderStatus.PENDING ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                          {o.status === OrderStatus.PENDING ? 'Por Atender' : 'En Reparto'}
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{new Date(o.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div>
                        <p className="text-lg font-black text-[#0a3a6b] uppercase italic truncate">{client?.business}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{client?.name}</p>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl">
                        <i className={`fa-solid ${o.productType === ProductType.ICE ? 'fa-snowflake text-blue-400' : 'fa-droplet text-teal-400'}`}></i>
                        <span className="font-black italic text-[#0a3a6b]">{o.quantity} {o.productType === ProductType.ICE ? 'Bolsas de Hielo' : 'Garrafones'}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center">
                  <i className="fa-solid fa-check-circle text-4xl text-[#26bba4] mb-4"></i>
                  <p className="font-black text-slate-400 uppercase italic">Operación al día. No hay pedidos pendientes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CLIENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6">Cartera de Clientes</h3>
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="pb-4">Negocio</th>
                  <th className="pb-4">Estado</th>
                  <th className="pb-4">Vol. Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clients.map(c => (
                  <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-black text-[#0a3a6b] italic uppercase text-xs">{c.business}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                        c.classification === 'GOOD' ? 'bg-emerald-100 text-emerald-600' : 
                        c.classification === 'REGULAR' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {c.classification}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-black text-slate-700">{c.totalBagsAccumulated}u</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6">Nuevo Cliente</h3>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              onAddClient(clientForm); 
              setClientForm({ business: '', name: '', phone: '', lat: 21.526, lng: -87.376, avgMonthlyPurchase: 0, classification: ClientClassification.REGULAR });
              setActiveTab('CLIENTS'); 
            }} className="space-y-4">
              <input required type="text" value={clientForm.business} onChange={e => setClientForm({...clientForm, business: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-xs outline-none" placeholder="Negocio" />
              <input required type="text" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-xs outline-none" placeholder="Responsable" />
              <button type="submit" className="w-full bg-[#26bba4] text-white p-4 rounded-xl font-black italic uppercase text-xs shadow-lg">Registrar</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'CONFIG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6">Precios Generales</h3>
             <div className="space-y-4">
                <div className="p-4 bg-[#0a3a6b] rounded-2xl text-white">
                  <p className="text-[9px] font-black uppercase opacity-60 mb-1">🧊 Hielo</p>
                  <input type="number" value={priceConfig.general[ProductType.ICE]} onChange={e => handlePriceUpdate(ProductType.ICE, parseInt(e.target.value))} className="bg-transparent text-2xl font-black italic outline-none w-full border-b border-white/20" />
                </div>
                <div className="p-4 bg-[#26bba4] rounded-2xl text-white">
                  <p className="text-[9px] font-black uppercase opacity-60 mb-1">💧 Agua</p>
                  <input type="number" value={priceConfig.general[ProductType.WATER]} onChange={e => handlePriceUpdate(ProductType.WATER, parseInt(e.target.value))} className="bg-transparent text-2xl font-black italic outline-none w-full border-b border-white/20" />
                </div>
             </div>
           </div>
        </div>
      )}

      {activeTab === 'INVENTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase">Producción JIT</h3>
            <div className="space-y-4">
              <input type="number" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} placeholder="Cantidad" className="w-full bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 text-3xl font-black outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { if(qtyInput) { onAddInventory(parseInt(qtyInput), 'PRODUCTION'); setQtyInput(''); } }} className="bg-[#0a3a6b] text-white p-6 rounded-2xl font-black uppercase text-xs">Entrada</button>
                <button onClick={() => { if(qtyInput) { onAddInventory(parseInt(qtyInput), 'WASTE', 'Merma'); setQtyInput(''); } }} className="bg-rose-500 text-white p-6 rounded-2xl font-black uppercase text-xs">Baja</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'MAP' && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <HolboxMap clients={clients} orders={orders} />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
