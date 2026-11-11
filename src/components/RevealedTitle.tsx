import type { CSSProperties } from "react";

/**
 * A title that enters word by word from a mask (each word rises from below).
 * The full text stays in aria-label so screen readers read it in one go.
 */
export default function RevealedTitle({ text, className = "", delay = 0, step = 60 }: {
  text: string; className?: string; delay?: number; step?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <h1 className={className} aria-label={text}>
      {words.map((word, i) => (
        // the key includes the text: when the municipality changes, the animation runs again
        <span key={`${text}-${i}`} aria-hidden className="mask" style={{ "--delay": `${delay + i * step}ms` } as CSSProperties}>
          <span>{word}</span>{i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}
