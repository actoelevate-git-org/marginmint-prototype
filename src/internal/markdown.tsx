import Markdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { readDiagram, resolveLink } from "./content";

/**
 * Renders repository Markdown for the internal portal. Raw HTML (details/summary)
 * is allowed but sanitised; headings get GitHub-style ids; relative links are
 * rewritten to portal pages; diagrams are served from /internal/assets.
 */
/** Natural size of a rendered diagram from its SVG viewBox (null if unknown). */
function diagramSize(url: string): { width: number; height: number } | null {
  const name = /^\/internal\/assets\/diagrams\/([a-z0-9-]+\.svg)$/.exec(url)?.[1];
  const svg = name ? readDiagram(name) : null;
  const box = svg ? /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(svg) : null;
  return box ? { width: Math.round(Number(box[1])), height: Math.round(Number(box[2])) } : null;
}

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-/]],
  },
};

function heading(level: 2 | 3 | 4) {
  const Tag = `h${level}` as const;
  return function Heading({ id, children }: { id?: string; children?: ReactNode }) {
    return (
      <Tag id={id} className="group scroll-mt-24">
        {children}
        {id ? (
          <a href={`#${id}`} aria-label="Link to this section" className="ml-2 inline-flex align-middle text-slate-300 no-underline opacity-0 transition-opacity hover:text-emerald group-hover:opacity-100">
            <Link2 className="size-4" aria-hidden="true" />
          </a>
        ) : null}
      </Tag>
    );
  };
}

export function MarkdownContent({ markdown, source }: { markdown: string; source: string }) {
  const components: Components = {
    a({ href, children }) {
      if (!href) return <span>{children}</span>;
      const target = resolveLink(source, href);
      if ("code" in target) {
        return (
          <span className="rounded bg-slate-100 px-1 font-mono text-[0.85em] text-slate-700" title={`Repository path: ${target.code}`}>
            {children}
          </span>
        );
      }
      if (target.external) {
        return (
          <a href={target.href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }
      return target.href.startsWith("#") ? <a href={target.href}>{children}</a> : <Link href={target.href}>{children}</Link>;
    },
    img({ src, alt }) {
      if (typeof src !== "string") return null;
      const target = resolveLink(source, src);
      const url = "href" in target ? target.href : src;
      const size = diagramSize(url);
      // Fill the column, never enlarge past natural size, and never shrink below 60%
      // of it (text stays legible); wider diagrams scroll inside the frame.
      const sizing = size ? { width: "100%", maxWidth: `${size.width}px`, minWidth: `${Math.min(size.width, Math.round(size.width * 0.6))}px` } : undefined;
      return (
        <a href={url} target="_blank" rel="noopener" className="not-prose my-6 block overflow-x-auto rounded-lg border border-line bg-white p-3 shadow-card" title="Open full size">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG diagrams; next/image adds nothing here */}
          <img
            src={url}
            alt={alt ?? ""}
            loading="lazy"
            width={size?.width}
            height={size?.height}
            style={sizing}
            className={size ? "mx-auto h-auto" : "mx-auto h-auto max-w-full"}
          />
          {alt ? <span className="mt-2 block text-center text-xs text-muted">{alt.replace(/\s*\(diagram\)$/, "")} · click to open full size</span> : null}
        </a>
      );
    },
    pre({ children }) {
      // Code blocks opt out of typography so inline-code styles can never leak in.
      return (
        <pre className="not-prose scrollbar-thin my-5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 px-4 py-3.5 font-mono text-[13px] leading-relaxed text-slate-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-mono [&_code]:text-inherit">
          {children}
        </pre>
      );
    },
    table({ children }) {
      return (
        <div className="not-prose my-6 overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-[13px] [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-slate-800 [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-600">
            {children}
          </table>
        </div>
      );
    },
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
  };

  return (
    <div className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:border-b prose-h2:border-line prose-h2:pb-2 prose-h2:text-xl prose-h3:text-base prose-a:font-medium prose-a:text-forest prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-emerald prose-blockquote:bg-mint/40 prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:font-normal [&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none [&_details]:my-4 [&_details]:rounded-lg [&_details]:border [&_details]:border-line [&_details]:bg-slate-50 [&_details]:px-4 [&_details]:py-2 [&_summary]:cursor-pointer [&_summary]:text-sm [&_summary]:font-medium [&_summary]:text-slate-600">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeSlug]}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
