import Link from "next/link";

export function Header() {
  return (
    <header className="w-full border-b bg-background">
      <div className="w-full flex h-16 items-center">
        <Link href="/" className="flex w-full items-center justify-center">
          <span className="text-xl font-bold">Atari Pong 1972</span>
        </Link>
      </div>
    </header>
  );
} 