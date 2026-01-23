import React from 'react';

// Placeholder modal component that redirects to contacts page
// In the future, this can be enhanced to be a proper modal form
export default function QuickAddContactModal({ isOpen, onClose, onSave }) {
  if (!isOpen) return null;

  const handleRedirect = () => {
    // Redirect to contacts page to create a new contact
    window.location.href = '/app/crm/contacts';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Create New Contact</h2>
        <p className="text-gray-600 mb-6">
          To create a new contact, you'll be redirected to the Contacts page where you can add all the necessary details.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRedirect}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Contacts
          </button>
        </div>
      </div>
    </div>
  );
}
