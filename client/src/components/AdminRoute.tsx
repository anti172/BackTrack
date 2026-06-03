import { Navigate } from 'react-router-dom';
import { isAdminLoggedIn } from '../auth/adminAuth';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
