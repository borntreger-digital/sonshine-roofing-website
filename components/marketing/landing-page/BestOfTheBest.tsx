import StaticImage from "@/components/media/StaticImage";
import { BestOfTheBestVideo } from "@/components/marketing/landing-page/BestOfTheBestVideo";
import { SECTION_HEADING, SECTION_SUBTITLE } from "@/components/location/sectionStyles";

const imageHeight = 175;
const imageWidth = 175;
const awards = [
  {
    year: "2021",
    src: "static:best-of-the-best-award-2021",
  },
  {
    year: "2022",
    src: "static:best-of-the-best-award-2022",
  },
  {
    year: "2023",
    src: "static:best-of-the-best-award-2023",
  },
  {
    year: "2024",
    src: "static:best-of-the-best-award-2024",
  },
  {
    year: "2025",
    src: "static:best-of-the-best-award-2025",
  },
] as const;

type BestOfTheBestProps = {
  title?: string
  highlightText?: string;
};

const defaultHighlight = "Best Roofer in Sarasota";

export default async function bestOfTheBest({
  title = `Voted ${defaultHighlight} for 5 Years`,
  highlightText = defaultHighlight
}: BestOfTheBestProps) {
  const highlightIndex = title.indexOf(highlightText);
  const renderedTitle =
    highlightIndex >= 0 ? (
      <>
        {title.slice(0, highlightIndex)}
        <span className="text-(--brand-blue)">{highlightText}</span>
        {title.slice(highlightIndex + highlightText.length)}
      </>
    ) : (
      title
    );
  return (
    <section className="px-4 pt-24">
      <div
        aria-label="botb-title"
        id="botb-title"
      >
        <div className="text-center">
          <h2 className={SECTION_HEADING}>
            {renderedTitle}
          </h2>
          <p className={SECTION_SUBTITLE}>SonShine Roofing is a five-time winner of the National Best of the Best Award which recognizes local roofing contractors with excellent reviews, top-rated customer service, and superior workmanship.</p>
        </div>
      </div>


      {/* Badges: responsive semantic list */}
      <ul className="grid justify-center grid-cols-5 gap-4 my-16 place-items-center">
        {awards.map((award) => {
          const label = `Best of the Best ${award.year} Award`;

          return (
            <li key={award.year} className="relative">
              <StaticImage
                src={award.src}
                title={label}
                height={imageHeight}
                width={imageWidth}
                loading="lazy"
                decoding="async"
              />
            </li>
          );
        })}
      </ul>

      <div className="grid items-start grid-cols-1 gap-8 mx-auto mt-16 md:grid-cols-2">
        <figure className="text-slate-900">
          <blockquote className="italic leading-relaxed md:text-lg">
            <p>
              &ldquo;You found one of the most <strong>positively reviewed</strong> roofing companies anywhere,
              SonShine Roofing in Florida, which is now a 5-time winner of our national
              Best of the Best award.&rdquo;
            </p>
          </blockquote>
          <figcaption className="md:text-lg mt-6 not-italic text-right">—Rich Noonan, Best of the Best TV</figcaption>
        </figure>

        <div className="relative">
          {/* Video component handles its own layout; wrapper keeps spacing predictable */}
          <BestOfTheBestVideo />
        </div>
      </div>
    </section>
  );
}
