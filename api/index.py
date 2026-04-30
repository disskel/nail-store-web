from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any # Any para robustez frente a NaN
from supabase import create_client, Client
import os
import time
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# 1. CONFIGURACIÓN E INICIALIZACIÓN (Setup)
# -----------------------------------------------------------------------------
# load_dotenv() # Comentado para producción en Vercel

app = FastAPI(
    title="Nail-Store API",
    description="Backend robusto para gestión de inventarios, márgenes, proveedores y caja diaria",
    version="1.0.10"
)

# MIDDLEWARE DE DIAGNÓSTICO (Crucial para ver el tráfico en Vercel)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    method = request.method
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    print(f"DIAGNÓSTICO: {method} {path} completado en {process_time:.2f}ms con status {response.status_code}")
    return response

# Configuración de CORS para permitir la comunicación con el Frontend en Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialización del cliente de Supabase con validación de entorno
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("CRÍTICO: No se detectaron las credenciales de Supabase en el sistema")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -----------------------------------------------------------------------------
# 2. MODELOS DE DATOS (PYDANTIC)
# Fundamento: Validación estricta de tipos para evitar inconsistencias en la DB
# -----------------------------------------------------------------------------

class ItemVenta(BaseModel):
    id_producto: str
    cantidad: int
    precio_unitario: float

class VentaRequest(BaseModel):
    items: List[ItemVenta]
    tipo_documento: str  # "NOTA_VENTA" o "PROFORMA"
    id_sesion_caja: str
    medio_pago: Optional[str] = "EFECTIVO"
    observaciones: Optional[str] = None

class IngresoRequest(BaseModel):
    """Modelo para el registro de entrada de mercancía de proveedores"""
    id_producto: str
    cantidad: int
    costo_nuevo: float
    precio_menor_nuevo: float
    precio_mayor_nuevo: float
    documento_referencia: Optional[str] = None

class ProveedorRequest(BaseModel):
    nombre: str
    contacto: Optional[str] = None

class CategoriaRequest(BaseModel):
    """Modelo para el registro de nuevas categorías en el mantenedor"""
    nombre: str
    descripcion: Optional[str] = None

class AperturaCajaRequest(BaseModel):
    monto_inicial: float = 0.0 
    observaciones: Optional[str] = None

class CierreCajaRequest(BaseModel):
    id_sesion: str
    monto_fisico: float

class UpdatePrecioRequest(BaseModel):
    costo_unidad: float
    precio_menor: float
    precio_mayor: float

class ProductoCreateRequest(BaseModel):
    """Contrato para la creación de nuevos productos en el catálogo"""
    sku: str
    nombre: str
    id_proveedor: str
    id_categoria: str
    # Aceptamos Any para capturar el "NaN" del frontend y procesarlo internamente
    costo_unidad: Optional[Any] = 0.0
    precio_menor: Optional[Any] = 0.0
    precio_mayor: Optional[Any] = 0.0
    stock_actual: Optional[Any] = 0

# -----------------------------------------------------------------------------
# 3. ENDPOINTS DE SISTEMA Y SALUD
# -----------------------------------------------------------------------------

@app.get("/api/health")
@app.get("/health")
def health_check():
    """Verifica la disponibilidad del servidor y el estado de la conexión DB."""
    return {
        "status": "online", 
        "business": "Nail-Store", 
        "database_connected": supabase is not None
    }

# -----------------------------------------------------------------------------
# 4. MÓDULO DE PRODUCTOS E INVENTARIO
# -----------------------------------------------------------------------------

@app.get("/api/productos/margenes")
@app.get("/productos/margenes")
def obtener_margenes():
    """Calcula márgenes incluyendo todos los indicadores de precio para Trujillo."""
    try:
        # CORRECCIÓN: Se añadió "precio_mayor" a la cadena de selección[cite: 16]
        response = supabase.table("productos").select(
            "id, nombre, costo_unidad, costo_maximo, precio_menor, precio_mayor, stock_actual, "
            "categorias(nombre), proveedores(nombre)"
        ).execute()
        
        resultado = []
        for p in response.data:
            # Aseguramos que siempre existan valores numéricos para evitar errores visuales[cite: 16]
            costo_rep = float(p.get("costo_unidad") or 0.0)
            costo_max = float(p.get("costo_maximo") or costo_rep) 
            precio = float(p.get("precio_menor") or 0.0)
            # CAPTURA CORRECTA: Ahora sí obtenemos el precio mayor de la DB[cite: 16]
            p_mayor = float(p.get("precio_mayor") or 0.0)
            stock = int(p.get("stock_actual") or 0)
            
            cat_nombre = p.get("categorias", {}).get("nombre", "Sin Categoría") if p.get("categorias") else "Sin Categoría"
            prov_nombre = p.get("proveedores", {}).get("nombre", "Sin Proveedor") if p.get("proveedores") else "Sin Proveedor"
            
            # Cálculo de margen protegido contra división por cero
            if precio > 0:
                margen_porcentaje = ((precio - costo_rep) / precio) * 100
                resultado.append({
                    "id": p["id"],
                    "nombre": p["nombre"],
                    "categoria": cat_nombre,
                    "proveedor": prov_nombre,
                    "costo": costo_rep,
                    "costo_maximo": costo_max,
                    "precio": precio,
                    "precio_mayor": p_mayor, # AHORA SE ENVÍA AL FRONTEND[cite: 16]
                    "stock": stock,
                    "margen_porcentaje": round(float(margen_porcentaje), 2)
                })
            else:
                resultado.append({
                    "id": p["id"],
                    "nombre": p["nombre"],
                    "categoria": cat_nombre,
                    "proveedor": prov_nombre,
                    "costo": costo_rep,
                    "costo_maximo": costo_max,
                    "precio": precio,
                    "precio_mayor": p_mayor, # AHORA SE ENVÍA AL FRONTEND[cite: 16]
                    "stock": stock,
                    "margen_porcentaje": 0.0
                })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en márgenes: {str(e)}")

@app.post("/api/productos")
@app.post("/productos")
def crear_producto(req: ProductoCreateRequest):
    """Registra un nuevo producto. Obliga Proveedor/Categoría y fuerza stock a 0."""
    try:
        # Validación de reglas de negocio Trujillo
        if not req.id_proveedor or str(req.id_proveedor).strip() == "":
            raise HTTPException(status_code=400, detail="El Proveedor es obligatorio")
        if not req.id_categoria or str(req.id_categoria).strip() == "":
            raise HTTPException(status_code=400, detail="La Categoría es obligatoria")

        def clean_num(val):
            if val is None or str(val).lower() in ['nan', '', 'undefined', 'null']:
                return 0.0
            return float(val)

        costo_limpio = clean_num(req.costo_unidad)
        p_menor = clean_num(req.precio_menor)
        p_mayor = clean_num(req.precio_mayor)

        data = {
            "sku": req.sku, 
            "nombre": req.nombre, 
            "id_proveedor": req.id_proveedor,
            "id_categoria": req.id_categoria, 
            "costo_unidad": costo_limpio, 
            "costo_maximo": costo_limpio, 
            "precio_menor": p_menor,
            "precio_mayor": p_mayor, 
            "stock_actual": 0 # BLOQUEO: Siempre inicia en 0 para forzar Registrar Ingreso
        }
        res = supabase.table("productos").insert(data).execute()
        
        if res.data and len(res.data) > 0:
            new_id = res.data[0]['id']
            # Historial inicial obligatorio
            supabase.table("historial_precios").insert({
                "id_producto": new_id, 
                "costo_anterior": 0.0, 
                "costo_nuevo": costo_limpio,
                "precio_nuevo_menor": p_menor, 
                "precio_nuevo_mayor": p_mayor
            }).execute()

        return {"status": "success", "data": res.data[0] if res.data else data}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")

@app.put("/api/productos/{producto_id}/precios")
@app.put("/productos/{producto_id}/precios")
def actualizar_precios_producto(producto_id: str, req: UpdatePrecioRequest):
    """Ajusta precios y registra la trazabilidad siempre."""
    try:
        prod_actual = supabase.table("productos").select("costo_unidad, costo_maximo, nombre").eq("id", producto_id).single().execute()
        if not prod_actual.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        c_max_actual = float(prod_actual.data.get('costo_maximo') or 0.0)
        nuevo_c_max = max(c_max_actual, float(req.costo_unidad))

        update_data = {
            "costo_unidad": req.costo_unidad, 
            "costo_maximo": nuevo_c_max,
            "precio_menor": req.precio_menor, 
            "precio_mayor": req.precio_mayor
        }
        supabase.table("productos").update(update_data).eq("id", producto_id).execute()

        # Inserción forzada en historial para mantener el tablero activo
        supabase.table("historial_precios").insert({
            "id_producto": producto_id, 
            "costo_anterior": float(prod_actual.data.get('costo_unidad') or 0.0),
            "costo_nuevo": float(req.costo_unidad), 
            "precio_nuevo_menor": float(req.precio_menor),
            "precio_nuevo_mayor": float(req.precio_mayor)
        }).execute()

        return {"status": "success", "message": f"Precios actualizados para {prod_actual.data['nombre']}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 5. MÓDULO DE CATEGORÍAS (Mantenimiento Completo)
# -----------------------------------------------------------------------------

@app.get("/api/categorias")
@app.get("/categorias")
def listar_categorias():
    try:
        res = supabase.table("categorias").select("*").eq("activo", True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/categorias")
@app.post("/categorias")
def crear_categoria(req: CategoriaRequest):
    try:
        data = {"nombre": req.nombre, "descripcion": req.descripcion, "activo": True}
        res = supabase.table("categorias").insert(data).execute()
        return {"status": "success", "data": res.data[0] if res.data else data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear categoría: {str(e)}")

# -----------------------------------------------------------------------------
# 6. MÓDULO DE DASHBOARD
# -----------------------------------------------------------------------------

@app.get("/api/dashboard/resumen")
@app.get("/dashboard/resumen")
def obtener_resumen_dashboard():
    try:
        res = supabase.table("productos").select("costo_unidad, stock_actual").execute()
        # Protección contra valores nulos en el cálculo del valor total[cite: 20]
        v_total = sum(float(p.get("costo_unitario") or p.get("costo_unidad") or 0.0) * int(p.get("stock_actual") or 0) for p in res.data)
        return {"valor_total_inventario": round(v_total, 2), "total_items": len(res.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en dashboard: {str(e)}")

# -----------------------------------------------------------------------------
# 7. MÓDULO DE PROVEEDORES
# -----------------------------------------------------------------------------

@app.get("/api/proveedores")
@app.get("/proveedores")
def listar_proveedores():
    try:
        response = supabase.table("proveedores").select("*").eq("activo", True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/proveedores")
@app.post("/proveedores")
def crear_proveedor(prov: ProveedorRequest):
    try:
        data = {"nombre": prov.nombre, "contacto": prov.contacto, "activo": True}
        response = supabase.table("proveedores").insert(data).execute()
        return {"status": "success", "data": response.data[0] if response.data else data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 8. MÓDULO DE CAJA
# -----------------------------------------------------------------------------

@app.post("/api/caja/abrir")
@app.post("/caja/abrir")
def abrir_caja(req: AperturaCajaRequest):
    try:
        res = supabase.table("sesiones_caja").insert({"monto_inicial": req.monto_inicial, "estado": "ABIERTA", "observaciones": req.observaciones}).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 9. MÓDULO DE VENTAS
# -----------------------------------------------------------------------------

@app.post("/api/ventas/procesar")
@app.post("/ventas/procesar")
def procesar_venta(venta: VentaRequest):
    try:
        for item in venta.items:
            prod = supabase.table("productos").select("stock_actual").eq("id", item.id_producto).single().execute()
            nuevo_stock = (int(prod.data.get('stock_actual') or 0)) - item.cantidad
            supabase.table("productos").update({"stock_actual": nuevo_stock}).eq("id", item.id_producto).execute()
            
            supabase.table("movimientos_inventario").insert({
                "id_producto": item.id_producto, 
                "tipo_movimiento": "SALIDA", 
                "cantidad": item.cantidad, 
                "precio_momento": item.precio_unitario, 
                "id_sesion_caja": venta.id_sesion_caja,
                "medio_pago": venta.medio_pago
            }).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en venta: {str(e)}")

# -----------------------------------------------------------------------------
# 10. MÓDULO DE INVENTARIO (ENTRADAS / COMPRAS)
# -----------------------------------------------------------------------------

@app.post("/api/inventario/ingreso")
@app.post("/inventario/ingreso")
def registrar_ingreso(req: IngresoRequest):
    """Aumenta stock y garantiza el registro histórico completo (SIN SILENCIADOR)[cite: 20]."""
    try:
        # 1. Obtener estado actual del producto
        prod_res = supabase.table("productos").select("costo_unidad, costo_maximo, stock_actual").eq("id", req.id_producto).single().execute()
        if not prod_res.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        c_ant = float(prod_res.data.get('costo_unidad') or 0.0)
        s_act = int(prod_res.data.get('stock_actual') or 0)
        c_max_ant = float(prod_res.data.get('costo_maximo') or 0.0) 
        
        nuevo_stock = s_act + req.cantidad
        nuevo_c_max = max(c_max_ant, float(req.costo_nuevo))

        # 2. Actualizar Tabla Maestro de Productos
        supabase.table("productos").update({
            "stock_actual": nuevo_stock, 
            "costo_unidad": req.costo_nuevo,
            "costo_maximo": nuevo_c_max, 
            "precio_menor": req.precio_menor_nuevo,
            "precio_mayor": req.precio_mayor_nuevo
        }).eq("id", req.id_producto).execute()

        # 3. Registrar el Movimiento de Inventario
        supabase.table("movimientos_inventario").insert({
            "id_producto": req.id_producto, 
            "tipo_movimiento": "ENTRADA", 
            "cantidad": req.cantidad,
            "precio_momento": req.costo_nuevo, 
            "referencia": req.documento_referencia or "Ingreso Manual"
        }).execute()

        # 4. Registrar Historial Obligatorio[cite: 20]
        hist_entry = {
            "id_producto": req.id_producto, 
            "costo_anterior": c_ant, 
            "costo_nuevo": float(req.costo_nuevo),
            "precio_nuevo_menor": float(req.precio_menor_nuevo),
            "precio_nuevo_mayor": float(req.precio_mayor_nuevo)
        }
        supabase.table("historial_precios").insert(hist_entry).execute()

        return {"status": "success", "stock_final": nuevo_stock}
    except Exception as e:
        # Si falla Supabase por RLS o columnas, ahora verás el error real en la web
        raise HTTPException(status_code=500, detail=f"Error Crítico BD: {str(e)}")

# -----------------------------------------------------------------------------
# 11. MÓDULO DE TRAZABILIDAD Y CONTEXTO
# -----------------------------------------------------------------------------

@app.get("/api/productos/{producto_id}/historial-ingresos")
@app.get("/productos/{producto_id}/historial-ingresos")
def obtener_historial_ingresos_especifico(producto_id: str):
    """Devuelve los 3 últimos registros del historial para el panel de ingresos."""
    try:
        res = supabase.table("historial_precios")\
            .select("fecha_cambio, costo_nuevo, precio_nuevo_menor, precio_nuevo_mayor")\
            .eq("id_producto", producto_id)\
            .order("fecha_cambio", desc=True)\
            .limit(3)\
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/productos/{producto_id}/historial")
@app.get("/productos/{producto_id}/historial")
def obtener_historial_producto(producto_id: str):
    try:
        res = supabase.table("productos").select("id").eq("id", producto_id).single().execute()
        if not res.data: raise HTTPException(status_code=404, detail="Producto no encontrado")
            
        res = supabase.table("movimientos_inventario")\
            .select("*")\
            .eq("id_producto", producto_id)\
            .order("fecha", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/productos/reporte-completo")
@app.get("/productos/reporte-completo")
def obtener_reporte_completo():
    try:
        response = supabase.table("productos").select(
            "nombre, costo_unidad, costo_maximo, precio_menor, precio_mayor, stock_actual, proveedores(nombre)"
        ).execute()
        
        resultado = []
        for p in response.data:
            prov_nombre = p.get("proveedores", {}).get("nombre", "SIN PROVEEDOR") if p.get("proveedores") else "SIN PROVEEDOR"
            resultado.append({
                "PRODUCTO": p["nombre"].upper() if p["nombre"] else "SIN NOMBRE", 
                "PROVEEDOR": prov_nombre.upper(),
                "COSTO REPOSICIÓN (S/)": float(p.get("costo_unidad") or 0.0),
                "COSTO TECHO MÁXIMO (S/)": float(p.get("costo_maximo") or 0.0),
                "PRECIO MENOR (S/)": float(p.get("precio_menor") or 0.0),
                "PRECIO MAYOR (S/)": float(p.get("precio_mayor") or 0.0),
                "STOCK ACTUAL": int(p.get("stock_actual") or 0)
            })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte: {str(e)}")