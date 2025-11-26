'use client';

interface KPIs {
  repTotalDAs: number;
  repTotalData: number;
  globalTotalDAs: number;
  globalTotalData: number;
}

export default function KPICards({ kpis }: { kpis: KPIs }) {
  const cards = [
    {
      title: 'My DA Users',
      value: kpis.repTotalDAs,
      color: 'bg-blue-500',
      icon: '👥',
    },
    {
      title: 'My Total Data Collected',
      value: kpis.repTotalData.toLocaleString(),
      color: 'bg-green-500',
      icon: '📊',
    },
  ];

  const getBorderColor = (color: string) => {
    if (color.includes('blue')) return 'border-blue-600';
    if (color.includes('green')) return 'border-green-600';
    if (color.includes('purple')) return 'border-purple-600';
    return 'border-amber-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${getBorderColor(card.color)} hover:shadow-lg transition`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{card.title}</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">{card.value}</p>
            </div>
            <div className="text-3xl opacity-20">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

