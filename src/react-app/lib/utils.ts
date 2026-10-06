import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind のクラスをまとめる（shadcn/ui の標準） */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
