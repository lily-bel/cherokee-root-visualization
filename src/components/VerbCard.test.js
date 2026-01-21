import { render, screen, fireEvent } from '@testing-library/react';
import VerbCard from './VerbCard';
import React from 'react';

const mockData = {
  definition: 'to do something',
  class_name: '1(i)',
  config: {
    pron: { set_type: 'A' }
  }
};

const mockClassInfo = {
  present: 'a',
  imperfective: 'o',
  perfective: 'v',
  imperative: 'i',
  infinitive: 'di'
};

describe('VerbCard Label Formatting', () => {
  test('omits animate/inanimate when unique for person+tense', () => {
    const linkedCsvEntry = {
      Syllabary: 'ᎠᏗᎭ',
      Entry: 'adiha',
      Other_Forms: '1st person singular with animate/ inanimate object:gadia^ᎦᏗᎠ^gadi’a'
    };

    render(<VerbCard data={mockData} linkedCsvEntry={linkedCsvEntry} classInfo={mockClassInfo} />);
    
    // Expand to see details
    fireEvent.click(screen.getByText(/Details/i));
    
    // Check that Syllabary is rendered in the large font div
    expect(screen.getByText('ᎦᏗᎠ')).toBeInTheDocument();
    expect(screen.getByText('1st person present')).toBeInTheDocument();
    expect(screen.queryByText(/inanimate object/i)).not.toBeInTheDocument();
  });

  test('includes animate/inanimate when multiple forms for same person+tense', () => {
    const linkedCsvEntry = {
      Syllabary: 'ᎠᏓᏱᎭ',
      Entry: 'adahyiha',
      Other_Forms: '1st person singular with animate object:jiyada’yiha^ᏥᏯᏓᏱᎭ^jiyada’yiha|1st person singular with inanimate object:gada’yiha^ᎦᏓᏱᎭ^gada’yiha'
    };

    render(<VerbCard data={mockData} linkedCsvEntry={linkedCsvEntry} classInfo={mockClassInfo} />);
    
    // Expand to see details
    fireEvent.click(screen.getByText(/Details/i));
    
    expect(screen.getByText('ᏥᏯᏓᏱᎭ')).toBeInTheDocument();
    expect(screen.getByText('ᎦᏓᏱᎭ')).toBeInTheDocument();
    expect(screen.getByText('1st person present (animate object)')).toBeInTheDocument();
    expect(screen.getByText('1st person present (inanimate object)')).toBeInTheDocument();
  });
  
  test('handles imperative duplicates', () => {
     const linkedCsvEntry = {
      Syllabary: 'ᎠᏓᏱᎭ',
      Entry: 'adahyiha',
      Other_Forms: 'imperative with animate direct objects:hiyadayiga^ᎯᏯᏓᏱᎦ|imperative with inanimate direct objects:hadayhga^ᎭᏓᏱᎦ'
    };

    render(<VerbCard data={mockData} linkedCsvEntry={linkedCsvEntry} classInfo={mockClassInfo} />);
    
    // Expand to see details
    fireEvent.click(screen.getByText(/Details/i));
    
    expect(screen.getByText('ᎯᏯᏓᏱᎦ')).toBeInTheDocument();
    expect(screen.getByText('ᎭᏓᏱᎦ')).toBeInTheDocument();
    expect(screen.getByText('2nd person imperative (animate object)')).toBeInTheDocument();
    expect(screen.getByText('2nd person imperative (inanimate object)')).toBeInTheDocument();
  });
});