from fastapi import FastAPI, HTTPException, Request, Header, Depends # AGREGADO: Header y Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Literal
from supabase import create_client, Client
import os
import time
from datetime import datetime, timezone
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# 1. CONFIGURACIÓN E INICIALIZACIÓN (Setup)
# -----------------------------------------------------------------------------
# load_dotenv() # Comentado para producción en Vercel

app = FastAPI(
    title="Nail-Store API Pro",
    description="Motor de gestión empresarial con Seguridad SSR v1.0.33",
    version="1.0.33", # CORREGIDO: Coma agregada para evitar el error 500
    contact={
        "name": "Soporte Técnico KACS",
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
        token = authorization.split(" ")[1]
        
        # 1. Obtenemos la respuesta completa
        response = supabase.auth.get_user(token)
        
        # 2. Extraemos el usuario del objeto UserResponse
        user = response.user 
        
        if not user:
            raise HTTPException(status_code=401, detail="SESIÓN INVÁLIDA")
            
        # IMPORTANTE: Retornamos un diccionario, no el objeto pelado.
        # Esto permite hacer auth_data["token"] más adelante.
        return {"user": user, "token": token}
    except Exception as e:
        print(f"Error de seguridad en Trujillo: {str(e)}")
        raise HTTPException(status_code=401, detail="SESIÓN EXPIRADA")

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

class GastoRequest(BaseModel):
    """Modelo para el registro de egresos operativos (Alquiler, Luz, etc.)"""
    descripcion: str
    monto: float
    categoria: Literal['ALQUILER', 'LUZ', 'AGUA', 'PERSONAL', 'MOVILIDAD', 'OTROS', 'SERVICIOS']
    metodo_pago: Optional[str] = "EFECTIVO"
    fecha_gasto: Optional[str] = None # Formato ISO opcional
    id_sesion_caja: Optional[str] = None # Vinculación opcional a un turno

class AcademiaRequest(BaseModel):
    """Modelo para el catálogo de academias"""
    nombre: str
    descuento_sugerido: Optional[float] = 0.0

class ClienteRequest(BaseModel):
    """Modelo para el registro y búsqueda de clientes"""
    tipo_documento: str # DNI, RUC, VARIOS
    numero_documento: str
    nombre_razon_social: str
    direccion: Optional[str] = None
    celular: Optional[str] = None
    contacto_nombre: Optional[str] = None
    id_academia: Optional[str] = None # NUEVO: Relación con academia

class ClienteUpdateRequest(BaseModel):
    """Modelo para edición y borrado lógico de clientes"""
    tipo_documento: Optional[str] = None
    numero_documento: Optional[str] = None
    nombre_razon_social: Optional[str] = None
    direccion: Optional[str] = None
    celular: Optional[str] = None
    id_academia: Optional[str] = None
    activo: Optional[bool] = None

class ItemVenta(BaseModel):
    id_producto: str
    cantidad: int
    precio_unitario: float

class VentaRequest(BaseModel):
    items: List[ItemVenta]
    tipo_documento: str  # "NOTA_VENTA" o "PROFORMA"
    id_sesion_caja: str
    medio_pago: Literal['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'] = "EFECTIVO"
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
@app.get("/api/productos")
@app.get("/productos")
def listar_productos_activos(
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """
    Endpoint ultra-ligero para el buscador del POS y Devoluciones.
    Solo retorna campos esenciales para no saturar la red.
    """
    try:
        # Extraemos el token para identificarnos ante la BD
        token = authorization.split(" ")[1] if authorization else None
        
        # Filtramos directamente desde SQL los que están activos
        res = supabase.postgrest.auth(token).table("productos")\
            .select("id, sku, nombre, precio_menor, stock_actual, activo")\
            .eq("activo", True)\
            .order("nombre")\
            .execute()
            
        return res.data
    except Exception as e:
        print(f"Error al listar productos ligeros: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/api/productos/margenes")
@app.get("/productos/margenes")
def obtener_margenes(mostrar_inactivos: bool = False, user = Depends(validar_token),authorization: str = Header(None)):
    """Calcula márgenes. Permite filtrar productos inactivos (Borrado Lógico)."""
    try:
        token = authorization.split(" ")[1] if authorization else None
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
            
            # 1. CALCULAMOS EL MARGEN MAYOR AQUÍ PARA QUE EXISTA EN AMBOS CASOS (IF / ELSE)
            margen_mayor = ((p_mayor - costo_rep) / p_mayor) * 100 if p_mayor > 0 else 0.0
            
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
                    "margen_porcentaje": round(float(margen_porcentaje), 2), # <--- AQUÍ FALTABA LA COMA (,)
                    "margen_mayor": round(float(margen_mayor), 2) # <-- NUEVO DATO ENVIADO AL FRONTEND
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
                    "margen_porcentaje": 0.0, # <--- AGREGAMOS LA COMA (,)
                    "margen_mayor": round(float(margen_mayor), 2) # <--- TAMBIÉN DEBE IR EN EL ELSE
                })
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en márgenes: {str(e)}")

@app.post("/api/productos")
@app.post("/productos")
def crear_producto(
    req: ProductoCreateRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Registra un nuevo producto identificándose ante la DB para saltar el RLS."""
    try:
        # Extraemos el token para identificarnos ante la base de datos
        token = authorization.split(" ")[1] if authorization else None

        # Validaciones de negocio obligatorias para Trujillo
        if not req.id_proveedor or str(req.id_proveedor).strip() == "":
            raise HTTPException(status_code=400, detail="El Proveedor es obligatorio")
        if not req.id_categoria or str(req.id_categoria).strip() == "":
            raise HTTPException(status_code=400, detail="La Categoría es obligatoria")

        costo_limpio = float(req.costo_unidad or 0.0)
        p_menor = float(req.precio_menor or 0.0)
        p_mayor = float(req.precio_mayor or 0.0)

        data = {
            "sku": req.sku, 
            "nombre": req.nombre.upper(), 
            "id_proveedor": req.id_proveedor,
            "id_categoria": req.id_categoria, 
            "costo_unidad": costo_limpio, 
            "costo_maximo": costo_limpio, 
            "precio_menor": p_menor,
            "precio_mayor": p_mayor, 
            "stock_actual": 0,
            "activo": True
        }
        
        # 1. Insertamos el producto con firma digital (Token)
        res = supabase.postgrest.auth(token).table("productos").insert(data).execute()
        
        if res.data and len(res.data) > 0:
            new_id = res.data[0]['id']
            # 2. Registramos el historial inicial con firma digital (Token)
            supabase.postgrest.auth(token).table("historial_precios").insert({
                "id_producto": new_id, 
                "costo_anterior": 0.0, 
                "costo_nuevo": costo_limpio,
                "precio_nuevo_menor": p_menor, 
                "precio_nuevo_mayor": p_mayor
            }).execute()

        return {"status": "success", "data": res.data[0] if res.data else data}
    except Exception as e:
        print(f"Error al crear producto: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al crear producto: {str(e)}")

@app.patch("/api/productos/{producto_id}")
@app.patch("/productos/{producto_id}")
def actualizar_producto(
    producto_id: str, 
    req: ProductoUpdateRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Permite corregir el nombre o desactivar el producto identificándose ante la DB."""
    try:
        # Extraemos el token para identificarnos ante Supabase
        token = authorization.split(" ")[1] if authorization else None
        
        update_data = {}
        if req.nombre is not None: 
            update_data["nombre"] = req.nombre.upper()
        if req.activo is not None: 
            update_data["activo"] = req.activo

        # ACCIÓN CRÍTICA: Usamos .auth(token) para que el RLS permita la actualización
        res = supabase.postgrest.auth(token).table("productos")\
            .update(update_data).eq("id", producto_id).execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
            
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        print(f"Error al actualizar producto: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/productos/{producto_id}/precios")
@app.put("/productos/{producto_id}/precios")
def actualizar_precios_producto(
    producto_id: str, 
    req: UpdatePrecioRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Ajusta precios y registra la trazabilidad identificándose ante la DB."""
    try:
        # Extraemos el token para identificarnos ante la base de datos
        token = authorization.split(" ")[1] if authorization else None

        # 1. Obtenemos datos actuales con identificación segura
        prod_actual = supabase.postgrest.auth(token).table("productos")\
            .select("costo_unidad, costo_maximo, nombre")\
            .eq("id", producto_id).single().execute()
            
        if not prod_actual.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        # Mantenemos tu lógica de costo techo máximo
        c_max_actual = float(prod_actual.data.get('costo_maximo') or 0.0)
        nuevo_c_max = max(c_max_actual, float(req.costo_unidad))

        update_data = {
            "costo_unidad": req.costo_unidad, 
            "costo_maximo": nuevo_c_max,
            "precio_menor": req.precio_menor, 
            "precio_mayor": req.precio_mayor
        }
        
        # 2. Actualizamos el producto con firma digital
        supabase.postgrest.auth(token).table("productos")\
            .update(update_data).eq("id", producto_id).execute()

        # 3. Registramos la trazabilidad en el historial con firma digital
        supabase.postgrest.auth(token).table("historial_precios").insert({
            "id_producto": producto_id, 
            "costo_anterior": float(prod_actual.data.get('costo_unidad') or 0.0),
            "costo_nuevo": float(req.costo_unidad), 
            "precio_nuevo_menor": float(req.precio_menor),
            "precio_nuevo_mayor": float(req.precio_mayor)
        }).execute()

        return {"status": "success", "message": f"Precios actualizados para {prod_actual.data['nombre']}"}
    except Exception as e:
        print(f"Error en actualización de precios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 6. MÓDULO CRM DE CLIENTES (TRUJILLO SEGUIMIENTO)
# -----------------------------------------------------------------------------

@app.get("/api/clientes")
@app.get("/clientes")
def listar_clientes(user = Depends(validar_token),authorization: str = Header(None)):
    """Devuelve la lista completa de clientes para el nuevo menú de seguimiento."""
    try:
        token = authorization.split(" ")[1] if authorization else None

        # ACTUALIZACIÓN: JOIN con academias y filtramos los activos (Borrado Lógico)
        res = supabase.postgrest.auth(token).table("clientes")\
            .select("*, academias(nombre, descuento_sugerido)")\
            .eq("activo", True)\
            .order("nombre_razon_social").execute()
        return res.data
    except Exception as e:
        print(f"Error en listado clientes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clientes/{numero}")
@app.get("/clientes/{numero}")
def buscar_cliente(
    numero: str, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """Busca un cliente usando identificación segura y trae su academia."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        # ACTUALIZACIÓN: JOIN con academias para traer el nombre y descuento en la búsqueda del POS
        res = supabase.postgrest.auth(token).table("clientes")\
            .select("*, academias(nombre, descuento_sugerido)")\
            .eq("numero_documento", numero).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clientes/{id_cliente}/historial")
@app.get("/clientes/{id_cliente}/historial")
def historial_compras_cliente(
    id_cliente: str, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Consulta todas las notas de pedido previas identificándose ante la DB."""
    try:
        # Extraemos el token del encabezado de seguridad
        token = authorization.split(" ")[1] if authorization else None
        
        # ACCIÓN CRÍTICA: Usamos .auth(token) para que Supabase reconozca 
        # al administrador y nos permita ver las ventas vinculadas al cliente.
        res = supabase.postgrest.auth(token).table("ventas")\
            .select("id, fecha, correlativo_nota, monto_neto, medio_pago, estado")\
            .eq("id_cliente", id_cliente)\
            .order("fecha", desc=True)\
            .execute()
            
        return res.data
    except Exception as e:
        print(f"Error en historial de cliente: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clientes")
@app.post("/clientes")
def crear_cliente(
    req: ClienteRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """Registra cliente con formato formal para Trujillo."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        data = {
            "tipo_documento": req.tipo_documento,
            "numero_documento": req.numero_documento,
            "nombre_razon_social": req.nombre_razon_social.upper(),
            "direccion": req.direccion.upper() if req.direccion else None,
            "celular": req.celular,
            "contacto_nombre": req.contacto_nombre.upper() if req.contacto_nombre else None,
            "id_academia": req.id_academia, # NUEVO: Guardamos la relación
            "activo": True
        }
        res = supabase.postgrest.auth(token).table("clientes").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================

@app.patch("/api/clientes/{id_cliente}")
@app.patch("/clientes/{id_cliente}")
def actualizar_cliente(
    id_cliente: str, 
    req: ClienteUpdateRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """Permite editar datos del cliente, desvincular academias o borrado lógico."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # SOLUCIÓN: exclude_unset=True captura exactamente lo que el frontend envió,
        # permitiendo diferenciar entre "no me enviaron el id_academia" y "enviaron id_academia = null"
        campos_recibidos = req.dict(exclude_unset=True)

        # =================================================================
        # BLOQUEO INTELIGENTE DE AUDITORÍA (OPCIÓN B)
        # =================================================================
        intentando_editar_documento = ("numero_documento" in campos_recibidos) or ("tipo_documento" in campos_recibidos)
        
        if intentando_editar_documento:
            # Buscamos si este cliente ya tiene alguna venta registrada
            ventas_historial = supabase.postgrest.auth(token).table("ventas")\
                .select("id").eq("id_cliente", id_cliente).limit(1).execute()
                
            if ventas_historial.data and len(ventas_historial.data) > 0:
                # Si tiene ventas, bloqueamos la API con un error 403 (Prohibido)
                raise HTTPException(
                    status_code=403, 
                    detail="BLOQUEO DE AUDITORÍA: No se puede editar el DNI/RUC de un cliente que ya tiene historial de compras. Por favor, registre un cliente nuevo."
                )
        # =================================================================

        update_data = {}

        if "tipo_documento" in campos_recibidos and req.tipo_documento:
            update_data["tipo_documento"] = req.tipo_documento.upper()
            
        if "numero_documento" in campos_recibidos and req.numero_documento:
            update_data["numero_documento"] = req.numero_documento

        if "nombre_razon_social" in campos_recibidos and req.nombre_razon_social:
            update_data["nombre_razon_social"] = req.nombre_razon_social.upper()
        
        if "direccion" in campos_recibidos and req.direccion:
            update_data["direccion"] = req.direccion.upper()
            
        if "celular" in campos_recibidos:
            update_data["celular"] = req.celular

        if "numero_documento" in campos_recibidos:
            update_data["numero_documento"] = req.numero_documento
            
        if "activo" in campos_recibidos:
            update_data["activo"] = req.activo

        # MAGIA: Si el frontend envió el campo, lo asignamos (incluso si es None/null)
        if "id_academia" in campos_recibidos:
            update_data["id_academia"] = req.id_academia

        if not update_data:
            return {"status": "success", "message": "Sin cambios detectados"}

        res = supabase.postgrest.auth(token).table("clientes")\
            .update(update_data).eq("id", id_cliente).execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
            
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# 6.5 MÓDULO DE ACADEMIAS (NUEVO CATÁLOGO)
# =============================================================================
@app.get("/api/academias")
@app.get("/academias")
def listar_academias(user = Depends(validar_token), authorization: str = Header(None)):
    """Trae las academias activas para los dropdowns del frontend."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        res = supabase.postgrest.auth(token).table("academias").select("*").eq("activo", True).order("nombre").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/academias")
@app.post("/academias")
def crear_academia(req: AcademiaRequest, user = Depends(validar_token), authorization: str = Header(None)):
    try:
        token = authorization.split(" ")[1] if authorization else None
        data = {
            "nombre": req.nombre.upper(),
            "descuento_sugerido": req.descuento_sugerido,
            "activo": True
        }
        res = supabase.postgrest.auth(token).table("academias").insert(data).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/academias/{id_academia}")
@app.patch("/academias/{id_academia}")
def actualizar_academia(
    id_academia: str, 
    req: dict, 
    user = Depends(validar_token), 
    authorization: str = Header(None)
):
    """Permite editar nombre/descuento o realizar borrado lógico (ocultar)."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # Formateamos a mayúsculas si se está actualizando el nombre
        if "nombre" in req and req["nombre"]:
            req["nombre"] = req["nombre"].upper()
            
        res = supabase.postgrest.auth(token).table("academias").update(req).eq("id", id_academia).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Academia no encontrada")
            
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 7. MÓDULO DE CATEGORÍAS (Mantenimiento Completo)
# -----------------------------------------------------------------------------

@app.get("/api/categorias")
@app.get("/categorias")
def listar_categorias(
    user = Depends(validar_token), 
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    try:
        token = authorization.split(" ")[1] if authorization else None
        # Usamos identificación para saltar el nuevo RLS
        res = supabase.postgrest.auth(token).table("categorias")\
            .select("*").eq("activo", True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/categorias")
@app.post("/categorias")
def crear_categoria(
    req: CategoriaRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    try:
        token = authorization.split(" ")[1] if authorization else None
        data = {"nombre": req.nombre.upper(), "descripcion": req.descripcion, "activo": True}
        res = supabase.postgrest.auth(token).table("categorias").insert(data).execute()
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear categoría: {str(e)}")

# -----------------------------------------------------------------------------
# 8. MÓDULO DE DASHBOARD (Resumen Financiero Seguro) - v1.1.0
# -----------------------------------------------------------------------------

@app.get("/api/dashboard/resumen")
@app.get("/dashboard/resumen")
def obtener_resumen_dashboard(
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Calcula el valor del inventario identificándose ante la DB para saltar el RLS."""
    try:
        # Extraemos el token del encabezado de seguridad
        token = authorization.split(" ")[1] if authorization else None
        
        # ACCIÓN CRÍTICA: Usamos .auth(token) para que Supabase reconozca 
        # al administrador y nos entregue los costos y el stock real.
        res = supabase.postgrest.auth(token).table("productos")\
            .select("costo_unidad, stock_actual")\
            .eq("activo", True).execute()
            
        # Realizamos el cálculo financiero del capital inmovilizado en Trujillo
        v_total = sum(float(p.get("costo_unidad") or 0.0) * int(p.get("stock_actual") or 0) for p in res.data)
        
        return {
            "valor_total_inventario": round(v_total, 2), 
            "total_items": len(res.data)
        }
    except Exception as e:
        print(f"Error en dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en dashboard: {str(e)}")

# -----------------------------------------------------------------------------
# 9. MÓDULO DE PROVEEDORES
# -----------------------------------------------------------------------------

@app.get("/api/proveedores")
@app.get("/proveedores")
def listar_proveedores(
    user = Depends(validar_token), 
    authorization: str = Header(None)
):
    try:
        token = authorization.split(" ")[1] if authorization else None
        res = supabase.postgrest.auth(token).table("proveedores")\
            .select("*").eq("activo", True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/proveedores")
@app.post("/proveedores")
def crear_proveedor(
    prov: ProveedorRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    try:
        token = authorization.split(" ")[1] if authorization else None
        data = {"nombre": prov.nombre.upper(), "contacto": prov.contacto, "activo": True}
        response = supabase.postgrest.auth(token).table("proveedores").insert(data).execute()
        return {"status": "success", "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 10. MÓDULO DE CAJA
# -----------------------------------------------------------------------------

@app.post("/api/caja/abrir")
@app.post("/caja/abrir")
def abrir_caja(
    req: AperturaCajaRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Inicia un nuevo turno registrando el autor del mismo."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # Usamos el token para que el registro quede asociado al usuario logueado
        res = supabase.postgrest.auth(token).table("sesiones_caja").insert({
            "monto_inicial": req.monto_inicial, 
            "estado": "ABIERTA", 
            "observaciones": req.observaciones,
            
        }).execute()
        
        if not res.data:
            raise Exception("No se pudo confirmar la apertura en la base de datos")
            
        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------------------
# 11. MÓDULO DE VENTAS Y NOTA DE PEDIDO (TRABAJO PESADO) - v1.1.0
# -----------------------------------------------------------------------------

@app.post("/api/ventas/procesar")
@app.post("/ventas/procesar")
def procesar_venta(
    venta: VentaRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Registra transacción, vincula cliente y gestiona stock con seguridad SSR."""
    try:
        # Extraemos el token para identificarnos ante todas las tablas
        token = authorization.split(" ")[1] if authorization else None

        # =====================================================================
        # INTELIGENCIA PROFORMA (BYPASS DE INVENTARIO Y TURNOS)
        # Si es una cotización, calculamos montos pero NO tocamos la DB ni el Stock
        # =====================================================================
        if venta.tipo_documento == "PROFORMA":
            monto_bruto = sum(item.cantidad * item.precio_unitario for item in venta.items)
            monto_descuento = float(venta.descuento or 0.0)
            monto_neto = max(0.0, monto_bruto - monto_descuento)
            
            # Generamos un correlativo temporal estético de proforma para Trujillo
            # -----------------------------------------------------------------
            # CORRECCIÓN DE ZONA HORARIA: TRUJILLO / LIMA, PERÚ (UTC-5)
            # Importamos 'timedelta' y 'timezone' para crear un desplazamiento
            # de -5 horas. Esto obliga al servidor de Vercel a calcular la
            # fecha y hora local exacta de tu negocio y no la de Londres.
            # -----------------------------------------------------------------
            from datetime import timezone, timedelta
            huso_horario_peru = timezone(timedelta(hours=-5))

            timestamp_prof = datetime.now(huso_horario_peru).strftime("%Y%m%d%H%M")
            correlativo_proforma = f"PROF-{timestamp_prof}"
            
            return {
                "status": "success", 
                "id_venta": None,
                "correlativo": correlativo_proforma,
                "total_letras": monto_a_letras(monto_neto)
            }

        # 1. Resolución de Cliente (Identificar o Crear) - Pasamos authorization
        target_cliente_id = venta.id_cliente
        if not target_cliente_id and venta.cliente_data:
            # Actualizamos las llamadas para incluir el pasaporte de seguridad
            existente = buscar_cliente(venta.cliente_data.numero_documento, user, authorization)
            if existente: 
                target_cliente_id = existente['id']
            else:
                nuevo = crear_cliente(venta.cliente_data, user, authorization)
                target_cliente_id = nuevo['id']
        
        if not target_cliente_id:
            # Buscamos cliente VARIOS usando identificación segura
            varios = supabase.postgrest.auth(token).table("clientes")\
                .select("id").eq("tipo_documento", "VARIOS").single().execute()
            target_cliente_id = varios.data['id']

        # 2. Generación de Correlativo Secuencial Protegido
        correlativo_final = None
        if venta.tipo_documento == "NOTA_VENTA":
            corr_data = supabase.postgrest.auth(token).table("correlativos")\
                .select("*").eq("tipo_documento", "NOTA_PEDIDO").single().execute()
            
            nuevo_num = corr_data.data['ultimo_numero'] + 1
            correlativo_final = f"{corr_data.data['serie']}-{str(nuevo_num).zfill(corr_data.data['longitud_numero'])}"
            
            # Actualizamos correlativo con firma digital
            supabase.postgrest.auth(token).table("correlativos")\
                .update({"ultimo_numero": nuevo_num}).eq("id", corr_data.data['id']).execute()

        # 3. Cálculos de Auditoría Financiera
        monto_bruto = sum(item.cantidad * item.precio_unitario for item in venta.items)
        monto_descuento = float(venta.descuento or 0.0)
        monto_neto = max(0.0, monto_bruto - monto_descuento)

        # 4. Insertar Cabecera de Venta Identificada
        res_header = supabase.postgrest.auth(token).table("ventas").insert({
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

        # 5. Procesar Detalle y Descuento de Stock Autorizado
        for item in venta.items:
            # Leemos stock con identificación
            prod = supabase.postgrest.auth(token).table("productos")\
                .select("stock_actual").eq("id", item.id_producto).single().execute()
            
            nuevo_stock = (int(prod.data.get('stock_actual') or 0)) - item.cantidad
            
            # Actualizamos stock con identificación
            supabase.postgrest.auth(token).table("productos")\
                .update({"stock_actual": nuevo_stock}).eq("id", item.id_producto).execute()
            
            # Registramos movimiento de salida con identificación
            supabase.postgrest.auth(token).table("movimientos_inventario").insert({
                "id_producto": item.id_producto, 
                "tipo_movimiento": "SALIDA", 
                "cantidad": item.cantidad, 
                "precio_momento": item.precio_unitario, 
                "id_sesion_caja": venta.id_sesion_caja,
                "medio_pago": venta.medio_pago,
                "id_venta": id_venta_db
            }).execute()

        # 6. Respuesta para el Frontend
        return {
            "status": "success", 
            "id_venta": id_venta_db,
            "correlativo": correlativo_final,
            "total_letras": monto_a_letras(monto_neto)
        }
    except Exception as e:
        print(f"Error crítico en venta Trujillo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error crítico en venta: {str(e)}")

# -----------------------------------------------------------------------------
# 12. MÓDULO DE INVENTARIO (ENTRADAS / COMPRAS)
# -----------------------------------------------------------------------------

@app.post("/api/inventario/ingreso")
@app.post("/inventario/ingreso")
def registrar_ingreso(
    req: IngresoRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """
    Aumenta stock e identifica la operación ante Supabase para saltar el RLS.
    SOLUCIÓN: Corrige el 'Error de Conexión' en el panel de Trujillo.
    """
    try:
        # Extraemos el token para identificarnos ante la DB
        token = authorization.split(" ")[1] if authorization else None
        
        # 1. Consultamos el producto con identificación segura
        prod_res = supabase.postgrest.auth(token).table("productos")\
            .select("costo_unidad, costo_maximo, stock_actual")\
            .eq("id", req.id_producto).single().execute()
            
        if not prod_res.data:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        c_ant = float(prod_res.data.get('costo_unidad') or 0.0)
        s_act = int(prod_res.data.get('stock_actual') or 0)
        c_max_ant = float(prod_res.data.get('costo_maximo') or 0.0) 
        
        nuevo_stock = s_act + req.cantidad
        nuevo_c_max = max(c_max_ant, float(req.costo_nuevo))

        # 2. Actualizamos el stock y precios con identificación
        supabase.postgrest.auth(token).table("productos").update({
            "stock_actual": nuevo_stock, 
            "costo_unidad": req.costo_nuevo,
            "costo_maximo": nuevo_c_max, 
            "precio_menor": req.precio_menor_nuevo,
            "precio_mayor": req.precio_mayor_nuevo
        }).eq("id", req.id_producto).execute()

        # 3. Registramos el movimiento de inventario con identificación
        supabase.postgrest.auth(token).table("movimientos_inventario").insert({
            "id_producto": req.id_producto, 
            "tipo_movimiento": "ENTRADA", 
            "cantidad": req.cantidad,
            "precio_momento": req.costo_nuevo, 
            "referencia": req.documento_referencia or "Ingreso Manual"
        }).execute()

        # 4. Registramos la trazabilidad de precios con identificación
        supabase.postgrest.auth(token).table("historial_precios").insert({
            "id_producto": req.id_producto, 
            "costo_anterior": c_ant, 
            "costo_nuevo": float(req.costo_nuevo),
            "precio_nuevo_menor": float(req.precio_menor_nuevo),
            "precio_nuevo_mayor": float(req.precio_mayor_nuevo)
        }).execute()

        return {"status": "success", "stock_final": nuevo_stock}
    except Exception as e:
        print(f"Error crítico en ingreso stock: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error Crítico BD: {str(e)}")

# -----------------------------------------------------------------------------
# 13. MÓDULO DE TRAZABILIDAD Y CONTEXTO
# -----------------------------------------------------------------------------

@app.get("/api/productos/{producto_id}/historial-ingresos")
@app.get("/productos/{producto_id}/historial-ingresos")
def obtener_historial_ingresos_especifico(
    producto_id: str, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Trae los últimos 3 cambios de precio usando identificación segura ante la DB."""
    try:
        # Extraemos el token del encabezado de seguridad
        token = authorization.split(" ")[1] if authorization else None
        
        # ACCIÓN CRÍTICA: Nos identificamos ante Supabase con .auth(token)
        # Esto permite que el RLS nos deje ver la trazabilidad de costos de Trujillo.
        res = supabase.postgrest.auth(token).table("historial_precios")\
            .select("fecha_cambio, costo_nuevo, precio_nuevo_menor, precio_nuevo_mayor")\
            .eq("id_producto", producto_id)\
            .order("fecha_cambio", desc=True)\
            .limit(3)\
            .execute()
            
        return res.data
    except Exception as e:
        print(f"Error en trazabilidad de costos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/productos/{producto_id}/historial")
@app.get("/productos/{producto_id}/historial")
def obtener_historial_producto(
    producto_id: str, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Consulta el log de movimientos identificándose para saltar el RLS."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # ACCIÓN CRÍTICA: Identificación segura ante Supabase
        res = supabase.postgrest.auth(token).table("movimientos_inventario")\
            .select("*")\
            .eq("id_producto", producto_id)\
            .order("fecha", desc=True)\
            .execute()
            
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/productos/reporte-completo")
@app.get("/productos/reporte-completo")
def obtener_reporte_completo(
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Genera reporte maestro de stock usando identificación segura."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # ACCIÓN CRÍTICA: Identificación segura para ver productos y proveedores protegidos
        response = supabase.postgrest.auth(token).table("productos").select(
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

@app.get("/api/caja/estado-actual")
@app.get("/caja/estado-actual")
def obtener_estado_caja(
    user = Depends(validar_token), 
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Busca si existe una sesión abierta usando el token para saltar el RLS."""
    try:
        # Extraemos el token del encabezado
        token = authorization.split(" ")[1] if authorization else None
        
        # ACCIÓN CRÍTICA: Nos identificamos ante la DB con .auth(token)
        res = supabase.postgrest.auth(token).table("sesiones_caja")\
            .select("*")\
            .eq("estado", "ABIERTA")\
            .order("fecha_apertura", desc=True)\
            .limit(1)\
            .execute()
        
        if res.data and len(res.data) > 0:
            return {"esta_abierta": True, "sesion": res.data[0]}
        return {"esta_abierta": False, "sesion": None}
    except Exception as e:
        print(f"Error de seguridad en terminal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/caja/resumen/{sesion_id}")
@app.get("/caja/resumen/{sesion_id}")
def obtener_resumen_caja(
    sesion_id: str, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """Calcula totales acumulados usando identificación segura."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # Obtenemos datos de la sesión con permiso RLS
        sesion = supabase.postgrest.auth(token).table("sesiones_caja")\
            .select("monto_inicial")\
            .eq("id", sesion_id).single().execute()
            
        if not sesion.data: 
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        m_inicial = float(sesion.data.get("monto_inicial") or 0.0)

        # Consultar Ventas con permiso RLS
        ventas_res = supabase.postgrest.auth(token).table("ventas")\
            .select("monto_neto, medio_pago")\
            .eq("id_sesion_caja", sesion_id)\
            .eq("estado", "COMPLETADA")\
            .execute()
        
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
            "saldo_esperado_efectivo": round(m_inicial + desglose["EFECTIVO"], 2),
            "total_general_caja_bancos": round(m_inicial + total_ventas_netas, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/caja/cerrar")
@app.post("/caja/cerrar")
def cerrar_caja(
    req: CierreCajaRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN PARA EL RLS
):
    """Finaliza el turno y guarda auditoría detallada usando identificación segura."""
    try:
        # Extraemos el token del encabezado de autorización
        token = authorization.split(" ")[1] if authorization else None

        # 1. Obtener el resumen actualizado (Pasamos el authorization para saltar el RLS)
        resumen = obtener_resumen_caja(req.id_sesion, user, authorization)
        esp_efectivo = resumen["saldo_esperado_efectivo"]
        
        # 2. Calcular descuadres por cada método
        dif_efectivo = req.monto_fisico_efectivo - esp_efectivo
        dif_yape = req.monto_yape_contado - resumen["ventas_por_metodo"]["YAPE"]
        dif_plin = req.monto_plin_contado - resumen["ventas_por_metodo"]["PLIN"]
        dif_transf = req.monto_transf_contado - resumen["ventas_por_metodo"]["TRANSFERENCIA"]

        total_diferencia = dif_efectivo + dif_yape + dif_plin + dif_transf

        # 3. Actualizar Sesión Maestra con permiso RLS
        # Usamos .auth(token) para que Supabase reconozca al cajero autor de la acción
        supabase.postgrest.auth(token).table("sesiones_caja").update({
            "monto_final_contado": req.monto_fisico_efectivo,
            "monto_final_sistema": esp_efectivo,
            "estado": "CERRADA"
        }).eq("id", req.id_sesion).execute()

        # 4. Registrar Auditoría Final Detallada con permiso RLS
        obs_arqueo = f"Dif Yape: {dif_yape:.2f}, Plin: {dif_plin:.2f}, Transf: {dif_transf:.2f}"
        supabase.postgrest.auth(token).table("cierres_caja_detalle").insert({
            "id_sesion": req.id_sesion,
            "total_efectivo_sistema": esp_efectivo,
            "total_digital_sistema": resumen["total_ventas_turno"] - resumen["ventas_por_metodo"]["EFECTIVO"],
            "monto_fisico_contado": req.monto_fisico_efectivo,
            "diferencia": total_diferencia,
            "observaciones_arqueo": obs_arqueo
        }).execute()

        return {"status": "success", "resumen_diferencias": {
            "efectivo": dif_efectivo, "digital": dif_yape + dif_plin + dif_transf, "total": total_diferencia
        }}
    except Exception as e:
        # Imprimimos el error en el servidor para facilitar el soporte técnico
        print(f"Error crítico en cierre de caja: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en cierre: {str(e)}")

# -----------------------------------------------------------------------------
# 15. GESTIÓN DE HISTORIAL Y REPORTES (ACTUALIZADO: AGRUPAMIENTO POR NOTA)
# -----------------------------------------------------------------------------

@app.get("/api/caja/historial")
@app.get("/caja/historial")
def listar_historial_cajas(
    user = Depends(validar_token), 
    authorization: str = Header(None) # <--- CAPTURAMOS EL PASAPORTE DE SEGURIDAD
):
    """Consulta la Vista SQL identificándose ante la DB para saltar el RLS."""
    try:
        # Extraemos el token del encabezado para que Supabase sepa quién pregunta
        token = authorization.split(" ")[1] if authorization else None
        
        # ACCIÓN CRÍTICA: Usamos .auth(token) para que la vista nos entregue
        # los datos de las sesiones protegidas.
        res = supabase.postgrest.auth(token).table("vista_historial_cajas")\
            .select("*").execute()
            
        return res.data
    except Exception as e:
        print(f"Error en vista historial: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en vista historial: {str(e)}")

@app.get("/api/caja/reporte-productos/{sesion_id}")
@app.get("/caja/reporte-productos/{sesion_id}")
def reporte_productos_por_turno(sesion_id: str, user = Depends(validar_token),authorization: str = Header(None)):
    """
    Genera un reporte agrupado por Nota de Venta, incluyendo auditoría de 
    costos y márgenes de ganancia exactos para la interfaz gerencial.
    """
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # 1. Ampliamos la consulta: Traemos el 'costo_unidad' del producto y el 'monto_neto' real de la venta
        res = supabase.postgrest.auth(token).table("movimientos_inventario")\
            .select("cantidad, precio_momento, id_venta, "
                    "productos(nombre, sku, costo_unidad), "
                    "ventas(id, correlativo_nota, monto_neto, id_cliente, clientes(nombre_razon_social))")\
            .eq("id_sesion_caja", sesion_id)\
            .eq("tipo_movimiento", "SALIDA")\
            .execute()
            
        ventas_agrupadas = {}
        
        for m in res.data:
            id_v = m.get("id_venta")
            if not id_v: continue # Ignoramos salidas manuales sin venta ligada
            
            venta_info = m.get("ventas") or {}
            prod_info = m.get("productos") or {}
            
            # Inicializamos la cabecera de la venta si es la primera vez que la vemos
            if id_v not in ventas_agrupadas:
                ventas_agrupadas[id_v] = {
                    "id_venta": id_v,
                    "correlativo": venta_info.get("correlativo_nota", "SIN CORRELATIVO"),
                    "cliente": venta_info.get("clientes", {}).get("nombre_razon_social", "PÚBLICO GENERAL") if venta_info.get("clientes") else "PÚBLICO GENERAL",
                    "productos": [],
                    "total_venta": float(venta_info.get("monto_neto") or 0.0), # Lo que pagó realmente el cliente (incluye descuentos)
                    "costo_total": 0.0 # Acumulador del costo de fábrica
                }
            
            # Matemáticas del ítem
            subtotal_item = float(m["cantidad"] * (m["precio_momento"] or 0.0))
            costo_unitario = float(prod_info.get("costo_unidad") or 0.0)
            costo_fila = float(m["cantidad"] * costo_unitario)
            
            ventas_agrupadas[id_v]["productos"].append({
                "sku": prod_info.get("sku"),
                "nombre": prod_info.get("nombre"),
                "cantidad": m["cantidad"],
                "precio_venta": float(m["precio_momento"] or 0.0),
                "total_item": subtotal_item
            })
            
            # Sumamos el costo de fábrica al total de esta nota
            ventas_agrupadas[id_v]["costo_total"] += costo_fila

        # 2. Calculamos el margen de ganancia final por cada nota
        for id_v, data in ventas_agrupadas.items():
            t_venta = data["total_venta"]
            t_costo = data["costo_total"]
            
            if t_venta > 0:
                data["porcentaje_ganancia"] = ((t_venta - t_costo) / t_venta) * 100
            else:
                data["porcentaje_ganancia"] = 0.0

        return list(ventas_agrupadas.values())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en agrupamiento: {str(e)}")

# -----------------------------------------------------------------------------
# 16. REIMPRESIÓN: RECUPERAR DATOS COMPLETOS DE UNA VENTA
# -----------------------------------------------------------------------------

@app.get("/api/ventas/{id_venta}/detalle-completo")
@app.get("/ventas/{id_venta}/detalle-completo")
def obtener_detalle_venta_reimpresion(id_venta: str, user = Depends(validar_token),authorization: str = Header(None)):
    """
    Recupera cabecera, items y datos del cliente para volver a imprimir.
    """
    try:
        token = authorization.split(" ")[1] if authorization else None
        # 1. Traemos la cabecera y datos del cliente
        venta = supabase.postgrest.auth(token).table("ventas")\
            .select("*, clientes(*)")\
            .eq("id", id_venta).single().execute()
            
        # 2. Traemos los productos vendidos en esa boleta específica
        items = supabase.postgrest.auth(token).table("movimientos_inventario")\
            .select("cantidad, precio_momento, productos(nombre, sku)")\
            .eq("id_venta", id_venta).execute()
            
        return {
            "venta": venta.data,
            "items": items.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# 17. MÓDULO DE GASTOS Y UTILIDADES (ACTUALIZADO - v1.0.35)
# -----------------------------------------------------------------------------

@app.post("/api/gastos")
@app.post("/gastos")
def registrar_gasto(
    req: GastoRequest, 
    user = Depends(validar_token), 
    authorization: str = Header(None) # Capturamos el header aquí mismo
):
    """
    Registra un egreso operativo en la base de datos.
    SOLUCIÓN: Extraemos el token directamente del header para no romper 
    la compatibilidad con el resto de tu código que usa 'user'.
    """
    try:
        # Extraemos el token del encabezado 'Authorization: Bearer <TOKEN>'
        if not authorization:
            raise Exception("No se proporcionó el encabezado de autorización")
            
        token = authorization.split(" ")[1]

        data = {
            "descripcion": req.descripcion.upper(),
            "monto": req.monto,
            "categoria": req.categoria,
            "metodo_pago": req.metodo_pago,
            "id_sesion_caja": req.id_sesion_caja
        }

        # AUDITORÍA AUTOMÁTICA: Si no viene caja, buscamos la abierta en Trujillo
        if not req.id_sesion_caja:
            sesion_activa = supabase.postgrest.auth(token).table("sesiones_caja")\
                .select("id").eq("estado", "ABIERTA")\
                .order("fecha_apertura", desc=True).limit(1).execute()
            
            if sesion_activa.data:
                data["id_sesion_caja"] = sesion_activa.data[0]["id"]

        if req.fecha_gasto:
            data["fecha_gasto"] = req.fecha_gasto

        # ACCIÓN CRÍTICA: Nos identificamos ante Supabase usando el token capturado
        # Esto permite saltar la política RLS (Error 42501) sin cambiar el objeto 'user'
        res = supabase.postgrest.auth(token).table("gastos_operativos").insert(data).execute()
        
        if not res.data:
            raise Exception("La base de datos no confirmó el registro del gasto")

        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        # Devolvemos el error detallado para ver cualquier otro problema en la consola
        raise HTTPException(status_code=500, detail=f"Error al registrar gasto: {str(e)}")

@app.get("/api/gastos")
@app.get("/gastos")
def listar_gastos_rango(
    desde: str, 
    hasta: str, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """Lista el detalle de gastos operativos para el tooltip de Utilidades."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # Aseguramos que cubra hasta las 23:59 del día de fin
        fecha_fin = f"{hasta}T23:59:59.999Z" if len(hasta) == 10 else hasta
        
        res = supabase.postgrest.auth(token).table("gastos_operativos")\
            .select("*")\
            .gte("fecha_gasto", desde)\
            .lte("fecha_gasto", fecha_fin)\
            .order("fecha_gasto", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar detalle de gastos: {str(e)}")

@app.get("/api/reportes/utilidad")
@app.get("/reportes/utilidad")
def obtener_reporte_utilidad(
    desde: str, 
    hasta: str, 
    user = Depends(validar_token),
    authorization: str = Header(None) # <--- CAPTURAMOS EL TOKEN
):
    """
    Consulta la Vista SQL 'vista_reporte_utilidad' de forma segura.
    Fórmula: Utilidad Neta = (Ventas - Costo Mercadería) - Gastos Operativos.
    """
    try:
        # Extraemos el token del encabezado para identificarnos
        token = authorization.split(" ")[1] if authorization else None

        # ACCIÓN CRÍTICA: Usamos .auth(token) para que Supabase nos reconozca 
        # y nos entregue todos los registros protegidos por RLS.
        res = supabase.postgrest.auth(token).table("vista_reporte_utilidad")\
            .select("*")\
            .gte("fecha", desde)\
            .lte("fecha", hasta)\
            .order("fecha", desc=True)\
            .execute()
            
        return res.data
    except Exception as e:
        print(f"Error en reporte financiero: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error en reporte financiero: {str(e)}")

# -----------------------------------------------------------------------------
# 18. MÓDULO DE OBLIGACIONES (NOTIFICACIONES)
# -----------------------------------------------------------------------------

class ObligacionRequest(BaseModel):
    descripcion: str
    categoria: str
    es_recurrente: bool = True
    dia_vencimiento: Optional[int] = None
    fecha_especifica: Optional[str] = None
    monto_sugerido: float = 0.0
    recordatorio_dias: int = 3

@app.post("/api/obligaciones")
@app.post("/obligaciones")
def crear_obligacion(
    req: ObligacionRequest, 
    user = Depends(validar_token), 
    authorization: str = Header(None) # <--- Capturamos el pasaporte de seguridad
):
    """Registra una obligación sincronizada con las políticas de Supabase."""
    try:
        # Extraemos el token del encabezado
        token = authorization.split(" ")[1] if authorization else None
        data = req.dict()

        # USAMOS EL TOKEN PARA SALTAR EL RLS (Igual que en Gastos)
        res = supabase.postgrest.auth(token).table("obligaciones_pago").insert(data).execute()
        
        # Validación de seguridad para evitar el error 500 si la DB no responde
        if not res.data:
            raise Exception("No se pudo insertar la regla en la base de datos")

        return {"status": "success", "data": res.data[0]}
    except Exception as e:
        print(f"Error crítico en obligaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ObligacionUpdate(BaseModel):
    ultima_notificacion: str

@app.get("/api/obligaciones")
@app.get("/obligaciones")
def listar_obligaciones(
    user = Depends(validar_token), 
    authorization: str = Header(None) # <--- CAPTURAMOS EL HEADER
):
    """Trae todas las reglas usando el token para saltar el RLS de Supabase."""
    try:
        # EXTRAEMOS EL TOKEN PARA IDENTIFICARNOS ANTE LA DB
        token = authorization.split(" ")[1] if authorization else None
        
        # USAMOS .auth(token) PARA QUE SUPABASE NOS PERMITA VER LOS DATOS
        res = supabase.postgrest.auth(token).table("obligaciones_pago").select("*").order("dia_vencimiento").execute()
        
        return res.data
    except Exception as e:
        print(f"Error al listar obligaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINTS DE ADMINISTRACIÓN DE CRONOGRAMA ---

@app.patch("/api/obligaciones/{id_ob}")
@app.patch("/obligaciones/{id_ob}")
def actualizar_configuracion_obligacion(
    id_ob: str, 
    req: dict, 
    user = Depends(validar_token), 
    authorization: str = Header(None)
):
    """Permite editar montos, días o activar/pausar la regla."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        # Bypass RLS: Nos identificamos para modificar nuestra propia regla
        res = supabase.postgrest.auth(token).table("obligaciones_pago").update(req).eq("id", id_ob).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al editar regla: {str(e)}")

@app.delete("/api/obligaciones/{id_ob}")
@app.delete("/obligaciones/{id_ob}")
def eliminar_obligacion_definitiva(
    id_ob: str, 
    user = Depends(validar_token), 
    authorization: str = Header(None)
):
    """Borra físicamente la regla del cronograma."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        supabase.postgrest.auth(token).table("obligaciones_pago").delete().eq("id", id_ob).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")

# -----------------------------------------------------------------------------
# 18.2 MÓDULO DE CUMPLIMIENTO (MARCAR COMO PAGADO)
# -----------------------------------------------------------------------------

# Nuevo modelo para la transacción unificada
class LiquidarPagoRequest(BaseModel):
    monto: float
    metodo_pago: str
    categoria: str
    descripcion: str
    fecha_pago: str
    id_sesion_caja: Optional[str] = None

@app.post("/api/obligaciones/{id_ob}/liquidar")
@app.post("/obligaciones/{id_ob}/liquidar")
def liquidar_pago_completo(
    id_ob: str, 
    req: LiquidarPagoRequest, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """Procesa gasto y alerta en una sola transacción atómica."""
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # Invocamos la función SQL (RPC) de Supabase
        params = {
            "p_id_ob": id_ob,
            "p_monto": req.monto,
            "p_metodo": req.metodo_pago,
            "p_cat": req.categoria,
            "p_desc": req.descripcion.upper(),
            "p_fecha": req.fecha_pago,
            "p_id_caja": req.id_sesion_caja
        }
        
        # ACCIÓN ATÓMICA: Todo o Nada
        res = supabase.postgrest.auth(token).rpc("liquidar_obligacion_trujillo", params).execute()
        
        return res.data
    except Exception as e:
        print(f"Error en transacción Trujillo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fallo crítico: {str(e)}")

# -----------------------------------------------------------------------------
# 19. MÓDULO DE ANALÍTICA CRM (ALIANZAS Y FIDELIZACIÓN)
# -----------------------------------------------------------------------------

@app.get("/api/reportes/analitica-crm")
@app.get("/reportes/analitica-crm")
def obtener_analitica_crm(
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """Genera los 4 KPIs estratégicos con filtros de fecha y podio garantizado."""
    try:
        # Extraemos el pasaporte de seguridad para saltar el RLS
        token = authorization.split(" ")[1] if authorization else None
        
        # 1. Ajuste estricto de Zona Horaria (Trujillo, Perú UTC-5) e Inteligencia de Fechas
        from datetime import datetime, timezone, timedelta
        huso_horario_peru = timezone(timedelta(hours=-5))
        hoy = datetime.now(huso_horario_peru)

        if desde and hasta:
            fecha_inicio = desde
            # Si mandan solo la fecha (YYYY-MM-DD), aseguramos que cubra hasta las 23:59 de ese día
            fecha_fin = f"{hasta}T23:59:59.999Z" if len(hasta) == 10 else hasta
            # Formato estético para el frontend (ej. "2026-05-01 AL 2026-05-28")
            mes_str = f"{desde[:10]} AL {hasta[:10]}"
        else:
            fecha_inicio = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
            fecha_fin = hoy.isoformat()
            mes_str = hoy.strftime("%m/%Y")

        # 2. Obtener todas las VENTAS COMPLETADAS en el rango de fechas con RLS seguro
        ventas_res = supabase.postgrest.auth(token).table("ventas")\
            .select("monto_neto, monto_descuento, id_cliente, clientes(nombre_razon_social, id_academia, academias(id, nombre))")\
            .eq("estado", "COMPLETADA")\
            .gte("fecha", fecha_inicio)\
            .lte("fecha", fecha_fin)\
            .execute()

        # 3. Traemos todos los clientes activos
        clientes_res = supabase.postgrest.auth(token).table("clientes")\
            .select("id, id_academia")\
            .eq("activo", True)\
            .execute()

        # 4. Traemos TODAS las academias activas para garantizar que salgan en el podio (incluso con 0.00)
        academias_res = supabase.postgrest.auth(token).table("academias")\
            .select("id, nombre")\
            .eq("activo", True)\
            .execute()

        # --- PROCESAMIENTO DE DATOS EN MEMORIA (PYTHON) ---
        analitica_academias = {}
        top_clientes = {}
        total_alumnas_por_academia = {}

        # A. Pre-poblar el diccionario con todas las academias existentes (El truco del Podio)
        for ac in academias_res.data:
            analitica_academias[ac["nombre"]] = {
                "ventas": 0.0, 
                "descuentos": 0.0, 
                "id": ac["id"], 
                "compradoras_unicas": set()
            }

        # B. Contar cuántas alumnas existen por cada academia (Filtro seguro de nulos)
        for c in clientes_res.data:
            ac_id = c.get("id_academia")
            if ac_id:
                total_alumnas_por_academia[ac_id] = total_alumnas_por_academia.get(ac_id, 0) + 1

        # C. Procesar las ventas del rango de fechas
        for v in ventas_res.data:
            cli = v.get("clientes")
            if not cli: continue
            
            ac = cli.get("academias")
            if ac:
                ac_nombre = ac.get("nombre", "SIN NOMBRE")
                ac_id = ac.get("id")
                cli_nombre = cli.get("nombre_razon_social", "DESCONOCIDO")
                neto = float(v.get("monto_neto") or 0.0)
                dscto = float(v.get("monto_descuento") or 0.0)

                # Si por alguna razón la academia no estaba pre-poblada (ej. fue borrada lógicamente pero tiene ventas históricas)
                if ac_nombre not in analitica_academias:
                    analitica_academias[ac_nombre] = {
                        "ventas": 0.0, 
                        "descuentos": 0.0, 
                        "id": ac_id, 
                        "compradoras_unicas": set()
                    }
                
                analitica_academias[ac_nombre]["ventas"] += neto
                analitica_academias[ac_nombre]["descuentos"] += dscto
                analitica_academias[ac_nombre]["compradoras_unicas"].add(cli_nombre)

                # Agrupar por Cliente (KPI 4: Top Embajadoras)
                if cli_nombre not in top_clientes:
                    top_clientes[cli_nombre] = {"total_comprado": 0.0, "academia": ac_nombre}
                top_clientes[cli_nombre]["total_comprado"] += neto

        # D. Formatear y calcular porcentajes finales
        ranking_alianzas = []
        for nombre, datos in analitica_academias.items():
            total_alumnas = total_alumnas_por_academia.get(datos["id"], 0)
            compradoras = len(datos["compradoras_unicas"])
            # Cálculo de KPI 3: Tasa de Conversión
            conversion = (compradoras / total_alumnas * 100) if total_alumnas > 0 else 0

            ranking_alianzas.append({
                "academia": nombre,
                "total_generado": round(datos["ventas"], 2),
                "total_descuento_cedido": round(datos["descuentos"], 2),
                "tasa_conversion": round(conversion, 1),
                "alumnas_registradas": total_alumnas,
                "alumnas_compradoras": compradoras
            })

        # Ordenar Academia de Mayor a Menor Venta
        ranking_alianzas = sorted(ranking_alianzas, key=lambda x: x["total_generado"], reverse=True)

        # Ordenar Alumnas de Mayor a Menor Compra (Lista Completa para Filtrado Interactivo)
        embajadoras = [{"cliente": k, "academia": v["academia"], "total": round(v["total_comprado"], 2)} for k, v in top_clientes.items()]
        embajadoras = sorted(embajadoras, key=lambda x: x["total"], reverse=True) 

        # Respuesta estructurada para el Dashboard de Next.js
        return {
            "mes_analisis": mes_str,
            "ranking_alianzas": ranking_alianzas,
            "top_embajadoras": embajadoras
        }

    except Exception as e:
        print(f"Error crítico en analítica CRM: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fallo en procesamiento de analítica: {str(e)}")

    # -----------------------------------------------------------------------------
# 20. MÓDULO DE DEVOLUCIONES Y NOTAS DE CRÉDITO (DOBLE PARTIDA CONTABLE)
# Propósito: Rastrear devoluciones exactas, reingresar stock, auditar mermas
# y ajustar automáticamente la caja de HOY sin romper el historial pasado.
# -----------------------------------------------------------------------------

class ItemDevolucion(BaseModel):
    id_producto: str
    cantidad_devuelta: int
    precio_unitario: float
    estado_inventario: Literal['REINGRESADO_BUENO', 'MERMA']

class ItemCambio(BaseModel):
    id_producto: str
    cantidad: int
    precio_unitario: float

class DevolucionRequest(BaseModel):
    id_venta_original: str
    correlativo_original: str
    tipo_operacion: Literal['TOTAL', 'PARCIAL', 'CAMBIO']
    monto_devuelto: float # Valor absoluto de la diferencia en dinero
    es_saldo_a_favor_empresa: bool = False # True si en un CAMBIO el cliente pagó extra
    metodo_reembolso: Literal['EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA']
    motivo: str
    items_devueltos: List[ItemDevolucion]
    items_nuevos: Optional[List[ItemCambio]] = []

@app.get("/api/devoluciones/consultar/{correlativo}")
@app.get("/devoluciones/consultar/{correlativo}")
def consultar_venta_para_devolucion(
    correlativo: str,
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """
    Busca una venta por su correlativo (Ej. P001-0000179) y verifica en la
    tabla devoluciones_detalle si algún ítem ya fue devuelto antes, 
    devolviendo solo el saldo disponible para evitar doble fraude.
    """
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # 1. Traemos la cabecera de la Venta
        venta_res = supabase.postgrest.auth(token).table("ventas")\
            .select("*, clientes(nombre_razon_social, numero_documento)")\
            .eq("correlativo_nota", correlativo.upper()).single().execute()
            
        if not venta_res.data:
            raise HTTPException(status_code=404, detail="DOCUMENTO NO ENCONTRADO EN LA BASE DE DATOS")
            
        id_venta = venta_res.data["id"]

        # 2. Traemos el detalle original de la venta (Las salidas de Kardex)
        items_res = supabase.postgrest.auth(token).table("movimientos_inventario")\
            .select("id_producto, cantidad, precio_momento, productos(nombre, sku)")\
            .eq("id_venta", id_venta)\
            .eq("tipo_movimiento", "SALIDA").execute()

        # 3. Traemos el historial de devoluciones de esta venta (Si existe)
        devs_res = supabase.postgrest.auth(token).table("devoluciones")\
            .select("id").eq("id_venta_original", id_venta).execute()
        
        ids_devoluciones = [d["id"] for d in devs_res.data]
        
        items_ya_devueltos = {}
        if ids_devoluciones:
            detalles_dev = supabase.postgrest.auth(token).table("devoluciones_detalle")\
                .select("id_producto, cantidad_devuelta")\
                .in_("id_devolucion", ids_devoluciones).execute()
                
            for det in detalles_dev.data:
                prod_id = det["id_producto"]
                items_ya_devueltos[prod_id] = items_ya_devueltos.get(prod_id, 0) + det["cantidad_devuelta"]

        # 4. Cruzamos datos para saber qué queda disponible para devolver
        items_disponibles = []
        for item in items_res.data:
            prod_id = item["id_producto"]
            cant_original = item["cantidad"]
            cant_devuelta = items_ya_devueltos.get(prod_id, 0)
            cant_restante = cant_original - cant_devuelta
            
            if cant_restante > 0:
                items_disponibles.append({
                    "id_producto": prod_id,
                    "sku": item["productos"]["sku"],
                    "nombre": item["productos"]["nombre"],
                    "precio_unitario": item["precio_momento"],
                    "cantidad_disponible": cant_restante
                })

        return {
            "venta": venta_res.data,
            "items_disponibles": items_disponibles
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/devoluciones/procesar")
@app.post("/devoluciones/procesar")
def procesar_devolucion_y_cambio(
    req: DevolucionRequest,
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """
    ARQUITECTURA ENTERPRISE V4: Transacción ACID con protecciones Anti-Fraude
    y resolución de condiciones de carrera (Check-then-Act) a nivel BD.
    """
    try:
        # =========================================================
        # TRAMO 1: SEGURIDAD Y AUTENTICACIÓN
        # Extraemos el pasaporte del usuario para que Supabase sepa 
        # quién está ejecutando la acción (para auditoría y RLS).
        # =========================================================
        token = authorization.split(" ")[1] if authorization else None
        
        # =========================================================
        # TRAMO 2: PREPARACIÓN DE DATOS (PAYLOAD)
        # Convertimos los objetos de Python (req.items_devueltos) 
        # en diccionarios JSON puros que PostgreSQL pueda entender nativamente.
        # =========================================================
        items_devueltos_json = [item.dict() for item in req.items_devueltos]
        items_nuevos_json = [item.dict() for item in req.items_nuevos] if req.items_nuevos else []

        # Empaquetamos exactamente los parámetros que pide nuestra función SQL V4
        params = {
            "p_id_venta_original": req.id_venta_original,
            "p_correlativo_original": req.correlativo_original,
            "p_tipo_operacion": req.tipo_operacion,
            "p_monto_devuelto": req.monto_devuelto,
            "p_es_saldo_empresa": req.es_saldo_a_favor_empresa,
            "p_metodo_reembolso": req.metodo_reembolso,
            "p_motivo": req.motivo.upper(),
            "p_items_devueltos": items_devueltos_json,
            "p_items_nuevos": items_nuevos_json
        }

        # =========================================================
        # TRAMO 3: EJECUCIÓN DE LA TRANSACCIÓN ATÓMICA
        # En lugar de hacer múltiples inserciones desde Python, enviamos 
        # un solo paquete a Supabase usando RPC (Remote Procedure Call). 
        # La Base de Datos hace todo el trabajo pesado en 0.05 segundos.
        # =========================================================
        res = supabase.postgrest.auth(token).rpc("procesar_devolucion_transaccional_v4", params).execute()
        
        # Si la base de datos confirma el éxito, enviamos la data a React
        return res.data
        
    except Exception as e:
        # =========================================================
        # TRAMO 4: MANEJO DE ERRORES FORMALES (ERRCODE)
        # Si la base de datos detecta fraude o falta de stock, aborta la 
        # operación y nos envía un código (Ej. CJA01). Aquí lo traducimos 
        # para mostrarle una alerta visual en pantalla al cajero.
        # =========================================================
        error_dict = str(e)
        print(f"Auditoría DB V4: {error_dict}")
        
        if "CJA01" in error_dict:
            raise HTTPException(status_code=400, detail="OPERACIÓN CANCELADA: NO HAY TURNO DE CAJA ABIERTO.")
        elif "STK01" in error_dict:
            raise HTTPException(status_code=409, detail="CONFLICTO: STOCK INSUFICIENTE PARA REALIZAR EL CAMBIO.")
        elif "DEV01" in error_dict:
            raise HTTPException(status_code=403, detail="FRAUDE DETECTADO: LA CANTIDAD SUPERA EL SALDO DISPONIBLE DE LA VENTA.")
            
        # Fallback para errores de conectividad o de sistema inesperados
        raise HTTPException(status_code=500, detail="ERROR CRÍTICO EN TRANSACCIÓN DE BASE DE DATOS.")

# -----------------------------------------------------------------------------
# 21. MÓDULO DE BUSINESS INTELLIGENCE (ANALÍTICA Y MATRIZ BCG)
# -----------------------------------------------------------------------------

@app.get("/api/analitica/inteligencia")
@app.get("/analitica/inteligencia")
def analitica_inteligencia_negocio(
    desde: str, 
    hasta: str, 
    user = Depends(validar_token),
    authorization: str = Header(None)
):
    """
    Motor de BI: Procesa todas las ventas en un rango de fechas y clasifica 
    los productos usando la Matriz de Rentabilidad BCG.
    """
    try:
        token = authorization.split(" ")[1] if authorization else None
        
        # 1. Aseguramos que cubra hasta las 23:59 del día final
        fecha_fin = f"{hasta}T23:59:59.999Z" if len(hasta) == 10 else hasta

        # 2. DOBLE FILTRO SEGURO: Traer solo IDs de ventas completadas en el rango
        ventas_res = supabase.postgrest.auth(token).table("ventas")\
            .select("id")\
            .eq("estado", "COMPLETADA")\
            .gte("fecha", desde)\
            .lte("fecha", fecha_fin)\
            .execute()
            
        ids_ventas = [v["id"] for v in ventas_res.data]
        
        # Si no hubo ventas en ese rango, devolvemos esquema vacío para no romper la UI
        if not ids_ventas:
            return {"resumen": {"ticket_promedio": 0, "ingresos": 0, "margen_global": 0}, "matriz": [], "ranking_volumen": [], "ranking_rentabilidad": []}

        # 3. Extraer solo las salidas que NO fueron devoluciones
        # Usamos .not_.ilike para excluir cualquier referencia que contenga 'DEVOLUCION'
        res = supabase.postgrest.auth(token).table("movimientos_inventario")\
            .select("cantidad, precio_momento, productos(id, nombre, costo_unidad)")\
            .eq("tipo_movimiento", "SALIDA")\
            .in_("id_venta", ids_ventas)\
            .not_.ilike("referencia", "%DEVOLUCION%")\
            .execute()

        # 4. Agrupamiento y Matemáticas Financieras
        productos_agrupados = {}
        
        for m in res.data:
            prod = m.get("productos")
            if not prod: continue
            
            p_id = prod.get("id")
            p_nombre = prod.get("nombre")
            p_costo = float(prod.get("costo_unidad") or 0.0)
            
            cant = int(m.get("cantidad") or 0)
            precio = float(m.get("precio_momento") or 0.0)
            
            venta_total = cant * precio
            costo_total = cant * p_costo
            
            if p_id not in productos_agrupados:
                productos_agrupados[p_id] = {
                    "id": p_id,
                    "nombre": p_nombre,
                    "cantidad": 0,
                    "ingresos": 0.0,
                    "costos": 0.0
                }
                
            productos_agrupados[p_id]["cantidad"] += cant
            productos_agrupados[p_id]["ingresos"] += venta_total
            productos_agrupados[p_id]["costos"] += costo_total

        # 5. Cálculos Globales para trazar los Ejes de la Matriz BCG
        lista_productos = []
        total_ingresos_global = 0.0
        total_costos_global = 0.0
        total_cantidad_vendida = 0
        
        for p in productos_agrupados.values():
            ing = p["ingresos"]
            cst = p["costos"]
            margen = ((ing - cst) / ing) * 100 if ing > 0 else 0.0
            
            p["margen_porcentaje"] = round(margen, 2)
            p["utilidad_neta"] = round(ing - cst, 2)
            
            total_ingresos_global += ing
            total_costos_global += cst
            total_cantidad_vendida += p["cantidad"]
            
            lista_productos.append(p)

        # Promedios del mercado para saber dónde "cortar" los cuadrantes
        cantidad_promedio = total_cantidad_vendida / len(lista_productos) if lista_productos else 0
        margen_promedio = ((total_ingresos_global - total_costos_global) / total_ingresos_global) * 100 if total_ingresos_global > 0 else 0

        # 6. Algoritmo de Clasificación Automática (Inteligencia de Negocio)
        for p in lista_productos:
            es_alta_rotacion = p["cantidad"] >= cantidad_promedio
            es_alto_margen = p["margen_porcentaje"] >= margen_promedio
            
            if es_alta_rotacion and es_alto_margen:
                p["cuadrante"] = "ESTRELLA"
            elif es_alta_rotacion and not es_alto_margen:
                p["cuadrante"] = "VACA"
            elif not es_alta_rotacion and es_alto_margen:
                p["cuadrante"] = "INTERROGANTE"
            else:
                p["cuadrante"] = "PERRO"

        # 7. Generar los Rankings Duales
        ranking_volumen = sorted(lista_productos, key=lambda x: x["cantidad"], reverse=True)[:10]
        ranking_rentabilidad = sorted(lista_productos, key=lambda x: x["utilidad_neta"], reverse=True)[:10]
        
        ticket_promedio = total_ingresos_global / len(ids_ventas)

        return {
            "resumen": {
                "ticket_promedio": round(ticket_promedio, 2),
                "ingresos": round(total_ingresos_global, 2),
                "margen_global": round(margen_promedio, 2),
                "eje_x_cantidad": round(cantidad_promedio, 2) # Punto de corte
            },
            "matriz": lista_productos,
            "ranking_volumen": ranking_volumen,
            "ranking_rentabilidad": ranking_rentabilidad
        }
    except Exception as e:
        print(f"Error Crítico en Analítica BI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Fallo en motor BI: {str(e)}")