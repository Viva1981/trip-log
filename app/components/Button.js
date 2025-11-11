'use client';

export default function Button({ children, type = "button", onClick, variant = "primary", disabled }) {
  const base = "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition";
  const styles = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 disabled:bg-sky-300",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:bg-gray-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}
