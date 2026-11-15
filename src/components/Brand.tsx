import { SERVICE_NAME } from '@/config/brand'
import type { CSSProperties } from 'react'
import type { Category, Companion } from '@/domain/models'

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <img
      className={large ? 'brand-large' : 'brand'}
      src={
        large ? '/figma/onboarding-imgGroup3.svg' : '/figma/home-imgGroup4.svg'
      }
      alt={SERVICE_NAME}
    />
  )
}
export function CategoryIcon({
  category,
  size = 24,
}: {
  category: Category
  size?: number
}) {
  const offsets = {
    park: -19.19,
    food: -112.21,
    cafe: -209.59,
    culture: -308.72,
    sports: -413.95,
    shopping: -518.6,
  }
  return (
    <span
      className="sprite"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src="/figma/home-img1.png"
        alt=""
        style={{
          width: '631.1%',
          height: '210.47%',
          left: `${offsets[category]}%`,
          top: '-56.1%',
        }}
      />
    </span>
  )
}
export function CompanionIcon({ companion }: { companion: Companion }) {
  const offsets: Record<Companion, [number, number, number, number]> = {
    혼자: [609.52, 203.17, -45.24, -86.9],
    아이와: [568.89, 189.63, -165.56, -78.89],
    연인과: [512, 170.67, -255, -68],
    친구와: [441.38, 154.87, -317.24, -64.16],
    가족과: [568.89, 189.63, -165.56, -78.89],
  }
  const [width, height, left, top] = offsets[companion]
  return (
    <span className="sprite companion-icon" aria-hidden="true">
      <img
        src="/figma/home-img2.png"
        alt=""
        style={
          {
            width: `${width}%`,
            height: `${height}%`,
            left: `${left}%`,
            top: `${top}%`,
          } as CSSProperties
        }
      />
    </span>
  )
}
export function FilterIcon({ type }: { type: 'date' | 'location' | 'people' }) {
  return (
    <span className="sprite filter-icon" aria-hidden="true">
      <img
        src="/figma/home-imgImage10.png"
        alt=""
        style={{
          width: '988.64%',
          height: '402.78%',
          left: type === 'people' ? '-435.84%' : '-444.32%',
          top: { date: '-22.22%', location: '-214.2%', people: '-301.8%' }[
            type
          ],
        }}
      />
    </span>
  )
}
export function NavIcon({
  name,
  active = false,
}: {
  name: 'search' | 'heart' | 'flow' | 'my'
  active?: boolean
}) {
  if (name === 'my')
    return (
      <img
        className={`nav-icon my-nav-icon ${active ? 'selected' : ''}`}
        src="/figma/current-saved-empty-imgGroup8.svg"
        alt=""
      />
    )
  const file =
    name === 'heart' && active
      ? 'saved-imgHeart'
      : name === 'flow' && active
        ? 'guide-imgFlow'
        : name === 'search' && !active
          ? 'saved-imgSearch'
          : `home-img${name[0].toUpperCase()}${name.slice(1)}`
  return <img className="nav-icon" src={`/figma/${file}.svg`} alt="" />
}
