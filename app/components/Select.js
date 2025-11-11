'use client';

export default function Select({ label, name, value, onChange, options = [] }) {
  return (
    <label className="block text-sm space-y-1">
      <span className="text-gray-700">{label}</span>
      <select
        name={name}
        className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        value={value}
        onChange={onChange}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}
