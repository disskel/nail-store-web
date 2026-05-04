'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // Nueva librería oficial
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/apiService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  
  // Inicialización del cliente SSR para Componentes de Cliente
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session) {
        // Sincronización con el apiService para el Backend Python
        await apiService.handleSession(data.session);
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas para Trujillo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="w-full max-w-md bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 p-8 text-white">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">JEAN NAILS <span className="text-pink-500">STORE</span></h1>
          <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest">Seguridad SSR v1.0.16</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <input 
            type="email" placeholder="Email" className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3"
            value={email} onChange={(e) => setEmail(e.target.value)} required 
          />
          <input 
            type="password" placeholder="Contraseña" className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-3"
            value={password} onChange={(e) => setPassword(e.target.value)} required 
          />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-pink-600 hover:bg-pink-700 py-3 rounded-lg font-bold">
            {loading ? 'VALIDANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
    </div>
  );
}