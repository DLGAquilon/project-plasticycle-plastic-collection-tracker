import {
  Activity,
  AlertTriangle,
  Award,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Facebook,
  Flag,
  Layout,
  Linkedin,
  Rocket,
  ShieldCheck,
  Target,
  TrendingUp,
  Twitter,
  UserCircle,
  Users,
} from "lucide-react";
import Logo from "../components/logo.js";
import ThemeToggle from "../components/theme-toggle.js";

const features = [
  ["Real-time Leaderboards", "Instant visualization of departmental rankings to drive healthy campus competition."],
  ["AI Trend Prediction", "Predicts high-volume periods to optimize waste collection logistics."],
  ["Mobile-First Logging", "Frictionless deposit entry designed for students on the move."],
  ["Admin Dashboards", "Comprehensive data exporting for sustainability reporting and compliance."],
  ["Gamification Elements", "Departments are given rewards at the end of the school year to incentivize participation."],
  ["Leaderboard Integrity", "Robust validation mechanisms such as QR-based logging, drop-box protocols, and admin oversight to ensure accurate deposit logging."],
];

const releaseCriteria = [
  "Validation: Leaderboard updates in under 1 second after a deposit log.",
  "Integrity: Deposit counts only accept valid numerical inputs.",
  "AI Accuracy: Forecast variance within plus or minus 15 percent of actuals.",
  "Security: Department data is read-only for students and write-only for admins.",
  "UX: Deposit flow completed in under 3 simple steps.",
];

export default function Home() {
  return (
    <div className="bg-paper text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="#hero" className="shrink-0"><Logo href={null} className="text-3xl" /></a>
          <nav className="hidden items-center gap-6 lg:flex">
            {[
              ["#proposal", "Proposal"],
              ["#team", "Team"],
              ["#ai", "AI Integration"],
              ["#sdg", "SDGs"],
              ["#users", "Target Users"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium uppercase tracking-widest text-muted hover:text-forest">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/login" className="hidden rounded-full border border-line px-4 py-2 text-sm font-semibold sm:inline">Sign in</a>
            <a href="/signup" className="rounded-full bg-forest px-5 py-2 text-sm font-bold text-on-brand">Join Now</a>
          </div>
        </div>
      </header>

      <main>
        <section
          id="hero"
          className="relative flex min-h-[90vh] items-center justify-center overflow-hidden text-center"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(30, 77, 43, 0.45) 0%, rgba(15, 23, 42, 0.92) 100%), url(\"https://images.pexels.com/photos/12894737/pexels-photo-12894737.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2\")",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
        >
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-20">
            <h1 className="text-5xl font-bold leading-tight text-white drop-shadow-2xl md:text-7xl">
              Track Your Plastic, <br />
              <span className="text-[#22c55e]">Compete for the Planet.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-100 drop-shadow-lg md:text-xl">
              A web-based plastic waste deposit tracking and inter-departmental competition system for MMCM.
            </p>
            <a href="#proposal" className="mt-8 inline-block rounded-full bg-forest px-12 py-5 text-xl font-bold text-on-brand">
              Explore the Project
            </a>
          </div>
        </section>

        <section id="proposal" className="bg-card py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="text-4xl font-black uppercase tracking-wide md:text-5xl">Project Proposal</h2>
              <p className="mt-4 text-sm font-bold uppercase tracking-widest text-muted">Turning Waste into a Winning Game</p>
            </div>
            <div className="grid items-start gap-8 md:grid-cols-2">
              <article className="h-full rounded-3xl border border-line bg-paper p-8">
                <div className="mb-6 flex items-center text-clay">
                  <AlertTriangle className="mr-3 h-8 w-8" />
                  <h3 className="text-2xl font-bold">The Problem</h3>
                </div>
                <p className="text-lg leading-relaxed">
                  Campus initiatives are often sporadic and poorly monitored. The lack of a centralized tracking system results in inconsistent participation, fewer accountability measures, and difficulty in evaluating departmental contributions.
                </p>
              </article>
              <article className="h-full rounded-3xl border border-line bg-paper p-8">
                <div className="mb-6 flex items-center text-forest">
                  <ShieldCheck className="mr-3 h-8 w-8" />
                  <h3 className="text-2xl font-bold">The Solution</h3>
                </div>
                <p className="text-lg leading-relaxed">
                  A centralized, web-based platform to log and track plastic deposits. By integrating competition, we foster consistent engagement, encouraging proper disposal habits and long-term environmental accountability within the MMCM Community.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="team" className="border-y border-line bg-paper py-24">
          <div className="mx-auto max-w-sm px-4 text-center">
            <h2 className="mb-16 text-4xl font-black uppercase tracking-wide">Team Setup</h2>
            <img src="/images/formal-image.jpg" alt="Vin Benjamin Belandres" className="mx-auto h-48 w-48 rounded-full object-cover ring-4 ring-forest/30" />
            <h3 className="mt-8 text-2xl font-bold uppercase tracking-wide">Vin Benjamin Belandres</h3>
            <p className="mt-2 text-sm font-bold uppercase tracking-tight text-forest">Full Stack Developer</p>
            <p className="text-sm font-bold uppercase tracking-tight text-forest">UI/UX Designer</p>
            <p className="text-sm font-bold uppercase tracking-tight text-forest">Project Manager</p>
            <a href="https://dlgaquilon.github.io/it103-fa1-portfolio/" className="mt-8 block text-2xl font-bold uppercase tracking-tight text-forest underline">
              View Portfolio
            </a>
          </div>
        </section>

        <section id="ai" className="relative overflow-hidden bg-[#0f172a] py-24 text-[#f8fafc]">
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 md:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex rounded-2xl bg-[#22c55e]/20 p-3 text-[#22c55e]">
                <BrainCircuit className="h-10 w-10" />
              </div>
              <h2 className="mb-8 text-4xl font-black uppercase tracking-wider md:text-5xl">AI-Driven Forecasting</h2>
              <p className="text-xl leading-relaxed text-slate-200">
                PlastiCycle uses a sophisticated <span className="font-bold text-[#22c55e]">Time-Series Forecasting Module</span> to predict plastic deposit trends.
              </p>
            </div>
            <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#22c55e] text-[#0f172a]">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Short-Term Predictions</h4>
                  <p className="text-sm text-slate-300">Predicts collection volumes over a 2-3 month horizon using historical departmental data.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#22c55e] text-[#0f172a]">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Proactive Planning</h4>
                  <p className="text-sm text-slate-300">Enables administrators to allocate waste management resources based on projected departmental performance.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sdg" className="bg-card py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="mb-4 text-4xl font-black uppercase tracking-wide">SDG Alignment</h2>
              <p className="leading-relaxed text-muted">Our mission is anchored in Global Goals for a sustainable future.</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              {[
                ["/images/sdg-12.png", "SDG 12", "#BF8D2C", "Responsible Consumption", "Shifts waste collection from sporadic events to a continuous, systematized process. Encourages proper recycling through structured tracking and departmental accountability."],
                ["/images/sdg-11.png", "SDG 11", "#F99D26", "Sustainable Communities", "Treats MMCM as a micro-community, improving campus-level monitoring and generating data that informs long-term institutional sustainability policies."],
                ["/images/sdg-13.png", "SDG 13", "#3F7E44", "Climate Action", "Influences student behavior through competition and high visibility, fostering lifelong habit formation rather than one-time participation."],
              ].map(([src, alt, color, title, text]) => (
                <article key={alt} className="overflow-hidden rounded-3xl border border-line">
                  <div className="flex h-48 items-center justify-center p-8" style={{ background: color }}>
                    <img src={src} alt={alt} className="h-40 w-auto object-contain" />
                  </div>
                  <div className="p-8">
                    <h3 className="mb-4 text-xl font-bold">{title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="users" className="bg-paper py-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-16 text-center text-4xl font-black uppercase tracking-wider">Who is this for?</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                [Users, "text-forest", "MMCM Students", "Primary User", "Provides a simple logging interface, clear departmental rankings, and immediate progress tracking to stay motivated."],
                [Award, "text-accent", "Dept. Representatives", "Secondary User", "Requires tools to monitor internal engagement and access comparative insights to encourage team participation."],
                [Activity, "text-ink", "School Administrators", "Strategy User", "Relies on centralized collection records and forecasting insights to evaluate and support institutional sustainability."],
              ].map(([Icon, color, title, role, text]) => (
                <article key={title} className="rounded-3xl border border-line bg-card p-8">
                  <Icon className={`mb-6 h-12 w-12 ${color}`} />
                  <h4 className="mb-2 text-2xl font-bold">{title}</h4>
                  <p className="mb-4 text-sm text-muted">{role}</p>
                  <p className="leading-relaxed">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="summary" className="bg-card py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto mb-20 max-w-3xl text-center">
              <h2 className="mb-6 text-4xl font-black uppercase tracking-tight md:text-5xl">Project Summary</h2>
              <p className="text-muted">The roadmap to a sustainable campus community.</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-8">
                <div className="rounded-[2rem] bg-[#0f172a] p-8 text-[#f8fafc]">
                  <div className="mb-6 flex items-center text-[#22c55e]">
                    <Flag className="mr-3 h-6 w-6" />
                    <h3 className="text-lg font-bold uppercase">Groundwork</h3>
                  </div>
                  <p className="mb-6 text-sm leading-relaxed text-slate-200">
                    Solving the crisis of participation fatigue. We move from manual, sporadic events to a continuous, data-driven ecosystem where every deposit is recorded and valued.
                  </p>
                  <div className="mb-4 flex items-center border-t border-white/10 pt-4 text-[#22c55e]">
                    <Rocket className="mr-3 h-6 w-6" />
                    <h3 className="text-lg font-bold uppercase">Strategic Goals</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-200">
                    To establish MMCM as a model for micro-community sustainability, creating a repeatable framework for other institutions to follow.
                  </p>
                </div>
                <div className="rounded-[2rem] border border-line bg-paper p-8">
                  <div className="mb-6 flex items-center text-forest">
                    <UserCircle className="mr-3 h-6 w-6" />
                    <h3 className="text-lg font-bold uppercase">User Persona</h3>
                  </div>
                  <p className="mb-2 text-sm font-bold">The Proactive Student</p>
                  <p className="text-sm leading-relaxed text-muted">
                    Goal: To contribute to their department ranking while effortlessly logging waste disposal via mobile, seeing their impact in real time.
                  </p>
                </div>
              </div>
              <div className="rounded-[2rem] border border-line bg-paper p-8">
                <div className="mb-8 flex items-center">
                  <Layout className="mr-3 h-6 w-6 text-forest" />
                  <h3 className="text-xl font-bold uppercase tracking-tight">Key Features</h3>
                </div>
                <ul className="space-y-6">
                  {features.map(([title, text], index) => (
                    <li key={title} className="flex gap-4">
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest text-[10px] font-bold text-on-brand">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase">{title}</p>
                        <p className="mt-1 text-xs text-muted">{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative overflow-hidden rounded-[2rem] bg-forest p-8 text-on-brand">
                <div className="mb-8 flex items-center">
                  <ClipboardCheck className="mr-3 h-6 w-6" />
                  <h3 className="text-xl font-bold uppercase">Release Criteria</h3>
                </div>
                <div className="space-y-4">
                  {releaseCriteria.map((test) => (
                    <div key={test} className="flex items-start gap-3 rounded-xl bg-black/10 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <p className="text-xs leading-relaxed">{test}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-black/15 pt-8">
                  <p className="text-[10px] font-bold uppercase tracking-widest">Current Phase</p>
                  <p className="mt-1 text-lg font-black">Beta Testing / V1.0</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="start" className="bg-forest py-24 text-on-brand">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-5xl font-black tracking-tight md:text-6xl">Start Contributing.</h2>
            <h2 className="mt-2 text-5xl font-black tracking-tight md:text-6xl">Start Competing.</h2>
            <p className="mb-10 mt-8 text-xl leading-relaxed md:text-2xl">
              Join your fellow students and start turning plastic waste into departmental points today.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a href="/login" className="rounded-full bg-card px-10 py-4 text-lg font-semibold text-ink">Launch Platform</a>
              <a href="/signup" className="rounded-full border-2 border-current px-10 py-4 text-lg font-semibold">Be A Volunteer</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#334155] bg-[#0f172a] py-16 text-[#94a3b8]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#22c55e]">PlastiCycle</span>
              <p className="mt-4 max-w-xs leading-relaxed">
                A data-driven approach to plastic waste management within the Mapúa Malayan Colleges Mindanao community.
              </p>
            </div>
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#f8fafc]">Navigation</h5>
              <ul className="space-y-2 text-xs uppercase tracking-wider">
                <li><a href="#proposal" className="hover:text-[#22c55e]">Proposal</a></li>
                <li><a href="#ai" className="hover:text-[#22c55e]">AI Technology</a></li>
                <li><a href="#sdg" className="hover:text-[#22c55e]">Sustainability</a></li>
              </ul>
            </div>
            <div>
              <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#f8fafc]">Connect</h5>
              <div className="flex gap-4">
                <Twitter className="h-5 w-5" />
                <Facebook className="h-5 w-5" />
                <Linkedin className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="border-t border-[#334155] pt-8 text-center text-xs uppercase tracking-widest">
            &copy; {new Date().getFullYear()} PlastiCycle • Vin Benjamin Belandres • MMCM Sustainability Initiative
          </div>
        </div>
      </footer>
    </div>
  );
}
