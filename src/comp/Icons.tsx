import { ReactNode, SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  primary?: string;
  secondary?: string;
}

// FIXME: Basically none of the primary/secondary color stuff in this
// module is working properly

export function CopyIcon({
  primary = "fill-white",
  secondary = "fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

export function CopiedIcon({
  primary = "fill-white",
  secondary = "fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12"
      />
    </svg>
  );
}

export function HugeLoadingIcon({className, ...props}: SVGProps<SVGSVGElement>): ReactNode {
  return (<BaseLoadingIcon className={`w-20 h-20 border-4 ${className}`} {...props} />);
}
export function TinyLoadingIcon({className, ...props}: SVGProps<SVGSVGElement>): ReactNode {
  return (<BaseLoadingIcon className={`w-6 h-6 border-[1.75px] ${className}`} {...props} />);
}
export function TextLoadingIcon({className, ...props}: SVGProps<SVGSVGElement>): ReactNode {
  return (<BaseLoadingIcon className={`w-4 h-4 border ${className}`} {...props} />);
}
export function BaseLoadingIcon({className, ...props}: SVGProps<SVGSVGElement>): ReactNode {
  return (
    <LoadingIcon
      primary="fill-white"
      secondary="fill-black"
      className={`rounded-full border-white ${className}`}
      {...props}
    />
  );
}
export function LoadingIcon({primary, secondary, className}: IconProps): ReactNode {
  return (
    <svg className={`animate-spin ${className}`} fill="current" viewBox="0 0 1052 1052">
      <path
        className={primary ? primary : "fill-current"}
        d="M266.89,595.56c-7.36,0-13.8-2.51-19.31-7.57-5.51-5.04-8.26-11.7-8.26-19.98,0-7.34,2.75-13.78,8.28-19.31l68.9-68.9c33.09-33.09,68-49.63,104.75-49.63s73.04,16.09,106.13,48.26l34.46,35.83c11.93,11.95,23.2,20.21,33.75,24.8s21.82,6.89,33.77,6.89,23.2-2.51,33.75-7.57c10.56-5.06,21.82-13.56,33.77-25.51l67.55-67.53c6.42-6.44,12.85-9.66,19.29-9.66,7.34,0,14.01,2.53,19.98,7.59s8.97,12.17,8.97,21.35c0,6.44-3.22,12.87-9.66,19.29l-67.53,68.92c-17.47,17.47-34.93,29.87-52.38,37.21-17.47,7.36-35.38,11.03-53.75,11.03s-36.3-3.67-53.77-11.03c-17.47-7.34-34.46-19.29-50.98-35.83l-35.83-35.83c-22.06-22.04-44.57-33.07-67.53-33.07s-44.12,11.5-66.15,34.46l-68.92,67.53c-5.51,5.51-11.95,8.26-19.29,8.26Z"
      />
    </svg>
  );
}
