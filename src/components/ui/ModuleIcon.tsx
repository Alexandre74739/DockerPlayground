import { Box, Brush, Cloud, Database, Hammer, Layers, type LucideProps, Puzzle, Rocket } from "lucide-react";
import type { ModuleIconName } from "@/lib/types";

const icons = { rocket: Rocket, layers: Layers, box: Box, hammer: Hammer, database: Database, puzzle: Puzzle, cloud: Cloud, brush: Brush };

export function ModuleIcon({ name, ...props }: { name: ModuleIconName } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden {...props} />;
}
