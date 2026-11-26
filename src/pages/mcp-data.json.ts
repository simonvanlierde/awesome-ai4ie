// What the MCP tools in worker/mcp.ts read besides the reading list (literature-index.json):
// applications, resources and the Agent Skills, all from the build.
import { getCollection } from "astro:content";
import { appUrl } from "../lib/urls";

const skillFiles = import.meta.glob<string>("../../skills/*/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export async function GET() {
  const applications = (await getCollection("applications")).map(({ id, data }) => ({
    id,
    ...data,
    href: appUrl({ id, ...data }),
  }));
  const resources = (await getCollection("resources")).map(({ id, data }) => ({ id, ...data }));
  const skills = Object.fromEntries(
    Object.entries(skillFiles).map(([path, text]) => [path.split("/").at(-2), text]),
  );
  return Response.json({ applications, resources, skills });
}
