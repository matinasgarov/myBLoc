import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'myblocate — Biznes Analizatoru',
  description: 'Azərbaycanda biznesinizin uğur ehtimalını öyrənin. 6 amil əsasında 0–100 bal ilə yerləşmə analizini əldə edin.',
  openGraph: {
    title: 'myblocate — Biznes Analizatoru',
    description: 'Azərbaycanda biznesinizin uğur ehtimalını öyrənin.',
    siteName: 'myblocate',
    locale: 'az_AZ',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'myblocate — Biznes Analizatoru',
    description: 'Azərbaycanda biznesinizin uğur ehtimalını öyrənin.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={jetbrainsMono.variable}>
      <body>{children}</body>
    </html>
  )
}
