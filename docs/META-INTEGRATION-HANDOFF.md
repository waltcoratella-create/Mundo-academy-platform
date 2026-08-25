# Handoff — Integración Meta Ads (Mundo Academy)

> Estado a fecha del handoff. Fases A y B **implementadas y sin commitear**.
> HEAD del repo: `c1e3d9c feat: complete ads creatives editor`.
> Este documento es autosuficiente: no hace falta releer la conversación previa.

---

## 1 · Contexto: qué existía antes de Meta

El **builder de campañas** está terminado y en producción (commits ya en `main`):

- Flujo de 3 fases: **Campaign → Build → Creatives**. `TOTAL_STEPS = 3`.
- Ruta crear: `/mis-negocios/[businessId]/anuncios/create`
- Ruta editar: `/mis-negocios/[businessId]/anuncios/[campaignId]/edit`
- Dashboard: `/mis-negocios/[businessId]/anuncios`
- Tabla `ad_campaigns` en Supabase, con jsonb `audience`, `delivery`, `creative`.
- `creative` es multi-anuncio: `{ ads: [{ id, mediaUrl, mediaType, primaryText, headline, description, cta, destinationUrl }] }`, con migración retrocompatible desde el formato plano antiguo.
- `delivery` (8 campos): `conversionLocation`, `conversionEvent`, `advantagePlacements`, `budgetControl`, `bidStrategy`, `specialCategory`, `minimumDailySpend`, `dynamicCreative`.
- `audience` (11 campos): `globalReach`, `includedLocations`, `excludedLocations`, `advantageAudience`, `ageMin`, `ageMax`, `gender`, `interests`, `languages`, `customAudiencesIncluded`, `customAudiencesExcluded`.
- Timezone IANA real: `src/lib/timezone.ts` convierte `datetime-local` ↔ UTC respetando DST.
- **Nada se publica todavía en Meta.** El botón final dice "Revisar y finalizar" y guarda `status: 'draft'`. Esta disciplina se ha mantenido siempre: nunca se ha fingido publicación.

Documento de arquitectura completo (20 secciones), generado antes de implementar:
**https://claude.ai/code/artifact/b3f35d38-0cbd-44e7-8425-db2fb8597330**

---

## 2 · Decisiones de arquitectura ya tomadas por el usuario

1. **Una sola Meta App**, propiedad de Mundo Academy. Los clientes NO crean la suya.
2. **App Review empieza cuanto antes**, en paralelo al desarrollo.
3. **Facebook Page** es parte de la conexión del negocio, NO un campo del builder.
4. **Geo targeting** deberá migrar de nombres locales a entidades reales de Meta (`key` + display name) **antes de publicar**.
5. **Supabase Storage** sigue siendo el origen interno de creativos. En publicación: Supabase → servidor → upload a Meta → `image_hash` / `video_id`.
6. **Cifrado a nivel de aplicación** (AES-256-GCM), no Supabase Vault ni pgcrypto.
7. **Una conexión Meta viva por negocio** (índice único parcial; el histórico se conserva).

---

## 3 · Datos verificados contra documentación oficial de Meta

Verificado en vivo (no de memoria). **Reverificar antes de la Fase E**, la API cambia cada trimestre.

| Dato | Valor verificado |
|---|---|
| Versión Graph API actual | **v26.0** (cada versión vive mínimo 2 años) |
| `ads_management` | Standard para cuentas propias; **Advanced** para terceros |
| `ads_read` | Igual |
| `business_management` | Standard limitado; Advanced para BM completo |
| `pages_show_list` | **Vigente, no deprecado, NO requiere Advanced Access** |
| Token corto | Expira en horas |
| Token largo | **~60 días, NO se auto-refresca** |
| Intercambio | `GET oauth/access_token` con `grant_type=fb_exchange_token`, `client_id`, `client_secret`, `fb_exchange_token`. **Solo server-side** |
| Token caducado | **NO se puede intercambiar** — hay que rehacer login |
| `appsecret_proof` | `hash_hmac('sha256', access_token, app_secret)`. Forzable app-wide en Settings → Advanced → Security |
| Campos AdAccount | `id` (`act_<n>`), `account_id`, `name`, `currency`, `timezone_name`, `account_status` (1 = ACTIVE) |

**Requisito crítico de Advanced Access:** Meta exige mantener **500+ llamadas a la API en los últimos 15 días con <15% de error** antes de conceder Advanced. Standard está descrito como *"heavily rate-limited per ad account. For development only."* → Hay que generar tráfico real en modo desarrollo antes de poder optar.

**No verificado (pendiente):** requisitos exactos de App Review (vídeo, verificación de empresa).

---

## 4 · Estado exacto de la integración

### Fase A — Connection foundation ✅ implementada
### Fase B — OAuth + asset discovery ✅ implementada
### Fase C en adelante — ❌ no empezadas

**El flujo OAuth completo NUNCA se ha ejecutado.** Criptografía, `state` y configuración están probados en aislamiento; el intercambio real con Meta y los 4 edges de discovery solo se validan conectando de verdad.

---

## 5 · Archivos creados (sin commitear)

```
scripts/meta-connections-schema.sql                       migración (YA EJECUTADA en Supabase)
src/lib/meta/crypto.ts                                    AES-256-GCM, rotación de claves
src/lib/meta/connection-types.ts                          contratos + máquina de estados (NO server-only)
src/lib/meta/connections.ts                               CRUD server-only sobre meta_connections
src/lib/meta/config.ts                                    App ID/Secret/versión/scopes/redirect
src/lib/meta/graph.ts                                     metaGraphRequest + createAppSecretProof
src/lib/meta/oauth-state.ts                               state firmado anti-CSRF
src/lib/meta/discovery.ts                                 discovery de activos
src/app/api/meta/oauth/start/route.ts                     inicio OAuth
src/app/api/meta/oauth/callback/route.ts                  callback OAuth
src/app/(dashboard)/mis-negocios/[businessId]/configuraciones/meta-actions.ts       server actions
src/app/(dashboard)/mis-negocios/[businessId]/configuraciones/MetaConnectionPanel.tsx  UI cliente
docs/META-INTEGRATION-HANDOFF.md                          este documento
```

## 6 · Archivos modificados (sin commitear)

```
src/app/(dashboard)/mis-negocios/[businessId]/configuraciones/page.tsx
  → carga getMetaConnectionForBusiness y renderiza <MetaConnectionPanel/>
  → searchParams ampliados con { meta?, meta_error? }
```

## 7 · Cambios AJENOS pendientes en el working tree (NO tocar, NO commitear con Meta)

```
M  src/app/page.tsx
M  src/components/landing/hero.css
M  src/components/landing/public-footer.tsx
?? src/components/landing/editorial.tsx
?? src/components/landing/faq.tsx
?? src/components/landing/features.tsx
?? src/components/landing/marquee.tsx
?? src/components/landing/sections.css
```
Son de la **landing pública**, terminados y aprobados visualmente hace tiempo pero nunca commiteados por decisión del usuario. Mantenerlos fuera de cualquier commit de Meta.

---

## 8 · Schema y migraciones

### `meta_connections` — YA EJECUTADA en Supabase

Archivo: `scripts/meta-connections-schema.sql` (idempotente, re-ejecutable).

Columnas:
```
id uuid PK
business_id uuid NOT NULL FK businesses(id) ON DELETE CASCADE
status text NOT NULL DEFAULT 'connecting'
meta_user_id / meta_business_id / meta_business_name    text
ad_account_id / ad_account_name                          text
ad_account_currency / ad_account_timezone                text   ← la cuenta manda sobre el builder
page_id / page_name                                      text
pixel_id / pixel_name                                    text
token_ciphertext    text        ← v1.<iv>.<authTag>.<ct> base64url
token_key_version   smallint    ← qué clave lo cifró
token_expires_at    timestamptz
scopes              text[] NOT NULL DEFAULT '{}'
last_error          text
connected_at / disconnected_at / created_at / updated_at timestamptz
```

Constraints:
- `meta_connections_status_chk` — status ∈ (connecting, connected, expired, error, disconnected)
- `meta_connections_token_chk` — status='connected' obliga a token_ciphertext NOT NULL
- `meta_connections_keyver_chk` — ciphertext y key_version van juntos o ninguno

Índices:
- `meta_connections_one_live_per_business` — **UNIQUE parcial** `WHERE disconnected_at IS NULL`
- `meta_connections_business_idx`
- `meta_connections_key_version_idx` — parcial, para rotación de claves

Trigger: `meta_connections_touch_updated_at`

**RLS: `ENABLE` + `FORCE` con CERO políticas**, más `REVOKE ALL FROM anon, authenticated`.
En Postgres, RLS sin políticas deniega todo → las claves que puede tener un navegador no leen nada, ni siquiera el ciphertext. Solo el service role accede, y solo desde `src/lib/meta/connections.ts` (marcado `server-only`).
Deliberadamente más estricto que `ad_campaigns`, que sí expone política de propietario.

### Migraciones anteriores relevantes ya aplicadas
- `scripts/ads-campaigns-schema.sql` — tabla `ad_campaigns`
- `ALTER TABLE ad_campaigns ADD COLUMN delivery jsonb NOT NULL DEFAULT '{}'` (manual)
- CHECK de `objective` ampliado con `'engagement'` (manual)

### NO hay migraciones pendientes para Fase C.

---

## 9 · Variables de entorno

### Configuradas en Vercel ✅
```
META_APP_ID
META_APP_SECRET
META_TOKEN_ENCRYPTION_KEY     32 bytes base64 (openssl rand -base64 32)
```

```
NEXT_PUBLIC_APP_URL=https://mundo-academy-platform.vercel.app
```
De aquí se deriva el `redirect_uri`. **Sin esto el OAuth no arranca** (`metaRedirectUri()` lanza `MetaConfigError`).
Ya configurada en Vercel. El dominio no es resoluble desde el repo: no hay `vercel.json`, ni la variable en `.env.local`, ni pistas en README.

### Opcionales
```
META_API_VERSION=v26.0                 # override; por defecto v26.0
META_OAUTH_REDIRECT_URI=...            # solo si local y prod deben divergir
META_TOKEN_ENCRYPTION_KEY_V<n>         # claves retiradas durante rotación
```

### Aviso sobre `.env.local`
Solo contiene claves de Clerk. **Faltan las de Supabase**, por lo que `/descubrir` y cualquier ruta que toque Supabase **fallan en local**. No es un bug introducido; es una carencia de entorno preexistente. Por eso ningún flujo con base de datos se ha podido probar localmente en toda la integración.

---

## 10 · Rutas OAuth y callback exacto

```
GET /api/meta/oauth/start?businessId=<uuid>
GET /api/meta/oauth/callback?code=…&state=…
```

### URL a registrar en Meta (Facebook Login → Settings → Valid OAuth Redirect URIs)

```
Local        http://localhost:3000/api/meta/oauth/callback
Producción   https://mundo-academy-platform.vercel.app/api/meta/oauth/callback
```

**La ruta es exactamente `/api/meta/oauth/callback`.**
La URL de producción ya está registrada en Meta Developers como Valid OAuth Redirect URI.

### Redirecciones de vuelta (nunca llevan nada sensible)
- Éxito → `/mis-negocios/<id>/configuraciones?meta=connected`
- Error → `…?meta_error=<clave>` con clave ∈ `state | session | forbidden | denied | oauth | exchange | save | config`
- Sin state verificado → `/mis-negocios?meta_error=state` (no se puede saber el negocio)

---

## 11 · Scopes finales

```
ads_management, ads_read, business_management, pages_show_list
```
Definidos en `META_SCOPES` (`src/lib/meta/config.ts`). Cuatro, ninguno "por si acaso".
`pages_show_list` se incluye porque **sin Página no hay identidad para el Ad Creative**.

---

## 12 · Seguridad y manejo de tokens

### Cifrado
AES-256-GCM con `node:crypto`. Formato versionado `v1.<iv>.<authTag>.<ciphertext>` en base64url.
- La versión del **formato** va en la cadena; la **clave** usada va en `token_key_version`.
- **Rotación:** mover la clave actual a `META_TOKEN_ENCRYPTION_KEY_V<CURRENT>`, poner la nueva en `META_TOKEN_ENCRYPTION_KEY`, **subir `CURRENT_KEY_VERSION` en `crypto.ts`** y desplegar. Es un cambio de código deliberado y revisable, no una edición invisible de entorno.
- GCM es autenticado: manipular ciphertext, IV o tag lanza error en vez de descifrar basura.

### state anti-CSRF
Payload `{ b: businessId, u: clerkUserId, n: nonce, e: expiry+10min }` firmado con HMAC-SHA256 usando el **App Secret**. Copia idéntica en cookie **HttpOnly** (`ma_meta_oauth_state`, path `/api/meta/oauth`, SameSite=Lax, Secure en producción).
El callback exige que **ambas coincidan** (comparación timing-safe) y que la firma verifique. La cookie se borra al usarse → **anti-replay**.

### Garantías verificadas
| Comprobación | Estado |
|---|---|
| Token en Client Component | ✅ El panel no importa ningún módulo `server-only` |
| Token en props RSC | ✅ `MetaConnection` **no tiene campo de token** por construcción |
| Token en return de server action | ✅ Los tipos no pueden expresarlo |
| App Secret server-only | ✅ Sin `NEXT_PUBLIC_` |
| `server-only` en los 6 módulos de lib/meta | ✅ crypto, connections, graph, config, discovery, oauth-state |
| Ownership en start/callback/discovery/save/disconnect | ✅ Los cinco, vía `getBusinessById(businessId, userId)` |
| Redirect controlado | ✅ Fijo desde env, nunca de la query |
| Secretos en logs | ✅ Ni code, ni token, ni ciphertext, ni la URL de Graph (lleva el token) |

`connection-types.ts` es el único módulo de `lib/meta` **sin** `server-only`: contiene solo tipos y funciones puras, y es el que el cliente importa.

---

## 13 · API server-only disponible

```ts
// src/lib/meta/connections.ts
getMetaConnectionForBusiness(businessId): Promise<MetaConnection | null>
  // Devuelve la conexión viva (disconnected_at IS NULL).
  // Si token_expires_at pasó, la marca 'expired' sola y la devuelve así.
saveMetaConnection(SaveMetaConnectionInput): Promise<MetaConnectionResult>
selectMetaAssets(SelectMetaAssetsInput): Promise<MetaConnectionResult>
disconnectMetaConnection(businessId): Promise<MetaConnectionResult>
setConnectionStatus(businessId, status, lastError?): Promise<MetaConnectionResult>
getMetaAccessToken(businessId): Promise<string | null>   // ⚠️ INTERNA — solo dentro de lib/meta

// src/lib/meta/graph.ts
metaGraphRequest<T>({ path, accessToken, params?, method?, timeoutMs? }): Promise<T>
metaGraphList<T>({ ...igual, maxPages? }): Promise<T[]>
createAppSecretProof(accessToken): string
class MetaGraphError { code, subcode, httpStatus, traceId, retryable }

// src/lib/meta/connection-types.ts  (seguro para cliente)
canTransition(from, to): boolean
connectionReadiness(c): { ready, missing[] }
isTokenExpired(c) / daysUntilExpiry(c)
```

`metaGraphRequest` añade `access_token` y `appsecret_proof` automáticamente, timeout 15s, y convierte errores de Graph en `MetaGraphError` sanitizado. `retryable` es true para 5xx y códigos 4 / 17 / 613 (throttling).

---

## 14 · Máquina de estados de la conexión

```
connecting ──► connected ──► expired ──► (re-auth) ──► connected
     │             │            │
     └──► error ◄──┘            │
     │             │            │
     └────────► disconnected ◄──┘     (terminal; la fila se conserva)
```

`setConnectionStatus` rechaza transiciones no permitidas. `disconnected` es terminal.
`expired` es estado real, no flag calculado, porque el token largo no se auto-refresca y uno caducado no puede intercambiarse.

---

## 15 · Discovery implementado

`discoverMetaAssets(businessId, adAccountId?)` en `src/lib/meta/discovery.ts`.
Cuatro edges distintos (Meta no tiene endpoint único):

| Edge | Campos | Criticidad |
|---|---|---|
| `/me/adaccounts` | `id,account_id,name,currency,timezone_name,account_status` | **Obligatorio** — si falla, aborta |
| `/me/accounts` | `id,name` (Páginas) | Degradación suave |
| `/me/businesses` | `id,name` | Degradación suave |
| `/act_<id>/adspixels` | `id,name` | Solo tras elegir cuenta |

- `account_status === 1` → `usable: true`. Las no activas aparecen deshabilitadas en el selector.
- Código de error **190** de Meta = token inválido/caducado → devuelve `needsReconnect: true`.
- Paginación acotada a 3 páginas × 50.
- Devuelve **solo ids, nombres, currency, timezone y status**. Nunca el token.

---

## 16 · UI implementada

`MetaConnectionPanel.tsx`, montado al final de `/mis-negocios/[businessId]/configuraciones`.
**No se rediseñó el dashboard de Anuncios.**

Cinco estados: **no conectado** (botón Conectar Meta) · **eligiendo activos** (selects de cuenta / página / pixel) · **conectado** (resumen + caducidad + cambiar selección + desconectar) · **caducado** (volver a conectar) · **error** (mensaje limpio).

Detalles: badge de estado con color; aviso ámbar cuando faltan ≤7 días para caducar; el selector de pixel se recarga al cambiar de cuenta; confirmación antes de desconectar.

---

## 17 · Tests y build

Los tests viven en el **scratchpad de la sesión**, NO en el repo. El proyecto **no tiene runner de tests** (sin jest/vitest, sin script `test`). Se ejecutan con `npx tsx <archivo>`.

| Suite | Casos | Cubre |
|---|---|---|
| `tz` | 24 | IANA, DST Madrid/NY verano-invierno, round-trip, zona inválida |
| `hydrate` | 17 | Hidratación de draft, reconstrucción de destino, filas legacy |
| `advanced` | 16 | minimumDailySpend null≠0, dynamicCreative, idiomas, custom audiences |
| `roundtrip` | 14 | delivery/audience sin solape de responsabilidades |
| `creatives` | 17 | Multi-anuncio, legacy plano → 1 anuncio, ids estables |
| `meta-crypto` | 36 | AES-GCM, manipulación detectada, rotación, máquina de estados, expiración |
| `meta-oauth` | 21 | CSRF, tampering de businessId, firma falsa, expiración, appsecret_proof, scopes |

**Total 145 casos, todos PASS.** TypeScript **0 errores**. `npm run build` **✓ Compiled successfully**, con `/api/meta/oauth/start` y `/api/meta/oauth/callback` compiladas.

**Decisión pendiente del usuario:** si quiere estas suites dentro del repo, hay que añadir runner (vitest o script `tsx`). No se hizo por no inventar infraestructura de testing sin criterio suyo.

---

## 18 · Pendientes inmediatos

1. **Commitear Fases A + B.** Nada de Meta está commiteado. Mensaje sugerido: `feat: add meta oauth and asset discovery`. Incluir solo los archivos de las secciones 5 y 6; **excluir la landing**.
2. ~~**Configurar `NEXT_PUBLIC_APP_URL`** en Vercel.~~ ✅ hecho (`https://mundo-academy-platform.vercel.app`).
3. ~~**Registrar el callback** en la Meta App.~~ ✅ hecho para producción; la URL local sigue pendiente de registrar si se quiere probar en `localhost`.
4. **Primera conexión real** — es la primera vez que el flujo se ejecutaría de verdad.
5. **Arrancar App Review** (camino crítico; recuerda el requisito de 500 llamadas/15 días).

## 19 · Fases futuras (del documento de arquitectura)

- **C — Asset discovery**: ya cubierta en gran parte por Fase B. Falta pulir tras probarla en real.
- **D — Targeting real + validación**: buscador geo contra Meta, `key` en vez de nombres, informe "qué falta para publicar". **Debe ir ANTES que E.**
- **E — Publish pipeline**: media → Creative → Ad, todo en `PAUSED`, con idempotencia y reconciliación por nombre.
- **F — Reconciliación**: reparar publicaciones a medias.
- **G — Sync de estado**: webhook + cron.
- **H — Insights**: métricas diarias en tabla propia.

Schema propuesto para E (**no creado todavía**): `meta_campaign_links` (1:1) y `meta_ad_links` (1:N, con UNIQUE `(ad_campaign_id, local_ad_id)` como clave de idempotencia).

---

## 20 · Riesgos conocidos

| Riesgo | Gravedad | Nota |
|---|---|---|
| **App Review lenta o rechazada** | Crítico | Camino crítico. Requiere 500 llamadas/15 días con <15% error antes de Advanced Access |
| **Flujo OAuth nunca ejecutado** | Alto | Prepararse para ajustar algún nombre de campo en la primera conexión real |
| **Geo targeting no publicable** | Alto | Guardamos nombres, Meta exige keys. **Ninguna campaña actual publica sin migrar.** Fase D antes que E |
| **Desajuste de moneda** | Alto | La cuenta manda. Ya se guardan `ad_account_currency/timezone`; falta que el builder los respete |
| **Campañas duplicadas en Meta** | Crítico (Fase E) | Gasta dinero real. Mitigación: lock + índice único + reconciliación por nombre |
| **Revocación remota no implementada** | Medio | Desconectar borra la credencial local pero **no revoca el permiso en Meta**. Existe `DELETE /{user-id}/permissions`; no se implementó por no poder probarlo. La UI lo dice explícitamente al usuario |
| **Falta la Página en campañas antiguas** | Medio | Ya resuelto a nivel de conexión, pero ninguna campaña existente tiene Page asociada |
| **Sin Supabase en `.env.local`** | Medio | Impide probar cualquier flujo con DB en local |
| **Cambios de la API de Meta** | Medio | Versión fija en `config.ts`; actualizar deliberadamente |
| **Límite de 5 MB en imágenes** | Bajo | Heredado de avatares; incoherente frente a 50 MB de vídeo. Afecta a `uploadFile`, compartido con perfiles y productos |

---

## 21 · Siguiente paso exacto

**Commitear Fases A + B.**

```bash
cd /Users/waltercoratella/Documents/mundo-academy-platform

git add scripts/meta-connections-schema.sql \
        src/lib/meta \
        src/app/api/meta \
        "src/app/(dashboard)/mis-negocios/[businessId]/configuraciones/meta-actions.ts" \
        "src/app/(dashboard)/mis-negocios/[businessId]/configuraciones/MetaConnectionPanel.tsx" \
        "src/app/(dashboard)/mis-negocios/[businessId]/configuraciones/page.tsx" \
        docs/META-INTEGRATION-HANDOFF.md

git status --porcelain        # verificar que la landing queda FUERA
npx tsc --noEmit
npm run build
git commit -m "feat: add meta oauth and asset discovery"
git push
```

`NEXT_PUBLIC_APP_URL` y el callback de producción ya están configurados. Después del commit: hacer la primera conexión real. Los errores de esa primera conexión son el input de la siguiente unidad de trabajo.

---

## 22 · Convenciones del proyecto a respetar

- Comentarios y código en **inglés**; UI y mensajes al usuario en **español**.
- Nunca ejecutar SQL automáticamente: entregar el archivo listo para pegar en Supabase SQL Editor.
- Nunca fingir estado (`status = active`) sin integración real.
- Commits acotados: solo los archivos de la unidad en curso.
- Verificar medidas visuales midiendo el DOM, no estimando.
- Server actions siempre re-verifican ownership; el `businessId` del cliente nunca se confía.
