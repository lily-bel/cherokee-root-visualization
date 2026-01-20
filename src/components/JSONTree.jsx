import React from 'react';

const JSONTree = ({ data, level = 0 }) => {
  if (typeof data !== 'object' || data === null) {
    return <span className="text-blue-600 dark:text-blue-300 font-mono">{String(data)}</span>;
  }

  return (
    <div className={`ml-${level > 0 ? 4 : 0}`}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="my-1">
          <span className="font-semibold text-gray-700 dark:text-gray-400">{key}: </span>
          <JSONTree data={value} level={level + 1} />
        </div>
      ))}
    </div>
  );
};

export default JSONTree;
