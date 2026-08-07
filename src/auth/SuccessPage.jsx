import { Navigate } from "react-router";

export function SuccessPage() {
  return <Navigate to="/admin/dashboard" replace />;
}
