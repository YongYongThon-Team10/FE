import { landmarkPhotos } from '../data/landmarkPhotos'

export type PhotoCredit = {
  author: string
  sourceUrl?: string
  license?: string
  licenseUrl?: string
}
export type ImageFields = {
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageCredit?: PhotoCredit | null
}
export type PlacePhotoData = {
  src: string
  credit?: PhotoCredit
  position?: string
  local?: boolean
}
function cleanCredit(value: unknown): PhotoCredit | undefined {
  if (!value || typeof value !== 'object') return undefined
  const credit = value as Record<string, unknown>
  if (typeof credit.author !== 'string' || credit.author.length > 300)
    return undefined
  return {
    author: credit.author,
    sourceUrl: safeImageUrl(credit.sourceUrl),
    license:
      typeof credit.license === 'string' && credit.license.length < 200
        ? credit.license
        : undefined,
    licenseUrl: safeImageUrl(credit.licenseUrl),
  }
}
export function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 4096) return undefined
  const text = value.trim()
  if (!text) return undefined
  if (
    /^\/(?!\/)/.test(text) &&
    !text.includes('\\') &&
    ![...text].some((char) => char.charCodeAt(0) <= 32)
  )
    return text
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:' || url.username || url.password)
      return undefined
    return url.href
  } catch {
    return undefined
  }
}
export function photoCandidates(
  name: string,
  fields: ImageFields = {},
): PlacePhotoData[] {
  const key = name.replace(/\s/g, '')
  const local = Object.hasOwn(landmarkPhotos, key)
    ? landmarkPhotos[key]
    : undefined
  const urls = [fields.imageUrl, fields.thumbnailUrl]
  return urls
    .flatMap((value) => {
      const src = safeImageUrl(value)
      if (!src) return []
      // Persisted local photos retain their original attribution and focal point.
      return [
        src === local?.src
          ? local
          : { src, credit: cleanCredit(fields.imageCredit) },
      ]
    })
    .concat(local ? [local] : [])
    .filter(
      (photo, index, all) =>
        all.findIndex((p) => p.src === photo.src) === index,
    )
}
