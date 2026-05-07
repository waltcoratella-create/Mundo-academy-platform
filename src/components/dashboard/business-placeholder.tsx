interface Props {
  icon: React.ElementType;
  title: string;
  description: string;
  businessName: string;
}

export function BusinessPlaceholder({ icon: Icon, title, description, businessName }: Props) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 text-sm mt-1">{businessName}</p>
      </div>
      <div className="bg-white rounded-xl border border-dashed border-gray-200 py-24 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon className="w-7 h-7 text-gray-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{description}</p>
          <p className="text-xs text-gray-400 mt-1">Esta sección estará disponible próximamente.</p>
        </div>
      </div>
    </div>
  );
}
