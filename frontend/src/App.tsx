import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/app/HomePage";
import PriceNegotiationPage from "./pages/app/PriceNegotiationPage";
import TrackPage from "./pages/app/TrackPage";
import ServicesPage from "./pages/app/ServicesPage";
import HistoryPage from "./pages/app/HistoryPage";
import ProfilePage from "./pages/app/ProfilePage";
import AdminPage from "./pages/app/AdminPage";
import SearchingPage from "./pages/app/SearchingPage";
import BookingConfirmedPage from "./pages/app/BookingConfirmedPage";
import BookingRejectedPage from "./pages/app/BookingRejectedPage";
import BookingCancelledPage from "./pages/app/BookingCancelledPage";
import UserRideFeedbackPage from "./pages/app/UserRideFeedbackPage";
import UserPaymentPage from "./pages/app/UserPaymentPage";
import CompletedRidePage from "./pages/app/CompletedRidePage";
import NotFound from "./pages/NotFound";
import RadarPage from "./pages/app/RadarPage";
import RiderShell from "./rider_app/RiderShell";
import RiderHomePage from "./rider_app/RiderHomePage";
import RiderTrackPage from "./rider_app/RiderTrackPage";
import RiderEarningPage from "./rider_app/RiderEarningPage";
import RiderAdvanceBookPage from "./rider_app/RiderAdvanceBookPage";
import RiderProfilePage from "./rider_app/RiderProfilePage";
import RiderRideDetailsPage from "./rider_app/RiderRideDetailsPage";
import RiderPaymentPage from "./rider_app/RiderPaymentPage";
import RiderLoginPage from "./rider_app/RiderLoginPage";
import RiderProtectedRoute from "./rider_app/RiderProtectedRoute";
import RiderFeedbackPage from "./rider_app/RiderFeedbackPage";
import RiderVehicleRegistrationPage from "./rider_app/RiderVehicleRegistrationPage";
import AdminV2LoginPage from "./admin_v2/pages/AdminLoginPage";
import AdminV2PanelPage from "./admin_v2/pages/AdminPanelPage";
import AdminV2Protected from "./admin_v2/components/AdminProtected";
import { LocationGuard } from "./components/LocationGuard";

const App = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Navigate to="/app/home" replace />} />
        <Route path="/admin" element={<Navigate to="/admin-v2" replace />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin-v2/login" element={<AdminV2LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/customer/auth" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/rider/login" element={<RiderLoginPage />} />

        <Route
          path="/rider"
          element={
            <RiderProtectedRoute>
              <LocationGuard>
                <RiderShell />
              </LocationGuard>
            </RiderProtectedRoute>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<RiderHomePage />} />
          <Route path="track" element={<RiderTrackPage />} />
          <Route path="earning" element={<RiderEarningPage />} />
          <Route path="advance" element={<RiderAdvanceBookPage />} />
          <Route path="profile" element={<RiderProfilePage />} />
          <Route path="ride/:rideId" element={<RiderRideDetailsPage />} />
          <Route path="payment/:rideId" element={<RiderPaymentPage />} />
          <Route path="feedback/:rideId" element={<RiderFeedbackPage />} />
          <Route path="vehicle/new" element={<RiderVehicleRegistrationPage />} />
        </Route>

        <Route
          path="/admin-v2"
          element={
            <AdminV2Protected>
              <AdminV2PanelPage />
            </AdminV2Protected>
          }
        />

        <Route
          path="/app/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <LocationGuard>
                <AppShell />
              </LocationGuard>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="home/destination-location-picker" element={<HomePage />} />
          <Route path="price_negotiation" element={<PriceNegotiationPage />} />
          <Route path="reservation/price_negotion" element={<HomePage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="searching" element={<SearchingPage />} />
          <Route path="booking-confirmed" element={<BookingConfirmedPage />} />
          <Route path="booking-rejected" element={<BookingRejectedPage />} />
          <Route path="booking-cancelled" element={<BookingCancelledPage />} />
          <Route path="payment/:rideId" element={<UserPaymentPage />} />
          <Route path="feedback" element={<UserRideFeedbackPage />} />
          <Route path="completed-ride/:id" element={<CompletedRidePage />} />
          <Route path="radar" element={<RadarPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
