import { Navigate } from "react-router-dom";

export function SuccessPage() {
  return <Navigate to="/dashboard" replace />;
}
