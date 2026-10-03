import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "./Field";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/** Paste an image URL or upload a file to Cloudinary. */
export default function ImageInput({ value, onChange, folder = "autohub", error }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be smaller than 5 MB");
    if (!CLOUD_NAME || !UPLOAD_PRESET) return toast.error("Cloudinary is not configured in .env - paste an image URL instead");

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    form.append("folder", folder);

    setUploading(true);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
      onChange(data.secure_url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-4 w-4 text-muted" />}
      </div>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload" error={error} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-semibold text-ink ring-1 ring-inset ring-line hover:bg-white"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        Upload
      </button>
    </div>
  );
}
