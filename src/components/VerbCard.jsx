import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

const VerbCard = ({ data, linkedCsvEntry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const syllabary = linkedCsvEntry?.Syllabary || '---';
  const entry = linkedCsvEntry?.Entry || '';
  const setType = data.config?.pron?.set_type;
  const isDistributive = data.config?.pre?.distributive;
  const className = data.class_name;
  const sentences = linkedCsvEntry?.sentences || [];
  
  // Parse Other Forms: "Label:Syllabary^Latin^Tone|..."
  const otherFormsRaw = linkedCsvEntry?.Other_Forms || '';
  const otherForms = otherFormsRaw.split('|').filter(f => f).map(form => {
    const [label, parts] = form.split(':');
    const [syl, lat, tone] = (parts || '').split('^');
    return { label, syl, lat, tone };
  });

  const renderWithHighlight = (text, wordIndex, isSyllabary = false) => {
    if (!text) return '';
    if (wordIndex === undefined || wordIndex === null || wordIndex === '') return text;
    
    const words = text.split(' ');
    const targetIdx = parseInt(wordIndex);
    
    return words.map((word, i) => (
      <React.Fragment key={i}>
        {i === targetIdx ? (
          <strong className={`${isSyllabary ? 'text-black dark:text-white' : 'text-[#433422] dark:text-[#d4c3a9] font-bold'} underline decoration-1 underline-offset-2`}>
            {word}
          </strong>
        ) : word}
        {i < words.length - 1 ? ' ' : ''}
      </React.Fragment>
    ));
  };

  return (
    <div className="py-3 border-b border-[#8c7851]/30 last:border-0 group transition-colors">
      <div className="flex flex-wrap items-baseline gap-x-4">
        <div className="flex flex-col min-w-[120px]">
          <span className="font-bold text-sm leading-tight">{data.definition}</span>
          <span className="text-[11px] opacity-60 font-serif italic">{linkedCsvEntry?.Entry_Tone || entry}</span>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <div className="text-[10px] italic opacity-60 flex gap-3">
            <span>
              <span className="opacity-40 mr-1 italic">cl.</span>
              <span className="font-mono tracking-tighter">[{className}]</span>
            </span>
            {setType && (
              <span>
                <span className="opacity-40 mr-1 text-[9px] uppercase tracking-tighter font-bold">Set</span>
                <span className="font-bold uppercase tracking-widest">{setType}</span>
              </span>
            )}
            {isDistributive && (
              <span className="flex items-center gap-1">
                <span className="opacity-40 text-[9px] font-bold">dist.</span>
                <span className="italic font-bold border-b border-[#5d4037] dark:border-[#b08e6e]">di</span>
              </span>
            )}
          </div>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
          >
            {isExpanded ? 'Hide' : 'Details'}
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* CED Conjugations */}
          <div className="border-l-2 border-[#8c7851]/40 pl-4">
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-40 mb-3">CED Conjugations</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Add the 3rd person present (main entry) as the first item */}
              <div className="text-sm">
                <span className="text-[10px] opacity-50 block mb-0.5">3rd person present</span>
                <div className="font-cherokee text-lg text-[#5d4037] dark:text-[#b08e6e]">{syllabary}</div>
                <div className="text-xs opacity-70 italic">{linkedCsvEntry?.Entry_Tone || entry}</div>
              </div>
              
              {otherForms.map((form, i) => (
                <div key={i} className="text-sm">
                  <span className="text-[10px] opacity-50 block mb-0.5">{form.label}</span>
                  <div className="font-cherokee text-lg text-[#5d4037] dark:text-[#b08e6e]">{form.syl}</div>
                  <div className="text-xs opacity-70 italic">{form.tone || form.lat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage Examples */}
          {sentences.length > 0 && (
            <div className="border-l-2 border-[#8c7851]/20 pl-4">
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-40 mb-3">Usage Examples</p>
              <ul className="space-y-4">
                {sentences.map((sentence, idx) => (
                  <li key={idx} className="text-sm">
                    <div className="font-cherokee text-lg text-[#5d4037] dark:text-[#b08e6e] leading-relaxed">
                      {renderWithHighlight(sentence.Syllabary, sentence.wordIndex, true)}
                    </div>
                    <div className="opacity-80 font-serif mt-1">
                      {renderWithHighlight(sentence.Tone || sentence.Transliteration, sentence.wordIndex, false)}
                    </div>
                    <div className="italic opacity-50 text-xs mt-0.5">{sentence.English}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerbCard;
