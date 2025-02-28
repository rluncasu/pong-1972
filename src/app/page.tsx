"use client";

import { PongGame } from "@/components/pong-game";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-900 p-4">
      <h1 className="mb-8 text-4xl font-bold text-white">Atari Pong (1972)</h1>
      <PongGame />
    </div>
  );
}
