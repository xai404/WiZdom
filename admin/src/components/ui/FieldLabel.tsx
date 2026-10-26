// Form label for Input / Select. A label ending in " *" marks a mandatory
// field — the asterisk is drawn in red.
const FieldLabel = ({ htmlFor, label }: { htmlFor?: string; label: string }) => {
  const required = label.endsWith(' *');
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {required ? label.slice(0, -2) : label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
};

export default FieldLabel;
