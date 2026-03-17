import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useAccount } from "wagmi";

export function RequireWallet({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const location = useLocation();

  if (!isConnected) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
