import { useState } from 'react'
import { photoCandidates, safeImageUrl } from '@/domain/images'
import type { ImageFields } from '@/domain/images'

export function PlacePhoto({
  name,
  image,
  className = '',
  placeholder = false,
}: {
  name: string
  image?: ImageFields
  className?: string
  placeholder?: boolean
}) {
  const [failed, setFailed] = useState<string[]>([])
  const photo = photoCandidates(name, image).find(
    (candidate) => !failed.includes(candidate.src),
  )
  if (!photo)
    return placeholder ? (
      <div
        className={`photo-placeholder ${className}`}
        role="img"
        aria-label={`${name} 사진 준비 중`}
      >
        사진 준비 중
      </div>
    ) : null
  const credit = photo.credit
  const source = safeImageUrl(credit?.sourceUrl)
  const license = safeImageUrl(credit?.licenseUrl)
  return (
    <figure className={`place-photo ${className}`}>
      <img
        src={photo.src}
        alt={`${name} 대표 사진`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        width="960"
        height="640"
        style={{ objectPosition: photo.position }}
        onError={() => setFailed((previous) => [...previous, photo.src])}
      />
      {credit && (
        <figcaption className="photo-credit">
          사진:{' '}
          {source ? (
            <a href={source} target="_blank" rel="noopener noreferrer">
              {credit.author}
            </a>
          ) : (
            credit.author
          )}
          {credit.license && (
            <>
              {' '}
              /{' '}
              {license ? (
                <a href={license} target="_blank" rel="noopener noreferrer">
                  {credit.license}
                </a>
              ) : (
                credit.license
              )}
            </>
          )}
          {photo.local && <span> / 크기 및 형식 변경, 화면 크롭</span>}
        </figcaption>
      )}
    </figure>
  )
}
