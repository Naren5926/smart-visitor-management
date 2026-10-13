import { useSyncExternalStore } from 'react'
import DesktopLayout from './DesktopLayout'
import MobileLayout from './MobileLayout'

const query = '(min-width: 768px)'
const subscribe = (cb) => {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

// Phone: bottom-tab mobile design. Laptop/desktop: the same sidebar shell the admin uses.
// Only one layout mounts at a time so pages never fetch twice.
export default function ResponsiveLayout({ title, nav, roleName }) {
  const isDesktop = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
  return isDesktop ? (
    <DesktopLayout nav={nav} roleName={roleName} ariaLabel={`${title} navigation`} />
  ) : (
    <MobileLayout title={title} nav={nav} />
  )
}
