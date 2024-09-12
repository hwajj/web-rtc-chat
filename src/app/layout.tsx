import localFont from "next/font/local";
import "./globals.css";
import Image from "next/image";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "WebRTC Chat",
  description: "A simple WebRTC video chat app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-yellow-50 px-10 py-10 antialiased w-screen h-screen m-0 p-0 flex flex-col absolute`}
      >
        <header className="p-2 flex items-baseline">
          <Image
            className="dark:invert"
            src="/logo2.png"
            alt="Next.js logo"
            width={312.5}
            height={72.5}
            priority
          />
        </header>
        {children}
        {/*<footer className="py-2 mt-auto border-red text-center">jeong</footer>*/}
      </body>
    </html>
  );
}
