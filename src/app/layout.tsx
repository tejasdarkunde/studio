
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'BSA Training Academy, Pune',
  description: 'Register for our ongoing and upcoming training sessions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const version = "0.1.0"; // Hardcode version to avoid import issues

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="min-h-screen flex flex-col">
           <header className="bg-background border-b sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
                 <Link href="/home2" className="text-xl font-bold text-primary tracking-tight">BSA Training Academy, Pune</Link>
                <div className="flex items-center gap-2">
                    <Button asChild variant="ghost"><Link href="/home">Home</Link></Button>
                    <div className="flex gap-4">
                        <Link href="/student-login" passHref>
                            <Button variant="outline">Student Login</Button>
                        </Link>
                        <Link href="/login" passHref>
                            <Button variant="link">Admin/Trainer Login</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
          <main className="flex-grow">
            {children}
          </main>
           <footer className="bg-background border-t">
              <div className="container mx-auto px-4 md:px-8 h-14 flex items-center justify-between text-sm text-muted-foreground">
                  <p>&copy; {new Date().getFullYear()} BSA Training Academy. All rights reserved.</p>
                  <p>Version {version}</p>
              </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
