'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

/**
 * COMPONENTE: Dashboard Principal - JEAN NAILS STORE
 * Propósito: Centralizar los indicadores clave de rendimiento (KPIs).
 * Versión: 1.0.36 - Soporte para Modo Claro y Oscuro (Responsive Theme).
 */

export default function Dashboard() {
  // --- 1. ESTADO DE LAS MÉTRICAS ---
  const [stats, setStats] = useState({
    valorInventario: 0,
    totalProductos: 0,
    totalClientes: 0
  });
  const [cargando, setCargando] = useState(true);

  // --- 2. MOTOR DE SINCRONIZACIÓN CON EL BACKEND ---
  async function cargarEstadisticas() {
    try {
      setCargando(true);
      
      /**
       * SINCRONIZACIÓN CENTRALIZADA:
       * Utilizamos Promise.all para ejecutar ambas peticiones en paralelo.
       * Ahora usamos 'getResumenDashboard' que ya gestiona los tokens de seguridad.
       */
      const [resumenInv, listaClientes] = await Promise.all([
        apiService.getResumenDashboard(),
        apiService.getClientes()
      ]);

      // --- 3. ACTUALIZACIÓN DEL ESTADO ---
      // Los datos se mapean directamente desde las respuestas del Backend.
      setStats({
        valorInventario: resumenInv.valor_total_inventario || 0,
        totalProductos: resumenInv.total_items || 0,
        totalClientes: listaClientes.length || 0
      });
    } catch (error) {
      console.error("Fallo en la sincronización del Dashboard:", error);
    } finally {
      setCargando(false);
    }
  }

  // Hook para disparar la carga de datos al montar el componente
  useEffect(() => { cargarEstadisticas(); }, []);

  // Pantalla de carga profesional mientras se validan los tokens en Trujillo
  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950 text-pink-600 dark:text-pink-500 font-black uppercase italic animate-pulse transition-colors duration-300">
      Sincronizando Dashboard con Trujillo...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      <header className="mb-12">
        <h1 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase italic transition-colors duration-300">Panel de Control</h1>
        <p className="text-pink-600 dark:text-pink-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2 italic">
          Gestión Inteligente • Jean Nails Store v1.0.36
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard 
          titulo="Capital en Stock" 
          valor={`S/ ${stats.valorInventario.toFixed(2)}`} 
          sub="Valorización total del inventario"
          color="text-emerald-600 dark:text-emerald-400"
          icon="💰"
        />
        <MetricCard 
          titulo="Variedad de Productos" 
          valor={stats.totalProductos.toString()} 
          sub="SKUs activos en catálogo"
          color="text-indigo-600 dark:text-indigo-400"
          icon="📦"
        />
        <MetricCard 
          titulo="Fidelización Clientes" 
          valor={stats.totalClientes.toString()} 
          sub="Base de datos CRM Trujillo"
          color="text-amber-600 dark:text-amber-400"
          icon="👥"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[3rem] backdrop-blur-xl transition-colors duration-300">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-6">Operaciones Críticas</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton href="/ventas" label="Nueva Venta" desc="Punto de Venta (POS)" icon="🛍️" />
            <QuickActionButton href="/clientes" label="Clientes" desc="Gestión de Cartera" icon="👥" />
            <QuickActionButton href="/inventario/ingreso" label="Entradas" desc="Cargar Almacén" icon="📥" />
            <QuickActionButton href="/inventario/nuevo" label="Catálogo" desc="Crear Producto" icon="✨" />
            <QuickActionButton href="/inventario" label="Catálogo" desc="Inventario" icon="📊" />
            <QuickActionButton href="/cajas" label="Hist. Cajas" desc="Historial de Cajas" icon="🔐" />
          </div>
        </section>

        <section className="bg-pink-600/5 border border-pink-200 dark:border-pink-500/20 p-8 rounded-[3rem] flex flex-col justify-center text-center transition-colors duration-300">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase italic tracking-tighter transition-colors duration-300">Terminal Asegurada</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 max-w-xs mx-auto font-bold uppercase">
            Sesión protegida mediante SSR. Todas las transacciones en Trujillo están siendo encriptadas y auditadas.
          </p>
        </section>
      </div>
    </div>
  );
}

// SUB-COMPONENTES ACTUALIZADOS PARA v4
function MetricCard({ titulo, valor, sub, color, icon }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] shadow-xl dark:shadow-2xl hover:border-indigo-500/50 transition-all group duration-300">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{titulo}</span>
        <span className="text-2xl group-hover:scale-125 transition-transform">{icon}</span>
      </div>
      <p className={`text-5xl font-black italic tracking-tighter ${color} mb-2`}>{valor}</p>
      <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">{sub}</p>
    </div>
  );
}

function QuickActionButton({ href, label, desc, icon }: any) {
  return (
    <a href={href} className="bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl hover:bg-white dark:hover:bg-zinc-800 transition-all flex items-center gap-4 group active:scale-95 shadow-sm dark:shadow-none duration-300">
      <span className="text-2xl">{icon}</span>
      <div className="text-left">
        <p className="text-xs font-black text-zinc-900 dark:text-white uppercase">{label}</p>
        <p className="text-[9px] text-zinc-500 dark:text-zinc-600 font-bold uppercase">{desc}</p>
      </div>
    </a>
  );
}