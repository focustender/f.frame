import plusIcon from "../assets/icons/plus.svg";
import plusReadMoreIcon from "../assets/icons/plus-readmore.svg";
import exitIcon from "../assets/icons/plus-exit.svg";
import "./PillButton.css";

// Figma "Read More Button" (8:242): Type=+ (icon only) and Type=Read More + (label + icon).
export function PillButton({
  label,
  onClick,
  disabled,
  title,
}: {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`pill ${label ? "pill--label" : "pill--icon"}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label ?? title}
    >
      {label && <span className="pill__label">{label}</span>}
      <span className="pill__icon">
        <img src={label ? plusReadMoreIcon : plusIcon} alt="" />
      </span>
    </button>
  );
}

// Figma "Exit" (12:333): the + icon rotated -45deg.
export function ExitButton({ onClick, title = "Clear media" }: { onClick: () => void; title?: string }) {
  return (
    <button type="button" className="pill pill--icon pill--exit" onClick={onClick} title={title} aria-label={title}>
      <span className="pill__icon pill__icon--exit">
        <img src={exitIcon} alt="" />
      </span>
    </button>
  );
}
