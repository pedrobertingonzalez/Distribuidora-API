# CHANGELOG — Distribuidora API
## Fase 3 — Gaps de producción

Este archivo documenta cada gap resuelto: qué se hizo, en qué archivo, y las
decisiones de arquitectura tomadas junto con el razonamiento. Está pensado para
ser leído sin tener que releer el código.

---

### Paso 1 — Base sólida (Fase 1)

#### [GAP] helmet + CORS — `index.js`
- Se instalaron `helmet` y `cors`.
- `app.use(helmet())` activa ~14 headers HTTP de seguridad en una línea.
- `app.use(cors())` habilita CORS para todos los orígenes.
- **Decisión temporal**: CORS abierto (`cors()` sin opciones) es válido para
  desarrollo y staging, pero en producción debe restringirse al dominio del
  frontend con `cors({ origin: 'https://tu-dominio.com' })`. Hay un comentario
  TODO en `index.js` recordándolo. No se restringió ahora porque el dominio de
  producción aún no está definido.
