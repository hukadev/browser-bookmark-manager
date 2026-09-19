import { afterEach, describe, expect, it, vi } from 'vitest'
import { OPEN_SEARCH_COMMAND, SESSION_KEY_OPEN_ON_SEARCH } from '../src/shared/constants'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

function stubChrome(overrides: {
  set?: ReturnType<typeof vi.fn>
  openPopup?: ReturnType<typeof vi.fn>
  setBadgeText?: ReturnType<typeof vi.fn>
  setBadgeBackgroundColor?: ReturnType<typeof vi.fn>
  getTree?: ReturnType<typeof vi.fn>
  query?: ReturnType<typeof vi.fn>
  onActivatedAddListener?: ReturnType<typeof vi.fn>
  onUpdatedAddListener?: ReturnType<typeof vi.fn>
  onTabCreatedAddListener?: ReturnType<typeof vi.fn>
  onCreatedAddListener?: ReturnType<typeof vi.fn>
  onRemovedAddListener?: ReturnType<typeof vi.fn>
  onChangedAddListener?: ReturnType<typeof vi.fn>
} = {}) {
  vi.stubGlobal('chrome', {
    commands: { onCommand: { addListener: vi.fn() } },
    storage: { session: { set: overrides.set ?? vi.fn() } },
    action: {
      openPopup: overrides.openPopup ?? vi.fn(),
      setBadgeText: overrides.setBadgeText ?? vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: overrides.setBadgeBackgroundColor ?? vi.fn().mockResolvedValue(undefined),
    },
    tabs: {
      onActivated: { addListener: overrides.onActivatedAddListener ?? vi.fn() },
      onUpdated: { addListener: overrides.onUpdatedAddListener ?? vi.fn() },
      onCreated: { addListener: overrides.onTabCreatedAddListener ?? vi.fn() },
      query: overrides.query ?? vi.fn().mockResolvedValue([]),
      get: vi.fn(),
    },
    bookmarks: {
      getTree: overrides.getTree ?? vi.fn().mockResolvedValue([]),
      onCreated: { addListener: overrides.onCreatedAddListener ?? vi.fn() },
      onRemoved: { addListener: overrides.onRemovedAddListener ?? vi.fn() },
      onChanged: { addListener: overrides.onChangedAddListener ?? vi.fn() },
    },
  })
}

describe('service-worker command handling', () => {
  it('writes the open-on-search flag then opens the popup for the search shortcut', async () => {
    const set = vi.fn().mockResolvedValue(undefined)
    const openPopup = vi.fn().mockResolvedValue(undefined)
    stubChrome({ set, openPopup })

    const { handleCommand } = await import('../src/background/service-worker')
    await handleCommand(OPEN_SEARCH_COMMAND)

    expect(set).toHaveBeenCalledWith({ [SESSION_KEY_OPEN_ON_SEARCH]: true })
    expect(openPopup).toHaveBeenCalledOnce()
  })

  it('ignores commands other than open-search', async () => {
    const set = vi.fn()
    const openPopup = vi.fn()
    stubChrome({ set, openPopup })

    const { handleCommand } = await import('../src/background/service-worker')
    await handleCommand('some-other-command')

    expect(set).not.toHaveBeenCalled()
    expect(openPopup).not.toHaveBeenCalled()
  })

  it('registers handleCommand as the onCommand listener', async () => {
    const addListener = vi.fn()
    vi.stubGlobal('chrome', {
      commands: { onCommand: { addListener } },
      storage: { session: { set: vi.fn() } },
      action: { openPopup: vi.fn(), setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn() },
      tabs: {
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
        onCreated: { addListener: vi.fn() },
        query: vi.fn(),
        get: vi.fn(),
      },
      bookmarks: {
        getTree: vi.fn().mockResolvedValue([]),
        onCreated: { addListener: vi.fn() },
        onRemoved: { addListener: vi.fn() },
        onChanged: { addListener: vi.fn() },
      },
    })

    const { handleCommand } = await import('../src/background/service-worker')

    expect(addListener).toHaveBeenCalledWith(handleCommand)
  })
})

describe('service-worker listener registration', () => {
  it('registers tab-watching and bookmark-watching listeners', async () => {
    const onActivatedAddListener = vi.fn()
    const onUpdatedAddListener = vi.fn()
    const onTabCreatedAddListener = vi.fn()
    const onCreatedAddListener = vi.fn()
    const onRemovedAddListener = vi.fn()
    const onChangedAddListener = vi.fn()
    stubChrome({
      onActivatedAddListener,
      onUpdatedAddListener,
      onTabCreatedAddListener,
      onCreatedAddListener,
      onRemovedAddListener,
      onChangedAddListener,
    })

    await import('../src/background/service-worker')

    expect(onActivatedAddListener).toHaveBeenCalledOnce()
    expect(onUpdatedAddListener).toHaveBeenCalledOnce()
    expect(onTabCreatedAddListener).toHaveBeenCalledOnce()
    expect(onCreatedAddListener).toHaveBeenCalledOnce()
    expect(onRemovedAddListener).toHaveBeenCalledOnce()
    expect(onChangedAddListener).toHaveBeenCalledOnce()
  })
})

describe('service-worker badge listeners', () => {
  it('sets the badge immediately when a new tab is created with a known url', async () => {
    const setBadgeText = vi.fn().mockResolvedValue(undefined)
    const getTree = vi.fn().mockResolvedValue([{ id: '1', title: 'x', url: 'https://example.com' }])
    let onTabCreated: ((tab: { id?: number; url?: string }) => void) | undefined
    stubChrome({
      setBadgeText,
      getTree,
      onTabCreatedAddListener: vi.fn((listener) => {
        onTabCreated = listener
      }),
    })

    await import('../src/background/service-worker')
    onTabCreated?.({ id: 3, url: 'https://example.com' })
    await Promise.resolve()

    expect(setBadgeText).toHaveBeenCalledWith({ tabId: 3, text: '✓' })
  })

  it('falls back to the tab url on status complete when changeInfo has no url', async () => {
    const setBadgeText = vi.fn().mockResolvedValue(undefined)
    const getTree = vi.fn().mockResolvedValue([{ id: '1', title: 'x', url: 'https://example.com' }])
    let onUpdated: ((tabId: number, changeInfo: { url?: string; status?: string }, tab: { url?: string }) => void) | undefined
    stubChrome({
      setBadgeText,
      getTree,
      onUpdatedAddListener: vi.fn((listener) => {
        onUpdated = listener
      }),
    })

    await import('../src/background/service-worker')
    onUpdated?.(5, { status: 'complete' }, { url: 'https://example.com' })
    await Promise.resolve()

    expect(setBadgeText).toHaveBeenCalledWith({ tabId: 5, text: '✓' })
  })
})
