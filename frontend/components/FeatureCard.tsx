import { ReactNode } from 'react';

interface FeatureCardProps {
  /** Lucide icon (or any node) rendered inside the icon swatch. */
  icon: ReactNode;
  title: string;
  description: string;
  /** Tailwind classes for the icon swatch background. e.g. `"bg-cta/20"`. */
  iconWrapperClass: string;
  /** Tailwind border classes including the hover state. e.g. `"border-primary/20 hover:border-primary/40"`. */
  borderClass: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  iconWrapperClass,
  borderClass,
}: FeatureCardProps) {
  return (
    <div
      className={`bg-background/80 rounded-xl p-8 border ${borderClass} transition-all duration-200 hover:translate-y-[-4px] shadow-md`}
    >
      <div
        className={`w-12 h-12 ${iconWrapperClass} rounded-lg flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <h3 className="font-heading text-xl font-semibold mb-3">{title}</h3>
      <p className="text-text/70">{description}</p>
    </div>
  );
}
