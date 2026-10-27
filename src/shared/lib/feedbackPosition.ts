export const FEEDBACK_PAGE_WIDTH = 423
export const FEEDBACK_PAGE_HEIGHT = 599

export function toFeedbackPosition(value: number, axis: 'x' | 'y') {
  const normalizedValue = value <= 1 ? value : value <= 100 ? value / 100 : value / (axis === 'x' ? FEEDBACK_PAGE_WIDTH : FEEDBACK_PAGE_HEIGHT)
  return `${Math.min(1, Math.max(0, normalizedValue)) * 100}%`
}
