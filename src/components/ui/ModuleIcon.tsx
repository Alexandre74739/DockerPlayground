import {
  Box,
  Brush,
  Bug,
  Cloud,
  Database,
  FileCode2,
  GitBranch,
  Hammer,
  Layers,
  type LucideProps,
  Package,
  Puzzle,
  Rocket,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import type { ModuleIconName } from "@/lib/types";

const icons = {
  rocket: Rocket,
  layers: Layers,
  box: Box,
  hammer: Hammer,
  database: Database,
  puzzle: Puzzle,
  cloud: Cloud,
  brush: Brush,
  package: Package,
  sliders: SlidersHorizontal,
  shield: ShieldCheck,
  users: Users,
  git: GitBranch,
  bug: Bug,
  file: FileCode2,
  server: Server,
};

export function ModuleIcon({ name, ...props }: { name: ModuleIconName } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden {...props} />;
}
