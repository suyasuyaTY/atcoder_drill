import { Link, NavLink } from "react-router";
import styles from "./Header.module.css";

const NAV = [
  { to: "/", label: "ホーム", end: true },
  { to: "/register", label: "登録", end: false },
  { to: "/table", label: "問題表", end: false },
];

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? `${styles.nav} ${styles.active}` : styles.nav);

/** ヘッダー（DESIGN §2 レイアウト、§3 Header）。選択中のナビには NavLink が aria-current="page" を付ける */
export function Header({ atcoderUserId }: { atcoderUserId: string | null }) {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        復習ドリル
      </Link>
      <nav className={styles.navs} aria-label="メイン">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={navClass}>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to="/profile"
        className={({ isActive }) => (isActive ? `${styles.me} ${styles.meActive}` : styles.me)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
        {atcoderUserId ?? "プロフィール"}
      </NavLink>
    </header>
  );
}
