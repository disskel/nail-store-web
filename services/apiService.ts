const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiService = {
  // -------------------------------------------------------------------------
  // 1. MANTENEDOR DE CATEGORÍAS
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 2. MANTENEDOR DE PROVEEDORES
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 3. GESTIÓN DE PRODUCTOS Y CATÁLOGO
  // -------------------------------------------------------------------------
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

  // Obtiene productos con sus proveedores y costos (incluye costo_maximo)[cite: 19]
  async getProductosParaIngreso() {
    const res = await fetch(`${API_URL}/productos/margenes`);
    if (!res.ok) throw new Error('Error al cargar catálogo de productos');
    return res.json();
  },

  // Ajuste manual de precios (Sincronización con el Backend)[cite: 19]
  async actualizarPreciosProducto(id: string, data: { costo_unidad: number, precio_menor: number, precio_mayor: number }) {
    const response = await fetch(`${API_URL}/productos/${id}/precios`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al actualizar precios');
    }
    return await response.json();
  },

  // -------------------------------------------------------------------------
  // 4. MÓDULO DE INVENTARIO E INGRESOS (Lógica Híbrida)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // 5. TRAZABILIDAD Y CONSULTAS HISTÓRICAS
  // -------------------------------------------------------------------------
  
  // Obtiene la hoja de vida completa (entradas/salidas) para el Inventario[cite: 19]
  async getHistorialProducto(id: string) {
    const res = await fetch(`${API_URL}/productos/${id}/historial`);
    if (!res.ok) throw new Error('Error al cargar historial del producto');
    return res.json();
  },

  // Obtiene los 3 últimos ingresos para referencia rápida[cite: 19]
  async getHistorialIngresosCorta(id: string) {
    const res = await fetch(`${API_URL}/productos/${id}/historial-ingresos`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al cargar referencia histórica');
    }
    return res.json();
  },

  // -------------------------------------------------------------------------
  // 6. MANTENEDOR DE CLIENTES (TRUJILLO)
  // -------------------------------------------------------------------------
  
  async buscarCliente(numero: string) {
    const res = await fetch(`${API_URL}/clientes/${numero}`);
    if (!res.ok) return null;
    return res.json();
  },

  async registrarCliente(data: any) {
    const res = await fetch(`${API_URL}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al registrar cliente');
    return res.json();
  },

  // -------------------------------------------------------------------------
  // 7. GESTIÓN DE VENTAS Y CAJA (POS)
  // -------------------------------------------------------------------------

  async getEstadoCaja() {
    const res = await fetch(`${API_URL}/caja/estado-actual`);
    if (!res.ok) throw new Error('Error al consultar estado de caja');
    return res.json();
  },

  async abrirCaja(monto: number, notas?: string) {
    const res = await fetch(`${API_URL}/caja/abrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monto_inicial: monto, observaciones: notas }),
    });
    if (!res.ok) throw new Error('Error al abrir caja');
    return res.json();
  },

  // ACTUALIZADO: Registra la venta, vincula cliente y soporta Nota de Pedido
  async procesarVenta(data: { 
    items: any[], 
    tipo_documento: string, 
    id_sesion_caja: string, 
    medio_pago: string, 
    descuento?: number, 
    cliente_data?: any 
  }) {
    const res = await fetch(`${API_URL}/ventas/procesar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al procesar la venta');
    }
    return res.json();
  },

  async getResumenCaja(id: string) {
    const res = await fetch(`${API_URL}/caja/resumen/${id}`);
    return res.json();
  },

  async cerrarCaja(id_sesion: string, monto_fisico: number) {
    const res = await fetch(`${API_URL}/caja/cerrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_sesion, monto_fisico }),
    });
    if (!res.ok) throw new Error('Error al procesar el cierre');
    return res.json();
  }
  
};