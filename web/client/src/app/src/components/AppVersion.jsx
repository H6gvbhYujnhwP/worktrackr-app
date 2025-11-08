import React from 'react';

const AppVersion = () => {
  const APP_VERSION = '2025-11-08.FIXED'; // Fixed onChange handlers and added logging
  
  return (
    <div className="text-xs text-gray-400 text-center py-2">
      Build {APP_VERSION}
    </div>
  );
};

export default AppVersion;
