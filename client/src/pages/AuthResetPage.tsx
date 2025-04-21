import React from 'react';
import AuthReset from '@/components/AuthReset';

const AuthResetPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold mb-8 text-gray-900 dark:text-white">
          WarmLeadNetwork Authentication Reset
        </h1>
        <AuthReset />
        <p className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          If you continue to experience issues after resetting, please contact support.
        </p>
      </div>
    </div>
  );
};

export default AuthResetPage;