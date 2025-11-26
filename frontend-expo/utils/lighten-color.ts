/**
 * Lightens or darkens a hex color by a specified amount.
 *
 * @param color - The hex color string (with or without '#' prefix)
 * @param amount - The amount to lighten (positive) or darken (negative) the color.
 *                 Range: -255 to 255. Values outside this range will be clamped.
 * @returns The modified hex color string (preserves original '#' prefix if present)
 *
 * @example
 * ```typescript
 * // Lighten a color
 * lightenColor('#ff0000', 50); // Returns '#ff3232' (lighter red)
 *
 * // Darken a color
 * lightenColor('#ff0000', -50); // Returns '#cd0000' (darker red)
 *
 * // Works without '#' prefix
 * lightenColor('00ff00', 100); // Returns '64ff64' (lighter green)
 *
 * // Extreme values are clamped
 * lightenColor('#ffffff', 100); // Returns '#ffffff' (already at max)
 * lightenColor('#000000', -100); // Returns '#000000' (already at min)
 * ```
 */
export const lightenColor = (color: string, amount: number) => {
  let usePound = false;

  if (color[0] === '#') {
    color = color.slice(1);
    usePound = true;
  }

  const num = parseInt(color, 16);

  let r = (num >> 16) + amount;

  if (r > 255) r = 255;
  else if (r < 0) r = 0;

  let b = ((num >> 8) & 0x00ff) + amount;

  if (b > 255) b = 255;
  else if (b < 0) b = 0;

  let g = (num & 0x0000ff) + amount;

  if (g > 255) g = 255;
  else if (g < 0) g = 0;

  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16);
};
