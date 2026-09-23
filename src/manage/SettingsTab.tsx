import { useRef, useState } from 'react'
import { Button } from '../components/Button'
import {
  exportRulesTo,
  getRememberedFolder,
  importRulesFromFile,
  pickBackupFolder,
  type ImportResult,
} from '../lib/backup'
import { cardBodyClass, cardClass } from '../lib/ui-classes'

export function SettingsTab() {
  const [folderName, setFolderName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function saveBackup() {
    setSaving(true)
    setSaveMessage('')
    try {
      const folder = (await getRememberedFolder()) ?? (await pickBackupFolder())
      setFolderName(folder.name)
      await exportRulesTo(folder)
      setSaveMessage(`Saved bookmark-manager-rules-backup.json to "${folder.name}".`)
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setSaveMessage('Could not save backup.')
    } finally {
      setSaving(false)
    }
  }

  async function chooseFolder() {
    try {
      const folder = await pickBackupFolder()
      setFolderName(folder.name)
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') setSaveMessage('Could not access that folder.')
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    setImportMessage('')
    try {
      const result: ImportResult = await importRulesFromFile(file)
      setImportMessage(`Merged ${result.autoTagRuleCount} auto-tag rule(s) and ${result.folderRuleCount} folder rule(s).`)
    } catch {
      setImportMessage('Could not read that backup file.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={cardClass}>
        <div className={cardBodyClass}>
          <h3 className="font-bold text-lg">Backup Automation Rules</h3>
          <p className="text-sm opacity-60">
            Save your auto-tagging and folder rules as JSON into a local folder — point it at your Dropbox or Google
            Drive desktop-sync folder to keep a synced backup, no account sign-in needed. Bookmarks themselves are
            covered by Chrome's own bookmark import/export.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="primary" onClick={saveBackup} disabled={saving}>
              {saving ? 'Saving…' : 'Save Backup'}
            </Button>
            <Button variant="outline" onClick={chooseFolder}>
              {folderName ? 'Change Folder' : 'Choose Folder'}
            </Button>
            {folderName && <span className="text-sm opacity-60">Folder: {folderName}</span>}
          </div>
          {saveMessage && (
            <p role="status" className="text-sm mt-2">
              {saveMessage}
            </p>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <div className={cardBodyClass}>
          <h3 className="font-bold text-lg">Restore Automation Rules</h3>
          <p className="text-sm opacity-60">
            Pick a backup JSON file to merge its rules into your current ones. Existing rules with matching ids are
            updated; everything else is kept as-is.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? 'Restoring…' : 'Restore from File'}
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
          </div>
          {importMessage && (
            <p role="status" className="text-sm mt-2">
              {importMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
