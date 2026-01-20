import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Layers } from 'lucide-react';
import JSONTree from './JSONTree';

const VerbCard = ({ data, linkedCsvEntry, zIndex }) => {
  const [expanded, setExpanded] = useState(false);

  // Fallback if no linked CSV entry found
  const syllabary = linkedCsvEntry?.Syllabary || '---';
  const entry = linkedCsvEntry?.Entry || '';

  return (
    <div 
      className={`
        relative bg-white dark:bg-slate-800 border-t-4 border-emerald-500 rounded-lg shadow-lg 
        transition-all duration-300 ease-in-out
        ${expanded ? 'mb-8 scale-100 z-50' : 'mb-[-1rem] md:mb-4 scale-95 hover:scale-100 cursor-pointer'}
      `}
      style={{ zIndex: expanded ? 50 : zIndex }}
      onClick={() => !expanded && setExpanded(true)}
    >
      {/* Header / Tab */}
      <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-slate-700">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="font-serif">{syllabary}</span>
            <span className="text-sm text-gray-500 font-sans font-normal">({entry})</span>
          </h3>
          <p className="text-gray-600 dark:text-gray-300 italic">{data.definition}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
        >
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 animate-fadeIn">
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Col: Metadata & Stems */}
            <div>
              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider text-gray-500">Class Name</span>
                <p className="font-mono text-emerald-600 dark:text-emerald-400">{data.class_name}</p>
              </div>

              <div className="mb-4">
                <h4 className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <Layers size={16} /> Original Stems
                </h4>
                <div className="bg-gray-50 dark:bg-slate-900 rounded p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(data.original_stems).map(([tense, stem]) => (
                      <div key={tense} className="flex justify-between border-b border-gray-200 dark:border-slate-700 pb-1">
                        <span className="text-gray-500">{tense}</span>
                        <span className="font-mono font-bold text-gray-800 dark:text-gray-100">{stem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Config Tree */}
            <div>
               <h4 className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  <BookOpen size={16} /> Configuration
                </h4>
               <div className="bg-gray-50 dark:bg-slate-900 rounded p-3 text-xs overflow-auto max-h-60">
                 <JSONTree data={data.config} />
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default VerbCard;
