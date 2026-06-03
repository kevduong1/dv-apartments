import { Fragment } from "react"

import { cn } from "@/lib/utils"

/**
 * Renders `text`, wrapping the characters at `indices` (from a fuzzy match) in
 * a subtle `<mark>`. Consecutive matched/unmatched characters are grouped into
 * single nodes so the output stays light. With no indices it's just the text.
 */
export function Highlight({
  text,
  indices,
  className,
}: {
  text: string
  indices?: number[]
  className?: string
}) {
  if (!indices || indices.length === 0) return <>{text}</>

  const matched = new Set(indices)
  const runs: { str: string; on: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const on = matched.has(i)
    const last = runs[runs.length - 1]
    if (last && last.on === on) last.str += text[i]
    else runs.push({ str: text[i], on })
  }

  return (
    <>
      {runs.map((run, i) =>
        run.on ? (
          <mark
            key={i}
            className={cn(
              "rounded bg-primary/15 text-foreground dark:bg-primary/25",
              className,
            )}
          >
            {run.str}
          </mark>
        ) : (
          <Fragment key={i}>{run.str}</Fragment>
        ),
      )}
    </>
  )
}
