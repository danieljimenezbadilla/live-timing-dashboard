# Live Timing Dashboard

Dashboard moderno tipo pit-wall para visualizar live timing de carreras desde
`https://livetiming.azurewebsites.net`.

Compuesto por:

- **`server/`** — Proxy en Node.js + Express que consulta el live timing,
  normaliza la respuesta (JSON o HTML scraping vía Cheerio) y la expone como
  JSON limpio. Resuelve el problema de CORS y maneja errores con caché.
- **`client/`** — Frontend en React + Vite con tabla de posiciones en tiempo
  real, cards de stats, búsqueda, filtros por clase, líder resaltado,
  diseño oscuro responsivo y refresco automático cada 5 segundos.

## Estructura

```
live-timing-dashboard/
├── server/
│   ├── index.js              # Express + endpoints
│   ├── livetiming-client.js  # Fetch + auto-discovery de endpoints
│   ├── normalizer.js         # JSON / HTML → schema canónico
│   └── package.json
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── styles.css
        ├── hooks/useLiveTiming.js
        └── components/
            ├── StatusBar.jsx
            ├── StatsCards.jsx
            ├── Filters.jsx
            └── LeaderboardTable.jsx
```

## Cómo se obtienen los datos

La URL pública (`/event=50?config=w3` o `/events/50/results`) es un **Single
Page Application**: sólo devuelve un HTML shell vacío y los datos se cargan
después vía JavaScript del lado del cliente, contra un endpoint interno que
no está documentado.

Por eso el backend hace **descubrimiento automático**: prueba una lista de
paths candidatos (`/api/events/{id}`, `/events/{id}/results`,
`/event={id}?config=w3`, etc.), cachea cuál funciona, y normaliza la
respuesta sin importar si vino como JSON o como HTML con tablas.

### Cómo apuntar al endpoint correcto

1. Abre `https://livetiming.azurewebsites.net/event=50?config=w3` en
   Chrome/Firefox.
2. Abre **DevTools → Network** y recarga.
3. Filtra por `XHR` / `Fetch` y observa qué URL devuelve los datos en JSON.
4. Si no está en la lista, añádela al principio de `CANDIDATE_PATHS` en
   `server/livetiming-client.js`.

El normalizador en `server/normalizer.js` ya tolera múltiples convenciones
de naming (`driver` / `driverName` / `pilot`, `gap` / `behind`, etc.), así
que ajustes adicionales suelen ser mínimos.

## Requisitos

- Node.js 18+ (usa `fetch` nativo / `node-fetch` v3 ESM)
- npm 9+

## Instalación

```bash
# 1. Backend
cd server
npm install

# 2. Frontend
cd ../client
npm install
```

## Ejecución (desarrollo)

Abrí dos terminales:

**Terminal 1 — backend:**

```bash
cd server
npm run dev
# → escucha en http://localhost:4000
# → endpoint: http://localhost:4000/api/event/50
```

**Terminal 2 — frontend:**

```bash
cd client
npm run dev
# → http://localhost:5173
```

El `vite.config.js` ya proxea `/api/*` al puerto 4000, así que el frontend
no necesita configurar nada.

## Producción

```bash
cd client
npm run build         # genera client/dist/

cd ../server
npm start             # node index.js
```

Para servir el cliente compilado desde el mismo Express, añade:

```js
app.use(express.static("../client/dist"));
```

## Características

- ✅ Tabla de posiciones con columnas: Pos, #, Estado, Clase, Rank, Piloto, Vueltas, Gap, Última, Mejor, Pits, Vehículo
- ✅ Líder resaltado en cyan con barra lateral luminosa
- ✅ Gap formateado en `+1m 23.456s` para diferencias largas
- ✅ Mejor vuelta general resaltada en morado (estilo "purple sector")
- ✅ Estado de pit/DNF/DNS con pills de colores
- ✅ Animación flash al cambiar la última vuelta
- ✅ Auto-refresh cada 5s con polling cancelable
- ✅ Buscador global (carro, piloto, clase, vehículo, equipo)
- ✅ Filtros por clase como chips (Todas, SP 9, Cup 2, SP-X, etc.)
- ✅ Cards superiores: Líder, Vueltas del líder, Mejor vuelta general, Carros en pista, Tiempo restante
- ✅ Indicador "Actualizado hace Ns" en vivo
- ✅ Modo caché si la fuente falla (no pierde la última vista válida)
- ✅ Cambio de evento ID desde la barra superior
- ✅ Diseño responsive desktop / tablet / móvil
- ✅ Tema oscuro motorsport con tipografía Rajdhani + JetBrains Mono

## Manejo de errores

| Situación                             | Comportamiento                                      |
|---------------------------------------|-----------------------------------------------------|
| Upstream caído, primera carga         | Banner rojo con botón "Reintentar"                  |
| Upstream caído, hay datos previos     | Banner amarillo "Datos en caché" + pill `STALE`     |
| Faltan columnas en la respuesta       | Se muestra `—` y la fila se renderiza igual         |
| Polling en curso al cambiar de evento | `AbortController` cancela el request en vuelo       |
| Carrera sin clases                    | Chip "Todas" único, no se rompe el filtro           |

## Notas

- El backend cachea internamente cada respuesta por 2 segundos para evitar
  saturar la fuente si abrís varias pestañas.
- El intervalo de refresco del cliente (5s) está en
  `App.jsx` → `useLiveTiming(eventId, 5000)`. Bajalo si el upstream lo
  permite.
- Para producción detrás de un dominio público, considerá rate-limiting
  (`express-rate-limit`) y un caché compartido (Redis) si vas a tener
  muchos espectadores.
