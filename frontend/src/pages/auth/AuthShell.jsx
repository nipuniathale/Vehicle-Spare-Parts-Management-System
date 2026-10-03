import Logo from "../../components/layout/Logo";

/** Split layout used by the login and register pages. */
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <img src="/bglogin.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/70 to-accent/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo dark />
          <div>
            <h2 className="max-w-md font-display text-4xl font-bold leading-tight">Genuine parts. Right fit. Delivered fast.</h2>
            <p className="mt-4 max-w-md text-white/70">Shop thousands of spare parts, track your orders and claim warranty online.</p>
          </div>
          <p className="text-xs text-white/50">© {new Date().getFullYear()} AutoHub Lanka</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
