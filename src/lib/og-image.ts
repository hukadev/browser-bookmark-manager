import { LOCAL_KEY_OG_IMAGE_CACHE } from '../shared/constants'

type OgImageCache = Record<string, string | null>

let cachePromise: Promise<OgImageCache> | null = null
const inFlight = new Map<string, Promise<string | null>>()

function loadCache(): Promise<OgImageCache> {
  if (!cachePromise) {
    cachePromise = chrome.storage.local
      .get(LOCAL_KEY_OG_IMAGE_CACHE)
      .then((result) => result[LOCAL_KEY_OG_IMAGE_CACHE] ?? {})
  }
  return cachePromise
}

async function saveCacheEntry(url: string, image: string | null): Promise<void> {
  const cache = await loadCache()
  cache[url] = image
  await chrome.storage.local.set({ [LOCAL_KEY_OG_IMAGE_CACHE]: cache })
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const content =
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
      doc.querySelector('meta[name="og:image"]')?.getAttribute('content')
    if (!content) return null
    return new URL(content, url).toString()
  } catch {
    return null
  }
}

/** Resolves a page's og:image URL, backed by a persisted chrome.storage.local cache keyed by page URL. */
export async function getOgImage(url: string): Promise<string | null> {
  const cache = await loadCache()
  if (url in cache) return cache[url]

  let promise = inFlight.get(url)
  if (!promise) {
    promise = fetchOgImage(url).then(async (image) => {
      await saveCacheEntry(url, image)
      inFlight.delete(url)
      return image
    })
    inFlight.set(url, promise)
  }
  return promise
}
