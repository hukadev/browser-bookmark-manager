import { describe, expect, it } from 'vitest'
import manifest from '../public/manifest.json'

describe('manifest.json', () => {
  it('declares Manifest V3', () => {
    expect(manifest.manifest_version).toBe(3)
  })

  it('requests only bookmarks, storage, activeTab, tabs, and favicon permissions', () => {
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['bookmarks', 'storage', 'activeTab', 'tabs', 'favicon']),
    )
    expect(manifest.permissions).toHaveLength(5)
  })

  it('defines a default popup and a background service worker', () => {
    expect(manifest.action?.default_popup).toBe('popup.html')
    expect(manifest.background?.service_worker).toBe('service-worker.js')
    expect(manifest.background?.type).toBe('module')
  })

  it('declares the Cmd/Ctrl+Shift+P open-search command', () => {
    const command = manifest.commands?.['open-search']
    expect(command?.suggested_key?.default).toBe('Ctrl+Shift+P')
    expect(command?.suggested_key?.mac).toBe('Command+Shift+P')
  })
})
