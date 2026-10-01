// 預設分類（內建、不能刪，但使用者可以在設定頁加自訂分類）
export const DEFAULT_CATEGORIES = [
  { key: 'food', label: '餐飲', icon: '🍚' },
  { key: 'transport', label: '交通', icon: '🚗' },
  { key: 'shopping', label: '購物', icon: '🛍️' },
  { key: 'entertainment', label: '娛樂', icon: '🎮' },
  { key: 'daily', label: '生活', icon: '🧴' },
  { key: 'medical', label: '醫療', icon: '💊' },
  { key: 'home', label: '居家', icon: '🏠' },
  { key: 'travel', label: '旅行', icon: '✈️' },
  { key: 'other', label: '其他', icon: '🧾' },
]

export const PAYMENT_METHODS = [
  { key: 'linepay', label: 'LINE Pay' },
  { key: 'applepay', label: 'Apple Pay' },
  { key: 'cash', label: '現金' },
  { key: 'card', label: '信用卡' },
  { key: 'other', label: '其他' },
]

// 合併內建分類 + 使用者自訂分類（已刪除的不顯示）
export function mergeCategories(custom) {
  const customActive = (custom || []).filter((c) => !c.deleted)
  return [...DEFAULT_CATEGORIES, ...customActive]
}

export function categoryLabel(categories, key) {
  return categories.find((c) => c.key === key)?.label || key || '其他'
}

export function categoryIcon(categories, key) {
  return categories.find((c) => c.key === key)?.icon || '🧾'
}
