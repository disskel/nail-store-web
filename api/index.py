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
    version="1.0.12" # ACTUALIZADO: Soporte para Nota de Pedido y Clientes
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
# 2. UTILIDADES FINANCIERAS (TRUJILLO FORMATO)[cite: 13]
# -----------------------------------------------------------------------------

def monto_a_letras(monto: float) -> str:
    """Convierte el total numérico a texto formal para la Nota de Pedido[cite: 13]."""
    unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    especiales = {11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE"}
    centenas = ["", "CIEN", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    def convertir_grupo(n):
        res = ""
        if n >= 100:
            res += (centenas[n // 100] if n != 100 else "CIENTO") + " "
            n %= 100
        if 10 < n < 20 and n in especiales:
            res += especiales[n] + " "
            n = 0
        elif n >= 10:
            res += decenas[n // 10] + (" Y " if n % 10 != 0 else "")
            n %= 10
        if n > 0:
            res += unidades[n] + " "
        return res

    entero = int(monto)
    decimales = int(round((monto - entero) * 100))
    
    palabras = ""
    if entero == 0: palabras = "CERO "
    elif entero < 1000: palabras = convertir_grupo(entero)
    else:
        miles = entero // 1000
        resto = entero % 1000
        palabras = (convertir_grupo(miles) if miles > 1 else "") + "MIL " + convertir_grupo(resto)

    return f"SON {palabras.strip()} CON {decimales:02d}/100 SOLES"

# -----------------------------------------------------------------------------
# 3. MODELOS DE DATOS (PYDANTIC)
# Fundamento: Validación estricta de tipos para evitar inconsistencias en la DB
# -----------------------------------------------------------------------------

class ClienteRequest(BaseModel):
    """Modelo para el registro y búsqueda de clientes[cite: 14]"""
    tipo_documento: str # DNI, RUC, VARIOS
    numero_documento: str
    nombre_razon_social: str
    direccion: Optional[str] = None
    celular: Optional[str] = None
    contacto_nombre: Optional[str] = None

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
    descuento: Optional[float] = 0.0 # Captura el descuento global aplicado en la venta
    # NUEVOS CAMPOS PARA NOTA DE PEDIDO[cite: 14]
    id_cliente: Optional[str] = None 
    cliente_data: Optional[ClienteRequest] = None # Para crear cliente en el momento

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
# 4. ENDPOINTS DE SISTEMA Y SALUD
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
# 5. MÓDULO DE PRODUCTOS E INVENTARIO
# -----------------------------------------------------------------------------

@app.get("/api/productos/margenes")
@app.get("/productos/margenes")
def obtener_margenes():
    """Calcula márgenes incluyendo todos los indicadores de precio para Trujillo."""
    try:
        # CORRECCIÓN: Se añadió "precio_mayor" a la cadena de selección[cite: 20]
        response = supabase.table("productos").select(
            "id, nombre, costo_unidad, costo_maximo, precio_menor, precio_mayor, stock_actual, "
            "categorias(nombre), proveedores(nombre)"
        ).execute()
        
        resultado = []
        for p in response.data:
            # Aseguramos que siempre existan valores numéricos para evitar errores visuales[cite: 20]
            costo_rep = float(p.get("costo_unidad") or 0.0)
            costo_max = float(p.get("costo_maximo") or costo_rep) 
            precio = float(p.get("precio_menor") or 0.0)
            # CAPTURA CORRECTA: Ahora sí obtenemos el precio mayor de la DB[cite: 20]
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
                    "precio_mayor": p_mayor, # AHORA SE ENVÍA AL FRONTEND[cite: 20]
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
                    "precio_mayor": p_mayor, # AHORA SE ENVÍA AL FRONTEND[cite: 20]
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
# 6. MÓDULO DE CLIENTES (MANTENEDOR TRUJILLO)[cite: 14]
# -----------------------------------------------------------------------------

@app.get("/api/clientes/{numero}")
def buscar_cliente(numero: str):
    """Localiza un cliente registrado por su DNI o RUC[cite: 14]."""
    try:
        res = supabase.table("clientes").select("*").eq("numero_documento", numero).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clientes")
def crear_cliente(req: ClienteRequest):
    """Registra un nuevo cliente con formato en mayúsculas para el PDF[cite: 14]."""
    try:
        data = {
            "tipo_documento": req.tipo_documento,
            "numero_documento": req.numero_documento,
            "nombre_razon_social": req.nombre_razon_social.upper(),
            "direccion": req.direccion.upper() if req.direccion else None,
            "celular": req.celular,
            "contacto_nombre": req.contacto_nombre.upper() if req.contacto_nombre else None
        }
        res = supabase.table("clientes").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 7. MÓDULO DE CATEGORÍAS (Mantenimiento Completo)
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
# 8. MÓDULO DE DASHBOARD
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
# 9. MÓDULO DE PROVEEDORES
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
# 10. MÓDULO DE CAJA
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
# 11. MÓDULO DE VENTAS (ARQUITECTURA DE CABECERA Y DETALLE)
# -----------------------------------------------------------------------------

@app.post("/api/ventas/procesar")
@app.post("/ventas/procesar")
def procesar_venta(venta: VentaRequest):
    """Registra transacción, vincula cliente y gestiona correlativos de Nota de Pedido[cite: 13, 14, 20]."""
    try:
        # 1. Resolución de Cliente (Identificar o Crear)[cite: 14]
        target_cliente_id = venta.id_cliente
        if not target_cliente_id and venta.cliente_data:
            existente = buscar_cliente(venta.cliente_data.numero_documento)
            if existente: target_cliente_id = existente['id']
            else:
                nuevo = crear_cliente(venta.cliente_data)
                target_cliente_id = nuevo['id']
        
        if not target_cliente_id:
            # Fallback a registro "VARIOS" (debe existir en DB con ese tipo)
            varios = supabase.table("clientes").select("id").eq("tipo_documento", "VARIOS").single().execute()
            target_cliente_id = varios.data['id']

        # 2. Generación de Correlativo Secuencial (P001-XXXXXXX)[cite: 13]
        correlativo_final = None
        if venta.tipo_documento == "NOTA_VENTA":
            corr_data = supabase.table("correlativos").select("*").eq("tipo_documento", "NOTA_PEDIDO").single().execute()
            nuevo_num = corr_data.data['ultimo_numero'] + 1
            correlativo_final = f"{corr_data.data['serie']}-{str(nuevo_num).zfill(corr_data.data['longitud_numero'])}"
            supabase.table("correlativos").update({"ultimo_numero": nuevo_num}).eq("id", corr_data.data['id']).execute()

        # 3. Cálculos de Auditoría Financiera
        monto_bruto = sum(item.cantidad * item.precio_unitario for item in venta.items)
        monto_descuento = float(venta.descuento or 0.0)
        monto_neto = max(0.0, monto_bruto - monto_descuento)

        # 4. Insertar Cabecera de Venta[cite: 20]
        res_header = supabase.table("ventas").insert({
            "id_sesion_caja": venta.id_sesion_caja,
            "id_cliente": target_cliente_id,
            "correlativo_nota": correlativo_final,
            "monto_bruto": monto_bruto,
            "monto_descuento": monto_descuento,
            "monto_neto": monto_neto,
            "medio_pago": venta.medio_pago,
            "motivo_descuento": venta.observaciones
        }).execute()

        if not res_header.data:
            raise HTTPException(status_code=500, detail="Error al generar el registro maestro de venta")
        
        id_venta_db = res_header.data[0]['id']

        # 5. Procesar Ítems (Detalle) y Actualizar Stock[cite: 20]
        for item in venta.items:
            # Obtener stock actual para el descuento[cite: 20]
            prod = supabase.table("productos").select("stock_actual").eq("id", item.id_producto).single().execute()
            nuevo_stock = (int(prod.data.get('stock_actual') or 0)) - item.cantidad
            
            # Actualizar Maestro de Productos[cite: 20]
            supabase.table("productos").update({"stock_actual": nuevo_stock}).eq("id", item.id_producto).execute()
            
            # Registrar Movimiento de Inventario Vinculado a la Venta[cite: 20]
            supabase.table("movimientos_inventario").insert({
                "id_producto": item.id_producto, 
                "tipo_movimiento": "SALIDA", 
                "cantidad": item.cantidad, 
                "precio_momento": item.precio_unitario, 
                "id_sesion_caja": venta.id_sesion_caja,
                "medio_pago": venta.medio_pago,
                "id_venta": id_venta_db # <--- VINCULACIÓN CRÍTICA
            }).execute()

        # 6. Respuesta para el Frontend (Preparación de Impresión)[cite: 13]
        return {
            "status": "success", 
            "id_venta": id_venta_db,
            "correlativo": correlativo_final,
            "total_letras": monto_a_letras(monto_neto)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crítico en proceso de venta: {str(e)}")

# -----------------------------------------------------------------------------
# 12. MÓDULO DE INVENTARIO (ENTRADAS / COMPRAS)
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
# 13. MÓDULO DE TRAZABILIDAD Y CONTEXTO
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

# -----------------------------------------------------------------------------
# 14. GESTIÓN DE SESIÓN DE CAJA Y ARQUEO PRECISO[cite: 20]
# -----------------------------------------------------------------------------

@app.get("/api/caja/estado-actual")
@app.get("/caja/estado-actual")
def obtener_estado_caja():
    """Busca si existe una sesión abierta actualmente."""
    try:
        # Buscamos la última sesión que esté en estado ABIERTA
        res = supabase.table("sesiones_caja")\
            .select("*")\
            .eq("estado", "ABIERTA")\
            .order("fecha_apertura", desc=True)\
            .limit(1)\
            .execute()
        
        if res.data and len(res.data) > 0:
            return {"esta_abierta": True, "sesion": res.data[0]}
        return {"esta_abierta": False, "sesion": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ACTUALIZACIÓN DE RESUMEN: Ahora consultamos la tabla 'ventas' (Montos Netos)
@app.get("/api/caja/resumen/{sesion_id}")
@app.get("/caja/resumen/{sesion_id}")
def obtener_resumen_caja(sesion_id: str):
    """Calcula ventas acumuladas usando la cabecera 'ventas' para mayor precisión en arqueos."""
    try:
        # 1. Obtener datos de la sesión para el monto inicial[cite: 20]
        sesion = supabase.table("sesiones_caja").select("monto_inicial").eq("id", sesion_id).single().execute()
        if not sesion.data:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        m_inicial = float(sesion.data.get("monto_inicial") or 0.0)

        # 2. Consultar Cabeceras de Venta (Donde el Neto ya descuenta la rebaja)
        ventas_res = supabase.table("ventas")\
            .select("monto_neto, medio_pago")\
            .eq("id_sesion_caja", sesion_id)\
            .eq("estado", "COMPLETADA")\
            .execute()
        
        # 3. Clasificación y Totalización
        total_ventas_netas = 0.0
        desglose = {
            "EFECTIVO": 0.0,
            "YAPE": 0.0,
            "PLIN": 0.0,
            "TRANSFERENCIA": 0.0
        }

        for v in ventas_res.data:
            neto = float(v.get("monto_neto") or 0.0)
            total_ventas_netas += neto
            
            medio = str(v.get("medio_pago", "EFECTIVO")).upper()
            if medio in desglose:
                desglose[medio] += neto
            else:
                desglose[medio] = desglose.get(medio, 0.0) + neto

        return {
            "monto_inicial": round(m_inicial, 2),
            "total_ventas": round(total_ventas_netas, 2),
            # El efectivo esperado suma el inicial + ventas en cash netas
            "saldo_esperado_efectivo": round(m_inicial + desglose["EFECTIVO"], 2),
            "desglose_pagos": {k: round(v, 2) for k, v in desglose.items()},
            "total_general_sistema": round(m_inicial + total_ventas_netas, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- END POINT PARA PROCESAR CIERRE - TABLA CIERRES_CAJA_DETALLE ---

@app.post("/api/caja/cerrar")
@app.post("/caja/cerrar")
def cerrar_caja(req: CierreCajaRequest):
    """Finaliza el turno, calcula descuadres y bloquea la terminal."""
    try:
        # 1. Obtener el resumen actualizado con montos netos[cite: 20]
        resumen = obtener_resumen_caja(req.id_sesion)
        
        m_sistema_efectivo = resumen["saldo_esperado_efectivo"]
        m_sistema_total = resumen["total_general_sistema"]
        diferencia = req.monto_fisico - m_sistema_efectivo

        # 2. Actualizar Tabla Maestra de Sesiones[cite: 20]
        supabase.table("sesiones_caja").update({
            "monto_final_contado": req.monto_fisico,
            "monto_final_sistema": m_sistema_efectivo,
            "estado": "CERRADA"
        }).eq("id", req.id_sesion).execute()

        # 3. Registrar Detalle de Auditoría Final
        supabase.table("cierres_caja_detalle").insert({
            "id_sesion": req.id_sesion,
            "total_efectivo_sistema": m_sistema_efectivo,
            "total_digital_sistema": resumen["total_ventas"] - resumen["desglose_pagos"]["EFECTIVO"],
            "monto_fisico_contado": req.monto_fisico,
            "diferencia": diferencia
        }).execute()

        return {"status": "success", "diferencia": diferencia}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en cierre: {str(e)}")