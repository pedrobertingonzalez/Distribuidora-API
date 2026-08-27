# MAPA CONSOLIDADO — Gaps de producción + Proyecto integrador Distribuidora
**Pedro Bertín | Julio 2026**

Este documento junta todo lo que quedó afuera del recorrido de formación (Fase 1 a JWT/Mongo) y lo mapea contra un único proyecto — la Distribuidora ampliada — para que sirva como ejercicio modelo de portfolio. La idea: no hay teoría suelta, cada gap tiene un lugar concreto donde se resuelve.

---

## Cómo usar este documento

Cada gap tiene: **qué falta**, **dónde se resuelve en la Distribuidora**, **prioridad** (Alta = bloquea entrevistas técnicas o portfolio creíble / Media = diferencial real / Baja = nice-to-have, mencionar que se conoce el trade-off).

El orden de build sugerido está al final. No hace falta resolver todo antes de mostrar el proyecto — algunos gaps de Baja prioridad se pueden dejar documentados como "decisión pendiente" en el README, que también es una señal profesional.

---

## FASE 1 — Node / Express / Git / Axios

| Gap | Dónde se resuelve | Prioridad |
|---|---|---|
| Sin `process.on('unhandledRejection'/'uncaughtException')` | `server.js` de Distribuidora — handler global de proceso | Media |
| Sin clases de error custom (`NotFoundError`, `ValidationError`) | Refactor de `error.middleware.js` | Alta |
| Sin validación de input (`joi`/`zod`) | Middleware de validación en cada router de Distribuidora | Alta |
| Sin `helmet` / CORS explícito | `app.js` — dos líneas, alto impacto | Alta |
| Sin separación de config por entorno | `.env.development` / `.env.production` | Media |
| `.gitignore` no es tema explícito | Auditoría de todos los repos + README explicando la práctica | Alta |
| Sin conventional commits / flujo PR | Aplicar desde el próximo commit de Distribuidora en adelante | Media |
| Axios sin timeout ni interceptors | `axios.create()` con instancia configurada, usada en toda la IA | Alta |

## FASE 2 — APIs de IA / Function Calling / Ollama / LangChain / RAG

| Gap | Dónde se resuelve | Prioridad |
|---|---|---|
| Sin manejo de rate limit (429) en Anthropic | Wrapper de llamada con retry/backoff | Alta |
| Sin timeout en llamadas a IA | Mismo wrapper | Alta |
| Sin streaming de respuestas | Endpoint de chat de Distribuidora (`stream: true`) | Media |
| Sin validar params que Claude manda en function calling | Validación antes de ejecutar cada tool en `agente.js` | Alta |
| Try/catch por tool individual dentro del loop | Refactor de `agente.js` | Alta |
| Sin logging de qué tool, con qué params, cuánto tardó | Tabla `logs_agente` en Mongo | Alta |
| Sin manejo de Ollama caído (fallback real) | `agenteLlama.js` — catch que redirige a Anthropic | Alta |
| Sin control de tamaño de contexto en context injection | Chequeo de longitud antes de inyectar en Ollama | Media |
| Cadenas LangChain sin manejo de error de parser | Try/catch alrededor de `.invoke()` | Media |
| Sin threshold de similitud en RAG (alucina si no hay match) | `similarity_search_with_score` + umbral mínimo | Alta |
| Sin chunking de documentos largos | Solo si Distribuidora suma documentos largos (no solo filas) | Baja |
| Sin re-indexado de Chroma cuando cambia el stock | Hook que reindexa al actualizar producto | Media |

## MongoDB / JWT

| Gap | Dónde se resuelve | Prioridad |
|---|---|---|
| Race conditions en descuento de stock | `findOneAndUpdate` con `$inc` en vez de find+save | Alta |
| Sin índices | Índice en `email`, en campos de filtro frecuente de pedidos | Media |
| Sin paginación | `GET /productos` y `GET /pedidos` con `limit`/`skip` | Media |
| Relaciones sin `populate()` | Pedido con cliente y productos completos en una query | Alta |
| Referencias huérfanas sin estrategia | Decidir y documentar: soft delete de clientes con pedidos | Media |
| Sin reconexión a Mongo | Listener de eventos de conexión con reintento | Baja |
| Sin refresh token | Access token corto + refresh token largo | Media |
| Sin rate limiting en login | `express-rate-limit` en `/login` | Alta |
| Sin roles/permisos | Campo `rol` en User + middleware `requiereRol('admin')` | Alta |
| Sin decisión sobre dónde vive el token en cliente | Documentar trade-off localStorage vs cookie httpOnly, elegir uno | Media |
| Sin flujo de reseteo de password | Fuera de alcance de Distribuidora — mencionar como conocido | Baja |
| `tokenVersion` para invalidación por usuario | Ya resuelto en la sesión de repaso — implementar en `user.model.js` | Alta |

## Los 8 temas de producción (ya identificados, ahora con contenido)

| Tema | Qué significa en concreto | Dónde se resuelve | Prioridad |
|---|---|---|---|
| Routing inteligente | Criterio explícito Ollama vs Anthropic (tamaño, sensibilidad, complejidad) | `router.service.js` nuevo en Distribuidora | Alta |
| Logging de tokens | Persistir `usage` en Mongo por request | Colección `logs_ia` | Alta |
| Context engineering formalizado | Versionar prompts, documentar por qué están redactados así | Carpeta `prompts/` con versión + changelog | Media |
| Límites de costo/tokens por sesión | Cortar sesión si supera un tope en dólares | Middleware que suma `usage` acumulado por sesión | Media |
| Evaluación de calidad de output | Criterio manual mínimo: checklist de qué hace "buena" una respuesta | Documento de criterios + revisión manual de 10 casos | Baja |
| Retry/fallback en fallos | Backoff exponencial en llamadas a IA y a Mongo | Wrapper compartido de llamadas externas | Alta |
| Seguridad IA (prompt injection) | Sanitizar datos de Mongo antes de inyectarlos en el contexto | Función de sanitización antes de `JSON.stringify()` en prompts | Alta |
| Observabilidad | Logs estructurados (qué prompt, qué contexto, qué respuesta) | Mismo logging de tokens, ampliado con contexto completo | Alta |

## Temas nunca tocados (fuera de los 8 ya nombrados)

| Tema | Dónde se resuelve | Prioridad |
|---|---|---|
| Testing (unitario/integración) | Tests con Jest o Vitest sobre servicios clave de Distribuidora | Alta |
| Deploy/hosting | Deployar Distribuidora en Render o Railway | Alta |
| Docker | Dockerfile básico para Distribuidora | Media |
| CI/CD | GitHub Actions corriendo tests en cada push | Media |
| Documentación de API (Swagger/OpenAPI) | Swagger sobre los endpoints de Distribuidora | Media |
| HTTPS/certificados | Cubierto automáticamente al deployar en Render/Railway | Baja |
| Caching | Cache simple en memoria para análisis de stock repetidos | Baja |
| Manejo de secrets en equipo | Documentar en README (no implementar, es proceso no código) | Baja |

---

## Orden de build sugerido

1. **Base sólida** — Fase 1 (helmet, CORS, validación, error handling, .gitignore, axios instance)
2. **Mongo real** — migración completa + race conditions + populate + índices + paginación
3. **JWT completo** — tokenVersion, roles, rate limit en login, decisión de dónde vive el token
4. **Agentes con las capas de producción** — retry/fallback, logging de tokens, observabilidad, seguridad ante prompt injection, routing inteligente
5. **RAG con threshold** — si Distribuidora suma búsqueda semántica, aplicar el umbral de similitud
6. **Límites y evaluación** — costo por sesión, criterios de calidad
7. **Capa de entrega** — testing, Swagger, Docker, deploy, CI/CD

Cada paso queda documentado en el README de Distribuidora — eso también es parte del portfolio: mostrar que sabés *por qué* está construido así, no solo que funciona.

---

## Siguiente paso

A partir de acá, la construcción real conviene hacerla en Claude Code (trabajo directo sobre el repo, git, Mongo corriendo) en vez de este chat. Este documento queda como la hoja de ruta de referencia durante todo el proceso.
