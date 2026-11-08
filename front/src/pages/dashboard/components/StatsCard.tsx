interface StatsCardProps {
  title: string;
  value: string;
  unit: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: 'teal' | 'emerald' | 'cyan' | 'sky';
}

export default function StatsCard({ title, value, unit, change, trend, icon, color }: StatsCardProps) {
  const colorClasses = {
    teal: 'bg-emerald-50 text-emerald-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    sky: 'bg-sky-50 text-sky-600'
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  const trendIcons = {
    up: 'ri-arrow-up-line',
    down: 'ri-arrow-down-line',
    neutral: 'ri-subtract-line'
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
          <div className={`inline-flex items-center gap-1 mt-3 px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}>
            <i className={trendIcons[trend]}></i>
            <span>{change}</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <i className={`${icon} text-2xl`}></i>
        </div>
      </div>
    </div>
  );
}