import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const MapPinIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const BookmarkIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? 'currentColor' : 'none'}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
export const CompassIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>
);
export const TagIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-8 8z" /><circle cx="7.5" cy="7.5" r="1.5" /></Svg>
);
export const ExternalLinkIcon = (p: IconProps) => (
  <Svg {...p}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" /></Svg>
);
export const FlagIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></Svg>
);
export const LocateIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></Svg>
);
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" /></Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="m5 12 4 4L19 6" /></Svg>
);
