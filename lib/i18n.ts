import { AZ } from './az'
import { EN } from './en'

export type Lang = 'az' | 'en'
export type Strings = { [K in keyof typeof AZ]: string }

export function getStrings(lang: Lang): Strings {
  return lang === 'en' ? EN : AZ
}
