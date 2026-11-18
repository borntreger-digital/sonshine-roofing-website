import { JsonLd } from '@/lib/seo/json-ld';
import { videoObjectSchema } from '@/lib/seo/schema';
import type { VideoItem } from '@/lib/content/video-types';
import LazyYoutubeEmbed from './LazyYoutubeEmbed';

type Props = {
  video: Pick<VideoItem, 'youtubeId' | 'title' | 'excerpt' | 'thumbnailUrl' | 'uploadDate'>;
  canonicalUrl: string;
  schemaId: string;
  className?: string;
};

/** Metadata is deployment-frozen; production capture and artifact checks require upload dates. */
export function SnapshotVideoWithSchema({ video, canonicalUrl, schemaId, className }: Props) {
  const embedUrl = `https://www.youtube-nocookie.com/embed/${video.youtubeId}`;
  const schema = videoObjectSchema({
    name: video.title, description: video.excerpt, canonicalUrl, embedUrl,
    thumbnailUrls: [video.thumbnailUrl], uploadDate: video.uploadDate ?? undefined,
    isFamilyFriendly: true,
  });
  return <>
    <JsonLd id={schemaId} data={schema} />
    <LazyYoutubeEmbed videoId={video.youtubeId} title={video.title} posterUrl={video.thumbnailUrl} className={className} discoverable />
  </>;
}
