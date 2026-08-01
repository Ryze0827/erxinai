import { Navigate } from "react-router";

export function SuccessPage() {
  return <Navigate to="/dashboard" replace />;
}
