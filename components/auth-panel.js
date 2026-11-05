import Logo from "./logo.js";

export default function AuthPanel({ title, children }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl">
      <img
        src="/images/weigh-in.jpg"
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover object-[center_30%]"
        style={{ filter: "blur(18px)" }}
      />
      <div className="absolute inset-0 bg-[#0f172a]/68" />
      <div className="relative z-10 flex min-h-[28rem] flex-col justify-between p-8 text-[#f8fafc] md:min-h-[40rem]">
        <Logo href="/" light className="text-3xl" />
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">{title}</h1>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#e2e8f0]">{children}</div>
        </div>
      </div>
    </section>
  );
}
