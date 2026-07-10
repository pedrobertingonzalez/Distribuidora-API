# CHANGELOG — Distribuidora API
## Fase 3 — Gaps de producción

Este archivo documenta cada gap resuelto: qué se hizo, en qué archivo, y las
decisiones de arquitectura tomadas junto con el razonamiento. Está pensado para
ser leído sin tener que releer el código.

---

### Paso 1 — Base sólida (Fase 1)

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
