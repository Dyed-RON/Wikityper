const API_ENDPOINT = 'https://en.wikipedia.org/w/api.php'
const MIN_INTRO_LENGTH = 200
const MAX_FALLBACK_LENGTH = 1200
const MAX_TYPING_PASSAGE_LENGTH = 12000

type JsonRecord = Record<string, unknown>

const transliterations: Record<string, string> = {
  Æ: 'AE',
  æ: 'ae',
  Ð: 'D',
  ð: 'd',
  Ø: 'O',
  ø: 'o',
  ß: 'ss',
  Þ: 'Th',
  þ: 'th',
  Œ: 'OE',
  œ: 'oe',
  Ł: 'L',
  ł: 'l',
  ı: 'i',
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function fetchJson(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<unknown> {
  const url = new URL(API_ENDPOINT)
  url.search = params.toString()

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Wikipedia request failed (HTTP ${response.status}).`)
  }

  return response.json()
}

export async function searchWikipedia(
  query: string,
  signal: AbortSignal,
): Promise<string[]> {
  const search = query.trim()
  if (!search) return []

  const params = new URLSearchParams({
    action: 'opensearch',
    search,
    limit: '8',
    namespace: '0',
    format: 'json',
    origin: '*',
  })
  const payload = await fetchJson(params, signal)

  if (!Array.isArray(payload) || !Array.isArray(payload[1])) {
    throw new Error('Wikipedia returned an unexpected search response.')
  }

  const titles: string[] = []
  const rawTitles: unknown[] = payload[1]
  for (const title of rawTitles) {
    if (typeof title !== 'string') {
      throw new Error('Wikipedia returned an unexpected search response.')
    }
    titles.push(title)
  }

  return titles
}

async function fetchExtract(
  title: string,
  includeFullPage: boolean,
  signal?: AbortSignal,
  maxCharacters?: number,
): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'extracts|pageprops',
    explaintext: '1',
    redirects: '1',
    titles: title,
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  if (!includeFullPage) params.set('exintro', '1')
  if (maxCharacters !== undefined) {
    params.set('exchars', String(maxCharacters))
  }

  const payload = await fetchJson(params, signal)
  if (!isRecord(payload) || !isRecord(payload.query)) {
    throw new Error('Wikipedia returned an unexpected article response.')
  }

  const pages = payload.query.pages
  if (!Array.isArray(pages) || !isRecord(pages[0])) {
    throw new Error('This Wikipedia article could not be found.')
  }

  const page = pages[0]
  if ('missing' in page) {
    throw new Error('This Wikipedia article could not be found.')
  }

  if (isRecord(page.pageprops) && 'disambiguation' in page.pageprops) {
    throw new Error(
      'This topic has multiple meanings. Try a more specific search.',
    )
  }

  if (typeof page.extract !== 'string') {
    throw new Error('This Wikipedia article has no introductory text.')
  }

  return page.extract
}

export async function fetchIntro(
  title: string,
  signal?: AbortSignal,
): Promise<string> {
  const intro = await fetchExtract(title, false, signal)
  if (normalizeText(intro).length >= MIN_INTRO_LENGTH) return intro

  const fullExtract = await fetchExtract(title, true, signal)
  const normalizedFullExtract = normalizeText(fullExtract)
  if (normalizedFullExtract.length < MIN_INTRO_LENGTH) {
    throw new Error('This article does not have enough text for a typing test.')
  }

  return normalizedFullExtract.slice(0, MAX_FALLBACK_LENGTH)
}

export async function fetchTypingPassage(
  title: string,
  signal?: AbortSignal,
): Promise<string> {
  const extract = await fetchExtract(
    title,
    true,
    signal,
    MAX_TYPING_PASSAGE_LENGTH,
  )
  const passage = normalizeText(extract)

  if (passage.length < MIN_INTRO_LENGTH) {
    throw new Error('This article does not have enough text for a typing test.')
  }

  return passage.slice(0, MAX_TYPING_PASSAGE_LENGTH)
}

export function normalizeText(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[  ]/g, ' ')
    .replace(/…/g, '...')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\([^)]*\)/g, (parenthetical) =>
      Array.from(parenthetical).some(
        (character) => character.charCodeAt(0) > 0x7f,
      )
        ? ''
        : parenthetical,
    )
    .replace(/[ÆæÐðØøßÞþŒœŁłı]/g, (character) => transliterations[character])
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s\S]/g, (character) => {
      const code = character.charCodeAt(0)
      return code >= 0x20 && code <= 0x7e ? character : ''
    })
    .replace(/\s+/g, ' ')
    .trim()
}
