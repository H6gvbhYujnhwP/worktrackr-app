import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { ArrowLeft, Save } from 'lucide-react';
import QuoteTemplateLineItemBuilder from './QuoteTemplateLineItemBuilder.jsx';

export default function QuoteTemplateForm({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    description: '',
    default_line_items: [],
    exclusions: [],
    terms_and_conditions: ''
  });
  const [saving, setSaving] = useState(false);
  const [exclusionInput, setExclusionInput] = useState('');

  // Load template data if editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        sector: template.sector || '',
        description: template.description || '',
        default_line_items: template.default_line_items || [],
        exclusions: template.exclusions || [],
        terms_and_conditions: template.terms_and_conditions || ''
      });
    }
  }, [template]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      setSaving(true);
      
      const url = template 
        ? `/api/quote-templates/${template.id}`
        : '/api/quote-templates';
      
      const method = template ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const savedTemplate = await response.json();
        onSave(savedTemplate);
      } else {
        const error = await response.json();
        alert(`Failed to save template: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleLineItemsChange = (lineItems) => {
    setFormData(prev => ({ ...prev, default_line_items: lineItems }));
  };

  const handleAddExclusion = () => {
    if (exclusionInput.trim()) {
      setFormData(prev => ({
        ...prev,
        exclusions: [...prev.exclusions, exclusionInput.trim()]
      }));
      setExclusionInput('');
    }
  };

  const handleRemoveExclusion = (index) => {
    setFormData(prev => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={onCancel}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle>
                  {template ? 'Edit Template' : 'Create Template'}
                </CardTitle>
                <CardDescription>
                  {template ? 'Update template details and line items' : 'Create a reusable quote structure'}
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., New Build House - 3 Bedroom"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sector
                </label>
                <Input
                  value={formData.sector}
                  onChange={(e) => setFormData(prev => ({ ...prev, sector: e.target.value }))}
                  placeholder="e.g., Construction, IT Support, Plumbing"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this template is for..."
                rows={3}
              />
            </div>

            {/* Line Items Builder */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Template Line Items
              </label>
              <QuoteTemplateLineItemBuilder
                lineItems={formData.default_line_items}
                onChange={handleLineItemsChange}
              />
            </div>

            {/* Exclusions */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Standard Exclusions
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={exclusionInput}
                    onChange={(e) => setExclusionInput(e.target.value)}
                    placeholder="Add exclusion (e.g., VAT not included)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExclusion())}
                  />
                  <Button type="button" onClick={handleAddExclusion}>
                    Add
                  </Button>
                </div>
                {formData.exclusions.length > 0 && (
                  <ul className="space-y-1">
                    {formData.exclusions.map((exclusion, index) => (
                      <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">{exclusion}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExclusion(index)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Terms & Conditions
              </label>
              <Textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                placeholder="Standard terms and conditions for this type of quote..."
                rows={5}
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
