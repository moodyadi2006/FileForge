import "./globals.css";
import AuthProvider from "@/context/AuthProvider";

export const metadata = {
  title: "FileForge",
  description: "Upload, Compress, Decompress",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <AuthProvider>
        <body suppressHydrationWarning className="antialiased">
          <div>{children}</div>
        </body>
      </AuthProvider>
    </html>
  );
}
