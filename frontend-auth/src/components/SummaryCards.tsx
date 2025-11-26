import { TrendingUp, TrendingDown } from 'lucide-react';
import { SummaryCard as SummaryCardType } from '../lib/mockData';

interface SummaryCardsProps {
  cards: SummaryCardType[];
}

export default function SummaryCards({ cards }: SummaryCardsProps) {
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      orange: 'bg-orange-50 border-orange-200',
      red: 'bg-red-50 border-red-200',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getTextColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      red: 'text-red-600',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIconBgColor = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100',
      green: 'bg-green-100',
      orange: 'bg-orange-100',
      red: 'bg-red-100',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
      {cards.map(card => (
        <div
          key={card.id}
          className={`p-6 rounded-lg border-2 ${getColorClasses(card.color)} transition-transform hover:scale-105 hover:shadow-lg`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
            <div
              className={`text-2xl ${getIconBgColor(card.color)} p-2 rounded-lg`}
            >
              {card.icon}
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <p
                className={`text-2xl md:text-3xl font-bold ${getTextColorClasses(card.color)}`}
              >
                {card.value}
              </p>
              {card.unit && (
                <p className="text-xs text-gray-500 mt-1">{card.unit}</p>
              )}
            </div>

            {card.change !== undefined && (
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  card.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {card.change >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                {Math.abs(card.change)}%
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
