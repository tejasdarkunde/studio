import Image from 'next/image';

export default function Home2Page() {
  return (
    <main>
      <section className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center text-white">
        {/* Background Image */}
        <Image
          src="https://picsum.photos/seed/tech/1600/600"
          alt="Hero background"
          fill
          className="object-cover"
          data-ai-hint="technology abstract"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div className="relative z-10 text-center p-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Innovate, Learn, Excel
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto">
            Welcome to the future of training. Explore our courses and unlock your potential.
          </p>
        </div>
      </section>

      {/* You can add more sections below */}
      <div className="container mx-auto p-4 md:p-8">
        <h2 className="text-3xl font-bold text-center">Page Content Goes Here</h2>
      </div>
    </main>
  );
}
