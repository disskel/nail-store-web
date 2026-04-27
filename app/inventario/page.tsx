'use client';

import { useEffect, useState } from 'react';
import { obtenerResumenDashboard } from '@/services/dashboardService';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerResumenDashboard().then(setData).finally(() => setCargando(false));
  }, []);

  if (cargando) return (
    <div className="flex h-full items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white">Resumen de Negocio</h1>
          <p className="text-zinc-500 font-medium">Estado actual de tu inventario y finanzas</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Fecha de hoy</p>
          <p className="text-white font-bold">{new Date().toLocaleDateString()}</p>
        </div>
      </header>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Valor Inventario" value={`S/ ${data.valor_total_inventario.toFixed(2)}`} icon="💰" color="blue" />
        <KPICard title="Stock Bajo" value={data.productos_stock_bajo} icon="⚠️" color="yellow" highlight={data.productos_stock_bajo > 0} />
        <KPICard title="Agotados" value={data.productos_agotados} icon="🚫" color="red" highlight={data.productos_agotados > 0} />
        <KPICard title="Items Totales" value={data.total_items} icon="📦" color="zinc" />
      </div>

      {/* Sección de Acciones Rápidas */}
      <section className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-3xl backdrop-blur-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          🚀 Próximas Acciones
        </h2>
        <div className="flex flex-wrap gap-4">
          <a href="/compras" className="flex-1 min-w-[200px] flex flex-col p-6 bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all group">
            <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">📥</span>
            <span className="text-white font-bold text-lg">Abastecer Stock</span>
            <span className="text-indigo-200 text-sm">Registrar ingreso de mercadería</span>
          </a>
          <a href="/inventario/nuevo" className="flex-1 min-w-[200px] flex flex-col p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all group border border-zinc-700">
            <span className="text-3xl mb-4 group-hover:scale-110 transition-transform">➕</span>
            <span className="text-white font-bold text-lg">Crear Producto</span>
            <span className="text-zinc-400 text-sm">Añadir nuevo ítem al catálogo</span>
          </a>
        </div>
      </section>
    </div>
  );
}

function KPICard({ title, value, icon, color, highlight = false }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    yellow: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
    zinc: "text-zinc-300 bg-zinc-500/10 border-zinc-500/20"
  };

  return (
    <div className={`p-6 rounded-3xl border transition-all hover:scale-[1.02] ${colors[color]} ${highlight ? 'ring-2 ring-current ring-offset-4 ring-offset-black' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-2xl p-3 bg-black/40 rounded-2xl">{icon}</span>
      </div>
      <p className="text-sm font-bold uppercase tracking-wider opacity-60">{title}</p>
      <p className="text-3xl font-black mt-1 text-white">{value}</p>
    </div>
  );
}