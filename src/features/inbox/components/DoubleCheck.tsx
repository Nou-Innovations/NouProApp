/**
 * DoubleCheck — WhatsApp-style "delivered / seen" double tick.
 *
 * Drawn in the SAME 24×24 coordinate space and stroke weight as the Lucide single
 * `Check` icon, so at a given `size` it matches the "sent" tick's height and thinness
 * exactly (just two overlapped checks instead of one). `size` is the bounding box,
 * same semantics as the `Icon` `size` prop. Used for `delivered` (grey) and `seen`
 * (accent) statuses instead of Lucide's CheckCheck, which reads as a blob.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface DoubleCheckProps {
  size?: number;
  color?: string;
}

export default function DoubleCheck({ size = 14, color = '#A8A29E' }: DoubleCheckProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 13 L7 18 L14.5 6.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 13 L13.5 18 L21 6.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Single tick (`sent` status) — one centered check matching DoubleCheck's weight/shape. */
export function SingleCheck({ size = 14, color = '#A8A29E' }: DoubleCheckProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 13 L10.5 18 L18 6.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
