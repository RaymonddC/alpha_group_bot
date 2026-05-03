interface TierCardProps {
  name: string;
  /** Default FairScore threshold for this tier (admins can override per group). */
  threshold: number;
  description: string;
  /** Tailwind background gradient classes. e.g. `"from-orange-900/30 to-orange-800/20"`. */
  gradientClass: string;
  /** Border classes including the hover state. e.g. `"border-orange-600/30 hover:border-orange-400/50"`. */
  borderClass: string;
  /** Color class for the tier name heading. e.g. `"text-orange-400"`. */
  nameColor: string;
}

export default function TierCard({
  name,
  threshold,
  description,
  gradientClass,
  borderClass,
  nameColor,
}: TierCardProps) {
  return (
    <div
      className={`bg-gradient-to-br ${gradientClass} rounded-xl p-6 border ${borderClass} transition-all duration-200 hover:translate-y-[-4px] shadow-md`}
    >
      <h3 className={`font-heading text-xl font-semibold mb-2 ${nameColor}`}>{name}</h3>
      <p className="text-4xl font-bold mb-2">{threshold}+</p>
      <p className="text-text/60">{description}</p>
    </div>
  );
}
