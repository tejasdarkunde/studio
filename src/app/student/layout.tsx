
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background border-b sticky top-0 z-10">
        <nav className="container mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-primary">
            BSA Training Academy, Pune
          </Link>
          <Button variant="outline" asChild>
            <Link href="/">Logout</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}
