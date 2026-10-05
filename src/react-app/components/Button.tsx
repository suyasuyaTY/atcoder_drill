import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "outline" | "danger";

/** ボタン（DESIGN §3 Button） */
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const cls = [styles.button, styles[variant], className].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...props} />;
}
