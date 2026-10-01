import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppGate } from '@/components/AppGate'
import { IdentityProvider } from '@/lib/identity'
import { ToastProvider } from '@/lib/toast'

import '../styles.css'

const siteName = 'Elaine — Faça. Registre. Compartilhe.'
const siteDescription =
  'Elaine transforma intenção em ação: faça algo concreto, registre com uma foto ou texto e compartilhe no feed público.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#f6f1e7' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { title: siteName },
      { name: 'description', content: siteDescription },
      { property: 'og:title', content: siteName },
      { property: 'og:description', content: siteDescription },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <ToastProvider>
      <IdentityProvider>
        <AppGate>
          <Outlet />
        </AppGate>
      </IdentityProvider>
    </ToastProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
