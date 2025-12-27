
import React, { useState, useMemo } from 'react';
import { ProductType, PaymentMethod, Client, Order, OrderStatus } from '../types';
import BigButton from '../components/BigButton';

interface WorkerWizardProps {
  clients: Client[];
  orders: Order[];
  workerType: ProductType;
  getUnitPrice: (clientId: string, product: ProductType) => number;
  onCompleteDelivery: (orderId: string, data: Partial<Order>) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onLogout: () => void;
}

const WorkerWizard: React.FC<WorkerWizardProps> = ({ 
  clients, orders, workerType, getUnitPrice, 
  onCompleteDelivery, onUpdateOrderStatus, onLogout 
}) => {
  const [step, setStep] = useState<number>(0); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [deliveryData, setDeliveryData] = useState<Partial<Order>>({
    productType: workerType,
    quantity: 1,
    status: OrderStatus.DELIVERED,
    timestamp: Date.now()
  });

  // Tareas pendientes específicas del tipo de repartidor
  const pendingTasks = useMemo(() => 
    orders.filter(o => o.status === OrderStatus.PENDING && o.productType === workerType),
    [orders, workerType]
  );

  const selectedClient = clients.find(c => c.id === deliveryData.clientId);
  const unitPrice = selectedClient && deliveryData.productType 
    ? getUnitPrice(selectedClient.id, deliveryData.productType) 
    : 0;

  const handleAcceptTask = (order: Order) => {
    onUpdateOrderStatus(order.id, OrderStatus.IN_PROGRESS);
    setDeliveryData({
      ...order,
      status: OrderStatus.DELIVERED // El siguiente estado al finalizar será delivered
    });
    setStartTime(Date.now());
    setStep(2); // Salta directamente a la cantidad (para confirmar o editar)
  };

  const nextStep = () => {
    if (step === 0) setStartTime(Date.now());
    setStep(prev => prev + 1);
  };
  
  const prevStep = () => {
    if (step === 2 && deliveryData.id) setStep(0); // Si es un pedido aceptado, vuelve a tareas
    else setStep(prev => prev - 1);
  };

  const resetWizard = () => {
    setStep(0);
    setStartTime(null);
    setDeliveryData({
      productType: workerType,
      quantity: 1,
      status: OrderStatus.DELIVERED,
      timestamp: Date.now()
    });
  };

  const finalize = () => {
    if (deliveryData.clientId && deliveryData.productType) {
      const currentPrice = getUnitPrice(deliveryData.clientId, deliveryData.productType);
      const amount = (deliveryData.quantity || 0) * currentPrice;
      onCompleteDelivery(deliveryData.id || `temp-${Date.now()}`, { 
        ...deliveryData, 
        unitPrice: currentPrice,
        amount,
        timestamp: startTime || Date.now()
      });
      resetWizard();
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col p-4 bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => step === 0 ? onLogout() : prevStep()} className="w-14 h-14 bg-[#0a3a6b] rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h2 className="text-xl font-black text-[#0a3a6b] leading-none italic uppercase">Maya <span className="text-[#26bba4]">Logística</span></h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic">
              Reparto de {workerType === ProductType.ICE ? 'Hielo' : 'Agua'}
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center text-rose-500 shadow-md border border-slate-100">
          <i className="fa-solid fa-power-off"></i>
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-center pb-24">
        {step === 0 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-black text-[#0a3a6b] text-center mb-6 italic uppercase tracking-tighter">Entregas Pendientes</h1>
            
            {pendingTasks.length > 0 ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {pendingTasks.map(task => {
                  const client = clients.find(c => c.id === task.clientId);
                  return (
                    <div key={task.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xl font-black text-[#0a3a6b] italic uppercase">{client?.business}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{client?.name}</p>
                        </div>
                        <div className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                          {task.quantity} {workerType === ProductType.ICE ? 'Bolsas' : 'Garraf.'}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAcceptTask(task)}
                        className="w-full bg-[#0a3a6b] text-white p-4 rounded-2xl font-black italic uppercase text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-check"></i> Aceptar Pedido
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-12 bg-slate-100 rounded-[3rem] border-4 border-dashed border-slate-200">
                <i className="fa-solid fa-mug-hot text-4xl text-slate-300 mb-4"></i>
                <p className="font-black text-slate-400 uppercase italic">No hay pedidos pendientes</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Relájate un momento</p>
              </div>
            )}
            
            <div className="pt-8 border-t border-slate-200">
              <button 
                onClick={() => { setDeliveryData(d => ({ ...d, id: undefined, productType: workerType })); nextStep(); }}
                className="w-full bg-[#26bba4] text-white p-6 rounded-[2.5rem] font-black italic uppercase text-sm shadow-xl flex items-center justify-center gap-3 border-b-8 border-teal-800"
              >
                <i className="fa-solid fa-plus-circle"></i> Venta Directa Nueva
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-[#0a3a6b] text-center mb-4 italic uppercase">SELECCIONAR CLIENTE</h1>
            <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {clients.map(client => (
                <button key={client.id} onClick={() => { setDeliveryData(d => ({ ...d, clientId: client.id })); nextStep(); }} className="w-full bg-white p-6 rounded-3xl border-4 border-slate-100 shadow-sm active:border-[#0a3a6b] active:bg-blue-50 text-left transition-all">
                  <p className="text-2xl font-black text-[#0a3a6b] italic uppercase">{client.business}</p>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">{client.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 text-center">
            <h1 className="text-3xl font-black text-[#0a3a6b] italic uppercase">CANTIDAD</h1>
            <div className="flex items-center justify-between bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-[#0a3a6b]">
              <button onClick={() => setDeliveryData(d => ({ ...d, quantity: Math.max(1, (d.quantity || 1) - 1) }))} className="w-20 h-20 bg-slate-100 text-[#0a3a6b] rounded-2xl text-5xl font-black flex items-center justify-center active:scale-90">-</button>
              <span className="text-8xl font-black text-[#0a3a6b] italic">{deliveryData.quantity}</span>
              <button onClick={() => setDeliveryData(d => ({ ...d, quantity: (d.quantity || 1) + 1 }))} className="w-20 h-20 bg-slate-100 text-[#26bba4] rounded-2xl text-5xl font-black flex items-center justify-center active:scale-90">+</button>
            </div>
            <div className="pt-8 space-y-4">
              <BigButton label="SIGUIENTE" onClick={nextStep} color="maya-teal" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-[#0a3a6b] text-center mb-4 italic uppercase">MÉTODO DE PAGO</h1>
            <div className="grid grid-cols-2 gap-4">
              <BigButton icon="fa-solid fa-money-bill-wave" label="EFEC" onClick={() => { setDeliveryData(d => ({ ...d, paymentMethod: PaymentMethod.CASH })); nextStep(); }} color="maya-blue" />
              <BigButton icon="fa-solid fa-file-signature" label="CRÉD" onClick={() => { setDeliveryData(d => ({ ...d, paymentMethod: PaymentMethod.CREDIT })); nextStep(); }} color="maya-blue" />
              <BigButton icon="fa-solid fa-credit-card" label="TARJ" onClick={() => { setDeliveryData(d => ({ ...d, paymentMethod: PaymentMethod.CARD })); nextStep(); }} color="maya-blue" />
              <BigButton icon="fa-solid fa-mobile-screen-button" label="TRANS" onClick={() => { setDeliveryData(d => ({ ...d, paymentMethod: PaymentMethod.TRANSFER })); nextStep(); }} color="maya-blue" />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h1 className="text-3xl font-black text-[#0a3a6b] text-center italic uppercase">EVIDENCIA</h1>
            <div className="space-y-4">
               <div className="relative bg-white h-44 rounded-[2rem] flex flex-col items-center justify-center border-4 border-dashed border-[#26bba4] overflow-hidden shadow-inner">
                <i className="fa-solid fa-camera text-4xl text-[#26bba4] mb-2"></i>
                <p className="font-black text-[#26bba4] text-xs uppercase tracking-widest">FOTO HIELERA</p>
                {deliveryData.photoUrl && <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center text-emerald-700 font-black uppercase">¡LISTO!</div>}
                <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0" onChange={() => setDeliveryData(d => ({ ...d, photoUrl: 'mock-photo-url' }))} />
              </div>
              <div className="bg-white h-44 rounded-[2rem] border-4 border-[#0a3a6b] flex flex-col items-center justify-center p-4 shadow-inner">
                <p className="text-[10px] font-black text-[#0a3a6b] uppercase mb-4 tracking-widest">FIRMA CLIENTE</p>
                <div onClick={() => setDeliveryData(d => ({ ...d, signature: 'mock-sig' }))} className="w-full h-full bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center relative cursor-pointer">
                   <i className="fa-solid fa-signature text-3xl opacity-20"></i>
                   {deliveryData.signature && <div className="absolute inset-0 flex items-center justify-center text-[#0a3a6b] font-black text-2xl italic">CONFIRMADO ✓</div>}
                </div>
              </div>
            </div>
            <div className="pt-6">
              <BigButton label="TERMINAR" onClick={finalize} color="maya-teal" disabled={!deliveryData.signature || !deliveryData.photoUrl} />
            </div>
          </div>
        )}
      </div>

      {selectedClient && step > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#0a3a6b] text-white rounded-t-[3rem] shadow-2xl z-30 animate-slide-up">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xl font-black italic uppercase truncate leading-tight">{selectedClient.business}</p>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                ${unitPrice} MXN / {deliveryData.productType === ProductType.ICE ? '🧊' : '💧'}
              </p>
            </div>
            <p className="text-4xl font-black text-[#26bba4] italic">${(deliveryData.quantity || 0) * unitPrice} <span className="text-xs not-italic text-white/60">MXN</span></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerWizard;
