// What the MCP tools in worker/mcp.ts read at runtime: papers with their BibTeX,
// applications and the Agent Skills, all from the build.
import { getCollection } from "astro:content";
import citations from "../data/citations.json";
import { litUrl } from "../lib/urls";

const skillFiles = import.meta.glob<string>("../../skills/*/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export async function GET() {
  const bibtex: Record<string, { bibtex: string } | undefined> = citations;
  const papers = (await getCollection("literature")).map(({ id, data: e }) => ({
    id,
    ...e,
    href: litUrl({ papers: [id] }),
    bibtex: bibtex[id]?.bibtex,
  }));
  const applications = (await getCollection("applications")).map(({ id, data }) => ({
    id,
    ...data,
  }));
  const skills = Object.fromEntries(
    Object.entries(skillFiles).map(([path, text]) => [path.split("/").at(-2), text]),
  );
  return Response.json({ papers, applications, skills });
}
