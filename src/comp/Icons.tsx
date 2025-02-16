"use client";
import type { UrbitClan } from '@/type/slab';
import { ReactNode, SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  primary?: string;
  secondary?: string;
}

// FIXME: Basically none of the primary/secondary color stuff in this
// module is working properly

export function SignIcon({
  primary="fill-white",
  secondary="fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

export function SendIcon({
  primary="fill-white",
  secondary="fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
      />
    </svg>
  );
}

export function ErrorIcon({
  primary="fill-white",
  secondary="fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}

export function CopyIcon({
  primary="fill-white",
  secondary="fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

export function CopiedIcon({
  primary="fill-white",
  secondary="fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12"
      />
    </svg>
  );
}

export function AzimuthIcon({
  primary="fill-white",
  secondary="fill-black",
  className
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
      <g transform="matrix(0.02110092,0,0,0.02110092,-0.66060426,-0.63932184)">
        <path
           d="m 55.002453,793.99414 c 0,-336.00049 242.999987,-610.00049 544.999997,-610.00049 302.00002,0 545.00005,274 545.00005,610.00049 0,130 -250.00005,219.99996 -545.00005,219.99996 -294.00001,0 -544.999997,-89.99996 -544.999997,-219.99996 z m 844.999987,135 c -1,-89 -12,-175 -34,-259 -5,-16 8,-31 24,-31 12,0 22,8 25,18 21,83 32,169 35,257 89.99996,-32 144.99996,-75 144.99996,-120 0,-284.00049 -182.99996,-515.00049 -421.99996,-552.00049 48,46 89,96 123,148 9,14 1,39 -21,39 -9,0 -16,-5 -21,-12 -43,-67 -97,-128 -163,-183 -263,5 -474,238 -485,535.00049 h 664 c 14,0 25,11 25,25 0,14 -11,25 -25,25 h -656 c 34.00001,79 234,145 486,145 115,0 218,-13 300,-35 z m -325,-525.00049 c 0,-14 11,-25 25,-25 14,0 25,11 25,25 0,14 -11,25 -25,25 -14,0 -25,-11 -25,-25 z m 0,130 c 0,-14 11,-25 25,-25 14,0 25,11 25,25 0,14 -11,25 -25,25 -14,0 -25,-11 -25,-25 z m 0,130.00049 c 0,-14 11,-25 25,-25 14,0 25,11 25,25 0,14 -11,25 -25,25 -14,0 -25,-11 -25,-25 z m 246,-130.00049 c 0,-14 11,-25 25,-25 14,0 25,11 25,25 0,14 -11,25 -25,25 -14,0 -25,-11 -25,-25 z"
        />
      </g>
    </svg>
  );
}

export function ClanIcon({
  clan,
  ...props
}: { clan: UrbitClan; } & IconProps): ReactNode {
  return (clan === "galaxy") ? (
    <GalaxyIcon {...props} />
  ) : (clan === "star") ? (
    <StarIcon {...props} />
  ) : (clan === "planet") ? (
    <PlanetIcon {...props} />
  ) : (
    <ErrorIcon {...props} />
  );
}

export function GalaxyIcon({
  primary="fill-white",
  secondary="fill-black",
  className,
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
      <g transform="matrix(0.02018349,0,0,0.02018349,-0.11014398,-0.08978691)">
        <path
          d="m 55.002453,629.99414 c 0,-318.00049 271.999997,-576.000488 600.999997,-576.000488 183,0 365.00005,80.999998 483.00005,214.999998 4,5 6,10 6,17 0,14 -11,25 -25,25 -7,0 -14,-3 -18,-9 -111.00005,-125 -276.00005,-198 -446.00005,-198 -302,0 -551,236 -551,526.00049 0,261 202,463.99996 440,463.99996 209,0 379,-158.99996 379,-353.99996 0,-169.00049 -125,-294.00049 -268,-294.00049 -114,0 -211,78 -211,191.00049 0,14 -11,25 -25,25 -14,0 -25,-11 -25,-25 0,-143.00049 123,-241.00049 261,-241.00049 171,0 318,148 318,344.00049 0,223 -194,403.99996 -429,403.99996 -266.00001,0 -489.999997,-225.99996 -489.999997,-513.99996 z"
        />
      </g>
    </svg>
  );
}

export function StarIcon({
  primary="fill-white",
  secondary="fill-black",
  className,
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
      <g transform="matrix(0.02110092,0,0,0.02110092,-0.66060324,-0.63932186)">
        <path
          d="m 500.00244,1069.9941 -73,-229.99996 c -12,-38 -32,-60 -66,-70 l -232.99998,-71 c -35.000011,-11 -73.000003,-47 -73.000003,-100.00049 0,-54 37.999996,-90 73.000003,-100 l 232.99998,-71 c 34,-11 54,-33 66,-70 l 73,-231 c 12,-36.999998 47,-72.999998 100,-72.999998 53,0 88,36 100,72.999998 l 74,231 c 12,37 31,59 66,70 l 232.99996,71 c 35,10 72,46 72,100 0,53.00049 -37,89.00049 -72,100.00049 l -232.99996,71 c -35,10 -54,32 -66,70 l -74,229.99996 c -12,37 -47,74 -100,74 -53,0 -88,-37 -100,-74 z m 152,-15 75,-230.99996 c 16,-50 45,-86 98,-102 l 232.99996,-71 c 19,-6 37,-24 37,-52.00049 0,-28 -18,-46 -37,-52 l -232.99996,-71 c -53,-17 -82,-52 -98,-102 l -75,-232 c -6,-19 -24,-38 -52,-38 -28,0 -46,19 -52,38 l -74,232 c -16,50 -45,85 -98,102 l -232.99998,71 c -19.00001,6 -38.00001,24 -38.00001,52 0,28.00049 19,46.00049 38.00001,52.00049 l 232.99998,71 c 53,16 82,52 98,102 l 74,230.99996 c 6,19 24,39 52,39 28,0 46,-20 52,-39 z"
        />
      </g>
    </svg>
  );
}

export function PlanetIcon({
  primary="fill-white",
  secondary="fill-black",
  className,
}: IconProps): ReactNode {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
      <g transform="matrix(0.02018349,0,0,0.02018349,-0.11015283,-0.08978691)">
        <path
          d="m 55.00293,988.99414 c 0,-14 11,-25 25,-25 14,0 25,11 25,25 0,72.99996 45,104.99996 105,104.99996 36,0 75,-8 118,-24 -38,-22 -73,-48 -104,-76.99996 -5,-5 -8,-11 -8,-18 0,-14 11,-25 25,-25 7,0 13,2 18,7 39,35 82,65.99996 129,87.99996 243,-115.99996 543,-415.99996 658.99997,-658.00045 -79.99997,-167 -249.99997,-283 -446.99997,-283 -273,0 -495,222 -495,495 0,64.00049 13,126.00049 35,183.00049 7,16 -5,35 -23,35 -10,0 -19,-7 -23,-16 -25,-61 -39,-131 -39,-202.00049 0,-301 245,-544.999998 545,-544.999998 202,0 378,109.999998 471.99997,271.999998 15,-42 23,-82 23,-117 0,-60 -31,-105 -104.99997,-105 -14,0 -25,-10.999998 -25,-24.999998 0,-14 11,-25 25,-25 105.99997,0 154.99997,71.999998 154.99997,154.999998 0,52 -16,112 -44,176 28,65 44,138 44,214 0,300.00049 -243.99997,545.00045 -544.99997,545.00045 -76,0 -148,-16 -214,-44 -64,28 -124,44 -176,44 -83,0 -155,-50 -155,-154.99996 z M 1071.0029,445.99365 C 945.00293,678.99414 681.00293,942.99414 448.00293,1069.9941 c 47,15 99,24 152,24 273,0 494.99997,-221.99996 494.99997,-495.00045 0,-53 -8,-105 -24,-153 z"
        />
      </g>
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
