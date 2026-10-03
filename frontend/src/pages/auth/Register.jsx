import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import GoogleButton from "../../components/auth/GoogleButton";
import Button from "../../components/ui/Button";
import Field, { Input } from "../../components/ui/Field";
import { homeFor, useAuth } from "../../context/AuthContext";
import { useForm } from "../../hooks/useForm";
import { gmailError, invalid } from "../../utils/validation";
import AuthShell from "./AuthShell";

/** Customer sign-up. Phone number and delivery address are asked later, at checkout. */
export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ firstName: "", lastName: "", email: "", password: "", confirm: "" });
  const e = form.errors;

  const onSubmit = form.submit(async (values) => {
    const problems = {};
    const email = gmailError(values.email);
    if (email) problems.email = email;
    if (values.password !== values.confirm) problems.confirm = "Passwords do not match";
    if (Object.keys(problems).length) {
      throw invalid(problems);
    }
    await register({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email.trim(),
      password: values.password,
    });
    navigate("/", { replace: true });
  }, "Welcome to AutoHub!");

  const onGoogle = async (credential) => {
    try {
      const user = await loginWithGoogle(credential);
      toast.success(`Welcome, ${user.firstName}!`);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Order parts, track deliveries and manage warranty claims.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" error={e.firstName} required><Input {...form.bind("firstName")} error={e.firstName} /></Field>
          <Field label="Last name" error={e.lastName} required><Input {...form.bind("lastName")} error={e.lastName} /></Field>
        </div>
        <Field label="Gmail address" error={e.email} required hint="Only @gmail.com addresses can be used to sign up">
          <Input type="email" autoComplete="email" placeholder="name@gmail.com" {...form.bind("email")} error={e.email} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" error={e.password} required hint="At least 6 characters"><Input type="password" autoComplete="new-password" {...form.bind("password")} error={e.password} /></Field>
          <Field label="Confirm password" error={e.confirm} required><Input type="password" autoComplete="new-password" {...form.bind("confirm")} error={e.confirm} /></Field>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={form.saving}>Create account</Button>
        <p className="text-xs text-muted">Your phone number and delivery address are asked when you place your first order.</p>
      </form>

      <GoogleButton onCredential={onGoogle} text="signup_with" />

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-semibold text-accent">Login</Link>
      </p>
    </AuthShell>
  );
}
