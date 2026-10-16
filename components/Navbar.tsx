"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, History, Settings, Lock } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  // On the terminal/relogio screen, navbar must NEVER appear (dedicated hardware kiosk mode)
  const isTerminal = pathname.startsWith("/relogio") || pathname.startsWith("/terminal");
  if (isTerminal) return null;

  const navLinks = [
    { href: "/", label: "Painel", icon: LayoutDashboard },
    { href: "/funcionarios", label: "Colaboradores", icon: Users },
    { href: "/relatorios", label: "Relatórios & Logs", icon: History },
    { href: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d0e12]/95 backdrop-blur-md border-b border-[#1f2129] text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#181a22] border border-[#2c303e] flex items-center justify-center text-zinc-200 group-hover:border-zinc-400 transition-colors">
                <Clock className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm tracking-tight font-bold text-white">
                  PONTO.BIO
                </span>
                <span className="hidden sm:inline-block font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                  Supabase
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                    isActive
                      ? "bg-[#181a24] text-white border border-[#2e3244]"
                      : "text-zinc-400 hover:text-white hover:bg-[#14161e]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action: Open Clock Terminal (Private Route) */}
          <div className="flex items-center gap-3">
            <Link
              href="/relogio"
              className="flex items-center gap-2 bg-[#12141a] hover:bg-[#1a1d26] text-emerald-400 border border-emerald-500/30 font-mono text-xs uppercase font-bold px-3.5 py-2 rounded-xl transition transform active:scale-95 shadow-sm"
              title="Abrir terminal em modo relógio de ponto físico"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>TERMINAL DO RELÓGIO</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden border-t border-[#1f2129] bg-[#0d0e12] px-3 py-1.5 flex justify-around">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded font-mono text-[10px] uppercase font-semibold ${
                isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
