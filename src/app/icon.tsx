import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 256,
  height: 256,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6C47FF 0%, #9C6FFF 100%)',
          borderRadius: '56px',
        }}
      >
        <svg viewBox="0 0 40 40" fill="none" style={{ width: '65%', height: '65%' }}>
          <path d="M15 21a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25 19a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
