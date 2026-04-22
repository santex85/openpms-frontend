import { lazy, Suspense, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useSearchParams,
} from "react-router-dom";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const BoardPage = lazy(() =>
  import("@/pages/BoardPage").then((m) => ({ default: m.BoardPage }))
);
const BookingDetailPage = lazy(() =>
  import("@/pages/BookingDetailPage").then((m) => ({
    default: m.BookingDetailPage,
  }))
);
const BookingsListPage = lazy(() =>
  import("@/pages/BookingsListPage").then((m) => ({
    default: m.BookingsListPage,
  }))
);
const GuestsPage = lazy(() =>
  import("@/pages/GuestsPage").then((m) => ({ default: m.GuestsPage }))
);
const GuestDetailPage = lazy(() =>
  import("@/pages/GuestDetailPage").then((m) => ({
    default: m.GuestDetailPage,
  }))
);
const RatesPage = lazy(() =>
  import("@/pages/RatesPage").then((m) => ({ default: m.RatesPage }))
);
const RoomsPage = lazy(() =>
  import("@/pages/RoomsPage").then((m) => ({ default: m.RoomsPage }))
);
const HousekeepingPage = lazy(() =>
  import("@/pages/HousekeepingPage").then((m) => ({
    default: m.HousekeepingPage,
  }))
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const OnboardingPage = lazy(() =>
  import("@/pages/OnboardingPage").then((m) => ({ default: m.OnboardingPage }))
);

const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("@/pages/ForgotPasswordPage").then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
const ResetPasswordPage = lazy(() =>
  import("@/pages/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  }))
);

function FullScreenFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{t("app.loading")}</p>
    </div>
  );
}

function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">{t("app.loading")}</p>
    </div>
  );
}

function AuthSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullScreenFallback />}>{children}</Suspense>;
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

/** Preserves `?entity_id=` from legacy `/audit-log` links when redirecting to Settings. */
function AuditLogRedirect() {
  const [searchParams] = useSearchParams();
  const entityId = searchParams.get("entity_id");
  const q =
    entityId !== null && entityId.trim() !== ""
      ? `?audit_entity_id=${encodeURIComponent(entityId.trim())}`
      : "";
  return <Navigate to={`/settings${q}#developer-audit`} replace />;
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route
          path="/login"
          element={
            <AuthSuspense>
              <LoginPage />
            </AuthSuspense>
          }
        />
        <Route
          path="/register"
          element={
            <AuthSuspense>
              <RegisterPage />
            </AuthSuspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthSuspense>
              <ForgotPasswordPage />
            </AuthSuspense>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AuthSuspense>
              <ResetPasswordPage />
            </AuthSuspense>
          }
        />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route
            index
            element={
              <LazyPage>
                <DashboardPage />
              </LazyPage>
            }
          />
          <Route
            path="onboarding"
            element={
              <LazyPage>
                <OnboardingPage />
              </LazyPage>
            }
          />
          <Route
            path="board"
            element={
              <LazyPage>
                <BoardPage />
              </LazyPage>
            }
          />
          <Route
            path="bookings"
            element={
              <LazyPage>
                <BookingsListPage />
              </LazyPage>
            }
          />
          <Route
            path="bookings/:id"
            element={
              <LazyPage>
                <BookingDetailPage />
              </LazyPage>
            }
          />
          <Route
            path="guests"
            element={
              <LazyPage>
                <GuestsPage />
              </LazyPage>
            }
          />
          <Route
            path="guests/:id"
            element={
              <LazyPage>
                <GuestDetailPage />
              </LazyPage>
            }
          />
          <Route
            path="rates"
            element={
              <LazyPage>
                <RatesPage />
              </LazyPage>
            }
          />
          <Route
            path="rooms"
            element={
              <LazyPage>
                <RoomsPage />
              </LazyPage>
            }
          />
          <Route path="audit-log" element={<AuditLogRedirect />} />
          <Route
            path="housekeeping"
            element={
              <LazyPage>
                <HousekeepingPage />
              </LazyPage>
            }
          />
          <Route
            path="settings"
            element={
              <LazyPage>
                <SettingsPage />
              </LazyPage>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
