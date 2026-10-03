/**
 * Same rules as the backend (@ValidEmail / @GmailAddress), so mistakes are shown before the form is sent.
 */
export const EMAIL_REGEX =
  /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export const GMAIL_REGEX = /^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@gmail\.com$/i;

/** Returns an error message, or undefined when the address is fine. */
export function emailError(value, { required = true } = {}) {
  const email = (value || "").trim();
  if (!email) return required ? "Email is required" : undefined;
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address (e.g. name@gmail.com)";
  return undefined;
}

/** Customer sign-up only accepts Gmail addresses. */
export function gmailError(value) {
  const email = (value || "").trim();
  if (!email) return "Email is required";
  if (!GMAIL_REGEX.test(email)) return "Please use a valid Gmail address (e.g. name@gmail.com)";
  return undefined;
}

export const PHONE_REGEX = /^\+?[0-9]{9,15}$/;

/**
 * Error for client-side checks: useForm shows each message under its field and the first one as a toast.
 * Usage: if (Object.keys(problems).length) throw invalid(problems);
 */
export function invalid(fieldErrors) {
  const err = new Error(Object.values(fieldErrors)[0]);
  err.fieldErrors = fieldErrors;
  return err;
}
