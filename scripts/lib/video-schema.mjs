import assert from 'node:assert/strict';
import { Parser } from 'htmlparser2';

/** Inspect actual script contents, including VideoObjects nested in other schemas. */
export function verifyVideoSchemaHtml(html, path, expectedVideos = []) {
  const videos = [];
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if ([value['@type']].flat().includes('VideoObject')) videos.push(value);
    Object.values(value).forEach(visit);
  }
  let script;
  new Parser({
    onopentag(name, attributes) {
      if (name === 'script' && attributes.type?.trim().toLowerCase() === 'application/ld+json') script = '';
    },
    ontext(text) { if (script !== undefined) script += text; },
    onclosetag(name) {
      if (name !== 'script' || script === undefined) return;
      let data;
      try { data = JSON.parse(script); } catch { assert.fail(`${path}: invalid JSON-LD`); }
      script = undefined;
      visit(data);
    },
  }, { decodeEntities: false }).end(html);

  for (const video of videos) {
    assert.ok(typeof video.name === 'string' && video.name.trim(), `${path}: VideoObject requires name`);
    assert.ok([video.thumbnailUrl].flat().some(url => typeof url === 'string' && /^https?:\/\//u.test(url)), `${path}: VideoObject requires thumbnailUrl`);
    assert.ok(typeof video.uploadDate === 'string'
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(video.uploadDate)
      && Number.isFinite(Date.parse(video.uploadDate)), `${path}: VideoObject requires a valid uploadDate with timezone`);
  }
  for (const expected of expectedVideos) {
    const matches = videos.filter(video => video.embedUrl === `https://www.youtube-nocookie.com/embed/${expected.youtubeId}`);
    assert.ok(matches.length, `${path}: missing expected VideoObject`);
    assert.ok(Number.isFinite(Date.parse(expected.uploadDate)), `${path}: snapshot requires a verified uploadDate`);
    for (const video of matches) assert.equal(video.uploadDate, new Date(expected.uploadDate).toISOString(), `${path}: uploadDate must match the captured YouTube date`);
  }
  return videos.length;
}

/** Required placements prevent a removed JSON-LD script from passing vacuously. */
export function expectedVideoSchemaPages(snapshot) {
  const pages = new Map();
  for (const [path, slug] of [['/', 'sonshine-roofing-best-of-the-best-2023'], ['/about-sonshine-roofing', 'sonshine-roofing-introduction']]) {
    const video = snapshot.videos.find(item => item.slug === slug);
    assert.ok(video, `${path}: required page video is missing from the snapshot`);
    pages.set(path, [video]);
  }
  for (const project of snapshot.projects) {
    if (!project.videoId) continue;
    const video = snapshot.videos.find(item => item.id === project.videoId);
    assert.ok(video, 'Project references a missing snapshot video');
    pages.set(`/project/${project.slug}`, [video]);
  }
  return pages;
}
