/**
 * Make a translucent version of any CSS colour, including `var(--token)` values.
 * Plain hex-alpha tricks such as `${color}44` break as soon as the colour is a
 * CSS variable, which is what every accent colour is now so it can follow the theme.
 */
export const alpha = (color: string, percent: number): string =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;
