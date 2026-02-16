interface TierBadgeProps {
  tier: string;
}

export default function TierBadge({ tier }: TierBadgeProps) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    bronze: {
      bg: 'bg-orange-900/20',
      text: 'text-orange-400',
      border: 'border-orange-600/30',
    },
    silver: {
      bg: 'bg-gray-700/20',
      text: 'text-gray-300',
      border: 'border-gray-400/30',
    },
    gold: {
      bg: 'bg-yellow-700/20',
      text: 'text-yellow-300',
      border: 'border-yellow-400/30',
    },
    none: {
      bg: 'bg-red-900/20',
      text: 'text-red-400',
      border: 'border-red-600/30',
    },
  };

  const color = colors[tier] || colors.none;

  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}
    >
      {tier.toUpperCase()}
    </span>
  );
}
