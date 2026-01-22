import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, FileText, Mic, CheckSquare, Info, Loader } from 'lucide-react';

export default function AIQuoteGenerator({ ticketId, customerId, onDraftComplete }) {
  const [prompt, setPrompt] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [contextSources, setContextSources] = useState({
    ticket_description: true,
    ticket_updates: true,
    customer_info: true,
    similar_quotes: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [contextPreview, setContextPreview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ticketId || customerId) {
      fetchContextPreview();
    }
  }, [ticketId, customerId]);

  const fetchContextPreview = async () => {
    try {
      const params = new URLSearchParams();
      if (ticketId) params.append('ticket_id', ticketId);
      if (customerId) params.append('customer_id', customerId);

      const response = await fetch(`/api/quotes/ai-context-preview?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setContextPreview(data);
      }
    } catch (error) {
      console.error('Error fetching context preview:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isPDF = file.type === 'application/pdf';
      const isAudio = file.type.startsWith('audio/') || 
                      file.name.endsWith('.mp3') || 
                      file.name.endsWith('.wav') || 
                      file.name.endsWith('.mp4');
      return isPDF || isAudio;
    });

    if (validFiles.length !== files.length) {
      setError('Only PDF and audio files (MP3, WAV, MP4) are supported');
      setTimeout(() => setError(null), 3000);
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleContext = (key) => {
    setContextSources(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && uploadedFiles.length === 0) {
      setError('Please enter a prompt or upload a file');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('context_sources', JSON.stringify(contextSources));
      if (ticketId) formData.append('ticket_id', ticketId);
      if (customerId) formData.append('customer_id', customerId);

      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/quotes/ai-generate-draft', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate draft quote');
      }

      const data = await response.json();
      onDraftComplete(data);
    } catch (error) {
      console.error('Error generating draft:', error);
      setError('Failed to generate draft quote. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') return <FileText size={16} />;
    if (file.type.startsWith('audio/')) return <Mic size={16} />;
    return <FileText size={16} />;
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-900">
          <p className="font-medium">AI Quote Generator</p>
          <p className="mt-1">
            Paste a customer email, type requirements, or upload files. The AI will analyze the information
            and generate a draft quote for you to review and edit.
          </p>
        </div>
      </div>

      {/* Main Prompt Text Box */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Main Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste customer email, type requirements, or describe what the customer needs...

Example:
- Paste: 'Hi, we need a quote for network upgrade for 21 units...'
- Type: 'Create quote for server installation, 3 days labour, Dell server, migration'
- Notes: 'Customer called about WiFi upgrade, needs completion by end of month'"
          className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
        />
        <p className="mt-2 text-xs text-gray-500">
          This is your primary input. Paste anything here - emails, notes, requirements, instructions to the AI.
        </p>
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Files (Optional)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.mp3,.wav,.mp4,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="text-gray-400 mb-2" size={32} />
            <p className="text-sm text-gray-600 font-medium">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF files or audio recordings (MP3, WAV, MP4)
            </p>
          </label>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {getFileIcon(file)}
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Sources */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Context to Include
        </label>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="ctx-ticket"
              checked={contextSources.ticket_description}
              onChange={() => toggleContext('ticket_description')}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="ctx-ticket" className="text-sm font-medium text-gray-700 cursor-pointer">
                Ticket Description
              </label>
              {contextPreview?.ticket_description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {contextPreview.ticket_description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="ctx-updates"
              checked={contextSources.ticket_updates}
              onChange={() => toggleContext('ticket_updates')}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="ctx-updates" className="text-sm font-medium text-gray-700 cursor-pointer">
                Ticket Updates & Comments
              </label>
              {contextPreview?.ticket_updates_count > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {contextPreview.ticket_updates_count} updates available
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="ctx-customer"
              checked={contextSources.customer_info}
              onChange={() => toggleContext('customer_info')}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="ctx-customer" className="text-sm font-medium text-gray-700 cursor-pointer">
                Customer Information
              </label>
              {contextPreview?.customer_name && (
                <p className="text-xs text-gray-600 mt-1">
                  {contextPreview.customer_name} - {contextPreview.customer_sector || 'No sector'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="ctx-similar"
              checked={contextSources.similar_quotes}
              onChange={() => toggleContext('similar_quotes')}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="ctx-similar" className="text-sm font-medium text-gray-700 cursor-pointer">
                Previous Similar Quotes
              </label>
              {contextPreview?.similar_quotes_count > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {contextPreview.similar_quotes_count} similar quotes found
                </p>
              )}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          The AI will use this context along with your prompt to generate a more accurate quote.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || (!prompt.trim() && uploadedFiles.length === 0)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isGenerating ? (
            <>
              <Loader className="animate-spin" size={20} />
              Generating Draft...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Generate Draft Quote
            </>
          )}
        </button>
      </div>
    </div>
  );
}
