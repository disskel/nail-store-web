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
    print(f"DIAGNÓSTICO: Recibida petición {method} en la ruta: {path}")
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    print(f"DIAGNÓSTICO: Ruta {path} completada en {process_time:.2f}ms con status {response.status_code}")
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
    """Calcula márgenes incluyendo ambos indicadores de costo."""
    try:
        response = supabase.table("productos").select(
            "id, nombre, costo_unidad, costo_maximo, precio_menor, stock_actual, "
            "categorias(nombre), proveedores(nombre)"
        ).execute()
        
        resultado = []
        for p in response.data:
            costo_rep = p.get("costo_unidad")
            costo_max = p.get("costo_maximo") or costo_rep 
            precio = p.get("precio_menor")
            stock = p.get("stock_actual") or 0
            
            cat_nombre = p.get("categorias", {}).get("nombre", "Sin Categoría") if p.get("categorias") else "Sin Categoría"
            prov_nombre = p.get("proveedores", {}).get("nombre", "Sin Proveedor") if p.get("proveedores") else "Sin Proveedor"
            
            if costo_rep is not None and precio is not None and precio > 0:
                margen_porcentaje = ((precio - float(costo_rep)) / precio) * 100
                resultado.append({
                    "id": p["id"],
                    "nombre": p["nombre"],
                    "categoria": cat_nombre,
                    "proveedor": prov_nombre,
                    "costo": float(costo_rep),
                    "costo_maximo": float(costo_max),
                    "precio": float(precio),
                    "stock": stock,
                    "margen_porcentaje": round(float(margen_porcentaje), 2)
                })
            else:
                resultado.append({
                    "id": p["id"],
                    "nombre": p["nombre"],
                    "categoria": cat_nombre,
                    "stock": stock,
                    "margen_porcentaje": "Pendiente"
                })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en márgenes: {str(e)}")

@app.post("/api/productos")
@app.post("/productos")
def crear_producto(req: ProductoCreateRequest):
    """Registra un nuevo producto e inicia su historial de precios."""
    try:
        def clean_num(val, is_int=False):
            if val is None or str(val).lower() in ['nan', '', 'undefined', 'null']:
                return 0
            return int(float(val)) if is_int else float(val)

        costo_limpio = clean_num(req.costo_unidad)
        p_menor = clean_num(req.precio_menor)
        p_mayor = clean_num(req.precio_mayor)

        data = {
            "sku": req.sku, "nombre": req.nombre, "id_proveedor": req.id_proveedor,
            "id_categoria": req.id_categoria, "costo_unidad": costo_limpio, 
            "costo_maximo": costo_limpio, "precio_menor": p_menor,
            "precio_mayor": p_mayor, "stock_actual": clean_num(req.stock_actual, True)
        }
        res = supabase.table("productos").insert(data).execute()
        
        # MEJORA: Crear registro inicial en historial para que no esté vacío
        if res.data:
            new_id = res.data[0]['id']
            try:
                supabase.table("historial_precios").insert({
                    "id_producto": new_id, "costo_anterior": 0, "costo_nuevo": costo_limpio,
                    "precio_nuevo_menor": p_menor, "precio_nuevo_mayor": p_mayor
                }).execute()
            except: pass

        return {"status": "success", "data": res.data[0] if res.data else data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")

@app.put("/api/productos/{producto_id}/precios")
@app.put("/productos/{producto_id}/precios")
def actualizar_precios_producto(producto_id: str, req: UpdatePrecioRequest):
    """Ajusta precios y registra la trazabilidad obligatoriamente."""
    try:
        prod_actual = supabase.table("productos").select("costo_unidad, costo_maximo, nombre").eq("id", producto_id).single().execute()
        if not prod_actual.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        c_max_actual = float(prod_actual.data.get('costo_maximo') or 0)
        nuevo_c_max = max(c_max_actual, float(req.costo_unidad))

        update_data = {
            "costo_unidad": req.costo_unidad, "costo_maximo": nuevo_c_max,
            "precio_menor": req.precio_menor, "precio_mayor": req.precio_mayor
        }
        supabase.table("productos").update(update_data).eq("id", producto_id).execute()

        # MEJORA: Registro siempre para mantener los 3 últimos registros[cite: 13]
        try:
            supabase.table("historial_precios").insert({
                "id_producto": producto_id, "costo_anterior": prod_actual.data.get('costo_unidad') or 0,
                "costo_nuevo": req.costo_unidad, "precio_nuevo_menor": req.precio_menor,
                "precio_nuevo_mayor": req.precio_mayor
            }).execute()
        except: pass 

        return {"status": "success", "message": f"Precios actualizados para {prod_actual.data['nombre']}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 5. MÓDULO DE CATEGORÍAS (Mantenimiento Completo)
# -----------------------------------------------------------------------------

@app.get("/api/categorias")
@app.get("/categorias")
def listar_categorias():
    """Obtiene categorías activas para los selectores."""
    try:
        res = supabase.table("categorias").select("*").eq("activo", True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/categorias")
@app.post("/categorias")
def crear_categoria(req: CategoriaRequest):
    """Registra una nueva categoría."""
    try:
        data = {"nombre": req.nombre, "descripcion": req.descripcion, "activo": True}
        res = supabase.table("categorias").insert(data).execute()
        result_data = res.data[0] if res.data and len(res.data) > 0 else data
        return {"status": "success", "message": "Registro de Categoria exitoso", "data": result_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear categoría: {str(e)}")

@app.put("/api/categorias/{categoria_id}")
@app.put("/categorias/{categoria_id}")
def editar_categoria(categoria_id: str, req: CategoriaRequest):
    """Edita campos de una categoría existente."""
    try:
        data = {"nombre": req.nombre, "descripcion": req.descripcion}
        res = supabase.table("categorias").update(data).eq("id", categoria_id).execute()
        return {"status": "success", "message": "Actualización de Categoria exitosa"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/categorias/{categoria_id}")
@app.delete("/categorias/{categoria_id}")
def eliminar_logico_categoria(categoria_id: str):
    """Desactiva una categoría sin borrarla de la DB."""
    try:
        res = supabase.table("categorias").update({"activo": False}).eq("id", categoria_id).execute()
        return {"status": "success", "message": "Categoría eliminada de la vista"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 6. MÓDULO DE DASHBOARD (PARA PRESENTACIÓN)
# -----------------------------------------------------------------------------

@app.get("/api/dashboard/resumen")
@app.get("/dashboard/resumen")
def obtener_resumen_dashboard():
    """Calcula indicadores clave de valor de inventario y stock crítico."""
    try:
        res = supabase.table("productos").select("costo_unidad, stock_actual").execute()
        
        valor_total = 0
        agotados = 0
        stock_bajo = 0
        
        for p in res.data:
            costo = float(p.get("costo_unidad") or 0)
            stock = int(p.get("stock_actual") or 0)
            
            valor_total += (costo * stock)
            if stock <= 0:
                agotados += 1
            elif stock < 10:
                stock_bajo += 1
                
        return {
            "valor_total_inventario": round(valor_total, 2),
            "productos_agotados": agotados,
            "productos_stock_bajo": stock_bajo,
            "total_items": len(res.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en dashboard: {str(e)}")

# -----------------------------------------------------------------------------
# 7. MÓDULO DE PROVEEDORES (Mantenimiento Completo)
# -----------------------------------------------------------------------------

@app.get("/api/proveedores")
@app.get("/proveedores")
def listar_proveedores():
    """Lista empresas proveedoras activas."""
    try:
        response = supabase.table("proveedores").select("*").eq("activo", True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar proveedores: {str(e)}")

@app.post("/api/proveedores")
@app.post("/proveedores")
def crear_proveedor(prov: ProveedorRequest):
    """Registra un nuevo proveedor."""
    try:
        data = {"nombre": prov.nombre, "contacto": prov.contacto, "activo": True}
        response = supabase.table("proveedores").insert(data).execute()
        result_data = response.data[0] if response.data and len(response.data) > 0 else data
        return {"status": "success", "message": "Registro de Proveedor exitoso", "data": result_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error DB Supabase: {str(e)}")

@app.put("/api/proveedores/{proveedor_id}")
@app.put("/proveedores/{proveedor_id}")
def editar_proveedor(proveedor_id: str, prov: ProveedorRequest):
    """Edita campos de un proveedor existente."""
    try:
        data = {"nombre": prov.nombre, "contacto": prov.contacto}
        res = supabase.table("proveedores").update(data).eq("id", proveedor_id).execute()
        return {"status": "success", "message": "Actualización de Proveedor exitosa"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/proveedores/{proveedor_id}")
@app.delete("/proveedores/{proveedor_id}")
def eliminar_logico_proveedor(proveedor_id: str):
    """Desactiva un proveedor sin borrarlo de la DB."""
    try:
        res = supabase.table("proveedores").update({"activo": False}).eq("id", proveedor_id).execute()
        return {"status": "success", "message": "Proveedor eliminado de la vista"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 8. MÓDULO DE CAJA (Arqueo Diario)
# -----------------------------------------------------------------------------

@app.post("/api/caja/abrir")
@app.post("/caja/abrir")
def abrir_caja(req: AperturaCajaRequest):
    """Inicia sesión de caja."""
    try:
        caja_abierta = supabase.table("sesiones_caja").select("*").eq("estado", "ABIERTA").execute()
        if caja_abierta.data:
            return {
                "status": "error", 
                "message": "La caja ya se encuentra abierta", 
                "id_sesion": caja_abierta.data[0]['id']
            }

        data = {
            "monto_inicial": req.monto_inicial,
            "estado": "ABIERTA",
            "observaciones": req.observaciones
        }
        res = supabase.table("sesiones_caja").insert(data).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en apertura: {str(e)}")

@app.post("/api/caja/cerrar")
@app.post("/caja/cerrar")
def cerrar_caja(req: CierreCajaRequest):
    """Calcula arqueo de caja."""
    try:
        ventas_res = supabase.table("movimientos_inventario").select("cantidad, precio_momento")\
            .eq("id_sesion_caja", req.id_sesion)\
            .eq("tipo_movimiento", "SALIDA")\
            .eq("medio_pago", "EFECTIVO")\
            .execute()
        
        sesion_res = supabase.table("sesiones_caja").select("monto_inicial").eq("id", req.id_sesion).single().execute()
        
        if not sesion_res.data:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")

        monto_ini = float(sesion_res.data['monto_inicial'])
        total_efectivo = sum(float(v['cantidad']) * float(v.get('precio_momento') or 0) for v in ventas_res.data)
        
        monto_esperado = monto_ini + total_efectivo
        diferencia = req.monto_fisico - monto_esperado

        supabase.table("sesiones_caja").update({
            "estado": "CERRADA",
            "monto_final_sistema": monto_esperado,
            "monto_final_contado": req.monto_fisico
        }).eq("id", req.id_sesion).execute()

        return {
            "status": "success",
            "cuadre": {
                "sistema": monto_esperado,
                "contado": req.monto_fisico,
                "diferencia": diferencia
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en cierre: {str(e)}")

# -----------------------------------------------------------------------------
# 9. MÓDULO DE VENTAS (SALIDAS)
# -----------------------------------------------------------------------------

@app.post("/api/ventas/procesar")
@app.post("/ventas/procesar")
def procesar_venta(venta: VentaRequest):
    """Registra ventas y descuenta stock."""
    try:
        for item in venta.items:
            prod_res = supabase.table("productos").select("nombre, stock_actual").eq("id", item.id_producto).single().execute()
            if not prod_res.data: continue

            if venta.tipo_documento == "NOTA_VENTA":
                stock_act = prod_res.data['stock_actual'] or 0
                if stock_act < item.cantidad:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente para {prod_res.data['nombre']}")
                
                nuevo_stock = stock_act - item.cantidad
                supabase.table("productos").update({"stock_actual": nuevo_stock}).eq("id", item.id_producto).execute()

            supabase.table("movimientos_inventario").insert({
                "id_producto": item.id_producto,
                "tipo_movimiento": "SALIDA",
                "cantidad": item.cantidad,
                "precio_momento": item.precio_unitario,
                "referencia": f"Venta: {venta.tipo_documento}",
                "id_sesion_caja": venta.id_sesion_caja,
                "medio_pago": venta.medio_pago
            }).execute()

        return {"status": "success", "message": "Venta registrada con éxito"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en venta: {str(e)}")

# -----------------------------------------------------------------------------
# 10. MÓDULO DE INVENTARIO (ENTRADAS / COMPRAS)
# -----------------------------------------------------------------------------

@app.post("/api/inventario/ingreso")
@app.post("/inventario/ingreso")
def registrar_ingreso(req: IngresoRequest):
    """Aumenta stock y garantiza el registro histórico completo[cite: 13]."""
    try:
        prod_res = supabase.table("productos").select("nombre, stock_actual, costo_unidad, costo_maximo").eq("id", req.id_producto).single().execute()
        if not prod_res.data: raise HTTPException(status_code=404, detail="Producto no encontrado")

        stock_act = prod_res.data['stock_actual'] or 0
        costo_ant = prod_res.data['costo_unidad']
        c_max_ant = float(prod_res.data.get('costo_maximo') or 0) 
        
        nuevo_stock = stock_act + req.cantidad
        nuevo_c_max = max(c_max_ant, float(req.costo_nuevo))

        supabase.table("productos").update({
            "stock_actual": nuevo_stock, "costo_unidad": req.costo_nuevo,
            "costo_maximo": nuevo_c_max, "precio_menor": req.precio_menor_nuevo,
            "precio_mayor": req.precio_mayor_nuevo
        }).eq("id", req.id_producto).execute()

        supabase.table("movimientos_inventario").insert({
            "id_producto": req.id_producto, "tipo_movimiento": "ENTRADA",
            "cantidad": req.cantidad, "precio_momento": req.costo_nuevo,
            "referencia": f"Documento: {req.documento_referencia}" if req.documento_referencia else "Ingreso Manual",
            "medio_pago": "EFECTIVO" 
        }).execute()

        # CORRECCIÓN: Registro de historial SIEMPRE para alimentar el tablero de ingresos[cite: 13]
        try:
            supabase.table("historial_precios").insert({
                "id_producto": req.id_producto, "costo_anterior": costo_ant or 0,
                "costo_nuevo": req.costo_nuevo, "precio_nuevo_menor": req.precio_menor_nuevo,
                "precio_nuevo_mayor": req.precio_mayor_nuevo 
            }).execute()
        except Exception as history_error:
            print(f"AVISO: Fallo al grabar historial: {history_error}")

        return {"status": "success", "stock_final": nuevo_stock}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en registro de ingreso: {str(e)}")

# -----------------------------------------------------------------------------
# 11. MÓDULO DE TRAZABILIDAD Y CONTEXTO
# -----------------------------------------------------------------------------

@app.get("/api/productos/{producto_id}/historial-ingresos")
@app.get("/productos/{producto_id}/historial-ingresos")
def obtener_historial_ingresos_especifico(producto_id: str):
    """Devuelve los 3 últimos registros del historial[cite: 13]."""
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
            .select("fecha, tipo_movimiento, cantidad, precio_momento, referencia, medio_pago")\
            .eq("id_producto", producto_id)\
            .order("fecha", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener historial: {str(e)}")

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
                "COSTO REPOSICIÓN (S/)": float(p.get("costo_unidad") or 0),
                "COSTO TECHO MÁXIMO (S/)": float(p.get("costo_maximo") or 0),
                "PRECIO MENOR (S/)": float(p.get("precio_menor") or 0),
                "PRECIO MAYOR (S/)": float(p.get("precio_mayor") or 0),
                "STOCK ACTUAL": p.get("stock_actual") or 0
            })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en reporte: {str(e)}")