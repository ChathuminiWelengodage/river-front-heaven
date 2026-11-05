import "./globals.css";

export const metadata = {
  title: "River Front Heaven",
  description: "Hotel management and booking system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
