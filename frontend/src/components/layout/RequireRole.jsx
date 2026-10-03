import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homeFor, useAuth } from "../../context/AuthContext";
import Spinner from "../ui/Spinner";

/** Route guard: only lets the listed roles through. */
export default function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homeFor(user)} replace />;
  }
  return <Outlet />;
}
