
import React from 'react';
import { Client, Order, OrderStatus } from '../types';

interface CustomerPortalProps {
  client: Client;
  orders: Order[];
  onNewOrder: () => void;
  onLogout: () => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ client, orders, onNewOrder, onLogout }) => {
  const goal = 1500;
  const progress = Math.min((client.totalBagsAccumulated / goal) * 100, 100);

  return (
    <div className="max-w-md mx-auto space-y-6 p-4 pb-20">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={onLogout}
            className="bg-[#0a3a6b] w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#0a3a6b] italic uppercase leading-none">Maya <span className="text-[#26bba4]">Caribbean</span></h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">{client.business}</p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-rose-500 shadow-md border border-slate-100 active:scale-95 transition-transform">
          <i className="fa-solid fa-power-off"></i>
        </button>
      </header>

      {/* Rewards Card - Styled like the Ice Bag */}
      <div className="relative overflow-hidden bg-white border-4 border-[#0a3a6b] p-6 rounded-[2.5rem] shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <i className="fa-solid fa-snowflake text-8xl text-[#0a3a6b]"></i>
        </div>
        
        <div className="relative z-10">
          <p className="text-[#0a3a6b] font-black text-center text-xs uppercase tracking-[0.3em] mb-1">Hecho pa' aguantar</p>
          <h2 className="text-4xl font-black text-[#0a3a6b] text-center italic mb-4">RECOMPENSA</h2>
          
          <div className="bg-[#0a3a6b] text-white p-4 rounded-2xl text-center mb-6">
            <span className="text-xs font-bold uppercase block opacity-70">Bolsas Acumuladas</span>
            <span className="text-5xl font-black italic">{client.totalBagsAccumulated}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-[#0a3a6b]">
              <span>Progreso Regalo</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border-2 border-[#0a3a6b]/10 p-1">
              <div 
                className="bg-gradient-to-r from-[#0a3a6b] to-[#26bba4] h-full rounded-full transition-all duration-1000" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-[11px] font-bold text-slate-500 text-center pt-2">
              Te faltan <span className="text-[#0a3a6b] font-black">{Math.max(0, goal - client.totalBagsAccumulated)}</span> bolsas para tu hielera gratis.
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={onNewOrder}
        className="w-full bg-[#26bba4] p-8 rounded-[2.5rem] shadow-xl shadow-teal-100 flex items-center justify-between group active:scale-95 transition-all border-b-8 border-teal-800"
      >
        <span className="text-white text-3xl font-black italic tracking-tighter">PEDIR AHORA</span>
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#26bba4] shadow-inner group-hover:rotate-12 transition-transform">
          <i className="fa-solid fa-cart-plus text-2xl"></i>
        </div>
      </button>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#0a3a6b] uppercase tracking-[0.2em] flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left"></i> Historial de Suministro
        </h3>
        <div className="space-y-3">
          {orders.filter(o => o.clientId === client.id).slice(0, 3).map(order => (
            <div key={order.id} className="bg-white p-5 rounded-3xl border-2 border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  order.productType === 'ICE' ? 'bg-blue-50 text-[#0a3a6b]' : 'bg-teal-50 text-[#26bba4]'
                }`}>
                  <i className={`fa-solid ${order.productType === 'ICE' ? 'fa-cubes' : 'fa-droplet'} text-2xl`}></i>
                </div>
                <div>
                  <p className="font-black text-slate-800 text-lg leading-none">{order.quantity} Unidades</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{new Date(order.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-[#0a3a6b] text-xl italic">${order.amount}</p>
                <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">Entregado</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
