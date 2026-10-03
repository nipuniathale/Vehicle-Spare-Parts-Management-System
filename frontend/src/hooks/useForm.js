import { useState } from "react";
import toast from "react-hot-toast";

/**
 * Small form helper: values, field errors from the backend (fieldErrors) and a submit wrapper.
 */
export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  /** Props for a text/number/select input bound to `name`. */
  const bind = (name) => ({
    name,
    value: values[name] ?? "",
    onChange: (e) => set(name, e.target.type === "checkbox" ? e.target.checked : e.target.value),
  });

  const submit = (action, successMessage) => async (event) => {
    event?.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const result = await action(values);
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (err) {
      setErrors(err.fieldErrors || {});
      toast.error(err.message);
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  return { values, setValues, set, bind, errors, setErrors, saving, submit };
}

/** "" -> null and numeric strings -> numbers, for request bodies. */
export const toNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
export const toText = (value) => (value === "" || value === undefined ? null : value);
