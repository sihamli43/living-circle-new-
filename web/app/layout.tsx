export const metadata = {
  title: 'Living Circle',
  description: 'Connect with like-minded people',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
