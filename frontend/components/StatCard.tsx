import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor: string;
  bgColor: string;
}

export default function StatCard({ icon: Icon, label, value, iconColor, bgColor }: StatCardProps) {
  return (
    <div className="bg-background/80 rounded-xl p-6 border border-text/10 hover:border-text/20 transition-all duration-200 cursor-pointer hover:translate-y-[-2px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text/60 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-text">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
