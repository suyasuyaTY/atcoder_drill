import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
	plugins: [react(), tailwindcss(), cloudflare()],
	resolve: {
		// shadcn/ui の import（@/components/ui/...）。@ は src/react-app
		alias: { "@": fileURLToPath(new URL("./src/react-app", import.meta.url)) },
	},
});
