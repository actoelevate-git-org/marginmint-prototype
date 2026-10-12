import { diagramFiles, readDiagram } from "@/internal/content";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return diagramFiles().map((file) => ({ file }));
}

/** Serves rendered architecture diagrams (SVG) for the internal portal. */
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const svg = readDiagram(file);
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
