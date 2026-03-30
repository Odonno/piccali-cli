import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a markdown string using react-markdown with GFM support.
 * Applies prose-like styling consistent with the app design system.
 */
export const MarkdownContent = ({ content }: { content: string }) => (
	<ReactMarkdown
		remarkPlugins={[remarkGfm]}
		components={{
			h1: ({ children }) => (
				<h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>
			),
			h2: ({ children }) => (
				<h2 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h2>
			),
			h3: ({ children }) => (
				<h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">
					{children}
				</h3>
			),
			p: ({ children }) => (
				<p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
			),
			ul: ({ children }) => (
				<ul className="list-disc list-inside text-sm mb-2 last:mb-0 space-y-0.5">
					{children}
				</ul>
			),
			ol: ({ children }) => (
				<ol className="list-decimal list-inside text-sm mb-2 last:mb-0 space-y-0.5">
					{children}
				</ol>
			),
			li: ({ children }) => <li className="text-sm">{children}</li>,
			blockquote: ({ children }) => (
				<blockquote className="border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground italic text-sm my-2">
					{children}
				</blockquote>
			),
			code: ({ children, className }) => {
				const isBlock = className?.startsWith("language-");
				if (isBlock) {
					return (
						<code className="block bg-muted rounded-md px-3 py-2 font-mono text-xs whitespace-pre overflow-x-auto">
							{children}
						</code>
					);
				}
				return (
					<code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
						{children}
					</code>
				);
			},
			pre: ({ children }) => <pre className="my-2 last:mb-0">{children}</pre>,
			a: ({ href, children }) => (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary underline underline-offset-2 hover:opacity-80"
				>
					{children}
				</a>
			),
			strong: ({ children }) => (
				<strong className="font-semibold">{children}</strong>
			),
			em: ({ children }) => <em className="italic">{children}</em>,
			hr: () => <hr className="border-border my-3" />,
			table: ({ children }) => (
				<div className="overflow-x-auto my-2">
					<table className="text-xs border-collapse w-full">{children}</table>
				</div>
			),
			thead: ({ children }) => (
				<thead className="bg-muted font-semibold">{children}</thead>
			),
			tbody: ({ children }) => <tbody>{children}</tbody>,
			tr: ({ children }) => (
				<tr className="border-b border-border">{children}</tr>
			),
			th: ({ children }) => (
				<th className="px-3 py-1.5 text-left font-mono font-semibold text-[11px]">
					{children}
				</th>
			),
			td: ({ children }) => (
				<td className="px-3 py-1.5 font-mono text-[11px]">{children}</td>
			),
		}}
	>
		{content}
	</ReactMarkdown>
);
