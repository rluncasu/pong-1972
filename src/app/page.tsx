"use client";

import { PongGame } from "@/components/pong-game";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-900 p-4">
      <PongGame />
    </div>
  );
}
