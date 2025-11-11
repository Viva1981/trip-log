export default function Card({ title, subtitle, children, footer }) {
  return (
    <div className="border rounded p-4 bg-white">
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <div className="font-semibold">{title}</div>}
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      )}
      {children}
      {footer && <div className="pt-3 mt-3 border-t">{footer}</div>}
    </div>
  );
}
