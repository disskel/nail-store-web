from fastapi import FastAPI, HTTPException, Request, Header, Depends # AGREGADO: Header y Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from supabase import create_client, Client
import os
import time
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# 1. CONFIGURACIÓN E INICIALIZACIÓN (Setup)
# -----------------------------------------------------------------------------
# load_dotenv() # Comentado para producción en Vercel

app = FastAPI(
    title="Nail-Store API Pro",
    description="Motor de gestión empresarial con Seguridad SSR v1.0.19",
    version="1.0.19", # CORREGIDO: Coma agregada para evitar el error 500
    contact={
        "name": "Soporte Técnico Trujillo",
        "email": "jeannailsstore@gmail.com"
    }
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

# =============================================================================
# BLOQUE 3: CAPA DE SEGURIDAD - EL PORTERO (SUPABASE AUTH)
# Propósito: Validar el Token JWT de cada usuario antes de procesar datos[cite: 11].
# =============================================================================

async def validar_token(authorization: str = Header(None)):
    """
    Inyección de dependencia de seguridad. Verifica que el cajero tenga una
    sesión activa. Si el token es inválido o falta, bloquea la API (Error 401).
    """
    if not authorization:
        raise HTTPException(
            status_code=401, 
            detail="ACCESO DENEGADO: NO SE ENCONTRÓ TOKEN DE SESIÓN"
        )
    
    try:
        # El token llega como 'Bearer eyJhbG...'
        token = authorization.split(" ")[1]
        
        # Validación en tiempo real contra el servidor de identidades de Supabase
        user = supabase.auth.get_user(token)
        
        if not user:
            raise HTTPException(status_code=401, detail="SESIÓN NO VÁLIDA")
            
        return user
    except Exception:
        raise HTTPException(
            status_code=401, 
            detail="SESIÓN EXPIRADA: POR FAVOR, INICIE SESIÓN NUEVAMENTE"
        )

# -----------------------------------------------------------------------------
# 2. UTILIDADES FINANCIERAS (TRUJILLO FORMATO)
# -----------------------------------------------------------------------------

def monto_a_letras(monto: float) -> str:
    """Convierte el total numérico a texto formal para la Nota de Pedido."""
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
    """Modelo para el registro y búsqueda de clientes"""
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
    descuento: Optional[float] = 0.0 
    # CAMPOS PARA NOTA DE PEDIDO
    id_cliente: Optional[str] = None 
    cliente_data: Optional[ClienteRequest] = None 

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
    """Modelo robusto para arqueo multimodal (Efectivo y Bancos)"""
    id_sesion: str
    monto_fisico_efectivo: float # Lo que hay físicamente en el cajón
    monto_yape_contado: float    # Lo visualizado en el App de Yape
    monto_plin_contado: float    # Lo visualizado en el App de Plin
    monto_transf_contado: float  # Lo visualizado en cuenta bancaria

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

class ProductoUpdateRequest(BaseModel):
    """Modelo para actualización selectiva de nombre y borrado lógico"""
    nombre: Optional[str] = None
    activo: Optional[bool] = None

# -----------------------------------------------------------------------------
# 4. ENDPOINTS DE SISTEMA Y SALUD
# -----------------------------------------------------------------------------

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

@app.get("/productos/margenes")
def obtener_margenes(mostrar_inactivos: bool = False, user = Depends(validar_token)):
    """Calcula márgenes. Permite filtrar productos inactivos (Borrado Lógico)."""
    try:
        query = supabase.table("productos").select(
            "id, nombre, costo_unidad, costo_maximo, precio_menor, precio_mayor, stock_actual, activo, "
            "categorias(nombre), proveedores(nombre)"
        )
        
        # Filtro de seguridad: por defecto ocultamos los inactivos
        if not mostrar_inactivos:
            query = query.eq("activo", True)
            
        response = query.execute()
        
        resultado = []
        for p in response.data:
            costo_rep = float(p.get("costo_unidad") or 0.0)
            costo_max = float(p.get("costo_maximo") or costo_rep) 
            precio = float(p.get("precio_menor") or 0.0)
            p_mayor = float(p.get("precio_mayor") or 0.0)
            stock = int(p.get("stock_actual") or 0)
            activo_status = p.get("activo", True)
            
            cat_nombre = p.get("categorias", {}).get("nombre", "Sin Categoría") if p.get("categorias") else "Sin Categoría"
            prov_nombre = p.get("proveedores", {}).get("nombre", "Sin Proveedor") if p.get("proveedores") else "Sin Proveedor"
            
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
                    "precio_mayor": p_mayor, 
                    "stock": stock,
                    "activo": activo_status,
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
                    "precio_mayor": p_mayor, 
                    "stock": stock,
                    "activo": activo_status,
                    "margen_porcentaje": 0.0
                })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en márgenes: {str(e)}")

@app.post("/productos")
def crear_producto(req: ProductoCreateRequest, user = Depends(validar_token)):
    """Registra un nuevo producto. Obliga Proveedor/Categoría y fuerza stock a 0."""
    try:
        if not req.id_proveedor or str(req.id_proveedor).strip() == "":
            raise HTTPException(status_code=400, detail="El Proveedor es obligatorio")
        if not req.id_categoria or str(req.id_categoria).strip() == "":
            raise HTTPException(status_code=400, detail="La Categoría es obligatoria")

        costo_limpio = float(req.costo_unidad or 0.0)
        p_menor = float(req.precio_menor or 0.0)
        p_mayor = float(req.precio_mayor or 0.0)

        data = {
            "sku": req.sku, 
            "nombre": req.nombre.upper(), # Siempre en mayúsculas
            "id_proveedor": req.id_proveedor,
            "id_categoria": req.id_categoria, 
            "costo_unidad": costo_limpio, 
            "costo_maximo": costo_limpio, 
            "precio_menor": p_menor,
            "precio_mayor": p_mayor, 
            "stock_actual": 0,
            "activo": True
        }
        res = supabase.table("productos").insert(data).execute()
        
        if res.data and len(res.data) > 0:
            new_id = res.data[0]['id']
            supabase.table("historial_precios").insert({
                "id_producto": new_id, 
                "costo_anterior": 0.0, 
                "costo_nuevo": costo_limpio,
                "precio_nuevo_menor": p_menor, 
                "precio_nuevo_mayor": p_mayor
            }).execute()

        return {"status": "success", "data": res.data[0] if res.data else data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")

@app.patch("/productos/{producto_id}")
def actualizar_producto(producto_id: str, req: ProductoUpdateRequest, user = Depends(validar_token)):
    """Permite corregir el nombre o desactivar el producto (Borrado Lógico)."""
    try:
        update_data = {}
        if req.nombre is not None: update_data["nombre"] = req.nombre.upper()
        if req.activo is not None: update_data["activo"] = req.activo

        res = supabase.table("productos").update(update_data).eq("id", producto_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
            
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/productos/{producto_id}/precios")
def actualizar_precios_producto(producto_id: str, req: UpdatePrecioRequest, user = Depends(validar_token)):
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
# 6. MÓDULO CRM DE CLIENTES (TRUJILLO SEGUIMIENTO)
# -----------------------------------------------------------------------------

@app.get("/clientes")
def listar_clientes(user = Depends(validar_token)):
    """Devuelve la lista completa de clientes para el nuevo menú de seguimiento."""
    try:
        res = supabase.table("clientes").select("*").order("nombre_razon_social").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/clientes/{numero}")
def buscar_cliente(numero: str, user = Depends(validar_token)):
    """Localiza un cliente registrado por su DNI o RUC."""
    try:
        res = supabase.table("clientes").select("*").eq("numero_documento", numero).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/clientes/{id_cliente}/historial")
def historial_compras_cliente(id_cliente: str, user = Depends(validar_token)):
    """Consulta todas las notas de pedido previas de un cliente específico."""
    try:
        res = supabase.table("ventas")\
            .select("id, fecha, correlativo_nota, monto_neto, medio_pago, estado")\
            .eq("id_cliente", id_cliente)\
            .order("fecha", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clientes")
def crear_cliente(req: ClienteRequest, user = Depends(validar_token)):
    """Registra un nuevo cliente con formato en mayúsculas para el PDF."""
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

@app.get("/categorias")
def listar_categorias(user = Depends(validar_token)):
    try:
        res = supabase.table("categorias").select("*").eq("activo", True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/categorias")
def crear_categoria(req: CategoriaRequest, user = Depends(validar_token)):
    try:
        data = {"nombre": req.nombre.upper(), "descripcion": req.descripcion, "activo": True}
        res = supabase.table("categorias").insert(data).execute()
        return {"status": "success", "data": res.data[0] if res.data else data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear categoría: {str(e)}")

# -----------------------------------------------------------------------------
# 8. MÓDULO DE DASHBOARD
# -----------------------------------------------------------------------------

@app.get("/dashboard/resumen")
def obtener_resumen_dashboard(user = Depends(validar_token)):
    try:
        # Solo sumamos valor de productos activos
        res = supabase.table("productos").select("costo_unidad, stock_actual").eq("activo", True).execute()
        v_total = sum(float(p.get("costo_unidad") or 0.0) * int(p.get("stock_actual") or 0) for p in res.data)
        return {"valor_total_inventario": round(v_total, 2), "total_items": len(res.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en dashboard: {str(e)}")

# -----------------------------------------------------------------------------
# 9. MÓDULO DE PROVEEDORES
# -----------------------------------------------------------------------------

@app.get("/proveedores")
def listar_proveedores(user = Depends(validar_token)):
    try:
        response = supabase.table("proveedores").select("*").eq("activo", True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/proveedores")
def crear_proveedor(prov: ProveedorRequest, user = Depends(validar_token)):
    try:
        data = {"nombre": prov.nombre.upper(), "contacto": prov.contacto, "activo": True}
        response = supabase.table("proveedores").insert(data).execute()
        return {"status": "success", "data": response.data[0] if response.data else data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 10. MÓDULO DE CAJA
# -----------------------------------------------------------------------------

@app.post("/caja/abrir")
def abrir_caja(req: AperturaCajaRequest, user = Depends(validar_token)):
    try:
        res = supabase.table("sesiones_caja").insert({
            "monto_inicial": req.monto_inicial, 
            "estado": "ABIERTA", 
            "observaciones": req.observaciones
        }).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 11. MÓDULO DE VENTAS Y NOTA DE PEDIDO (TRABAJO PESADO)
# -----------------------------------------------------------------------------

@app.post("/ventas/procesar")
def procesar_venta(venta: VentaRequest, user = Depends(validar_token)):
    """Registra transacción, vincula cliente y gestiona correlativos formales."""
    try:
        # 1. Resolución de Cliente (Identificar o Crear)
        target_cliente_id = venta.id_cliente
        if not target_cliente_id and venta.cliente_data:
            existente = buscar_cliente(venta.cliente_data.numero_documento)
            if existente: target_cliente_id = existente['id']
            else:
                nuevo = crear_cliente(venta.cliente_data)
                target_cliente_id = nuevo['id']
        
        if not target_cliente_id:
            varios = supabase.table("clientes").select("id").eq("tipo_documento", "VARIOS").single().execute()
            target_cliente_id = varios.data['id']

        # 2. Generación de Correlativo Secuencial (P001-XXXXXXX)
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

        # 4. Insertar Cabecera de Venta
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

        id_venta_db = res_header.data[0]['id']

        # 5. Procesar Detalle y Descuento de Stock
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
                "medio_pago": venta.medio_pago,
                "id_venta": id_venta_db
            }).execute()

        # 6. Respuesta para el Frontend (Preparación de Impresión)
        return {
            "status": "success", 
            "id_venta": id_venta_db,
            "correlativo": correlativo_final,
            "total_letras": monto_a_letras(monto_neto)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crítico en venta: {str(e)}")

# -----------------------------------------------------------------------------
# 12. MÓDULO DE INVENTARIO (ENTRADAS / COMPRAS)
# -----------------------------------------------------------------------------

@app.post("/inventario/ingreso")
def registrar_ingreso(req: IngresoRequest, user = Depends(validar_token)):
    """Aumenta stock y garantiza el registro histórico completo."""
    try:
        prod_res = supabase.table("productos").select("costo_unidad, costo_maximo, stock_actual").eq("id", req.id_producto).single().execute()
        if not prod_res.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        c_ant = float(prod_res.data.get('costo_unidad') or 0.0)
        s_act = int(prod_res.data.get('stock_actual') or 0)
        c_max_ant = float(prod_res.data.get('costo_maximo') or 0.0) 
        
        nuevo_stock = s_act + req.cantidad
        nuevo_c_max = max(c_max_ant, float(req.costo_nuevo))

        supabase.table("productos").update({
            "stock_actual": nuevo_stock, 
            "costo_unidad": req.costo_nuevo,
            "costo_maximo": nuevo_c_max, 
            "precio_menor": req.precio_menor_nuevo,
            "precio_mayor": req.precio_mayor_nuevo
        }).eq("id", req.id_producto).execute()

        supabase.table("movimientos_inventario").insert({
            "id_producto": req.id_producto, 
            "tipo_movimiento": "ENTRADA", 
            "cantidad": req.cantidad,
            "precio_momento": req.costo_nuevo, 
            "referencia": req.documento_referencia or "Ingreso Manual"
        }).execute()

        supabase.table("historial_precios").insert({
            "id_producto": req.id_producto, 
            "costo_anterior": c_ant, 
            "costo_nuevo": float(req.costo_nuevo),
            "precio_nuevo_menor": float(req.precio_menor_nuevo),
            "precio_nuevo_mayor": float(req.precio_mayor_nuevo)
        }).execute()

        return {"status": "success", "stock_final": nuevo_stock}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error Crítico BD: {str(e)}")

# -----------------------------------------------------------------------------
# 13. MÓDULO DE TRAZABILIDAD Y CONTEXTO
# -----------------------------------------------------------------------------

@app.get("/productos/{producto_id}/historial-ingresos")
def obtener_historial_ingresos_especifico(producto_id: str, user = Depends(validar_token)):
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

@app.get("/productos/{producto_id}/historial")
def obtener_historial_producto(producto_id: str, user = Depends(validar_token)):
    try:
        res = supabase.table("movimientos_inventario")\
            .select("*")\
            .eq("id_producto", producto_id)\
            .order("fecha", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/productos/reporte-completo")
def obtener_reporte_completo(user = Depends(validar_token)):
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
# 14. GESTIÓN DE SESIÓN DE CAJA Y ARQUEO MULTIMODAL
# -----------------------------------------------------------------------------

@app.get("/caja/estado-actual")
def obtener_estado_caja(user = Depends(validar_token)):
    """Busca si existe una sesión abierta actualmente."""
    try:
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

@app.get("/caja/resumen/{sesion_id}")
def obtener_resumen_caja(sesion_id: str, user = Depends(validar_token)):
    """Calcula totales acumulados para corroborar con el banco y caja física."""
    try:
        # 1. Obtener datos de la sesión para el monto inicial
        sesion = supabase.table("sesiones_caja").select("monto_inicial").eq("id", sesion_id).single().execute()
        if not sesion.data: raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        m_inicial = float(sesion.data.get("monto_inicial") or 0.0)

        # 2. Consultar Cabeceras de Venta Completadas
        ventas_res = supabase.table("ventas")\
            .select("monto_neto, medio_pago")\
            .eq("id_sesion_caja", sesion_id)\
            .eq("estado", "COMPLETADA")\
            .execute()
        
        # 3. Clasificación y Totalización Multimodal
        total_ventas_netas = 0.0
        desglose = {"EFECTIVO": 0.0, "YAPE": 0.0, "PLIN": 0.0, "TRANSFERENCIA": 0.0}

        for v in ventas_res.data:
            neto = float(v.get("monto_neto") or 0.0)
            total_ventas_netas += neto
            medio = str(v.get("medio_pago", "EFECTIVO")).upper()
            if medio in desglose: desglose[medio] += neto

        return {
            "monto_inicial": round(m_inicial, 2),
            "ventas_por_metodo": {k: round(v, 2) for k, v in desglose.items()},
            "total_ventas_turno": round(total_ventas_netas, 2),
            "saldo_esperado_efectivo": round(m_inicial + desglose["EFECTIVO"], 2), # Dinero FÍSICO en el cajón
            "total_general_caja_bancos": round(m_inicial + total_ventas_netas, 2)  # Total Global (Caja + Apps)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/caja/cerrar")
def cerrar_caja(req: CierreCajaRequest, user = Depends(validar_token)):
    """Finaliza el turno y guarda auditoría detallada de cada método."""
    try:
        # 1. Obtener el resumen actualizado
        resumen = obtener_resumen_caja(req.id_sesion)
        esp_efectivo = resumen["saldo_esperado_efectivo"]
        
        # 2. Calcular descuadres por cada método
        dif_efectivo = req.monto_fisico_efectivo - esp_efectivo
        dif_yape = req.monto_yape_contado - resumen["ventas_por_metodo"]["YAPE"]
        dif_plin = req.monto_plin_contado - resumen["ventas_por_metodo"]["PLIN"]
        dif_transf = req.monto_transf_contado - resumen["ventas_por_metodo"]["TRANSFERENCIA"]

        total_diferencia = dif_efectivo + dif_yape + dif_plin + dif_transf

        # 3. Actualizar Sesión Maestra
        supabase.table("sesiones_caja").update({
            "monto_final_contado": req.monto_fisico_efectivo,
            "monto_final_sistema": esp_efectivo,
            "estado": "CERRADA"
        }).eq("id", req.id_sesion).execute()

        # 4. Registrar Auditoría Final Detallada
        obs_arqueo = f"Dif Yape: {dif_yape:.2f}, Plin: {dif_plin:.2f}, Transf: {dif_transf:.2f}"
        supabase.table("cierres_caja_detalle").insert({
            "id_sesion": req.id_sesion,
            "total_efectivo_sistema": esp_efectivo,
            "total_digital_sistema": resumen["total_ventas_turno"] - resumen["ventas_por_metodo"]["EFECTIVO"],
            "monto_fisico_contado": req.monto_fisico_efectivo,
            "diferencia": total_diferencia,
            "observaciones_arqueo": obs_arqueo # Guardamos el detalle de los bancos aquí
        }).execute()

        return {"status": "success", "resumen_diferencias": {
            "efectivo": dif_efectivo, "digital": dif_yape + dif_plin + dif_transf, "total": total_diferencia
        }}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en cierre: {str(e)}")