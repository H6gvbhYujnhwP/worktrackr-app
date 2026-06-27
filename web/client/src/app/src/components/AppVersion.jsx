import React from 'react';

const AppVersion = () => {
  const APP_VERSION = '2026-06-26.dark-r2-sidebar'; // Manus dark redesign round 2 integrated + verified
  
  return (
    <div className="text-xs text-gray-400 text-center py-2">
      Build {APP_VERSION}
    </div>
  );
};

export default AppVersion;
