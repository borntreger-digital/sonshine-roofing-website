/** Public image fields only. No CMS exports, credentials, folders or audit data. */
export type PublicImage = {
  url: string;
  description: string;
  type: string;
  width: number;
  height: number;
  focalPoint: { x: number; y: number } | null;
};

type PositionedImage = {
  width: number | null;
  height: number | null;
  focalPoint?: { x: number; y: number } | null;
};

export function imagePosition(image: PositionedImage, position?: string, fallback = '50% 50%') {
  if (position) return position;
  if (image.focalPoint && image.width && image.height)
    return `${(image.focalPoint.x / image.width) * 100}% ${(image.focalPoint.y / image.height) * 100}%`;
  return fallback;
}

/** Backgrounds are decorative; position precedence matches cropped image rendering. */
export function imageBackground(image: PublicImage, position?: string, fallback = '50% 0%') {
  return {
    backgroundImage: `url("${image.url}")`,
    backgroundPosition: imagePosition(image, position, fallback),
  };
}
