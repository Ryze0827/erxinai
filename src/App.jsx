import { Navigate, Route, Routes } from "react-router";
import { EmailVerifyPage } from "./auth/EmailVerifyPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./auth/PasswordPages";
import { LoginPage } from "./auth/LoginPage";
import { OAuthCallbackPage } from "./auth/OAuthCallbackPage";
import { RegisterPage } from "./auth/RegisterPage";
import { SessionManager } from "./auth/SessionManager";
import { AppicaLandingPage } from "./landing/AppicaLandingPage";
import { ConsoleProvider } from "./console/ConsoleContext";
import { ConsoleLayout, ProtectedRoute } from "./console/ConsoleLayout";
import { LocaleProvider } from "./console/i18n";
import { DashboardPage } from "./console/pages/DashboardPage";
import { KeysPage } from "./console/pages/KeysPage";
import { UsagePage } from "./console/pages/UsagePage";
import { SubscriptionsPage } from "./console/pages/SubscriptionsPage";
import { RedeemPage } from "./console/pages/RedeemPage";
import { ChannelsPage } from "./console/pages/ChannelsPage";
import { MonitorPage } from "./console/pages/MonitorPage";
import { AffiliatePage } from "./console/pages/AffiliatePage";
import { ProfilePage } from "./console/pages/ProfilePage";
import { BatchImagesPage } from "./console/pages/BatchImagesPage";
import { CustomPage } from "./console/pages/CustomPage";
import { ImageApiDocsPage } from "./console/pages/ImageApiDocsPage";
import { ImageStudioPage } from "./console/pages/ImageStudioPage";
import { VideoWorkflowPage } from "./console/pages/VideoWorkflowPage";
import { KeyUsagePage } from "./console/pages/KeyUsagePage";
import { AirwallexPaymentPage, OrdersPage, PaymentQRCodePage, PaymentResultPage, PurchasePage, StripePaymentPage, StripePopupPage, WeChatPaymentCallbackPage } from "./console/pages/Payments";

function ConsoleRoute({ children, ...guard }) {
  return <ProtectedRoute {...guard}><ConsoleLayout>{children}</ConsoleLayout></ProtectedRoute>;
}

export function App() {
  return (
    <LocaleProvider>
      <ConsoleProvider>
        <SessionManager />
        <Routes>
          <Route path="/" element={<AppicaLandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/email-verify" element={<EmailVerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/success" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/auth/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/auth/linuxdo/callback" element={<OAuthCallbackPage provider="linuxdo" />} />
          <Route path="/auth/wechat/callback" element={<OAuthCallbackPage provider="wechat" />} />
          <Route path="/auth/dingtalk/callback" element={<OAuthCallbackPage provider="dingtalk" />} />
          <Route path="/auth/dingtalk/email-completion" element={<OAuthCallbackPage provider="dingtalk" initialPhase="create" />} />
          <Route path="/auth/oidc/callback" element={<OAuthCallbackPage provider="oidc" />} />
          <Route path="/auth/wechat/payment/callback" element={<WeChatPaymentCallbackPage />} />

          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<ConsoleRoute><DashboardPage /></ConsoleRoute>} />
          <Route path="/keys" element={<ConsoleRoute><KeysPage /></ConsoleRoute>} />
          <Route path="/batch-image" element={<ConsoleRoute standardOnly><BatchImagesPage /></ConsoleRoute>} />
          <Route path="/docs/batch-image" element={<ConsoleRoute standardOnly><BatchImagesPage /></ConsoleRoute>} />
          <Route path="/usage" element={<ConsoleRoute standardOnly><UsagePage /></ConsoleRoute>} />
          <Route path="/redeem" element={<ConsoleRoute standardOnly><RedeemPage /></ConsoleRoute>} />
          <Route path="/affiliate" element={<ConsoleRoute standardOnly feature="affiliate_enabled"><AffiliatePage /></ConsoleRoute>} />
          <Route path="/available-channels" element={<ConsoleRoute standardOnly feature="available_channels_enabled"><ChannelsPage /></ConsoleRoute>} />
          <Route path="/monitor" element={<ConsoleRoute feature="channel_monitor_enabled" mode="opt-out"><MonitorPage /></ConsoleRoute>} />
          <Route path="/profile" element={<ConsoleRoute><ProfilePage /></ConsoleRoute>} />
          <Route path="/image-studio" element={<ConsoleRoute><ImageStudioPage /></ConsoleRoute>} />
          <Route path="/image-api-docs" element={<ConsoleRoute><ImageApiDocsPage /></ConsoleRoute>} />
          <Route path="/video-workflow" element={<ConsoleRoute><VideoWorkflowPage /></ConsoleRoute>} />
          <Route path="/subscriptions" element={<ConsoleRoute standardOnly><SubscriptionsPage /></ConsoleRoute>} />
          <Route path="/purchase" element={<ConsoleRoute standardOnly feature="payment_enabled" mode="opt-out"><PurchasePage /></ConsoleRoute>} />
          <Route path="/orders" element={<ConsoleRoute standardOnly feature="payment_enabled" mode="opt-out"><OrdersPage /></ConsoleRoute>} />
          <Route path="/payment/qrcode" element={<ProtectedRoute standardOnly feature="payment_enabled" mode="opt-out"><PaymentQRCodePage /></ProtectedRoute>} />
          <Route path="/custom/:id" element={<ConsoleRoute><CustomPage /></ConsoleRoute>} />

          <Route path="/key-usage" element={<KeyUsagePage />} />
          <Route path="/payment/result" element={<PaymentResultPage />} />
          <Route path="/payment/stripe" element={<StripePaymentPage />} />
          <Route path="/payment/stripe-popup" element={<StripePopupPage />} />
          <Route path="/payment/airwallex" element={<AirwallexPaymentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConsoleProvider>
    </LocaleProvider>
  );
}
