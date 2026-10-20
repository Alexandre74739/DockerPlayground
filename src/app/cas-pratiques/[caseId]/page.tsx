import { notFound } from "next/navigation";
import { CaseLoader } from "@/components/cases/CaseLoader";
import { cases, getCase } from "@/lib/cases/catalog";

export function generateStaticParams() {
  return cases.map((practice) => ({ caseId: practice.id }));
}

export async function generateMetadata({ params }: PageProps<"/cas-pratiques/[caseId]">) {
  const { caseId } = await params;
  return { title: `${getCase(caseId)?.title ?? "Cas pratique"} · Docker Playground` };
}

export default async function CasePage({ params }: PageProps<"/cas-pratiques/[caseId]">) {
  const { caseId } = await params;
  if (!getCase(caseId)) notFound();
  return <CaseLoader caseId={caseId} />;
}
