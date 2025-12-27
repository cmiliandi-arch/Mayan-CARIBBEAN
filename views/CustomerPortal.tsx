
import React, { useState } from 'react';
import { Client, Order, OrderStatus, ProductType } from '../types';

interface CustomerPortalProps {
  client: Client;
  orders: Order[];
  onNewOrder: (product: ProductType, qty: number) => void;
  onLogout: () => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ client, orders, onNewOrder, onLogout }) => {
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderType, setOrderType] = useState<ProductType>(ProductType.ICE);
  const [qty, setQty] = useState(5);

  const goal = 1500;
  const progress = Math.min((client.totalBagsAccumulated / goal) * 100, 100);
  
  const pendingOrders = orders.filter(o => o.clientId === client.id && o.status !== OrderStatus.DELIVERED);

  const handleOrderSubmit = () => {
    onNewOrder(orderType, qty);
    setShowOrderModal(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 p-4 pb-24">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={onLogout}
            className="bg-[#0a3a6b] w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#26bba4] rounded-xl flex items-center justify-center text-white font-black italic">
              {client.business.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-black text-[#0a3a6b] italic uppercase leading-none">Maya <span className="text-[#26bba4]">Caribbean</span></h1>
              <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest mt-1 truncate max-w-[120px]">{client.business}</p>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-rose-500 shadow-md border border-slate-100">
          <i className="fa-solid fa-power-off"></i>
        </button>
      </header>

      {/* Reward Progress */}
      <div className="bg-white border-4 border-[#0a3a6b] p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 text-center">
          <p className="text-[#0a3a6b] font-black text-[9px] uppercase tracking-[0.3em] mb-1">Tu Lealtad se Premia</p>
          <h2 className="text-2xl font-black text-[#0a3a6b] italic mb-4">RECOMPENSA MAYA</h2>
          <div className="bg-[#0a3a6b] text-white p-3 rounded-2xl mb-4 inline-block px-8">
            <span className="text-xs font-bold uppercase opacity-60 block">Acumulado</span>
            <span className="text-4xl font-black italic">{client.totalBagsAccumulated}u</span>
          </div>
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
             <div className="h-full bg-[#26bba4] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Faltan {Math.max(0, goal - client.totalBagsAccumulated)} para tu regalo</p>
        </div>
      </div>

      {/* Pending Orders Display */}
      {pendingOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest px-2">Pedidos en Curso</h3>
          {pendingOrders.map(o => (
            <div key={o.id} className="bg-rose-50 border-2 border-rose-100 p-4 rounded-3xl flex justify-between items-center animate-pulse">
              <div className="flex items-center gap-3">
                <i className={`fa-solid ${o.productType === ProductType.ICE ? 'fa-snowflake text-blue-400' : 'fa-droplet text-teal-400'} text-xl`}></i>
                <div>
                  <p className="font-black text-[#0a3a6b] text-sm uppercase italic">{o.quantity} {o.productType === ProductType.ICE ? 'Hielo' : 'Agua'}</p>
                  <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">{o.status === OrderStatus.PENDING ? 'Esperando Repartidor' : 'En camino...'}</p>
                </div>
              </div>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-rose-500 shadow-sm">
                <i className="fa-solid fa-clock-rotate-left text-xs"></i>
              </div>
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => setShowOrderModal(true)}
        className="w-full bg-[#26bba4] p-8 rounded-[2.5rem] shadow-xl text-white flex items-center justify-between border-b-8 border-teal-800 active:scale-95 transition-all"
      >
        <div className="text-left">
          <p className="text-3xl font-black italic tracking-tighter">SOLICITAR</p>
          <p className="text-[10px] font-black uppercase opacity-60">Suministro Inmediato</p>
        </div>
        <i className="fa-solid fa-truck-fast text-4xl"></i>
      </button>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-[#0a3a6b] uppercase tracking-widest px-2">Entregas Recientes</h3>
        <div className="space-y-3">
          {orders.filter(o => o.clientId === client.id && o.status === OrderStatus.DELIVERED).slice(0, 5).map(order => (
            <div key={order.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.productType === 'ICE' ? 'bg-blue-50 text-[#0a3a6b]' : 'bg-teal-50 text-[#26bba4]'}`}>
                  <i className={`fa-solid ${order.productType === 'ICE' ? 'fa-snowflake' : 'fa-droplet'}`}></i>
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm italic uppercase">{order.quantity} Unidades</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">{new Date(order.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="font-black text-[#0a3a6b] italic text-sm">${order.amount}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0a3a6b]/90 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 space-y-6 animate-slide-up">
            <h2 className="text-2xl font-black text-[#0a3a6b] text-center italic uppercase">Nuevo Pedido</h2>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setOrderType(ProductType.ICE)}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${orderType === ProductType.ICE ? 'border-[#0a3a6b] bg-blue-50' : 'border-slate-100'}`}
              >
                <i className="fa-solid fa-snowflake text-2xl text-[#0a3a6b]"></i>
                <span className="text-[10px] font-black uppercase">Hielo</span>
              </button>
              <button 
                onClick={() => setOrderType(ProductType.WATER)}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${orderType === ProductType.WATER ? 'border-[#26bba4] bg-teal-50' : 'border-slate-100'}`}
              >
                <i className="fa-solid fa-droplet text-2xl text-[#26bba4]"></i>
                <span className="text-[10px] font-black uppercase">Agua</span>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad de Unidades</p>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black text-lg">-</button>
                <span className="text-4xl font-black italic text-[#0a3a6b]">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm font-black text-lg">+</button>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button onClick={handleOrderSubmit} className="w-full bg-[#26bba4] text-white p-5 rounded-2xl font-black italic uppercase shadow-xl">Confirmar Pedido</button>
              <button onClick={() => setShowOrderModal(false)} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
