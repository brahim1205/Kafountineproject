interface StatsCardProps {
  icon: string;
  label: string;
  value: string;
  bgColor: string;
  iconColor: string;
}

export default function StatsCard({ icon, label, value, bgColor, iconColor }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
          <i className={`${icon} text-xl ${iconColor}`}></i>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
}