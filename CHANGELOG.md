# CHANGELOG — Distribuidora API
## Fase 3 — Gaps de producción

Este archivo documenta cada gap resuelto: qué se hizo, en qué archivo, y las
decisiones de arquitectura tomadas junto con el razonamiento. Está pensado para
ser leído sin tener que releer el código.

---

### Paso 1 — Base sólida (Fase 1)

#### [GAP] Separación de config por entorno — `.env.example`
- Se creó `.env.example` con todas las variables requeridas (`PORT`, `ANTHROPIC_API_KEY`)
  documentadas con comentarios sobre de dónde obtenerlas.
- **Decisión de arquitectura**: se descartaron las opciones de `.env.development` /
  `.env.production` (con carga manual o `dotenv-flow`) porque en producción real
  Railway y Render inyectan las variables directamente como env vars del proceso —
  nunca leen un archivo `.env.production` del repo. Subir ese archivo al repo sería
  un riesgo de seguridad, y fuera del repo pierde sentido. El `.env.example` cumple
  el objetivo real del gap: documentar qué variables son necesarias para que cualquier
  persona que clone el repo sepa qué tiene que configurar.
- `.env` ya estaba en `.gitignore`. No se requirió cambio adicional.

#### [GAP] Validación de input con joi — `middlewares/validate.js` + `schemas/`
- Se instaló `joi` y se creó `middlewares/validate.js` con una factory `validate(schema)`.
- La factory retorna un middleware que valida `req.body`, acumula todos los errores
  (`abortEarly: false`), stripea campos desconocidos y castea tipos.
- Se crearon schemas en `schemas/`: `clientes.schema.js`, `proveedores.schema.js`,
  `productos.schema.js`, `pedidos.schema.js`.
- Cada router POST usa `validate(schema)` antes del handler.
- Los services mantienen sus validaciones de negocio (ej: stock suficiente) porque
  eso es lógica de dominio, no validación de input.

#### [GAP] Instancia axios configurada — `services/axiosClient.js`
- `anthropicClient`: baseURL de Anthropic, timeout 30s, headers comunes pre-seteados.
- `ollamaClient`: baseURL de Ollama local, timeout 60s (los modelos locales son más lentos).
- Interceptor de request: inyecta `x-api-key` desde `process.env` en cada llamada a Anthropic.
- Interceptor de response: loguea método, URL y tiempo de respuesta en ms.
- `productos.services.js`, `agente.js` y `agenteLlama.js` migrados para usar estas instancias.
- El timeout en Anthropic evita que una llamada colgada bloquee el servidor indefinidamente.

#### [GAP] Clases de error custom — `middlewares/errors.js` + todos los services
- Se creó `middlewares/errors.js` con `NotFoundError` (404) y `ValidationError` (400).
- Ambas extienden `Error` y setean `this.status` en el constructor.
- `errorHandler.js` refactorizado para identificarlas con `instanceof` y loguear `err.name`.
- Todos los services (`clientes`, `proveedores`, `productos`, `pedidos`) reemplazaron
  el patrón manual `const e = new Error(); e.status = 400; throw e` por
  `throw new ValidationError(...)` / `throw new NotFoundError(...)`.

#### [GAP] process.on global — `index.js`
- `unhandledRejection`: captura promesas rechazadas sin catch. Loguea y sale con código 1.
- `uncaughtException`: captura errores sincrónicos que escaparon de todos los try/catch.
- `process.exit(1)` permite que el orquestador (PM2, Railway, Docker) reinicie en estado limpio.
- Ambos van al final de `index.js`, después del `app.listen`.

#### [GAP] helmet + CORS — `index.js`
- Se instalaron `helmet` y `cors`.
- `app.use(helmet())` activa ~14 headers HTTP de seguridad en una línea.
- `app.use(cors())` habilita CORS para todos los orígenes.
- **Decisión temporal**: CORS abierto (`cors()` sin opciones) es válido para
  desarrollo y staging, pero en producción debe restringirse al dominio del
  frontend con `cors({ origin: 'https://tu-dominio.com' })`. Hay un comentario
  TODO en `index.js` recordándolo. No se restringió ahora porque el dominio de
  producción aún no está definido.

---

### Paso 2 — Migración a MongoDB

#### [SETUP] Conexión a Mongo + modelos base — `config/db.js`, `models/`
- No es un gap de la tabla en sí, sino el prerequisito de todos los gaps de
  Mongo: hasta ahora toda la persistencia era `fs.readFile`/`writeFile` sobre
  `data/*.json`.
- **Decisión de arquitectura — Mongo local vs Atlas**: se eligió MongoDB local
  para esta etapa. Atlas queda para el Paso 7 (deploy), porque Railway/Render
  corren en contenedores efímeros sin disco persistente confiable — ahí sí va
  a hacer falta un Mongo gestionado. Desarrollar contra Atlas ahora sumaría
  latencia de red y dependencia de internet sin necesidad real todavía.
- **Decisión de arquitectura — `_id` nativo vs `id` numérico**: se eligió usar
  el `_id` (ObjectId) nativo de Mongo como identificador único, abandonando el
  campo `id` numérico autoincremental que manejaba cada service a mano
  (`maxId + 1`). Mongo no tiene autoincremento nativo — simularlo requiere una
  colección de contadores aparte o buscar el máximo en cada alta, lo cual es
  un anti-patrón conocido en Mongo y puede generar sus propias condiciones de
  carrera. Esto implica que las rutas pasan a recibir ObjectId (string
  hexadecimal de 24 caracteres) en vez de enteros pequeños, y que todo
  consumidor de `idProveedor`/`idCliente`/`idProducto` (schemas Joi, services,
  router de productos, `services/tools.js` del agente) se actualiza en los
  próximos commits para no quedar roto.
- Se crearon 4 modelos en `models/`: `proveedor.model.js`, `cliente.model.js`,
  `producto.model.js`, `pedido.model.js`. Las relaciones se modelan con
  `{ type: mongoose.Schema.Types.ObjectId, ref: 'Coleccion' }` (ej.
  `Producto.proveedor`, `Pedido.cliente`, `Pedido.producto`), que habilita
  `.populate()` — se usa por primera vez en la migración de `pedidos.services.js`.
- **Corrección de tipo**: el campo `telefono` se definió como `String`, no
  `Number` (el JSON original lo tenía como `Number`). Un teléfono es un dato
  que se muestra, no sobre el que se calcula — `Number` pierde ceros a la
  izquierda, no soporta `+` ni guiones, y puede perder precisión en números
  largos. Aplica igual a `proveedor.model.js` y `cliente.model.js`.
- **`config/db.js`**: `conectarDB()` tiene try/catch propio, no depende del
  `unhandledRejection` genérico del Paso 1. Si Mongo no está corriendo, loguea
  un mensaje específico y accionable ("¿está corriendo mongod?") en vez de un
  stack trace genérico de Mongoose, y hace `process.exit(1)` desde el propio
  catch — la app no tiene sentido corriendo sin base de datos, así que el
  fallo sigue siendo fatal, solo que con mejor diagnóstico.
- `index.js` ahora llama `await conectarDB()` antes de `app.listen()`.
- Probado localmente: conecta contra Mongo local (`mongodb://127.0.0.1:27017/distribuidora`)
  y el servidor levanta normalmente.

#### [GAP] Migración de productos a Mongo — `services/productos.services.js`
- Reemplazado el patrón `fs.readFile`/`writeFile` completo por queries de
  Mongoose contra el modelo `Producto`. Se eliminó `guardarProducto` (leer
  array completo → mutar en memoria → reescribir el archivo entero): no tiene
  equivalente con documentos individuales en Mongo, cada operación ahora
  escribe directo (`Producto.create()`) o se resuelve puntual en la migración
  de pedidos (`findOneAndUpdate` + `$inc`, próximo commit).
- `crearProducto` valida la existencia del proveedor consultando el modelo
  `Proveedor` directamente (`Proveedor.findById`), no a través de
  `proveedores.services.js` — ese service todavía no está migrado, y cada
  service Mongoose puede depender directamente de los modelos de las
  entidades relacionadas sin pasar por el service ajeno.
- **Efecto del rename `idProveedor` → `proveedor`** (decisión tomada en el
  commit de setup, al elegir `_id` nativo con relaciones ObjectId + `ref`):
  actualizado en cascada `schemas/productos.schema.js` (ahora valida
  `proveedor` como `Joi.string().hex().length(24)`, formato de un ObjectId,
  en vez de `Joi.number()`) y `routers/productos.router.js` (`GET
  /productos/proveedor?proveedor=...`, sin `parseInt` — un ObjectId es un
  string, no un número).
- **Estado transitorio conocido**: `pedidos.services.js` todavía importa
  `leerProductos`/`guardarProducto` con la firma vieja — queda roto hasta el
  próximo commit (migración de pedidos), que es inmediato.

#### [GAP] Migración de pedidos a Mongo — `services/pedidos.services.js`
- Reemplazado `fs.readFile`/`writeFile` por Mongoose contra `Pedido`. Se
  eliminó `guardarPedido` (mismo motivo que `guardarProducto`: no aplica a
  documentos individuales).
- **Race condition en descuento de stock resuelta**: `crearPedido` usaba
  *leer stock → chequear en JS → restar → escribir* en pasos separados —
  dos pedidos concurrentes del mismo producto podían leer el mismo stock
  antes de que el primero terminara de escribir, y el segundo `write` pisaba
  al primero (se podía vender más stock del real). Se reemplazó por
  `Producto.findOneAndUpdate({ _id: producto, stock: { $gte: cantidad } },
  { $inc: { stock: -cantidad } })`: el chequeo y el descuento pasan a ser una
  sola operación atómica dentro de Mongo, sin ventana donde otro request se
  pueda colar. Si no hay stock suficiente, el filtro no matchea y devuelve
  `null` en vez de dejar stock negativo. `cancelarPedido` usa el mismo `$inc`
  (en positivo) para devolver stock, atómico por el mismo motivo aunque acá
  no hay riesgo de vender de más.
- **Primer uso de `populate()`**: `leerPedidos` y `filtrarPedidos` encadenan
  `.populate('cliente').populate('producto')` — la API devuelve el pedido con
  los documentos completos de cliente y producto, no solo sus ObjectId.
  Resuelve el gap "Relaciones sin populate()" de la tabla.
- `estado: 'pendiente'` y `fecha` ya no se asignan a mano en el service — el
  modelo `Pedido` los define con `default` (`enum` con default `'pendiente'`,
  `fecha: Date.now`). Efecto colateral positivo: `fecha` pasa de ser un
  string de formato regional (`toLocaleDateString()`, ej. `"13/5/2026"`) a un
  `Date` real de Mongo, ordenable y filtrable por rango.
- Cascada del rename a `cliente`/`producto` (ObjectId): actualizado
  `schemas/pedidos.schema.js` (`Joi.string().hex().length(24)` en vez de
  `Joi.number()`), `routers/pedidos.router.js` (sin `parseInt` en los `:id`
  de `PATCH /completar/:id` y `PATCH /:id`), y `services/tools.js` (la tool
  `registrarPedidoPrueba` del agente de IA pasa sus params `idCliente`/
  `idProducto` de `type: "number"` a `cliente`/`producto` de `type: "string"`,
  para matchear lo que `crearPedido` espera ahora).

#### [GAP] Validación en dos capas para clientes y proveedores — `models/cliente.model.js`, `models/proveedor.model.js`
- **Hallazgo durante la migración** (no estaba en la tabla original de
  gaps, surgió al revisar el refactor de `clientes.services.js` y
  `proveedores.services.js`): los modelos de Mongoose solo tenían
  `required: true` en el campo `nombre`. `email`, `telefono`, `direccion`
  (Cliente) y `categoria` (Proveedor) no tenían respaldo a nivel de modelo —
  dependían enteramente de que el middleware `validate(schema)` de Joi los
  exigiera antes en el router.
- **Por qué importa**: hoy (se verificó con grep sobre todo el repo) nada
  llama a `crearCliente`/`crearProveedor` sin pasar antes por su router y su
  schema Joi — ni el agente de IA (`services/tools.js` no define tools de
  creación de cliente/proveedor) ni ningún script. Pero es un contrato
  implícito, no forzado por el lenguaje: el día que se agregue una tool de
  agente, un script de seed, o cualquier otro caller que llame al service
  directo, se saltearía toda validación sin que nada lo impida — Mongoose
  aceptaría un documento con `email` o `telefono` indefinidos.
- **Fix**: se agregó `required: true` a los 4 campos faltantes (mismo patrón
  ya usado en `nombre`, no es una feature nueva de Mongoose). Con esto la
  validación queda en dos capas: Joi en el borde (mensajes de error legibles,
  rechaza antes de tocar la base) y Mongoose como respaldo (garantiza
  integridad sin importar quién llame al service). También se descubrió y
  corrigió, en el mismo repaso, que `schemas/proveedores.schema.js` exigía un
  campo `direccion` que la entidad Proveedor nunca tuvo (copy-paste de
  `clientes.schema.js` no ajustado) y no validaba `categoria`, que sí es un
  campo real — se corrigió el schema Joi para que valide `categoria` en vez
  de `direccion`.
- Como consecuencia de la corrección del `telefono` de `Number` a `String`
  (decidido en el commit de setup), `schemas/clientes.schema.js` y
  `schemas/proveedores.schema.js` pasan de `Joi.number().integer().positive()`
  a `Joi.string()` para ese campo, consistente con el tipo real del modelo.

#### [GAP] Paginación — `GET /productos`, `GET /pedidos`
- Se agregó `leerProductosPaginado({ skip, limit })` y
  `leerPedidosPaginado({ skip, limit })` como funciones **nuevas y separadas**
  de `leerProductos()`/`leerPedidos()`, que quedan intactas sin parámetros.
- **Decisión de diseño**: la primera versión metía `skip`/`limit` como
  parámetros opcionales directamente en `leerProductos()` (la función
  compartida). Se descartó: `historialIA()` llama a `leerProductos()` para
  inyectar el inventario completo en el contexto de la IA — si esa función
  acepta `skip`/`limit`, cualquier cambio futuro ahí (a mano o por un agente)
  podría pasarle esos parámetros sin darse cuenta de que corta el inventario
  que la IA necesita ver completo. Separar el nombre (`leerProductosPaginado`)
  hace el contrato explícito: nadie confundiría esa función con "traeme todo
  el inventario".
- Se evaluó también resolver la paginación con `.slice()` en JS después de
  traer la colección completa — se descartó porque pierde el beneficio real
  de paginar: seguiría trayendo todos los documentos de Mongo a memoria en
  cada request. `leerProductosPaginado`/`leerPedidosPaginado` arman la query
  a nivel de Mongo (`Model.find().skip(skip).limit(limit)`), así que solo se
  transfieren desde la base los documentos de la página pedida.
- `skip`/`limit` son opcionales vía query params (`?skip=&limit=`) en ambos
  routers — sin params, el comportamiento es idéntico al de antes (devuelve
  todo). Probado manualmente: sin params trae el total, `?limit=1` trae 1,
  `?skip=1&limit=1` trae el segundo.

#### [GAP] Índices — `models/cliente.model.js`, `models/proveedor.model.js`, `models/pedido.model.js`, `models/producto.model.js`
- Se agregó `index: true` en los campos que la tabla del documento señala
  como candidatos ("índice en email, en campos de filtro frecuente de
  pedidos"): `Cliente.email`, `Proveedor.email` (búsqueda por email),
  `Pedido.estado` (lo filtra `filtrarPedidos`), `Producto.proveedor` (lo
  filtra `productosPorProveedor`). Sin índice, cada una de esas queries
  escanea la colección entera; con índice, Mongo va directo a los documentos
  que matchean.
- **Decisión**: no se marcó ninguno como `unique`. El gap pide índice para
  performance de lectura, no una restricción de unicidad nueva — eso
  cambiaría el comportamiento actual (hoy nada impide emails duplicados) y
  es una decisión aparte que no estaba pedida en este gap.

#### [GAP] Referencias huérfanas — `models/cliente.model.js`, `models/proveedor.model.js`, `services/clientes.services.js`, `services/proveedores.services.js`
- **El problema**: `eliminarCliente`/`eliminarProveedor` hacían un borrado
  físico (`findByIdAndDelete`). Si un cliente con pedidos existentes se
  borraba, esos pedidos quedaban con una referencia (`ObjectId`) a un
  documento que ya no existe — `populate('cliente')` en pedidos viejos
  empezaría a devolver `null`, perdiendo el dato histórico de quién hizo el
  pedido. Mismo problema simétrico entre `Proveedor` y `Producto`.
- **Decisión de arquitectura — soft delete condicional** (tomada sin
  consulta previa, con autorización explícita del usuario para decidir y
  documentar el razonamiento en este paso puntual): el documento ya orienta
  la solución ("soft delete de clientes con pedidos"). Se implementó de
  forma condicional, no incondicional:
  - Si el cliente/proveedor **tiene** pedidos/productos asociados
    (`Pedido.exists({ cliente: id })` / `Producto.exists({ proveedor: id })`),
    se marca `activo: false` en vez de borrarlo — el documento sigue
    existiendo, así que `populate()` en pedidos/productos viejos sigue
    resolviendo el dato real en vez de `null`.
  - Si **no** tiene nada asociado, se borra físicamente
    (`findByIdAndDelete`) — no tiene sentido dejar un documento marcado
    "inactivo" sin ninguna referencia que proteger, sería basura acumulada
    sin beneficio.
- Se aplicó el mismo criterio a `Proveedor` (no solo `Cliente`, que es lo
  único que menciona la tabla del documento): el problema de integridad
  referencial es idéntico para `Producto.proveedor`, así que la misma
  solución aplica por simetría. Documentado acá porque es una extensión más
  allá de lo que pedía literalmente el gap.
- Se agregó `activo: { type: Boolean, default: true }` a ambos modelos.
  `leerClientes()`/`leerProveedores()` filtran `{ activo: true }` — un
  cliente/proveedor "borrado" (soft) deja de aparecer en los listados, igual
  que si se hubiera borrado de verdad.
- **Efecto en cascada sobre las validaciones de creación**: `crearProducto`
  y `crearPedido` verificaban que el proveedor/cliente existiera con
  `findById` — eso encontraría igual a uno soft-deleted (`activo: false`),
  permitiendo crear productos o pedidos nuevos contra una entidad que se
  supone borrada. Se cambió a `findOne({ _id, activo: true })` en los dos
  services, para que un cliente/proveedor "borrado" no pueda seguir
  generando actividad nueva.
- Probado manualmente: cliente sin pedidos se borra físicamente y desaparece
  de Mongo; cliente con pedidos se marca inactivo, desaparece de
  `GET /clientes`, pero el `populate('cliente')` de su pedido viejo sigue
  trayendo el nombre real; un intento de crear un pedido nuevo contra ese
  cliente inactivo es rechazado con `NotFoundError`.

#### [GAP] Reconexión a Mongo — `config/db.js`
- El driver de MongoDB ya reintenta la conexión automáticamente por
  default (no hace falta lógica de retry manual). Lo que faltaba era
  observabilidad: enterarse cuándo se corta la conexión y cuándo se
  recupera, en vez de que el proceso quede en silencio.
- Se agregaron listeners sobre `mongoose.connection`: `disconnected` (loguea
  advertencia), `reconnected` (loguea recuperación), `error` (loguea el
  detalle). Complementa el `try/catch` de `conectarDB()` (que cubre el fallo
  al arrancar) con visibilidad de cortes que ocurran mientras el servidor ya
  está corriendo.

---

### Paso 2 — Cerrado

Los 6 gaps de Mongo de la tabla quedaron resueltos: race conditions en
stock (`$inc` atómico), índices, paginación, `populate()`, referencias
huérfanas (soft delete condicional), reconexión. De paso se corrigieron dos
bugs preexistentes encontrados durante la migración (validación de
`proveedores.schema.js` con campo `direccion` inexistente, y falta de
`required: true` de respaldo en `Cliente`/`Proveedor`). JWT (Paso 3) queda
para la próxima sesión, según el orden de build sugerido del documento.

---

### Paso 3 — JWT integrado al capstone

#### [GAP] Register + Login — `models/user.model.js`, `schemas/auth.schema.js`, `routers/auth.router.js`, `services/auth.services.js`
- Se creó el modelo `User`: `nombre` (trim), `email` (unique, lowercase,
  trim), `password` (`select: false`), `rol` (enum `admin`/`vendedor`,
  default `vendedor`), `tokenVersion` (default 0) y `{ timestamps: true }`.
- `schemas/auth.schema.js`: `registrarSchema` y `loginSchema`, con `password`
  `min(8).max(72)` (bcrypt ignora lo que pasa de 72 bytes).
- `middlewares/errors.js`: se agregaron `ConflictError` (409) y
  `UnauthorizedError` (401).
- `routers/auth.router.js`: `POST /auth/register` (201) y `POST /auth/login`
  (200). Router delgado: valida con Joi, llama al service y pasa los errores
  a `next(error)`. Montado en `index.js` con `app.use('/auth', authRouter)`,
  sin protección de token (si no, nadie podría loguearse).
- `services/auth.services.js`: `registrar()` y `login()`.
- Variables nuevas en `.env` / `.env.example`: `JWT_SECRET`, `JWT_EXPIRES_IN`.
- **Decisión — mismo 401 "Credenciales inválidas"** para email inexistente y
  contraseña incorrecta: con mensajes distintos, un atacante con una lista de
  emails filtrados descubre cuáles tienen cuenta. **Gap conocido**: el
  register sí revela existencia (409); resolverlo requiere un flujo de
  verificación por mail, que no existe todavía. Pendiente opcional: timing
  attack en login (email inexistente responde más rápido que uno que pasa
  por bcrypt).
- **Decisión — catch del error 11000 en `registrar()`**: el chequeo previo
  con `User.exists()` cubre el caso normal, pero no dos registros
  simultáneos (doble clic): ambos pasan el chequeo antes de que el primero
  guarde. El índice `unique` frena al segundo con el error 11000 del driver,
  y el catch lo traduce a 409 en vez de dejarlo llegar como 500. Cualquier
  otro error se relanza con `throw error;` para no esconder la causa real.
- **Decisión — `tokenVersion` y `rol` en `User` desde el arranque**: evita
  migrar documentos más adelante. `tokenVersion` permite invalidar todos los
  tokens de un usuario (robo, cambio de contraseña) sin rotar `JWT_SECRET`,
  que desloguearía a todos. `rol` tiene default para que nadie se
  autoasigne admin; además `stripUnknown` en Joi descarta un `rol` enviado
  en el body, y el service desestructura solo `{ nombre, email, password }`.
- **Decisión — bcrypt con 12 rounds** (2^12 = 4096 iteraciones, ~250ms por
  hash): imperceptible para un usuario, inviable para fuerza bruta sobre una
  base robada. Los rounds quedan guardados dentro del hash, así que se
  pueden subir en el futuro sin romper los hashes existentes.
- **Decisión — normalización idéntica del email** (lowercase + trim) en los
  dos schemas de Joi y en el modelo: sin ella, un usuario registrado con
  mayúsculas no encuentra su cuenta al loguearse. El modelo es la última
  línea de defensa para caminos que no pasan por Joi.
- **Payload del token**: solo `userId`, `rol` y `tokenVersion`. Nada de
  email ni password: el payload está firmado, no cifrado.
- Respuestas sin password: `select: false` solo aplica a queries, así que el
  documento de `create()` trae el hash en memoria; se devuelve un objeto
  armado a mano.
- Probado manualmente en Thunder Client: register 201, register repetido
  409, login 200 con token, contraseña incorrecta 401, email inexistente 401
  con el mismo mensaje. Payload verificado (`userId`, `rol`, `tokenVersion`,
  `iat`, `exp` a 1h).
- Pendiente del Paso 3: middleware de verificación con chequeo de
  `tokenVersion`, proteger rutas, roles/permisos, rate limit en `/login`,
  refresh token, decisión localStorage vs cookie httpOnly.

#### [GAP] Middleware de autenticación y rutas protegidas — `middlewares/auth.middleware.js`, `index.js`
- `middlewares/auth.middleware.js`: `verificarToken`. Verifica el header
  `Bearer`, la firma y vencimiento del JWT, la existencia del usuario y su
  `tokenVersion`. Deja `req.usuario = { id, rol }` disponible para las rutas.
- `index.js`: `verificarToken` montado en `/clientes`, `/pedidos`,
  `/productos`, `/proveedores`, `/agente` y `/agente-llama`. `/auth` queda
  sin proteger (si no, nadie podría loguearse).
- **Decisión — `tokenVersion` contra la base en cada request**: permite
  revocar los tokens de un usuario (celular robado, cambio de contraseña)
  sin rotar `JWT_SECRET`, que desloguearía a todos. Costo: una query extra
  a Mongo por request protegido. Un JWT puro no consulta la base, pero
  tampoco se puede revocar antes de que venza.
- **Decisión — rol leído de la base, no del token**: un cambio de rol
  aplica en el próximo request, sin esperar a que venza el token.
- **`.select('tokenVersion rol')`**: trae solo los campos necesarios, no el
  documento entero.
- **Decisión — mismo 401 para todo** (token roto, vencido, usuario
  inexistente o versión vieja): no se le revela al atacante qué falló
  específicamente.
- **`startsWith('Bearer ')`**: corta headers mal formados con un 401 claro
  en vez de un error confuso más adelante.
- **Errores de `jwt.verify`**: `TokenExpiredError` y `JsonWebTokenError` se
  traducen a 401; cualquier otro error se relanza y termina en 500.
- **try/catch + `next(error)`**: en Express 4, un error en un middleware
  async sin atrapar no llega al `errorHandler` y tira el server.
- Probado manualmente en Thunder Client: sin header 401, token válido 200,
  token alterado 401, `tokenVersion` subido en Compass → token viejo 401,
  login nuevo 200, `/auth/login` sin token 200.

#### [GAP] Roles y permisos (RBAC) — `middlewares/errors.js`, `middlewares/roles.middlewares.js`, todos los routers
- Con `verificarToken` resolviendo la autenticación ("¿quién sos?"), faltaba la
  autorización ("¿podés hacer esto?"): todo usuario autenticado tenía acceso
  total a todos los recursos.
- `middlewares/errors.js`: se agregó `ForbiddenError` (403), siguiendo el patrón
  de las clases ya existentes.
- `middlewares/roles.middlewares.js`: `requiereRol(...roles)`, factory que recibe
  los roles habilitados y devuelve el middleware que compara contra
  `req.usuario.rol`. Mismo patrón que `validate(schema)` del Paso 1.
- Aplicado ruta por ruta en `productos`, `clientes`, `proveedores`, `pedidos`,
  `agente` y `agente-llama`. `/auth` queda público.
- **Permisos aplicados**: productos — `GET /`, `/proveedor` y `/stockBajo` para
  ambos roles; `GET /analisis-stock`, `POST /` y `POST /historialIA` solo admin.
  Clientes — `GET /` y `POST /` para ambos; `PATCH /:id` (baja) solo admin.
  Proveedores — todo admin. Pedidos — todas las rutas para ambos roles.
  Agente y agente-llama — solo admin. Criterio: el admin gestiona la
  distribuidora (catálogo, proveedores, análisis con IA), el vendedor atiende
  clientes y carga pedidos. Principio de mínimo privilegio.
- **Decisión — archivo separado de `auth.middleware.js`**: autenticación y
  autorización son responsabilidades distintas y conviene que se note en la
  estructura de archivos.
- **Decisión — middleware por ruta, no por recurso**: `verificarToken` se monta
  en `index.js` para el recurso completo porque todas las rutas lo necesitan
  igual; los roles varían según la operación, así que van en cada ruta.
- **Decisión — sin consulta a la base**: el rol ya lo leyó `verificarToken` de
  Mongo en este mismo request. Acá solo se comparan strings en memoria, sin
  costo adicional, y un cambio de rol sigue aplicando en el request siguiente.
- **Decisión — deny by default**: se compara contra una lista de permitidos, no
  de prohibidos. Un rol nuevo queda automáticamente fuera de todas las rutas
  hasta que se lo sume explícitamente; con la lógica invertida tendría acceso a
  todo el día que se crea.
- **Decisión — el permiso se evalúa antes que la validación de Joi**: a quien no
  tiene permiso no se le devuelven los mensajes del schema, que son información
  sobre la forma de un endpoint que no puede usar. Orden en la ruta:
  `verificarToken` → `requiereRol` → `validate` → handler.
- **Decisión — los permisos se deciden por la operación de negocio, no por el
  verbo HTTP**: `PATCH /clientes/:id` y `PATCH /proveedores/:id` son los soft
  deletes del Paso 2, no ediciones. Un PATCH puede ser más destructivo que un
  DELETE, así que quedan restringidos a admin pese al verbo. En la primera
  versión de este commit `PATCH /clientes/:id` había quedado habilitado para
  vendedor por seguir el verbo en vez de la operación; corregido antes de
  commitear.
- **Decisión — chequeo defensivo de `req.usuario`**: si el middleware se montara
  en una ruta fuera de `verificarToken`, sin ese chequeo se produciría un
  `TypeError` y un 500 confuso. Se responde 403 (fail closed) con un mensaje que
  identifica el error de programación, distinto del mensaje genérico al usuario.
- **Decisión — agente y agente-llama restringidos a admin**: las tools
  disponibles (`obtener productos bajo stock`, `obtener proveedores`,
  `registrar pedido`) se ejecutan con los permisos del servidor, no con los del
  usuario que pregunta. Si el vendedor pudiera usar `/agente`, obtendría por esa
  vía datos que la ruta directa le niega, y `registrarPedidoPrueba` escribiría en
  la base salteándose el middleware de roles y la validación de Joi. Es el patrón
  *confused deputy*, agravado por la posibilidad de prompt injection sobre el
  input en texto libre.
- **El primer admin se crea a mano**: el register asigna siempre el rol por
  default (`stripUnknown` descarta un `rol` enviado en el body y el service
  desestructura solo los campos usados), así que nadie puede autoascenderse. El
  primer admin se promueve editando el documento en Compass.
- Probado manualmente en Thunder Client, 9 casos sobre productos: `GET
  /productos` con vendedor 200, con admin 200, sin token 401;
  `GET /productos/analisis-stock` con vendedor 403, con admin 200;
  `POST /productos` con vendedor y body válido 403, con body inválido 403 (no
  400 — confirma que el permiso se evalúa antes que Joi), con admin y body
  inválido 400 de Joi, con admin y body válido 201. Más: `GET /proveedores` con
  vendedor 403, `GET /clientes` con vendedor 200, `PATCH /clientes/:id` con
  vendedor 403.
- **Gap conocido — autorización por propiedad (ownership)**: RBAC decide por tipo
  de recurso, no por instancia. Un vendedor puede ver y modificar pedidos creados
  por otro vendedor. Requiere un campo `vendedor` en el modelo `Pedido`, llenado
  desde `req.usuario.id` al crear, y filtrado en el service (el middleware no
  sirve: corre antes de leer el documento, así que no sabe de quién es). Queda
  por decidir 403 vs 404 para un recurso ajeno — un 403 confirma que existe,
  mismo criterio que la enumeración de emails del login.
- **Gap conocido — filtrado de tools por rol en el agente**: solución correcta a
  largo plazo en lugar de restringir el endpoint entero — pasar el rol al agente
  y ofrecerle al modelo únicamente las tools permitidas. Va con el Paso 4, junto
  con la validación de tool params y las defensas anti prompt-injection.
- **Gap conocido — faltan PATCH y DELETE de productos**: `productos.services.js`
  no tiene funciones de actualización ni de borrado. Al escribirlas hay que
  decidir entre borrado físico y soft delete condicional, como ya se hizo con
  `Cliente` y `Proveedor`, y agregar un schema de Joi propio para el PATCH
  (campos opcionales más `.min(1)`, no reutilizar `crearProductoSchema`).
- **Gap conocido — rutas de baja con nombre engañoso**: `PATCH /clientes/:id` y
  `PATCH /proveedores/:id` dan de baja, no editan. Deberían ser `PATCH /:id/baja`
  o `/:id/desactivar`. Consecuencia: hoy no existe forma de editar un cliente o
  un proveedor, porque la ruta genérica de edición está ocupada por la baja.
- **Gap conocido — sin constantes de rol**: los roles se pasan como strings
  literales (`requiereRol('admin')`). Un typo o una mayúscula no produce ningún
  error: la ruta simplemente bloquea a todos, en silencio. Un objeto
  `ROLES = { ADMIN: 'admin', VENDEDOR: 'vendedor' }` lo haría detectable.
- Pendiente del Paso 3: rate limit en `/login`, refresh token, decisión
  localStorage vs cookie httpOnly.