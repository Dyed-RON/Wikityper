import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchIntro, normalizeText, searchWikipedia } from './wikipedia'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

function articleResponse(extract: string, pageprops?: object) {
  return {
    query: {
      pages: [
        {
          extract,
          ...(pageprops ? { pageprops } : {}),
        },
      ],
    },
  }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('searchWikipedia', () => {
  it('uses the OpenSearch API parameters and returns article titles', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(['alan tur', ['Alan Turing', 'Alan Turing (film)'], [], []]),
    )

    await expect(searchWikipedia(' alan tur ', new AbortController().signal)).resolves.toEqual([
      'Alan Turing',
      'Alan Turing (film)',
    ])

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requestUrl.origin).toBe('https://en.wikipedia.org')
    expect(requestUrl.pathname).toBe('/w/api.php')
    expect(requestUrl.searchParams.get('action')).toBe('opensearch')
    expect(requestUrl.searchParams.get('search')).toBe('alan tur')
    expect(requestUrl.searchParams.get('limit')).toBe('8')
    expect(requestUrl.searchParams.get('namespace')).toBe('0')
    expect(requestUrl.searchParams.get('format')).toBe('json')
    expect(requestUrl.searchParams.get('origin')).toBe('*')
  })

  it('does not request suggestions for a blank query', async () => {
    await expect(searchWikipedia('  ', new AbortController().signal)).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports unsuccessful responses and malformed payloads', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 503))
    await expect(
      searchWikipedia('topic', new AbortController().signal),
    ).rejects.toThrow('HTTP 503')

    fetchMock.mockResolvedValueOnce(jsonResponse(['topic', [1], [], []]))
    await expect(
      searchWikipedia('topic', new AbortController().signal),
    ).rejects.toThrow('unexpected search response')
  })
})

describe('fetchIntro', () => {
  it('fetches the plain-text article intro with redirects and CORS enabled', async () => {
    const intro = 'A'.repeat(220)
    fetchMock.mockResolvedValue(jsonResponse(articleResponse(intro)))

    await expect(fetchIntro('Alan Turing')).resolves.toBe(intro)

    const requestUrl = new URL(String(fetchMock.mock.calls[0][0]))
    expect(requestUrl.searchParams.get('action')).toBe('query')
    expect(requestUrl.searchParams.get('prop')).toBe('extracts|pageprops')
    expect(requestUrl.searchParams.get('exintro')).toBe('1')
    expect(requestUrl.searchParams.get('explaintext')).toBe('1')
    expect(requestUrl.searchParams.get('redirects')).toBe('1')
    expect(requestUrl.searchParams.get('titles')).toBe('Alan Turing')
    expect(requestUrl.searchParams.get('formatversion')).toBe('2')
    expect(requestUrl.searchParams.get('origin')).toBe('*')
  })

  it('falls back to a full extract, capped at about 1200 normalized characters', async () => {
    const fullText = 'A'.repeat(1400)
    fetchMock
      .mockResolvedValueOnce(jsonResponse(articleResponse('Short intro.')))
      .mockResolvedValueOnce(jsonResponse(articleResponse(fullText)))

    const result = await fetchIntro('Short article')

    expect(result).toHaveLength(1200)
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.has('exintro')).toBe(
      false,
    )
  })

  it('rejects missing and disambiguation pages with readable errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ query: { pages: [{ missing: true }] } }),
    )
    await expect(fetchIntro('Missing')).rejects.toThrow('could not be found')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(articleResponse('Some text', { disambiguation: '' })),
    )
    await expect(fetchIntro('Mercury')).rejects.toThrow('multiple meanings')
  })

  it('rejects articles that remain too short after the full-text fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(articleResponse('Short')))
      .mockResolvedValueOnce(jsonResponse(articleResponse('Still short')))

    await expect(fetchIntro('Short page')).rejects.toThrow('not have enough text')
  })
})

describe('normalizeText', () => {
  it('normalizes keyboard punctuation, citations, pronunciation, and whitespace', () => {
    expect(
      normalizeText(
        '“Café” — ‘rock’n’roll’… [1]\u00a0test (音声) \n  end.',
      ),
    ).toBe(`"Cafe" - 'rock'n'roll'... test end.`)
  })

  it('transliterates common latin characters and removes other untypeable symbols', () => {
    expect(normalizeText('Æsir, Straße, Þing, Łódź, 😀')).toBe(
      'AEsir, Strasse, Thing, Lodz,',
    )
  })

  it('collapses and trims all whitespace', () => {
    expect(normalizeText('  first\n\nsecond\tword  ')).toBe('first second word')
  })
})
