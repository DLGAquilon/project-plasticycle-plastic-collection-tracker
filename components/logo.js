import Link from "next/link";

export default function Logo({ href = "/", className = "text-3xl", light = false }) {
  const wordmark = (
    <span className={`font-extrabold tracking-tight transition-colors ${light ? "text-[#f8fafc]" : "text-forest"} ${className}`}>
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
