type ClassValue =
  | string
  | number
  | undefined
  | null
  | false
  | { [key: string]: boolean | undefined | null }

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flatMap((input) => {
      if (!input && input !== 0) return []
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k)
      }
      return [String(input)]
    })
    .join(' ')
}
