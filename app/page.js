import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">PlastiCycle</span>
        <Link href="/login" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-card">
          Sign in
        </Link>
      </header>
      <section className="mx-auto grid max-w-5xl gap-10 px-6 pb-24 pt-12 md:grid-cols-[1.2fr_0.8fr] md:items-end">
        <div className="rise">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-forest">Plastic competitions</p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Rank the kilos. Lock the result.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink/75">
            A barangay, campus, or company runs its own contest. Puroks or departments collect single-use plastic, and only the people enrolled in that contest can open it.
          </p>
          <Link href="/login" className="mt-8 inline-flex rounded-full bg-forest px-6 py-3 font-semibold text-white">
            Open your competitions
          </Link>
        </div>
        <ol className="space-y-4">
          {[
            ["01", "Sign in", "Administrators and middlemen land on the contests they run. Viewers land on the one they were enrolled in."],
            ["02", "Add a competition", "Pick barangay, campus, or company so the participants stay puroks or departments."],
            ["03", "Log, then lock", "Weigh-ins add kilograms. Locking the contest freezes the ranking."],
          ].map(([index, title, text], item) => (
            <li key={index} className="rise rounded-3xl border border-line bg-card p-5" style={{ animationDelay: `${item * 90}ms` }}>
              <p className="text-xs font-semibold tracking-[0.14em] text-clay">{index}</p>
              <h2 className="mt-2 text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-ink/70">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
