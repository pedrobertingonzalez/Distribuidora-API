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
