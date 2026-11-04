import Link from "next/link";

export default function Logo({ href = "/", className = "text-3xl" }) {
  const wordmark = (
    <span className={`font-extrabold tracking-tight text-forest transition-colors ${className}`}>
      PlastiCycle
    </span>
  );
  if (!href) return wordmark;
  return (
    <Link href={href} className="group hover:opacity-80">
      {wordmark}
    </Link>
  );
}
