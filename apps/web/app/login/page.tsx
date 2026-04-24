import { AuthLayout } from "../../components/auth-layout";
import { LoginForm } from "../../components/login-form";

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Continue where your news intelligence left off.">
      <LoginForm />
    </AuthLayout>
  );
}
