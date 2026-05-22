import { useState, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface FilterAccordionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

export function FilterAccordion({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: FilterAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-primary/10 last:border-b-0 font-inter">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-primary/5 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <span className="font-poppins font-semibold text-primary-dark text-sm">
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
              {badge}
            </span>
          )}
        </div>
        <ChevronRight
          className={`w-4 h-4 text-primary/60 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
