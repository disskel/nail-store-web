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
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Fallo al crear categoría');
    return data;
  },
  async updateCategoria(id: string, nombre: string, descripcion?: string) {
    const res = await fetch(`${API_URL}/categorias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, descripcion }),
    });
    return res.json();
  },
  async deleteCategoria(id: string) {
    const res = await fetch(`${API_URL}/categorias/${id}`, {
      method: 'DELETE',
    });
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Fallo al crear proveedor');
    return data;
  },
  async updateProveedor(id: string, nombre: string, contacto?: string) {
    const res = await fetch(`${API_URL}/proveedores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, contacto }),
    });
    return res.json();
  },
  async deleteProveedor(id: string) {
    const res = await fetch(`${API_URL}/proveedores/${id}`, {
      method: 'DELETE',
    });
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
  },

  // --- NUEVAS FUNCIONES PARA INGRESO Y TRAZABILIDAD (SOLUCIONAN EL ERROR) ---
  
  // Obtiene productos con sus proveedores para el selector[cite: 20]
  async getProductosParaIngreso() {
    const res = await fetch(`${API_URL}/productos/margenes`);
    if (!res.ok) throw new Error('Error al cargar catálogo de productos');
    return res.json();
  },

  // Envía el registro de entrada de mercadería al backend[cite: 20]
  async registrarIngreso(data: any) {
    const res = await fetch(`${API_URL}/inventario/ingreso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Fallo al procesar ingreso');
    }
    return res.json();
  },

  // Obtiene el historial de movimientos de un item específico[cite: 20]
  async getHistorialProducto(id: string) {
    const res = await fetch(`${API_URL}/productos/${id}/historial`);
    if (!res.ok) throw new Error('Error al cargar historial del producto');
    return res.json();
  }
};