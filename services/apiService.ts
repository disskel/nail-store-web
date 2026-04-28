const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiService = {
  // --- CATEGORÍAS ---
  async getCategorias() {
    const res = await fetch(`${API_URL}/categorias`);
    if (!res.ok) throw new Error('Error al listar categorías');
    return res.json();
  },
  async createCategoria(nombre: string, descripcion?: string) {
    const res = await fetch(`${API_URL}/categorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion }),
    });
    if (!res.ok) throw new Error('Fallo al crear categoría');
    return res.json();
  },

  // --- PROVEEDORES ---
  async getProveedores() {
    const res = await fetch(`${API_URL}/proveedores`);
    if (!res.ok) throw new Error('Error al listar proveedores');
    return res.json();
  },
  async createProveedor(nombre: string, contacto?: string) {
    const res = await fetch(`${API_URL}/proveedores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, contacto }),
    });
    if (!res.ok) {
        const errData = await res.json();
        // Esto lanzará el error exacto de Supabase en el alert
        throw new Error(errData.detail || 'Fallo al crear proveedor'); 
    }
    return res.json();
  },

  // --- PRODUCTOS ---
  async registrarProducto(data: any) {
    const res = await fetch(`${API_URL}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Fallo al registrar producto');
    }
    return res.json();
  }
};