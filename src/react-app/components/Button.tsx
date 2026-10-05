import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";
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

/** ボタンの見た目のリンク（「セッションを再開」など、移動するだけの主操作） */
export function LinkButton({ variant = "primary", className, ...props }: LinkProps & { variant?: Variant }) {
  const cls = [styles.button, styles[variant], className].filter(Boolean).join(" ");
  return <Link className={cls} {...props} />;
}
