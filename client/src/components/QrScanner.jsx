import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Alert } from '@/components/ui/alert'

// Camera QR reader. Works on HTTPS or localhost only (a browser rule for camera access).
export default function QrScanner({ onResult, paused = false }) {
  const [cameraError, setCameraError] = useState('')

  if (cameraError) {
    return (
      <Alert variant="warning" className="space-y-1">
        <p className="font-medium">Camera not available</p>
        <p>{cameraError}</p>
        {!window.isSecureContext && <p>Open the app over HTTPS (or localhost) so the browser allows camera access.</p>}
      </Alert>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-black">
      <Scanner
        formats={['qr_code']}
        paused={paused}
        constraints={{ facingMode: 'environment' }}
        scanDelay={400}
        onScan={(codes) => {
          const value = codes?.[0]?.rawValue
          if (value) onResult(value)
        }}
        onError={(err) => {
          const name = err?.name || ''
          setCameraError(
            name === 'NotAllowedError'
              ? 'Camera permission was denied. Allow camera access in your browser settings and reload.'
              : (err?.message || 'The camera could not be started.')
          )
        }}
        styles={{ container: { width: '100%', aspectRatio: '1 / 1' } }}
      />
    </div>
  )
}
