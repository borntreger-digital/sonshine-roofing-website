'use client';

import { useMemo } from 'react';

import ResourceArchiveClient from '@/components/dynamic-content/ResourceArchiveClient';
import type { FacetGroup, TermLite } from '@/lib/content/project-types';
import type { VideoItem } from '@/lib/content/video-types';
import type { PageResult } from '@/lib/ui/pagination';
import { videoArchiveGroups, videoConditionNotice } from '@/lib/ui/video-filters';

import InfiniteList from '@/components/dynamic-content/InfiniteList';
import VideoPlayback from './VideoPlayback';
import type { PlaybackVideo } from './VideoModal';

type Props = {
  collectionUrl: string;
  initialResult: PageResult<VideoItem> & { facets?: FacetGroup[] };
  playbackVideos: PlaybackVideo[];
  bucketOptions: Array<{ slug: string; label: string }>;
  materialOptions: TermLite[];
  serviceOptions: TermLite[];
  pageSize: number;
  initialFilters: {
    search?: string;
    bucketSlugs?: string[];
    materialSlugs?: string[];
    serviceAreaSlugs?: string[];
  };
};

const buildVideoFilters = ({
  search,
  selections,
}: {
  search: string;
  selections: Record<string, string[]>;
}) => ({
  q: search || undefined,
  buckets: selections.bucket ?? [],
  materialTypeSlugs: selections.material ?? [],
  serviceAreaSlugs: selections.area ?? [],
});

export default function VideoLibraryClient({
  collectionUrl,
  initialResult,
  playbackVideos,
  bucketOptions,
  materialOptions,
  serviceOptions,
  pageSize,
  initialFilters,
}: Props) {
  const groups = useMemo(
    () => videoArchiveGroups({ categories: bucketOptions, materials: materialOptions, serviceAreas: serviceOptions }),
    [bucketOptions, materialOptions, serviceOptions],
  );

  return (
    <VideoPlayback collectionUrl={collectionUrl} playbackVideos={playbackVideos}>
      {(openVideo) => (
        <ResourceArchiveClient
          kind="video"
          apiPath="/api/resources/video"
          pageSize={pageSize}
          initialResult={initialResult}
          initialFilters={{
            search: initialFilters.search ?? '',
            selections: {
              bucket: initialFilters.bucketSlugs ?? [],
              material: initialFilters.materialSlugs?.map((s) => s.toLowerCase()) ?? [],
              area: initialFilters.serviceAreaSlugs?.map((s) => s.toLowerCase()) ?? [],
            },
          }}
          groups={groups}
          conditionNotice={videoConditionNotice}
          labels={{ itemSingular: 'video', itemPlural: 'videos' }}
          buildFiltersPayload={buildVideoFilters}
          renderResults={({ result, listFilters }) => (
            <InfiniteList
              kind="video"
              initial={result}
              filters={listFilters}
              pageSize={pageSize}
              gridClass="mt-8"
              onVideoOpen={openVideo}
            />
          )}
        />
      )}
    </VideoPlayback>
  );
}
