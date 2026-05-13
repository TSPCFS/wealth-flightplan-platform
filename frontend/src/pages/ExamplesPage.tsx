import React from 'react';
import { ExampleBrowser } from '../components/examples/ExampleBrowser';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ExamplesPage: React.FC = () => {
  useDocumentTitle('Worked examples');
  return <ExampleBrowser />;
};
