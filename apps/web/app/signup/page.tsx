import { AuthLayout } from "../../components/auth-layout";
import { SignupForm } from "../../components/signup-form";

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your Newslytic account"
      subtitle="Personalized, verified, and low-noise news starts in under a minute."
    >
      <SignupForm />
    </AuthLayout>
  );
}
