import GameBoard from "@/components/GameBoard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <GameBoard />
    </main>
  );
}
