/** Decorative treatment of the existing display font, not a copy of Paper Kuto. */
export default function PaperCutText({ text, className = '' }: { text: string; className?: string }) {
  return <span className={`paper-cut ${className}`}>
    <span className="paper-readable">{text}</span>
    <span className="paper-ink" aria-hidden="true">{text.split(' ').map((word, wordIndex) => <span className="paper-word" key={wordIndex}>
      {Array.from(word).map((letter, index) => <span className={`paper-letter cut-${(index + wordIndex * 3) % 5}`} key={index}>{letter}</span>)}
    </span>)}</span>
  </span>;
}
