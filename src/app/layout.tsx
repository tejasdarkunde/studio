
"use client";

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useState } from 'react';

// export const metadata: Metadata = { // Metadata must be defined in a Server Component
//   title: 'BSA Training Academy, Pune',
//   description: 'Register for our ongoing and upcoming training sessions.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const version = "0.1.0"; // Hardcode version to avoid import issues
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>BSA Training Academy, Pune</title>
        <meta name="description" content="Register for our ongoing and upcoming training sessions." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="min-h-screen flex flex-col">
           <header className="bg-background border-b sticky top-0 z-10">
            <nav className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
              <Link href="/home2" className="text-xl font-bold text-primary">
                BSA Training Academy
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Button asChild>
                  <Link href="/login">Login</Link>
                </Button>
              </div>
              <div className="md:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <div className="flex flex-col gap-4 py-6">
                      <Button asChild>
                        <Link href="/login" onClick={() => setSheetOpen(false)}>Login</Link>
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </nav>
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
