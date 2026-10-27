'use client';

import { forwardRef } from 'react';
import { preload as preloadResource } from 'react-dom';
import VinextImage, { type ImageProps } from 'sonshine:vinext-image';
import {
  generateImageAttributes, isRemoteUrl, isSvgUrl, resolveImageSource,
  validateRemoteUrl,
} from 'vinext/shims/image-props';

// vinext 1.3.1 sends remote/fill images directly to their origin. Keep its
// loading, blur, ref and completion behavior, but supply responsive Workers URLs.
// This module is aliased only by Vite; the Next build retains next/image.
const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(props, ref) {
  const { src, width, height, blurDataURL } = resolveImageSource(props);
  if (props.unoptimized || props.loader || isSvgUrl(src) || /^(?:data:|blob:)/.test(src)) {
    return <VinextImage {...props} ref={ref} />;
  }
  if (isRemoteUrl(src) && !validateRemoteUrl(src).allowed) return null;

  const sizes = props.sizes ?? (props.fill ? '100vw' : undefined);
  const quality = Number(props.quality ?? 75);
  const attributes = generateImageAttributes(src, width ?? 640, quality, sizes);
  const release = process.env.__SONSHINE_RELEASE_ID;
  const version = (url: string) => `${url}&dpl=${release}`;
  const srcSet = attributes.srcSet.split(', ').map(candidate => {
    const [url, descriptor] = candidate.split(' ');
    return `${version(url)} ${descriptor}`;
  }).join(', ');
  const optimizedSrc = version(attributes.src);
  const fetchPriority = props.fetchPriority ?? (props.priority ? 'high' : undefined);
  if (props.priority || props.preload) {
    preloadResource(optimizedSrc, { as: 'image', imageSrcSet: srcSet, imageSizes: sizes, fetchPriority });
  }
  const responsive = { srcSet, sizes, fetchPriority };
  return <VinextImage {...props} {...responsive} ref={ref} src={optimizedSrc}
    width={props.fill ? undefined : width} height={props.fill ? undefined : height} blurDataURL={blurDataURL}
    unoptimized priority={false} preload={false}
    loading={props.priority ? 'eager' : props.loading} />;
});

export default Image;
