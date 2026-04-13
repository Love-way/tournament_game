'use client';

import './globals.css';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode } from 'react';

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? 'https://placeholder.convex.cloud'
);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <title>Omshina Tournoi Zone</title>
        <meta name="description" content="Omshina Tournoi Zone — Plateforme de tournoi gaming" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
