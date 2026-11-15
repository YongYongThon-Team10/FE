import type { Filters as FiltersType } from '@/domain/models'
import {
  categories,
  categoryNames,
  companions,
  emptyFilters,
} from '@/domain/models'
import { useApp } from '@/state/context'
import { Calendar } from './Calendar'
import { CategoryIcon, CompanionIcon, FilterIcon } from './Brand'

export function FilterPanel({ compact = false }: { compact?: boolean }) {
  const { filters, setFilters, data } = useApp()
  const toggle = <K extends 'categories' | 'districts' | 'companions'>(
    key: K,
    value: FiltersType[K][number],
  ) => {
    const previous = filters[key] as string[]
    setFilters({
      ...filters,
      [key]: previous.includes(value)
        ? previous.filter((v) => v !== value)
        : [...previous, value],
    })
  }
  return (
    <section
      className={`filter-panel ${compact ? 'compact' : ''}`}
      aria-label="검색 조건"
    >
      <div className="row between">
        <span className="blue small">필터 검색</span>
        <button
          type="button"
          className="text-button tiny"
          onClick={() => setFilters(emptyFilters)}
        >
          초기화
        </button>
      </div>
      <div className="categories">
        {categories.map((c) => (
          <button
            type="button"
            key={c}
            className={`category-button ${filters.categories.includes(c) ? 'active' : ''}`}
            aria-pressed={filters.categories.includes(c)}
            onClick={() => toggle('categories', c)}
          >
            <CategoryIcon category={c} size={40} />
            <span>{categoryNames[c]}</span>
          </button>
        ))}
      </div>
      <div className="filter-label">
        언제 <FilterIcon type="date" />
      </div>
      <Calendar
        selected={filters.date}
        events={data?.events}
        onSelect={(date) => setFilters({ ...filters, date, until: '' })}
      />
      <div className="filter-label">
        지역 <FilterIcon type="location" />
      </div>
      <div className="chips">
        {['처인구', '수지구', '기흥구'].map((d) => (
          <button
            type="button"
            className={`chip ${filters.districts.includes(d) ? 'active' : ''}`}
            key={d}
            aria-pressed={filters.districts.includes(d)}
            onClick={() => toggle('districts', d)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="filter-label">
        누구와 <FilterIcon type="people" />
      </div>
      <div className="chips">
        {companions.map((c) => (
          <button
            type="button"
            className={`chip companion-chip ${filters.companions.includes(c) ? 'active' : ''}`}
            key={c}
            aria-pressed={filters.companions.includes(c)}
            onClick={() => toggle('companions', c)}
          >
            <CompanionIcon companion={c} />
            {c}
          </button>
        ))}
      </div>
      <div className="filter-label">예산 · 공간</div>
      <div className="chips">
        <button
          type="button"
          className={`chip ${filters.freeOnly ? 'active' : ''}`}
          aria-pressed={filters.freeOnly}
          onClick={() =>
            setFilters({ ...filters, freeOnly: !filters.freeOnly })
          }
        >
          무료만
        </button>
        {(['indoor', 'outdoor'] as const).map((v) => (
          <button
            type="button"
            key={v}
            className={`chip ${filters.environment === v ? 'active' : ''}`}
            aria-pressed={filters.environment === v}
            onClick={() =>
              setFilters({
                ...filters,
                environment: filters.environment === v ? '' : v,
              })
            }
          >
            {v === 'indoor' ? '실내' : '야외'}
          </button>
        ))}
      </div>
      {filters.maxDuration && (
        <button
          type="button"
          className="chip active"
          onClick={() => setFilters({ ...filters, maxDuration: null })}
        >
          최대 {filters.maxDuration}분 ×
        </button>
      )}
      {filters.until && (
        <p className="small blue">
          기간: {filters.date} ~ {filters.until}
        </p>
      )}
    </section>
  )
}
