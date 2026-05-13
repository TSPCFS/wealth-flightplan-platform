import React from 'react';
import { Link } from 'react-router-dom';
import type { CurrentStageDetails } from '../../types/user.types';
import { Button } from '../common/Button';

interface Props {
  stageDetails: CurrentStageDetails | null;
}

// attooh!-branded hero. Full-bleed sunset image with a graduated overlay,
// uppercase Montserrat 800 headline, white subtitle, and a lime + ghost
// CTA pair. Tracks MOCKUP.html exactly.
const HERO_BG_IMAGE =
  'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/AqJpNjLZr8GgtLAFmqa0/media/637ba93453cbe1febe4828e4.png';
// Strong overlay on the left for headline legibility, then drops off quickly
// so the soccer-at-sunset photo (boys silhouettes + ball) reads through on the
// right two-thirds of the hero. Previously 135deg + uniform 0.25/0.1 stops
// flattened the whole photo into a near-black field.
const HERO_OVERLAY =
  'linear-gradient(95deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0) 100%)';

export const StageHero: React.FC<Props> = ({ stageDetails }) => {
  if (!stageDetails) {
    // Empty state: same dramatic photographic hero, with the empty-state
    // CTA promoted to the primary button.
    return (
      <section
        data-testid="stage-hero-empty"
        className="relative overflow-hidden rounded-2xl text-white shadow-attooh-md min-h-[380px] p-8 sm:p-14"
        style={{
          backgroundImage: `${HERO_OVERLAY}, url("${HERO_BG_IMAGE}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          backgroundColor: 'var(--attooh-charcoal)',
        }}
      >
        <p className="font-lato font-bold text-[11px] uppercase tracking-[0.2em] text-attooh-lime mb-4 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
          Step 0 · Start here
        </p>
        <h2 className="font-montserrat font-extrabold text-3xl sm:text-5xl uppercase leading-[1.05] tracking-tight mb-4 max-w-[760px] [text-shadow:0_2px_8px_rgba(0,0,0,0.4)]">
          Design your financial masterpiece on your life's canvas!
        </h2>
        <p className="text-base sm:text-[17px] text-white/90 max-w-[560px] mb-7 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
          Place yourself on the six steps in under two minutes. The 5-Question
          Quick Check anchors every recommendation we make.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/assessments" aria-label="Start an assessment">
            <Button variant="primary">Start an assessment →</Button>
          </Link>
        </div>
      </section>
    );
  }

  const pct = Math.min(100, Math.max(0, stageDetails.progress_to_next_stage_pct ?? 0));

  return (
    <section
      className="relative overflow-hidden rounded-2xl text-white shadow-attooh-md min-h-[320px] p-8 sm:p-14"
      style={{
        backgroundImage: `${HERO_OVERLAY}, url("${HERO_BG_IMAGE}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 35%',
        backgroundColor: 'var(--attooh-charcoal)',
      }}
    >
      <p className="font-lato font-bold text-[11px] uppercase tracking-[0.2em] text-attooh-lime mb-3 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
        Your current stage
      </p>
      <h1 className="font-montserrat font-extrabold text-3xl sm:text-5xl uppercase leading-[1.05] tracking-tight mb-3 max-w-[760px] break-words [text-shadow:0_2px_8px_rgba(0,0,0,0.4)]">
        {stageDetails.name}
      </h1>
      <p className="text-base sm:text-[17px] text-white/90 max-w-[560px] mb-4 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
        {stageDetails.description}
      </p>

      <span className="inline-flex items-center font-lato font-bold text-[11px] uppercase tracking-[0.14em] bg-white/15 text-white px-3 py-1.5 rounded-full backdrop-blur-sm">
        Income runway: {stageDetails.income_runway}
      </span>

      {stageDetails.next_stage && (
        <div className="mt-6 max-w-[560px]">
          <div className="flex items-center justify-between text-xs text-white/85 mb-1.5">
            <span>Progress to {stageDetails.next_stage}</span>
            <span>{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Progress to ${stageDetails.next_stage}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="w-full bg-white/25 rounded-full h-2 overflow-hidden"
          >
            <div
              className="bg-attooh-lime h-2 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
};
