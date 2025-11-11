'use client';

export default function Input({ label, type="text", name, placeholder, required, value, onChange }) {
  return (
    <label className="block text-sm space-y-1">
      <span className="text-gray-700">{label}</span>
      <input
        className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}
