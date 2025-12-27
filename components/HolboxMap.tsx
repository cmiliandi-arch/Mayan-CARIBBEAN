
import React from 'react';
import { Client, Order, OrderStatus } from '../types';

interface HolboxMapProps {
  clients: Client[];
  orders: Order[];
  onMarkerClick?: (client: Client, order?: Order) => void;
}

const HolboxMap: React.FC<HolboxMapProps> = ({ clients, orders, onMarkerClick }) => {
  // Simplified Holbox shape as SVG
  return (
    <div className="relative w-full aspect-[2/1] bg-blue-100 rounded-2xl overflow-hidden border-2 border-slate-200">
      <svg viewBox="0 0 800 400" className="w-full h-full">
        {/* Island Base */}
        <path 
          d="M50,200 Q150,150 250,180 T450,160 T650,190 T750,220 L740,240 Q640,260 440,250 T240,260 T40,230 Z" 
          fill="#FEF3C7" 
          stroke="#D97706" 
          strokeWidth="2"
        />
        
        {/* Markers */}
        {clients.map((client) => {
          const order = orders.find(o => o.clientId === client.id);
          let markerColor = "#EF4444"; // Red (Pending)
          if (order?.status === OrderStatus.IN_PROGRESS) markerColor = "#F59E0B"; // Yellow
          if (order?.status === OrderStatus.DELIVERED) markerColor = "#10B981"; // Green
          
          // Coordinate normalization for Holbox (Mock)
          const x = (client.lng + 87.385) * 15000; 
          const y = (21.535 - client.lat) * 15000;

          return (
            <g 
              key={client.id} 
              className="cursor-pointer hover:scale-125 transition-transform"
              onClick={() => onMarkerClick?.(client, order)}
            >
              <circle cx={x} cy={y} r="10" fill={markerColor} stroke="white" strokeWidth="2" />
              <text x={x} y={y - 15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1E293B">
                {client.business}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg text-xs shadow-md border border-slate-200">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Pendiente</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500"></span> En Proceso</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Entregado</div>
      </div>
    </div>
  );
};

export default HolboxMap;
