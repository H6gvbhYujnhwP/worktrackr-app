import React from 'react';

const AppVersion = () => {
  const APP_VERSION = '2025-09-23.9'; // Obsolete field removal fix
  
  return (
    <div className="text-xs text-gray-400 text-center py-2">
      Build {APP_VERSION}
    </div>
  );
};

export default AppVersion;
