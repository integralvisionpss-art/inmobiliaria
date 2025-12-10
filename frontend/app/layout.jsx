import "./globals.css";

export const metadata = {
  title: "Inmobiliaria",
  description: "Sistema inmobiliario",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
