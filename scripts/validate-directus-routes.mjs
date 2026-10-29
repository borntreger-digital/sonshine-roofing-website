import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readRouteCollection } from "./route-inventory.mjs";

const rootDir = process.cwd();

function loadEnvFile(filename) {
  const path = resolve(rootDir, filename);
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    if (process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.at(-1) === quote) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function normalizePath(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const path = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
  return path.length > 1 ? path.replace(/\/+$/u, "") : "/";
}

function normalizeSlug(value, owner) {
  const slug = String(value ?? "").trim().replace(/^\/+|\/+$/gu, "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
    throw new Error(
      '[route-manifest] ' + owner + ' has invalid route slug "' + slug + '".',
    );
  }
  return slug;
}

export async function validateRouteOwners({ clientSlug, readCollection, snapshots = {} }) {
  const owners = [];

  function addOwner(collection, id, path, scopeKey) {
    const normalizedPath = normalizePath(path);
    if (!normalizedPath) {
      throw new Error(
        "[route-manifest] " + collection + " " + id + " has no route.",
      );
    }
    const expectedScopePrefix = clientSlug + ":";
    if (
      typeof scopeKey !== "string" ||
      !scopeKey.startsWith(expectedScopePrefix)
    ) {
      throw new Error(
        "[route-manifest] " +
          collection +
          " " +
          id +
          " is missing its database-maintained scope_key.",
      );
    }
    owners.push({ collection, id: String(id), path: normalizedPath });
  }

  const websitePages = await readCollection("website_pages", [
    "id",
    "path",
    "page_type",
    "scope_key",
  ]);
  for (const page of websitePages) {
    addOwner("website_pages", page.id, page.path, page.scope_key);
  }

  if (
    [
      "borntreger-digital",
      "southern-standards-landscaping",
      "vowell-construction",
      "care-compass-advisors",
      "sonshine-roofing",
    ].includes(clientSlug)
  ) {
    const services = await readCollection("services", [
      "id",
      "slug",
      "scope_key",
    ]);
    for (const service of services) {
      const slug = normalizeSlug(service.slug, "services " + service.id);
      addOwner(
        "services",
        service.id,
        clientSlug === "sonshine-roofing" ? "/" + slug : "/services/" + slug,
        service.scope_key,
      );
    }
  }

  if (clientSlug === "borntreger-digital" || clientSlug === "sonshine-roofing") {
    const blogPosts = await readCollection("blog_posts", [
      "id",
      "slug",
      "scope_key",
    ]);
    for (const post of blogPosts) {
      const slug = normalizeSlug(post.slug, "blog_posts " + post.id);
      addOwner(
        "blog_posts",
        post.id,
        clientSlug === "sonshine-roofing" ? "/" + slug : "/blog/" + slug,
        post.scope_key,
      );
    }
  }

  if (clientSlug === "borntreger-digital") {
    const caseStudies = await readCollection("case_studies", [
      "id",
      "slug",
      "scope_key",
    ]);
    for (const study of caseStudies) {
      const slug = normalizeSlug(study.slug, "case_studies " + study.id);
      addOwner("case_studies", study.id, "/case-studies/" + slug, study.scope_key);
    }
  }

  if (clientSlug === "sonshine-roofing") {
    const projectSnapshot = snapshots.projects;
    if (!projectSnapshot || projectSnapshot.version !== 3 || projectSnapshot.clientSlug !== clientSlug
      || !Array.isArray(projectSnapshot.projects) || !Array.isArray(projectSnapshot.videos)
      || !Array.isArray(projectSnapshot.categories)) {
      throw new Error("[route-manifest] Combined content snapshot has an invalid client, version, or inventory.");
    }
    for (const project of projectSnapshot.projects) {
      addOwner("roofing_projects", project.slug, project.uri, project.scopeKey);
    }

    const locationSnapshot = snapshots.locations;
    if (!locationSnapshot || locationSnapshot.version !== 1 || locationSnapshot.clientSlug !== clientSlug || !Array.isArray(locationSnapshot.pages)) throw new Error('[route-manifest] Location snapshot is invalid.');
    for (const page of locationSnapshot.pages) addOwner('roofing_service_areas', page.id, `/locations/${page.slug}`, page.scopeKey);

    const [offers, persons, glossaryTerms] = await Promise.all([
      readCollection("special_offers", ["id", "slug", "scope_key"]),
      readCollection("persons", ["id", "slug", "scope_key"]),
      readCollection("roofing_glossary_terms", ["id", "slug", "scope_key"]),
    ]);
    for (const offer of offers) {
      const slug = normalizeSlug(offer.slug, "special_offers " + offer.id);
      addOwner("special_offers", offer.id, "/special-offers/" + slug, offer.scope_key);
    }
    for (const person of persons) {
      const slug = normalizeSlug(person.slug, "persons " + person.id);
      addOwner("persons", person.id, "/person/" + slug, person.scope_key);
    }
    for (const term of glossaryTerms) {
      const slug = normalizeSlug(term.slug, "roofing_glossary_terms " + term.id);
      addOwner(
        "roofing_glossary_terms",
        term.id,
        "/roofing-glossary/" + slug,
        term.scope_key,
      );
    }
  }

  const byPath = new Map();
  for (const owner of owners) {
    const list = byPath.get(owner.path) ?? [];
    list.push(owner);
    byPath.set(owner.path, list);
  }

  const collisions = [...byPath.entries()].filter(([, entries]) => entries.length > 1);
  if (collisions.length) {
    const details = collisions
      .map(
        ([path, entries]) =>
          path +
          " -> " +
          entries.map((entry) => entry.collection + ":" + entry.id).join(", "),
      )
      .join("\n");
    throw new Error("[route-manifest] Route ownership collision(s):\n" + details);
  }

  return owners;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  loadEnvFile(".env");
  loadEnvFile(".env.local");

  const directusUrl = (process.env.DIRECTUS_URL ?? "").trim().replace(/\/+$/u, "");
  const directusToken = (
    process.env.DIRECTUS_TOKEN ??
    process.env.DIRECTUS_STATIC_TOKEN ??
    ""
  ).trim();
  const clientSlug = (process.env.DIRECTUS_CLIENT_SLUG ?? "").trim();

  if (!directusUrl || !directusToken || !clientSlug) {
    throw new Error(
      "[route-manifest] DIRECTUS_URL, DIRECTUS_CLIENT_SLUG, and DIRECTUS_TOKEN or DIRECTUS_STATIC_TOKEN are required.",
    );
  }

  const owners = await validateRouteOwners({ clientSlug,
    readCollection: (collection, fields) => readRouteCollection({ collection, fields, directusUrl, directusToken, clientSlug }),
    snapshots: clientSlug === "sonshine-roofing" ? {
      projects: JSON.parse(readFileSync(resolve(rootDir, ".generated/projects.json"), "utf8")),
      locations: JSON.parse(readFileSync(resolve(rootDir, ".generated/locations.json"), "utf8")),
    } : {},
  });
  process.stdout.write(
    "[route-manifest] Validated " +
      owners.length +
      " published Directus route owner(s) for " +
      clientSlug +
      ".\n",
  );
}
