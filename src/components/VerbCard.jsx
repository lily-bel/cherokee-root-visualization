import React from 'react';

const VerbCard = ({ data, linkedCsvEntry }) => {
  const syllabary = linkedCsvEntry?.Syllabary || '---';
  const entry = linkedCsvEntry?.Entry || '';
  const setType = data.config?.pron?.set_type;
  const isDistributive = data.config?.pre?.distributive;
  const className = data.class_name;

  return (
    <div className="py-4 border-b border-[#8c7851]/30 last:border-0 group transition-colors">
      <div className="flex flex-wrap items-baseline">
        <span className="font-cherokee text-2xl mr-3 text-[#5d4037] dark:text-[#b08e6e] group-hover:text-black dark:group-hover:text-white transition-colors">
          {syllabary}
        </span>
        <span className="italic opacity-60 mr-2 text-sm">({entry})</span>
        <span className="mr-2 underline decoration-[#8c7851]/30 underline-offset-4 decoration-1">
          {data.definition}
        </span>
      </div>
      
      <div className="text-sm italic opacity-80 mt-2 flex flex-wrap gap-4">
        <span>
          <span className="opacity-60 mr-1">cl.</span>
          <span className="font-mono text-xs tracking-tighter">[{className}]</span>
        </span>

        {setType && (
          <span>
            <span className="opacity-60 mr-1 text-xs uppercase tracking-tighter">Set</span>
            <span className="font-bold uppercase tracking-widest">{setType}</span>
          </span>
        )}

        {isDistributive && (
          <span className="flex items-center gap-1">
            <span className="opacity-60 text-xs">dist.</span>
            <span className="italic font-bold border-b border-[#5d4037] dark:border-[#b08e6e]">di</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default VerbCard;
