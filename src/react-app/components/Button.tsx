import type { ComponentProps } from "react";
import { Link, type LinkProps } from "react-router";
import { Button as UiButton } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "outline" | "danger" | "link";
type Size = "default" | "sm" | "lg";

const VARIANT = {
  primary: "default",
  secondary: "secondary",
  outline: "outline",
  danger: "destructive",
  /** リンク風のボタン（「取り消す」など） */
  link: "link",
} as const;

/** ボタン（DESIGN §3 Button）。shadcn/ui の Button に、DESIGN の呼び名で渡す */
export function Button({
  variant = "primary",
  size = "default",
  type = "button",
  ...props
}: Omit<ComponentProps<typeof UiButton>, "variant" | "size"> & { variant?: Variant; size?: Size }) {
  return <UiButton variant={VARIANT[variant]} size={size} type={type} {...props} />;
}

/** ボタンの見た目のリンク（「セッションを再開」など、移動するだけの主操作） */
export function LinkButton({
  variant = "primary",
  size = "default",
  className,
  ...props
}: LinkProps & { variant?: Variant; size?: Size }) {
  return (
    <UiButton
      variant={VARIANT[variant]}
      size={size}
      className={className}
      nativeButton={false}
      render={<Link {...props} />}
    />
  );
}
