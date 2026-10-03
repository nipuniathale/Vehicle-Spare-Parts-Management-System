import { Camera, ImageMinus, KeyRound, Loader2, Trash2, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { userApi } from "../../api/endpoints";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field, { Input, Textarea } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { runAction } from "../../hooks/useApi";
import { useConfirm } from "../../hooks/useConfirm";
import { toText, useForm } from "../../hooks/useForm";
import { invalid } from "../../utils/validation";

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const profile = useForm({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || "", address: user.address || "" });
  const password = useForm({ currentPassword: "", newPassword: "", confirm: "" });
  // accounts created with "Continue with Google" have no password until the user chooses one
  const hasPassword = user.passwordSet !== false;

  const saveProfile = profile.submit(async (v) => {
    setUser(await userApi.updateMe({ ...v, phone: toText(v.phone), address: toText(v.address) }));
  }, "Profile updated");

  const savePassword = password.submit(async (v) => {
    if (v.newPassword !== v.confirm) {
      throw invalid({ confirm: "Passwords do not match" });
    }
    await userApi.changePassword({ currentPassword: hasPassword ? v.currentPassword : null, newPassword: v.newPassword });
    password.setValues({ currentPassword: "", newPassword: "", confirm: "" });
    if (!hasPassword) setUser({ ...user, passwordSet: true });
  }, hasPassword ? "Password changed" : "Password set - you can now also log in with your email and password");

  const deleteAccount = () =>
    confirm.ask({
      title: "Delete your account?",
      message: "Your account, cart and feedback will be permanently deleted. Accounts with orders cannot be deleted.",
      confirmLabel: "Delete account",
      action: async () => {
        const ok = await runAction(() => userApi.deleteMe(), "Your account has been deleted");
        if (ok) {
          logout();
          navigate("/");
        }
        return ok;
      },
    });

  const pe = profile.errors;
  const we = password.errors;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">My profile</h1>
      <p className="mt-1 text-sm text-muted">{user.email}{user.authProvider === "GOOGLE" ? " · signed up with Google" : ""}</p>

      <ProfilePicture user={user} onChange={setUser} confirm={confirm} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><UserRound className="h-5 w-5 text-accent" /> Personal details</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={pe.firstName} required><Input {...profile.bind("firstName")} error={pe.firstName} /></Field>
            <Field label="Last name" error={pe.lastName} required><Input {...profile.bind("lastName")} error={pe.lastName} /></Field>
          </div>
          <Field label="Phone" error={pe.phone} hint="Used for deliveries - you can also enter it at checkout"><Input {...profile.bind("phone")} error={pe.phone} /></Field>
          <Field label="Default delivery address" error={pe.address}><Textarea rows={3} {...profile.bind("address")} error={pe.address} /></Field>
          <Button type="submit" loading={profile.saving}>Save changes</Button>
        </form>

        <div className="space-y-6">
          <form onSubmit={savePassword} className="card space-y-4 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><KeyRound className="h-5 w-5 text-accent" /> {hasPassword ? "Change password" : "Set a password"}</h2>
            {!hasPassword && <p className="text-xs text-muted">You signed up with Google. Choose a password if you also want to log in with your email address.</p>}
            {hasPassword && <Field label="Current password" error={we.currentPassword} required><Input type="password" {...password.bind("currentPassword")} error={we.currentPassword} /></Field>}
            <Field label="New password" error={we.newPassword} required><Input type="password" {...password.bind("newPassword")} error={we.newPassword} /></Field>
            <Field label="Confirm new password" error={we.confirm} required><Input type="password" {...password.bind("confirm")} error={we.confirm} /></Field>
            <Button type="submit" loading={password.saving}>{hasPassword ? "Update password" : "Set password"}</Button>
          </form>

          <div className="card border-danger/30 p-6">
            <h2 className="font-display text-lg font-bold text-danger">Delete account</h2>
            <p className="mt-1 text-sm text-muted">Permanently remove your account.</p>
            <Button variant="danger" icon={Trash2} className="mt-4" onClick={deleteAccount}>Delete my account</Button>
          </div>
        </div>
      </div>
      <ConfirmDialog {...confirm.props} />
    </div>
  );
}

const MAX_SIZE = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Add, change or remove the profile picture (shown in the header, on reviews and on feedback). */
function ProfilePicture({ user, onChange, confirm }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasPicture = Boolean(user.profileImageUrl);

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("Please choose a JPG, PNG, WEBP or GIF image");
    if (file.size > MAX_SIZE) return setError("The picture must be 2 MB or smaller");
    setError("");
    setBusy(true);
    try {
      onChange(await userApi.uploadAvatar(file));
      toast.success(hasPicture ? "Profile picture changed" : "Profile picture added");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    confirm.ask({
      title: "Remove profile picture?",
      message: "Your initials will be shown instead.",
      confirmLabel: "Remove",
      action: async () => {
        try {
          onChange(await userApi.removeAvatar());
          toast.success("Profile picture removed");
          return true;
        } catch (err) {
          toast.error(err.message);
          return false;
        }
      },
    });

  return (
    <div className="card mt-8 flex flex-col items-center gap-5 p-6 sm:flex-row">
      <div className="relative">
        <Avatar src={user.profileImageUrl} name={user.fullName} size="xl" className="ring-4" />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </span>
        )}
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h2 className="font-display text-lg font-bold">Profile picture</h2>
        <p className="mt-1 text-sm text-muted">
          Shown in the header and next to your reviews and feedback. JPG, PNG, WEBP or GIF, up to 2 MB.
        </p>
        {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
          <input ref={fileRef} type="file" accept={TYPES.join(",")} className="hidden" onChange={choose} data-testid="avatar-input" />
          <Button icon={Camera} onClick={() => fileRef.current?.click()} disabled={busy}>
            {hasPicture ? "Change picture" : "Add picture"}
          </Button>
          {hasPicture && (
            <Button variant="secondary" icon={ImageMinus} onClick={remove} disabled={busy}>Remove</Button>
          )}
        </div>
      </div>
    </div>
  );
}
