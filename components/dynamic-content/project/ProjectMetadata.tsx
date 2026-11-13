import type { ProjectSummary, TermLite } from "@/lib/content/project-types";
import { cn } from "@/lib/utils";

type ProjectMetadata = Pick<ProjectSummary, "neighborhood" | "serviceAreas" | "materialTypes" | "roofColors">;

const termNames = (terms?: readonly TermLite[]) =>
  [...new Set((terms ?? []).map(({ name }) => name.trim()).filter(Boolean))].join(", ");

export function ProjectNeighborhood({ project, className }: {
  project: Pick<ProjectMetadata, "neighborhood">;
  className?: string;
}) {
  const name = project.neighborhood?.name.trim();
  if (!name) return null;
  return <p data-project-neighborhood className={cn("text-sm font-normal leading-5 text-slate-500", className)}>{name}</p>;
}

export function ProjectFacts({ project, className }: { project: ProjectMetadata; className?: string }) {
  const facts = [
    ["Location", termNames(project.serviceAreas)],
    ["Material", termNames(project.materialTypes)],
    ["Color", termNames(project.roofColors)],
  ].filter(([, value]) => value);
  if (!facts.length) return null;

  return (
    <dl data-project-facts className={cn("space-y-2 text-sm leading-5", className)}>
      {facts.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3">
          <dt className="font-medium text-slate-500">{label}</dt>
          <dd className="min-w-0 wrap-break-word text-slate-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
