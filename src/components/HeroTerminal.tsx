/** Terminal décoratif de la page d'accueil (statique). */
export function HeroTerminal() {
  const prompt = (
    <>
      <span className="text-neon-400">alex@pc</span>
      <span className="text-ink-500">:</span>
      <span className="text-ink-300">~/projet</span>
      <span className="text-ink-500">$ </span>
    </>
  );
  return (
    <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950" aria-hidden>
      <div className="flex items-center gap-1.5 border-b border-ink-800 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
      </div>
      <pre className="overflow-hidden p-5 font-mono text-[12.5px] leading-[1.7] text-ink-100">
        {prompt}docker run -d -p 8080:80 --name web nginx{"\n"}
        <span className="text-ink-500">Status: Downloaded newer image for nginx:latest</span>
        {"\n"}
        <span className="text-ink-500">a3f1c9e5b7d24f6e8a0b1c2d3e4f5a6b7c8d9e0f</span>
        {"\n"}
        {prompt}docker ps{"\n"}
        <span className="text-ink-500">
          {
            "CONTAINER ID   IMAGE   STATUS         PORTS                  NAMES\na3f1c9e5b7d2   nginx   Up 3 seconds   0.0.0.0:8080->80/tcp   web"
          }
        </span>
        {"\n"}
        {prompt}
        <span className="animate-cursor bg-neon-400"> </span>
      </pre>
    </div>
  );
}
