import { createBrowserRouter } from "react-router";
import { AppLayout } from "./components/AppLayout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
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
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
