import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Food Dealz — Madison food deals',
    short_name: 'Food Dealz',
    description: 'Every restaurant and grocery deal in Madison, ranked by price.',
    start_url: '/deals',
    display: 'standalone',
    background_color: '#fbf7f2',
    theme_color: '#e4572e',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
