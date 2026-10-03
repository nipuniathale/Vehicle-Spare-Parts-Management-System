import { Heart } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";

/** Heart toggle: adds / removes a part from the logged-in customer's wishlist. */
export default function WishlistButton({ part, className = "", withLabel = false }) {
  const { user, isCustomer } = useAuth();
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const saved = has(part.id);

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate("/login", { state: { from: `/parts/${part.id}` } });
    if (!isCustomer) return toast.error("Only customer accounts have a wishlist");
    toggle(part);
  };

  return (
    <button type="button" onClick={onClick} title={saved ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={saved}
      className={`inline-flex items-center justify-center gap-2 transition ${className}`}>
      <Heart className={`h-4 w-4 ${saved ? "fill-accent text-accent" : ""}`} />
      {withLabel && <span>{saved ? "Saved" : "Wishlist"}</span>}
    </button>
  );
}
