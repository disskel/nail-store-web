'use client'; // 1. Habilitamos clics y lógica de sesión

import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // 2. Navegación rápida sin recargar
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { apiService } from '@/services/apiService';
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  // Inicializamos el portero de sesión para el navegador
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Función para salir del sistema de forma segura[cite: 13]
  const handleLogout = async () => {
    await supabase.auth.signOut(); // Avisa a Supabase
    await apiService.logout();     // Limpia el localStorage de Trujillo
    router.push('/login');         
    router.refresh();
  };

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full dark`}>
      <body className="flex flex-col lg:flex-row h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
        
        {/* BARRA LATERAL (Mantenemos tu estilo original)[cite: 15] */}
        <aside className="hidden lg:flex w-72 bg-black border-r border-zinc-800 flex-col p-6 shadow-2xl">
          
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              N
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Nail-Store</h2>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Admin Pro</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            <p className="text-[10px] font-bold text-zinc-500 uppercase px-3 mb-3">Principal</p>
            
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">🏠</span> Dashboard
            </Link>

            <Link href="/ventas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">🛍️</span> Ventas
            </Link>

            <Link href="/clientes" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">👤</span> Clientes
            </Link>

            <Link href="/inventario" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">📊</span> Inventario
            </Link>

            <Link href="/compras" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">📦</span> Registrar Ingreso
            </Link>

            <Link href="/inventario/nuevo" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-900 transition-all text-zinc-400 hover:text-white">
              <span className="text-lg">✨</span> Nuevo Producto
            </Link>
          </nav>

          {/* SECCIÓN DE CIERRE DE SESIÓN (Agregada al final)[cite: 13] */}
          <div className="pt-6 border-t border-zinc-800">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* NAVEGACIÓN MÓVIL (Actualizada con Logout)[cite: 15] */}
        <nav className="lg:hidden flex justify-around items-center bg-black border-b border-zinc-800 p-4 sticky top-0 z-50">
          <Link href="/">🏠</Link>
          <Link href="/ventas">🛍️</Link>
          <Link href="/clientes">👤</Link>
          <Link href="/inventario">📊</Link>
          <Link href="/compras">📦</Link>
          <Link href="/inventario/nuevo">✨</Link>
          <button onClick={handleLogout} className="text-xl">🚪</button>
        </nav>

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-zinc-950 to-black pt-20 lg:pt-0 pb-20 lg:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}