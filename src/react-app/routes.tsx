import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { DebugPage } from "./pages/DebugPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SessionPage } from "./pages/SessionPage";
import { TablePage } from "./pages/TablePage";

/** 画面のルート（SPEC §8.1）。まだ作っていない画面は NotFoundPage になる */
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "table", element: <TablePage /> },
      { path: "session", element: <SessionPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "debug", element: <DebugPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
