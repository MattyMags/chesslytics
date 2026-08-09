const DB_NAME = 'chesslytics'
const DB_VERSION = 1
const GAMES_STORE = 'games'
const META_STORE = 'meta'

export interface CacheMeta {
  username: string
  gameCount: number
  latestCreatedAt: number | null
  lastSyncedAt: number
}

interface StoredGame {
  key: string
  username: string
  game: unknown
}

function gameKey(username: string, gameId: string): string {
  return `${username.toLowerCase()}:${gameId}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error('Failed to open cache'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(GAMES_STORE)) {
        const store = db.createObjectStore(GAMES_STORE, { keyPath: 'key' })
        store.createIndex('username', 'username', { unique: false })
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'username' })
      }
    }
  })
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        const request = fn(store)

        tx.oncomplete = () => {
          db.close()
          resolve(request?.result)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('Cache transaction failed'))
        }
      }),
  )
}

export async function getCacheMeta(username: string): Promise<CacheMeta | null> {
  const key = username.toLowerCase()
  const result = await runTransaction<CacheMeta>(META_STORE, 'readonly', (store) =>
    store.get(key),
  )
  return (result as CacheMeta | undefined) ?? null
}

export async function getCachedGames<T extends { id: string; createdAt: number }>(
  username: string,
): Promise<T[]> {
  const key = username.toLowerCase()

  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(GAMES_STORE, 'readonly')
        const store = tx.objectStore(GAMES_STORE)
        const index = store.index('username')
        const request = index.getAll(key)

        request.onsuccess = () => {
          const rows = (request.result as StoredGame[]) ?? []
          const games = rows
            .map((row) => row.game as T)
            .sort((a, b) => a.createdAt - b.createdAt)
          db.close()
          resolve(games)
        }

        request.onerror = () => {
          db.close()
          reject(request.error ?? new Error('Failed to read cached games'))
        }
      }),
  )
}

export async function saveCachedGames<T extends { id: string; createdAt: number }>(
  username: string,
  games: T[],
): Promise<CacheMeta> {
  const normalized = username.toLowerCase()
  const latestCreatedAt =
    games.length > 0 ? Math.max(...games.map((game) => game.createdAt)) : null

  const meta: CacheMeta = {
    username: normalized,
    gameCount: games.length,
    latestCreatedAt,
    lastSyncedAt: Date.now(),
  }

  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction([GAMES_STORE, META_STORE], 'readwrite')
        const gamesStore = tx.objectStore(GAMES_STORE)
        const metaStore = tx.objectStore(META_STORE)
        const index = gamesStore.index('username')
        const clearRequest = index.getAllKeys(normalized)

        clearRequest.onsuccess = () => {
          for (const key of clearRequest.result as string[]) {
            gamesStore.delete(key)
          }

          for (const game of games) {
            gamesStore.put({
              key: gameKey(normalized, game.id),
              username: normalized,
              game,
            })
          }

          metaStore.put(meta)
        }

        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('Failed to write cache'))
        }
      }),
  )

  return meta
}

export async function clearCachedGames(username: string): Promise<void> {
  await saveCachedGames(username, [])
}

export async function exportCachedGamesNdjson(username: string): Promise<string> {
  const games = await getCachedGames<{ id: string; createdAt: number }>(username)
  return games.map((game) => JSON.stringify(game)).join('\n')
}

export async function importCachedGamesNdjson<T extends { id: string; createdAt: number }>(
  username: string,
  ndjson: string,
): Promise<CacheMeta> {
  const games = ndjson
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)

  return saveCachedGames(username, games)
}
