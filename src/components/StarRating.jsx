import { useState } from 'react'

export default function StarRating({ value = 0, onChange, max = 5, readonly = false, size = '' }) {
  const [hover, setHover] = useState(0)

  return (
    <div className={`star-rating ${readonly ? 'readonly' : ''} ${size}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <span
          key={star}
          className={`star ${star <= (hover || value) ? 'filled' : ''}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  )
}
