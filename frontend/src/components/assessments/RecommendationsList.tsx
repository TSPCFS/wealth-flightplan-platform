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
    <section className="bg-white rounded-lg shadow p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <ul className="space-y-2 list-disc list-inside text-gray-800">
        {recommendations.map((rec) => (
          <li key={rec}>{rec}</li>
        ))}
      </ul>
    </section>
  );
};
