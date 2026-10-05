"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { LogoMark, Wordmark } from "@/components/Logo";
import { ChartIcon, ClockIcon, GearIcon, HomeIcon, InboxIcon, MailIcon, SearchIcon, SparkIcon } from "./icons";
import s from "./AppShell.module.css";

const PRIMARY = [
  { href: "/app", label: "Home", icon: HomeIcon, exact: true },
  { href: "/app/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/app/follow-ups", label: "Follow-ups", icon: ClockIcon },
  { href: "/app/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/app/analyze", label: "Analyze", icon: SparkIcon },
];

const SECONDARY = [
  { href: "/app/settings#gmail", label: "Gmail", icon: MailIcon },
  { href: "/app/settings", label: "Settings", icon: GearIcon, exact: true },
];

type Props = {
  children: ReactNode;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  gmailEmail: string | null;
  counts: { attention: number; due: number };
};

export function AppShell({ children, businessName, ownerName, ownerEmail, gmailEmail, counts }: Props) {
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const badge = (href: string) =>
    href === "/app/inbox" && counts.attention ? counts.attention : href === "/app/follow-ups" && counts.due ? counts.due : null;

  const initial = (ownerName || ownerEmail).charAt(0).toUpperCase();

  return (
    <div className={`${s.shell} ui-surface`}>
      <a href="#main" className={s.skip}>
        Skip to content
      </a>

      <aside className={s.sidebar} aria-label="FollowUpOS">
        <Link href="/app" className={s.brand}>
          <Wordmark />
        </Link>
        <p className={s.business}>{businessName}</p>
        <nav className={s.nav} aria-label="Main">
          {PRIMARY.map(({ href, label, icon: Icon, exact }) => (
            <Link key={href} href={href} className={s.link} aria-current={isActive(href, exact) ? "page" : undefined}>
              <Icon />
              <span>{label}</span>
              {badge(href) && <b className={s.badge}>{badge(href)}</b>}
            </Link>
          ))}
          <hr className={s.rule} />
          {SECONDARY.map(({ href, label, icon: Icon, exact }) => (
            <Link key={href} href={href} className={s.link} aria-current={!href.includes("#") && isActive(href, exact) ? "page" : undefined}>
              <Icon />
              <span>{label}</span>
              {label === "Gmail" && <i className={s.dot} data-on={Boolean(gmailEmail)} aria-label={gmailEmail ? "connected" : "not connected"} />}
            </Link>
          ))}
        </nav>
        <p className={s.principle}>Nothing is sent without your approval.</p>
      </aside>

      <div className={s.main}>
        <header className={s.topbar}>
          <Link href="/app" className={s.mobileBrand} aria-label="FollowUpOS home">
            <LogoMark size={22} />
          </Link>
          <form
            className={s.search}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
              router.push(q ? `/app/inbox?q=${encodeURIComponent(q)}` : "/app/inbox");
            }}
          >
            <SearchIcon size={16} />
            <label htmlFor="global-search" className="sr-only">
              Search conversations
            </label>
            <input id="global-search" name="q" placeholder="Search customers, emails, messages…" autoComplete="off" />
          </form>
          <div className={s.account} ref={menuRef}>
            <button className={s.avatar} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              {initial}
              <span className="sr-only">Account menu</span>
            </button>
            {menu && (
              <div className={s.menu} role="menu">
                <div className={s.menuWho}>
                  <strong>{ownerName || "Your account"}</strong>
                  <span>{ownerEmail}</span>
                </div>
                <Link role="menuitem" href="/app/settings" onClick={() => setMenu(false)}>
                  Settings
                </Link>
                <Link role="menuitem" href="/" onClick={() => setMenu(false)}>
                  FollowUpOS website
                </Link>
                <form action="/auth/signout" method="post">
                  <button role="menuitem" type="submit">
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <main id="main" className={s.content} tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className={s.tabbar} aria-label="Main">
        {[...PRIMARY.slice(0, 3), PRIMARY[4], SECONDARY[1]].map(({ href, label, icon: Icon, exact }) => (
          <Link key={href} href={href} aria-current={isActive(href, exact) ? "page" : undefined}>
            <span className={s.tabIcon}>
              <Icon size={20} />
              {badge(href) && <b>{badge(href)}</b>}
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
