const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * FUNCIÓN AUXILIAR DE SEGURIDAD (PORTERO FRONTERA)
 * Propósito: Recuperar el token de sesión activa de Supabase para enviarlo al Backend.
 * Garantiza que cada fetch lleve el 'pasaporte' del usuario logueado.
 */
const getHeaders = () => {
  // Buscamos el token en el almacenamiento local que usa Supabase
  const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('supabase-session') : null;
  const session = sessionStr ? JSON.parse(sessionStr) : null;
  const token = session?.access_token;

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  };
};

export const apiService = {

  // -------------------------------------------------------------------------
  // 0. MÓDULO DE AUTENTICACIÓN
  // -------------------------------------------------------------------------
  
  async handleSession(session: any) {
    if (typeof window !== 'undefined') {
      if (session) {
        localStorage.setItem('supabase-session', JSON.stringify(session));
      } else {
        localStorage.removeItem('supabase-session');
      }
    }
  },

  // -------------------------------------------------------------------------
  // 1. MANTENEDOR DE CATEGORÍAS (PROTEGIDO)
  // -------------------------------------------------------------------------
  async getCategorias() {
    const res = await fetch(`${API_URL}/categorias`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al listar categorías');
    return res.json();
  },

  async createCategoria(nombre: string, descripcion?: string) {
    const res = await fetch(`${API_URL}/categorias`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ nombre, descripcion }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Fallo al crear categoría');
    return data;
  },

  async updateCategoria(id: string, nombre: string, descripcion?: string) {
    const res = await fetch(`${API_URL}/categorias/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ nombre, descripcion }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar categoría');
    return data;
  },

  async deleteCategoria(id: string) {
    const res = await fetch(`${API_URL}/categorias/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // -------------------------------------------------------------------------
  // 2. MANTENEDOR DE PROVEEDORES (PROTEGIDO)
  // -------------------------------------------------------------------------
  async getProveedores() {
    const res = await fetch(`${API_URL}/proveedores`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al listar proveedores');
    return res.json();
  },

  async createProveedor(nombre: string, contacto?: string) {
    const res = await fetch(`${API_URL}/proveedores`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ nombre, contacto }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Fallo al crear proveedor');
    return data;
  },

  async updateProveedor(id: string, nombre: string, contacto?: string) {
    const res = await fetch(`${API_URL}/proveedores/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ nombre, contacto }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Error al actualizar proveedor');
    return data;
  },

  async deleteProveedor(id: string) {
    const res = await fetch(`${API_URL}/proveedores/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // -------------------------------------------------------------------------
  // 3. GESTIÓN DE PRODUCTOS Y CATÁLOGO (PROTEGIDO)
  // -------------------------------------------------------------------------
  async registrarProducto(data: any) {
    const res = await fetch(`${API_URL}/productos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Fallo al registrar producto');
    }
    return res.json();
  },

  // Obtiene productos con sus proveedores y costos (incluye costo_maximo)
  async getProductosParaIngreso() {
    const res = await fetch(`${API_URL}/productos/margenes`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar catálogo de productos');
    return res.json();
  },

  // Requerida por app/inventario/page.tsx para el borrado lógico[cite: 12]
  async getProductosConMargen(mostrarInactivos: boolean = false) {
    const res = await fetch(`${API_URL}/productos/margenes?mostrar_inactivos=${mostrarInactivos}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al sincronizar catálogo detallado');
    return res.json();
  },

  // Permite editar nombre o desactivar (Borrado Lógico)[cite: 12]
  async updateProducto(id: string, data: { nombre?: string, activo?: boolean }) {
    const res = await fetch(`${API_URL}/productos/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al actualizar producto');
    }
    return res.json();
  },

  // Ajuste manual de precios (Sincronización con el Backend)[cite: 12]
  async actualizarPreciosProducto(id: string, data: { costo_unidad: number, precio_menor: number, precio_mayor: number }) {
    const response = await fetch(`${API_URL}/productos/${id}/precios`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al actualizar precios');
    }
    return await response.json();
  },

  // -------------------------------------------------------------------------
  // 4. MÓDULO DE INVENTARIO E INGRESOS (PROTEGIDO)
  // -------------------------------------------------------------------------
  async registrarIngreso(data: any) {
    const res = await fetch(`${API_URL}/inventario/ingreso`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Fallo al procesar ingreso');
    }
    return res.json();
  },

  // -------------------------------------------------------------------------
  // 5. TRAZABILIDAD Y CONSULTAS HISTÓRICAS (PROTEGIDO)
  // -------------------------------------------------------------------------
  
  // Obtiene la hoja de vida completa (entradas/salidas) para el Inventario
  async getHistorialProducto(id: string) {
    const res = await fetch(`${API_URL}/productos/${id}/historial`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar historial del producto');
    return res.json();
  },

  // Obtiene los 3 últimos ingresos para referencia rápida
  async getHistorialIngresosCorta(id: string) {
    const res = await fetch(`${API_URL}/productos/${id}/historial-ingresos`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al cargar referencia histórica');
    }
    return res.json();
  },

  // -------------------------------------------------------------------------
  // 6. MANTENEDOR Y CRM DE CLIENTES (ACTUALIZADO - PROTEGIDO)
  // -------------------------------------------------------------------------
  
  // Obtiene todos los clientes para el nuevo menú "Clientes"
  async getClientes() {
    const res = await fetch(`${API_URL}/clientes`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al listar clientes');
    return res.json();
  },

  async buscarCliente(numero: string) {
    const res = await fetch(`${API_URL}/clientes/${numero}`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return res.json();
  },

  async registrarCliente(data: any) {
    const res = await fetch(`${API_URL}/clientes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al registrar cliente');
    return res.json();
  },

  // Obtiene el historial de compras de un cliente para seguimiento de compras
  async getHistorialCliente(idCliente: string) {
    const res = await fetch(`${API_URL}/clientes/${idCliente}/historial`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar historial del cliente');
    return res.json();
  },

  // -------------------------------------------------------------------------
  // 7. GESTIÓN DE VENTAS Y CAJA (POS - PROTEGIDO)
  // -------------------------------------------------------------------------

  async getEstadoCaja() {
    const res = await fetch(`${API_URL}/caja/estado-actual`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al consultar estado de caja');
    return res.json();
  },

  async abrirCaja(monto: number, notas?: string) {
    const res = await fetch(`${API_URL}/caja/abrir`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ monto_inicial: monto, observaciones: notas }),
    });
    if (!res.ok) throw new Error('Error al abrir caja');
    return res.json();
  },

  // Registra la venta, vincula cliente y devuelve datos para la Nota de Pedido
  async procesarVenta(data: { 
    items: any[], 
    tipo_documento: string, 
    id_sesion_caja: string, 
    medio_pago: string, 
    descuento?: number, 
    cliente_data?: any,
    id_cliente?: string | null
  }) {
    const res = await fetch(`${API_URL}/ventas/procesar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al procesar la venta');
    }
    return res.json();
  },

  // Obtiene el resumen detallado para visualización total de dinero (Caja + Apps)
  async getResumenCaja(id: string) {
    const res = await fetch(`${API_URL}/caja/resumen/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error al obtener resumen de caja');
    return res.json();
  },

  // RESOLUCIÓN DE ERROR VERCEL: Se cambió monto_plin a monto_plin_contado para sincronizar con el Backend[cite: 12]
  async cerrarCaja(data: { 
    id_sesion: string, 
    monto_fisico_efectivo: number, 
    monto_yape_contado: number, 
    monto_plin_contado: number, 
    monto_transf_contado: number 
  }) {
    const res = await fetch(`${API_URL}/caja/cerrar`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Error al procesar el cierre multimodal');
    }
    return res.json();
  }
};