import './globals.css'

export const metadata = {
  title: 'Daily Photo',
  description: 'A beautiful daily rotating photo gallery.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
