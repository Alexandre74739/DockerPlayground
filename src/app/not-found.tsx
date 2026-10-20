import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-5xl">🐳</p>
      <h1 className="mt-4 text-2xl font-bold text-brand-950">Page introuvable</h1>
      <Link href="/" className="mt-6 inline-block text-brand-600 hover:underline">
        Retour au parcours
      </Link>
    </div>
  );
}
