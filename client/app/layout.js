import './globals.css';

export const metadata = {
  title: 'Pandora — Smart Lighting',
  description: 'Remote control for Energeeks E27 RGBW via Tuya Cloud',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
