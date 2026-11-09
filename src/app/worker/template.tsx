/** Transition douce à chaque changement de page. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="jl-page">{children}</div>;
}
