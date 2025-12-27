
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
  const [activeTab, setActiveTab] = useState<'STATS' | 'INVENTORY' | 'MAP' | 'CLIENTS' | 'CONFIG'>('STATS');
  const [statsPeriod, setStatsPeriod] = useState<'DIARIO' | 'SEMANAL' | 'MENSUAL'>('DIARIO');
  const [qtyInput, setQtyInput] = useState('');
  const [selectedClientForPrice, setSelectedClientForPrice] = useState<string | null>(null);
  
  // Forms
  const [clientForm, setClientForm] = useState({
    business: '', name: '', phone: '', lat: 21.526, lng: -87.376, 
    classification: ClientClassification.GOOD, avgMonthlyPurchase: 0
  });

  const analysis = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

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
        else res.transfer += o.amount;
      });
      return res;
    };

    const delivered = orders.filter(o => o.status === OrderStatus.DELIVERED);
    const dailyOrders = delivered.filter(o => new Date(o.deliveryTime!).toISOString().split('T')[0] === todayStr);
    const monthlyOrders = filterByDate(delivered, last30Days);
    const prevMonthlyOrders = filterByDate(delivered, prev30Days, last30Days);

    const dayTotals = calculateTotals(dailyOrders);
    const monthTotals = calculateTotals(monthlyOrders);
    const prevMonthTotals = calculateTotals(prevMonthlyOrders);

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

    const growth = prevMonthTotals.total > 0 ? ((monthTotals.total - prevMonthTotals.total) / prevMonthTotals.total * 100).toFixed(1) : "100";
    const topClient = clients.map(c => ({ 
      ...c, 
      vol: monthlyOrders.filter(o => o.clientId === c.id).reduce((a, b) => a + b.quantity, 0)
    })).sort((a, b) => b.vol - a.vol)[0];

    return { 
      dayTotals, monthTotals, growth, weekDays, stock, totalWaste, topClient,
      wasteRatio: totalProd > 0 ? ((totalWaste / totalProd) * 100).toFixed(1) : "0"
    };
  }, [orders, inventory, clients]);

  const handlePriceUpdate = (type: ProductType, val: number) => {
    setPriceConfig(prev => ({ ...prev, general: { ...prev.general, [type]: val } }));
  };

  const handleSpecialPrice = (clientId: string, type: ProductType, val: string) => {
    const numVal = parseInt(val);
    setPriceConfig(prev => {
      const newSpecial = { ...(prev.specialPrices[clientId] || {}) };
      if (isNaN(numVal)) {
        delete newSpecial[type];
      } else {
        newSpecial[type] = numVal;
      }
      
      const newSpecialPrices = { ...prev.specialPrices };
      if (Object.keys(newSpecial).length === 0) {
        delete newSpecialPrices[clientId];
      } else {
        newSpecialPrices[clientId] = newSpecial;
      }

      return { ...prev, specialPrices: newSpecialPrices };
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="bg-slate-100 text-slate-500 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#0a3a6b] italic uppercase leading-none">Maya <span className="text-[#26bba4]">Caribbean</span></h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">Gestión de Precios Holbox</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
          {['STATS', 'CLIENTS', 'INVENTORY', 'MAP', 'CONFIG'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 min-w-[90px] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-[#0a3a6b] shadow-sm' : 'text-slate-400'}`}>
              {tab === 'STATS' ? 'Reportes' : tab === 'CLIENTS' ? 'Clientes' : tab === 'INVENTORY' ? 'Inventario' : tab === 'CONFIG' ? 'Precios' : 'Mapa'}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'STATS' && (
        <div className="space-y-6">
          <div className="flex bg-white p-2 rounded-2xl shadow-sm w-fit mx-auto border border-slate-100">
            {['DIARIO', 'SEMANAL', 'MENSUAL'].map(p => (
              <button key={p} onClick={() => setStatsPeriod(p as any)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${statsPeriod === p ? 'bg-[#0a3a6b] text-white' : 'text-slate-400'}`}>{p}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border-l-8 border-[#0a3a6b] shadow-sm">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Caja {statsPeriod}</p>
              <p className="text-2xl font-black text-[#0a3a6b] italic">${(statsPeriod === 'DIARIO' ? analysis.dayTotals.total : analysis.monthTotals.total).toLocaleString()} <span className="text-[10px] not-italic">MXN</span></p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-l-8 border-[#26bba4] shadow-sm">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Bolsas Entregadas</p>
              <p className="text-2xl font-black text-[#26bba4] italic">{statsPeriod === 'DIARIO' ? analysis.dayTotals.bags : analysis.monthTotals.bags}u</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-l-8 border-amber-500 shadow-sm">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Inventario JIT</p>
              <p className="text-2xl font-black text-amber-500 italic">{analysis.stock}u</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border-l-8 border-rose-500 shadow-sm">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1">Tendencia</p>
              <p className="text-2xl font-black text-rose-500 italic">{analysis.growth}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
               <h3 className="text-lg font-black text-[#0a3a6b] mb-6 italic uppercase">Flujo de Caja Semanal</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.weekDays}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="total" fill="#26bba4" radius={[8, 8, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center">
               <h3 className="text-lg font-black text-[#0a3a6b] mb-6 italic uppercase">Desempeño JIT</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="text-xs font-black text-slate-500 uppercase">Cliente VIP del Mes</span>
                    <span className="font-black text-[#0a3a6b] italic uppercase">{analysis.topClient?.business || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="text-xs font-black text-slate-500 uppercase">Consumo de Hielo (MXN)</span>
                    <span className="font-black text-[#0a3a6b] italic">${analysis.monthTotals.ice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <span className="text-xs font-black text-slate-500 uppercase">Consumo de Agua (MXN)</span>
                    <span className="font-black text-[#26bba4] italic">${analysis.monthTotals.water.toLocaleString()}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CONFIG' && (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6 flex items-center gap-3">
              <i className="fa-solid fa-tags text-[#26bba4]"></i> Tarifas Generales de la Isla
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-[#0a3a6b] rounded-3xl text-white shadow-xl shadow-blue-900/20">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Precio Base Hielo</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black italic">$</span>
                    <input 
                      type="number" 
                      value={priceConfig.general[ProductType.ICE]} 
                      onChange={e => handlePriceUpdate(ProductType.ICE, parseInt(e.target.value))} 
                      className="bg-white/10 w-full text-4xl font-black italic outline-none border-b-4 border-white/20 focus:border-[#26bba4] transition-colors rounded-xl px-4 py-2"
                    />
                    <span className="text-xs font-black uppercase">MXN</span>
                  </div>
               </div>
               <div className="p-6 bg-[#26bba4] rounded-3xl text-white shadow-xl shadow-teal-900/20">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Precio Base Agua</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black italic">$</span>
                    <input 
                      type="number" 
                      value={priceConfig.general[ProductType.WATER]} 
                      onChange={e => handlePriceUpdate(ProductType.WATER, parseInt(e.target.value))} 
                      className="bg-white/10 w-full text-4xl font-black italic outline-none border-b-4 border-white/20 focus:border-[#0a3a6b] transition-colors rounded-xl px-4 py-2"
                    />
                    <span className="text-xs font-black uppercase">MXN</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6 flex items-center gap-3">
               <i className="fa-solid fa-user-gear text-[#26bba4]"></i> Precios Especiales por Cliente
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {clients.map(c => {
                 const hasSpecialIce = priceConfig.specialPrices[c.id]?.[ProductType.ICE] !== undefined;
                 const hasSpecialWater = priceConfig.specialPrices[c.id]?.[ProductType.WATER] !== undefined;
                 
                 return (
                   <div key={c.id} className={`p-6 rounded-[2rem] border-2 transition-all ${
                     selectedClientForPrice === c.id ? 'border-[#0a3a6b] bg-blue-50' : 'border-slate-100 bg-slate-50'
                   }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-[#0a3a6b] italic uppercase text-sm leading-tight">{c.business}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{c.name}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedClientForPrice(selectedClientForPrice === c.id ? null : c.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                            selectedClientForPrice === c.id ? 'bg-[#0a3a6b] text-white' : 'bg-white text-slate-400 shadow-sm'
                          }`}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-400 uppercase">🧊 Hielo:</span>
                          <span className={`font-black italic ${hasSpecialIce ? 'text-rose-500' : 'text-slate-500'}`}>
                            ${priceConfig.specialPrices[c.id]?.[ProductType.ICE] ?? priceConfig.general[ProductType.ICE]}
                            {hasSpecialIce && <span className="ml-1 text-[8px] uppercase not-italic">(ESP)</span>}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-slate-400 uppercase">💧 Agua:</span>
                          <span className={`font-black italic ${hasSpecialWater ? 'text-rose-500' : 'text-slate-500'}`}>
                            ${priceConfig.specialPrices[c.id]?.[ProductType.WATER] ?? priceConfig.general[ProductType.WATER]}
                            {hasSpecialWater && <span className="ml-1 text-[8px] uppercase not-italic">(ESP)</span>}
                          </span>
                        </div>
                      </div>

                      {selectedClientForPrice === c.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200 animate-slide-up">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Editar Tarifas Especiales</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="number" 
                              placeholder={`Hielo ($${priceConfig.general[ProductType.ICE]})`}
                              value={priceConfig.specialPrices[c.id]?.[ProductType.ICE] || ''}
                              onChange={e => handleSpecialPrice(c.id, ProductType.ICE, e.target.value)}
                              className="bg-white p-2 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-[#0a3a6b]"
                            />
                            <input 
                              type="number" 
                              placeholder={`Agua ($${priceConfig.general[ProductType.WATER]})`}
                              value={priceConfig.specialPrices[c.id]?.[ProductType.WATER] || ''}
                              onChange={e => handleSpecialPrice(c.id, ProductType.WATER, e.target.value)}
                              className="bg-white p-2 rounded-lg text-xs font-bold border border-slate-200 outline-none focus:border-[#26bba4]"
                            />
                          </div>
                          <p className="text-[7px] mt-2 text-slate-400 font-bold uppercase italic">Deja vacío para usar precio general.</p>
                        </div>
                      )}
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'CLIENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6 flex items-center gap-3">
              <i className="fa-solid fa-users text-[#26bba4]"></i> Base de Datos de Clientes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="pb-4">Negocio</th>
                    <th className="pb-4">Contacto</th>
                    <th className="pb-4">Estado</th>
                    <th className="pb-4">Bolsas Totales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {clients.map(c => (
                    <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-black text-[#0a3a6b] italic uppercase text-xs">{c.business}</td>
                      <td className="py-4 text-[10px] font-bold text-slate-500 uppercase">{c.name}</td>
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
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6">Nuevo Cliente</h3>
            <form onSubmit={(e) => { e.preventDefault(); onAddClient(clientForm); setActiveTab('MAP'); }} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Negocio</label>
                <input required type="text" value={clientForm.business} onChange={e => setClientForm({...clientForm, business: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-xs outline-none" placeholder="Restaurante..." />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Dueño</label>
                <input required type="text" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-xs outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Teléfono</label>
                <input type="tel" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-xs outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Clasificación</label>
                <select value={clientForm.classification} onChange={e => setClientForm({...clientForm, classification: e.target.value as any})} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold text-xs outline-none">
                  <option value={ClientClassification.GOOD}>Bueno</option>
                  <option value={ClientClassification.REGULAR}>Regular</option>
                  <option value={ClientClassification.BAD}>Malo</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#26bba4] text-white p-4 rounded-xl font-black italic uppercase text-xs shadow-lg active:scale-95 transition-all">Registrar Cliente</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'INVENTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-6">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase">Control de Fábrica JIT</h3>
            <div className="space-y-4">
              <input type="number" value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} placeholder="Cantidad de Bolsas" className="w-full bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 text-3xl font-black text-[#0a3a6b] outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { if(qtyInput) { onAddInventory(parseInt(qtyInput), 'PRODUCTION'); setQtyInput(''); } }} className="bg-[#0a3a6b] text-white p-6 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-lg">Ingresar Carga</button>
                <button onClick={() => { if(qtyInput) { onAddInventory(parseInt(qtyInput), 'WASTE', 'Merma Fábrica'); setQtyInput(''); } }} className="bg-rose-500 text-white p-6 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all shadow-lg">Registrar Merma</button>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm overflow-y-auto max-h-[500px]">
            <h3 className="text-xl font-black text-[#0a3a6b] italic uppercase mb-6">Auditoría de Stock</h3>
            <div className="space-y-3">
              {inventory.slice().reverse().map(log => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                      log.type === 'PRODUCTION' ? 'bg-[#26bba4]' : 
                      log.type === 'SALE' ? 'bg-[#0a3a6b]' : 'bg-rose-500'
                    }`}>
                      <i className={`fa-solid ${log.type === 'PRODUCTION' ? 'fa-industry' : log.type === 'SALE' ? 'fa-truck-fast' : 'fa-snowflake'}`}></i>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase">{log.type === 'PRODUCTION' ? 'Ingreso' : log.type === 'SALE' ? 'Salida Ruta' : 'Baja Merma'}</p>
                      <p className="text-[8px] font-bold text-slate-400">{log.reason || 'Movimiento Automatizado'}</p>
                    </div>
                  </div>
                  <span className={`text-lg font-black italic ${log.type === 'PRODUCTION' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {log.type === 'PRODUCTION' ? '+' : '-'}{log.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'MAP' && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm">
          <HolboxMap clients={clients} orders={orders} />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
