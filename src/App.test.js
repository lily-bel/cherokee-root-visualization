import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import * as dataProcessor from './utils/dataProcessor';

// Mock the data loading module
jest.mock('./utils/dataProcessor');

test('renders title after loading', async () => {
  // Mock return value for loadData
  dataProcessor.loadData.mockResolvedValue({
    csv: [],
    jsonByEntryNo: {},
    jsonByRoot: {}
  });

  render(<App />);
  
  // Wait for the loading state to disappear and title to appear
  const titleElement = await screen.findByText(/Verb Roots/i);
  expect(titleElement).toBeInTheDocument();
});
