import type { Metadata } from 'next'
import { JetBrains_Mono, Poppins } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-space-mono',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://myblocate.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'myblocate — Biznes Məkan Analizatoru',
    template: '%s | myblocate',
  },
  description:
    'Azərbaycanda biznes açmazdan əvvəl yerləşmə analizi. Rəqabət, piyada axını, metro, icarə və daha 7 amil əsasında 0–100 bal. Pulsuz və dəqiq.',
  keywords: [
    'biznes analiz', 'məkan seçimi', 'lokasiya analizi', 'Bakı biznes',
    'Azərbaycan biznes', 'rəqabət analizi', 'icarə qiymətləri',
    'business location analysis', 'Baku', 'Azerbaijan',
  ],
  authors: [{ name: 'myblocate' }],
  creator: 'myblocate',
  publisher: 'myblocate',
  alternates: {
    canonical: '/',
    languages: {
      'az-AZ': '/',
      'en-US': '/',
      'x-default': '/',
    },
  },
  openGraph: {
    title: 'myblocate — Biznes Məkan Analizatoru',
    description: 'Azərbaycanda biznesinizin uğur ehtimalını öyrənin. Pulsuz məkan analizi.',
    url: SITE_URL,
    siteName: 'myblocate',
    locale: 'az_AZ',
    alternateLocale: ['en_US'],
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 319,
        height: 330,
        alt: 'myblocate',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'myblocate — Biznes Məkan Analizatoru',
    description: 'Azərbaycanda biznesinizin uğur ehtimalını öyrənin.',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={`${jetbrainsMono.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  )
}
