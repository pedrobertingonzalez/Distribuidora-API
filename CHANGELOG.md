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
