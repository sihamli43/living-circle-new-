'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [status, setStatus] = useState('Loading...')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000')
        if (res.ok) {
          setStatus('✅ Backend is connected!')
        } else {
          setStatus('⚠️ Backend responded with error')
        }
      } catch (error) {
        setStatus('❌ Cannot connect to backend')
      }
    }

    checkBackend()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Living Circle</h1>
      <p>Backend Status: {status}</p>
      <p>This is your web frontend. Connect it to your Expo app!</p>
    </div>
  )
}
