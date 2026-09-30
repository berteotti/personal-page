export type Photo = {
  id: string
  src: string
  caption: string
  alt: string
  description: string
}

export type Country = {
  id: string
  stamp: string
  name: string
  story?: string
}

export const profile = {
  name: 'Leonardo',
  intro: 'A little about me.',
  biography: 'Software engineer, curious traveler, and creator of new products.',
} as const

export const photos: Photo[] = [
  { id: '01', src: '/images/leo.jpg', caption: "That's me", alt: 'Leo smiling and wearing sunglasses', description: '' },
]

export const blogPosts: { id: string; title: string }[] = []

export const countries: Country[] = [
  { id: 'ITA', name: 'Italy', stamp: 'Italia' },
  { id: 'THA', name: 'Thailand', stamp: 'Thailand' },
  { id: 'AGO', name: 'Angola', stamp: 'Angola' },
  { id: 'BRA', name: 'Brazil', stamp: 'Brasil' },
  { id: 'ESP', name: 'Spain', stamp: 'España' },
  { id: 'FRA', name: 'France', stamp: 'France' },
  { id: 'GBR', name: 'United Kingdom', stamp: 'UK' },
  { id: 'DEU', name: 'Germany', stamp: 'Deutschland' },
  { id: 'ARG', name: 'Argentina', stamp: 'Argentina' },
  { id: 'COL', name: 'Colombia', stamp: 'Colombia' },
  { id: 'URY', name: 'Uruguay', stamp: 'Uruguay' },
  { id: 'NLD', name: 'Netherlands', stamp: 'Nederland' },
  { id: 'BEL', name: 'Belgium', stamp: 'Belgium' },
  { id: 'CHE', name: 'Switzerland', stamp: 'Helvetia' },
  { id: 'AUT', name: 'Austria', stamp: 'Österreich' },
  { id: 'MAR', name: 'Morocco', stamp: 'Maroc' },
  { id: 'GRC', name: 'Greece', stamp: 'Greece' },
  { id: 'TUR', name: 'Turkey', stamp: 'Türkiye' },
]
