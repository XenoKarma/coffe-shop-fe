export type PageItem = number | "ellipsis"

export function pageItems(current: number, last: number): PageItem[] {
  const pages = new Set<number>([1, last])

  for (const page of [current - 1, current, current + 1]) {
    if (page >= 1 && page <= last) pages.add(page)
  }

  if (current <= 3) {
    for (let page = 2; page <= Math.min(4, last); page += 1) pages.add(page)
  }

  if (current >= last - 2) {
    for (let page = Math.max(1, last - 3); page <= last - 1; page += 1) pages.add(page)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const items: PageItem[] = []
  let previous = 0

  for (const page of sorted) {
    if (page - previous > 1) items.push("ellipsis")
    items.push(page)
    previous = page
  }

  return items
}
