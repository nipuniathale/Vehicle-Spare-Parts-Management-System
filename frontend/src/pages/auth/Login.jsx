import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import GoogleButton from "../../components/auth/GoogleButton";
import Button from "../../components/ui/Button";
import Field, { Input } from "../../components/ui/Field";
import { homeFor, useAuth } from "../../context/AuthContext";
import { useForm } from "../../hooks/useForm";
import { emailError, invalid } from "../../utils/validation";
import AuthShell from "./AuthShell";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm({ email: "", password: "" });

  const goHome = (user) => {
    const from = location.state?.from;
    navigate(from && user.role === "CUSTOMER" ? from : homeFor(user), { replace: true });
  };

  const onSubmit = form.submit(async ({ email, password }) => {
    const problem = emailError(email);
    if (problem) {
      throw invalid({ email: problem });
    }
    goHome(await login(email.trim(), password));
  });

  const onGoogle = async (credential) => {
    try {
      const user = await loginWithGoogle(credential);
      toast.success(`Welcome, ${user.firstName}!`);
      goHome(user);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Login to your AutoHub account.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" error={form.errors.email} required>
          <Input type="email" autoComplete="email" {...form.bind("email")} error={form.errors.email} placeholder="you@gmail.com" />
        </Field>
        <Field label="Password" error={form.errors.password} required>
          <Input type="password" autoComplete="current-password" {...form.bind("password")} error={form.errors.password} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={form.saving}>Login</Button>
      </form>

      <GoogleButton onCredential={onGoogle} text="signin_with" />

      <p className="mt-6 text-center text-sm text-muted">
        New to AutoHub? <Link to="/register" className="font-semibold text-accent">Create an account</Link>
      </p>
    </AuthShell>
  );
}
