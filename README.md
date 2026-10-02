# Distribuidora API

API REST para gestionar una distribuidora: proveedores, productos, clientes y pedidos, con autenticación JWT, roles y permisos, MongoDB y dos agentes de IA con *function calling* sobre los mismos services.

Proyecto de portfolio, en desarrollo (Fase 3 de un plan de producción documentado en `docs/mapa_gaps_distribuidora.md`). Las decisiones de diseño y su razonamiento están en [`CHANGELOG.md`](CHANGELOG.md).

## Stack

Node.js · Express 5 · MongoDB + Mongoose 9 · Joi 18 · JSON Web Tokens + bcrypt · express-rate-limit · helmet · cors · axios · API de Anthropic (Claude) y Ollama (local).

## Cómo correrlo

```bash
git clone https://github.com/pedrobertingonzalez/Distribuidora-API.git
cd Distribuidora-API
npm install
cp .env.example .env     # completar los valores
npm run dev              # nodemon; para producción: npm start
```

Requiere una instancia de MongoDB (local por defecto) y, para el agente con Claude, una API key de Anthropic. El agente local necesita Ollama corriendo en la máquina.

### Variables de entorno

| Variable | Qué es |
|---|---|
| `PORT` | Puerto del servidor (3000 por defecto) |
| `ANTHROPIC_API_KEY` | API key de Anthropic, para `/agente` |
| `MONGODB_URI` | Connection string de MongoDB |
| `JWT_SECRET` | Clave para firmar los tokens (larga y aleatoria) |
| `JWT_EXPIRES_IN` | Duración del token (`30m`, `1h`, `7d`) |

## Arquitectura

```
router (fino: ruta, permisos, validación)
  → service (lógica de negocio, tira errores propios)
    → model (Mongoose)
```

- `routers/`, `services/`, `models/`, `schemas/` (Joi), `middlewares/`, `config/`.
- Errores custom (`NotFoundError` 404, `ValidationError` 400, `ConflictError` 409, `UnauthorizedError` 401, `ForbiddenError` 403) que un `errorHandler` central convierte en respuestas HTTP. Los errores inesperados responden 500 con un mensaje genérico; el detalle queda solo en el log.
- Express 5: los rechazos de handlers async llegan solos al `errorHandler`, sin `try/catch` en cada ruta.
- Validación en dos capas: Joi en la entrada y reglas del modelo en Mongoose.

## Autenticación y permisos

- `POST /auth/register` y `POST /auth/login` son públicos; el resto exige `Authorization: Bearer <token>`.
- El token se invalida si el usuario no existe o cambia su `tokenVersion`; el rol se lee de la base en cada request.
- Rate limit en el login: 5 intentos fallidos cada 15 minutos por combinación IP + email.
- Roles: `admin` y `vendedor`. Lista de permitidos, no de prohibidos: un rol nuevo no tiene acceso a nada hasta que se lo habilita.

## Endpoints

| Método y ruta | Rol | Qué hace |
|---|---|---|
| `POST /auth/register` | público | Crea un usuario (rol `vendedor` por defecto) |
| `POST /auth/login` | público | Devuelve el token |
| `GET /productos` | admin, vendedor | Lista paginada (`?skip=&limit=`) |
| `GET /productos/proveedor?proveedor=` | admin, vendedor | Productos de un proveedor |
| `GET /productos/stockBajo` | admin, vendedor | Productos con menos de 50 unidades |
| `GET /productos/analisis-stock` | admin | Análisis de stock con IA |
| `POST /productos` | admin | Crea un producto |
| `POST /productos/historialIA` | admin | Consulta con IA sobre el inventario |
| `GET /clientes` · `POST /clientes` | admin, vendedor | Lista y crea clientes |
| `PATCH /clientes/:id` | admin | Da de baja (soft delete) |
| `GET /proveedores` · `POST /proveedores` | admin | Lista y crea proveedores |
| `PATCH /proveedores/:id` | admin | Da de baja (soft delete) |
| `GET /pedidos` | admin, vendedor | Lista paginada |
| `GET /pedidos/estado?estado=` | admin, vendedor | Filtra por `pendiente`, `completado` o `cancelado` |
| `POST /pedidos` | admin, vendedor | Crea un pedido |
| `PATCH /pedidos/completar/:id` | admin, vendedor | Completa un pedido pendiente |
| `PATCH /pedidos/:id` | admin, vendedor | Cancela un pedido pendiente y devuelve el stock |
| `POST /agente` | admin | Agente con Claude (function calling) |
| `POST /agente-llama` | admin | Agente con Ollama en local |

## Reglas de negocio de los pedidos

- No se puede crear un pedido sin stock suficiente. El descuento es un `findOneAndUpdate` atómico condicionado a que haya stock, así dos pedidos simultáneos no venden la misma unidad.
- El total se calcula como precio × cantidad; la fecha se asigna al crear; el estado inicial es siempre `pendiente`.
- Solo un pedido `pendiente` puede cancelarse o completarse; `cancelado` y `completado` son estados finales.

## Agentes de IA

Dos endpoints (`/agente` con la API de Anthropic y `/agente-llama` con Ollama) comparten las tools de `services/tools.js`: consultar productos con stock bajo, listar proveedores y crear un pedido. Las tools llaman a los mismos services que las rutas. Los dos endpoints son solo para `admin`: las tools se ejecutan con los permisos del servidor, no con los del usuario que pregunta.

## Límites conocidos

Documentados con su razonamiento en el `CHANGELOG.md`:

- Sin tests automáticos todavía.
- Crear un pedido descuenta el stock y después guarda el pedido en dos pasos separados; si el servidor se cae justo en el medio queda stock descontado sin pedido. La solución (transacciones) requiere un replica set y está prevista para el despliegue en Atlas.
- Dos cancelaciones simultáneas del mismo pedido podrían pasar el chequeo de estado a la vez.
- Un vendedor puede ver y modificar pedidos de otro vendedor (falta autorización por propiedad).
- El agente procesa solo la primera tool que pide el modelo y un error en una tool corta todo el request.
- CORS abierto y rate limit en memoria: pendientes de ajustar para producción.
- Pendientes de las capas de producción de los agentes: reintentos con backoff, registro de tokens y costos, validación de parámetros y defensas contra prompt injection.
