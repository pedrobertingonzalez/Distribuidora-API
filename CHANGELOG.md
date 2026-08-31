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
