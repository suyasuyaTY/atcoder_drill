import { defineConfig } from "vitest/config";

// vite.config.ts の cloudflare() を読み込まないよう、テスト用は分けている
export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
	},
});
