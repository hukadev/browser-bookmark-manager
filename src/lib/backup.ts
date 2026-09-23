import {
  getAutoTagRules,
  getFolderRules,
  saveAutoTagRules,
  saveFolderRules,
  type AutoTagRule,
  type FolderRule,
} from './automation'

const BACKUP_FILE_NAME = 'bookmark-manager-rules-backup.json'
const BACKUP_VERSION = 1

const IDB_NAME = 'bookmark-manager-backup'
const IDB_STORE = 'handles'
const IDB_KEY_FOLDER = 'rulesBackupFolder'

export interface RulesBackup {
  version: number
  exportedAt: string
  autoTagRules: AutoTagRule[]
  folderRules: FolderRule[]
}

function openHandleStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openHandleStore()
  return new Promise((resolve, reject) => {
    const request = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openHandleStore()
  return new Promise((resolve, reject) => {
    const request = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/** Opens a directory picker and remembers the choice for future exports. */
export async function pickBackupFolder(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await idbSet(IDB_KEY_FOLDER, handle)
  return handle
}

/** Returns the remembered folder if one was picked before and permission still holds. */
export async function getRememberedFolder(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await idbGet<FileSystemDirectoryHandle>(IDB_KEY_FOLDER)
  if (!handle) return null
  const permission = await handle.queryPermission({ mode: 'readwrite' })
  if (permission === 'granted') return handle
  if (permission === 'prompt' && (await handle.requestPermission({ mode: 'readwrite' })) === 'granted') return handle
  return null
}

async function buildRulesBackup(): Promise<RulesBackup> {
  const [autoTagRules, folderRules] = await Promise.all([getAutoTagRules(), getFolderRules()])
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), autoTagRules, folderRules }
}

/** Writes the current rules to the given folder, picking one first if none is remembered. */
export async function exportRulesTo(folder: FileSystemDirectoryHandle): Promise<void> {
  const backup = await buildRulesBackup()
  const fileHandle = await folder.getFileHandle(BACKUP_FILE_NAME, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(backup, null, 2))
  await writable.close()
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()]
}

export interface ImportResult {
  autoTagRuleCount: number
  folderRuleCount: number
}

/** Merges rules from a backup file into existing storage; matching ids are overwritten, others are kept. */
export async function importRulesFromFile(file: File): Promise<ImportResult> {
  const parsed = JSON.parse(await file.text()) as Partial<RulesBackup>
  const incomingAutoTagRules = parsed.autoTagRules ?? []
  const incomingFolderRules = parsed.folderRules ?? []

  const [existingAutoTagRules, existingFolderRules] = await Promise.all([getAutoTagRules(), getFolderRules()])
  const mergedAutoTagRules = mergeById(existingAutoTagRules, incomingAutoTagRules)
  const mergedFolderRules = mergeById(existingFolderRules, incomingFolderRules)

  await Promise.all([saveAutoTagRules(mergedAutoTagRules), saveFolderRules(mergedFolderRules)])
  return { autoTagRuleCount: incomingAutoTagRules.length, folderRuleCount: incomingFolderRules.length }
}
