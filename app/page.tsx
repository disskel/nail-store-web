'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';

/**
 * COMPONENTE: Dashboard Principal - JEAN NAILS STORE
 * Propósito: Centralizar los indicadores clave de rendimiento (KPIs).
 * Conecta el valor del inventario real con la base de datos de clientes.
 */

export default function Dashboard() {
  // --- 1. ESTADO DE LAS MÉTRICAS ---
  // Inicializamos en 0 para que la interfaz se llene dinámicamente al cargar.
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
       * Ejecutamos peticiones en paralelo (Promise.all)
       * 1. Traemos el resumen de inventario (Costo total y cantidad de items)
       * 2. Traemos la lista de clientes para contar cuántos hay registrados
       */
      const [resumenInv, listaClientes] = await Promise.all([
        // Nota: Asegúrate de tener 'getResumenDashboard' definido en tu apiService.ts
        // que apunte al endpoint '/api/dashboard/resumen' del index.py
        fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/dashboard/resumen`).then(res => res.json()),
        apiService.getClientes()
      ]);

      // --- 3. ACTUALIZACIÓN DEL ESTADO CON DATOS REALES ---
      setStats({
        valorInventario: resumenInv.valor_total_inventario || 0, // Extraído del Bloque 8 de index.py
        totalProductos: resumenInv.total_items || 0,           // Conteo real de filas en tabla productos
        totalClientes: listaClientes.length || 0               // Longitud del array de clientes CRM
      });
    } catch (error) {
      console.error("Fallo en la sincronización del Dashboard:", error);
    } finally {
      setCargando(false);
    }
  }

  // Hook para cargar los números apenas el usuario abre el sistema
  useEffect(() => { cargarEstadisticas(); }, []);

  // Pantalla de transición profesional mientras llegan los datos de Trujillo
  if (cargando) return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-indigo-500 font-black uppercase italic animate-pulse">
      Sincronizando Dashboard con Supabase...
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* CABECERA PRINCIPAL */}
      <header className="mb-12">
        <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">Panel de Control</h1>
        <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2 italic">
          Gestión Inteligente • Jean Nails Store Trujillo
        </p>
      </header>

      {/* REJILLA DE INDICADORES (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* MÉTRICA: CAPITAL EN STOCK */}
        <MetricCard 
          titulo="Valor del Inventario" 
          valor={`S/ ${stats.valorInventario.toFixed(2)}`} 
          sub="Dinero actual invertido en productos"
          color="text-emerald-400"
          icon="💰"
        />

        {/* MÉTRICA: VARIEDAD DE CATÁLOGO */}
        <MetricCard 
          titulo="Items en Catálogo" 
          valor={stats.totalProductos.toString()} 
          sub="Total de SKU registrados"
          color="text-indigo-400"
          icon="📦"
        />

        {/* MÉTRICA: FIDELIZACIÓN (CRM) */}
        <MetricCard 
          titulo="Clientes Registrados" 
          valor={stats.totalClientes.toString()} 
          sub="Base de datos de clientes identificados"
          color="text-amber-400"
          icon="👤"
        />
      </div>

      {/* SECCIÓN DE OPERACIONES Y ESTADO DEL SISTEMA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL DE ACCESOS RÁPIDOS */}
        <section className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[3rem] backdrop-blur-xl">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6">Atajos de Operación</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickActionButton href="/ventas" label="Punto de Venta" desc="Nueva Venta" icon="🛍️" />
            <QuickActionButton href="/clientes" label="Módulo Clientes" desc="Seguimiento CRM" icon="👥" />
            <QuickActionButton href="/inventario/ingreso" label="Cargar Stock" desc="Ingreso Mercancía" icon="📥" />
            <QuickActionButton href="/inventario/nuevo" label="Nuevo Item" desc="Crear Producto" icon="✨" />
          </div>
        </section>

        {/* PANEL DE STATUS TÉCNICO */}
        <section className="bg-indigo-600/5 border border-indigo-500/20 p-8 rounded-[3rem] flex flex-col justify-center text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Nail-Store v1.0.13</h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-xs mx-auto font-bold uppercase">
            Sistema operativo. Todos los servicios de Supabase y Python están en línea y sincronizados.
          </p>
        </section>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTES DE UI PARA EL DASHBOARD ---

/**
 * MetricCard: Genera una tarjeta de indicador con estilo Dark.
 */
function MetricCard({ titulo, valor, sub, color, icon }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl hover:border-zinc-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{titulo}</span>
        <span className="text-2xl group-hover:scale-125 transition-transform">{icon}</span>
      </div>
      <p className={`text-5xl font-black italic tracking-tighter ${color} mb-2`}>{valor}</p>
      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{sub}</p>
    </div>
  );
}

/**
 * QuickActionButton: Botón de navegación rápida con iconos grandes.
 */
function QuickActionButton({ href, label, desc, icon }: any) {
  return (
    <a href={href} className="bg-black border border-zinc-800 p-5 rounded-3xl hover:bg-zinc-800 transition-all flex items-center gap-4 group active:scale-95">
      <span className="text-2xl">{icon}</span>
      <div className="text-left">
        <p className="text-xs font-black text-white uppercase">{label}</p>
        <p className="text-[9px] text-zinc-600 font-bold uppercase">{desc}</p>
      </div>
    </a>
  );
}