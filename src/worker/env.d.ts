// wrangler types が拾わない値（secret と、本番の Phase B で足す vars）。
// .dev.vars にない値は Env に入らないので、ここで省略可能として足す。
interface Env {
  AUTH_TOKEN?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}
