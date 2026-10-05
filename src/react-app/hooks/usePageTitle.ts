import { useEffect } from "react";

const APP_NAME = "復習ドリル";

/** ページごとの <title>（「問題表 ・ 復習ドリル」） */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} ・ ${APP_NAME}` : APP_NAME;
  }, [title]);
}
