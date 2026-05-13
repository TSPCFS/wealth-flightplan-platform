import React from 'react';

interface RecommendationsListProps {
  recommendations: string[];
  title?: string;
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  title = 'Next steps',
}) => {
  if (recommendations.length === 0) return null;
  return (
    <section className="bg-attooh-card rounded-xl border border-attooh-border shadow-attooh-sm p-7 sm:p-9">
      <h2 className="font-montserrat text-lg font-bold text-attooh-charcoal mb-4">{title}</h2>
      <ul className="space-y-2 list-disc list-inside text-attooh-charcoal marker:text-attooh-lime-hover">
        {recommendations.map((rec) => (
          <li key={rec}>{rec}</li>
        ))}
      </ul>
    </section>
  );
};
