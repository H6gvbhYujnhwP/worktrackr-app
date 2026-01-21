import React, { useState } from 'react';
import { Plus, Edit2, Trash2, FileText, Shield, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Badge } from '@/components/ui/badge.jsx';

const SECTORS = [
  'Health & Safety Compliance',
  'Construction/Maintenance Work',
  'Field Service Operations',
  'Regulated Industries'
];

const DOCUMENT_TYPES = ['Method Statement', 'Risk Assessment'];

const LIKELIHOOD_SCALE = [
  { value: 1, label: 'Rare', description: 'May occur only in exceptional circumstances' },
  { value: 2, label: 'Unlikely', description: 'Could occur but not expected' },
  { value: 3, label: 'Possible', description: 'Might occur at some time' },
  { value: 4, label: 'Likely', description: 'Will probably occur' },
  { value: 5, label: 'Almost Certain', description: 'Expected to occur frequently' }
];

const SEVERITY_SCALE = [
  { value: 1, label: 'Insignificant', description: 'No injuries, minimal financial loss' },
  { value: 2, label: 'Minor', description: 'First aid treatment, minor financial loss' },
  { value: 3, label: 'Moderate', description: 'Medical treatment required, moderate financial loss' },
  { value: 4, label: 'Major', description: 'Extensive injuries, major financial loss' },
  { value: 5, label: 'Catastrophic', description: 'Death, huge financial loss, regulatory action' }
];

function getRiskLevel(score) {
  if (score <= 4) return { label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' };
  if (score <= 9) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  if (score <= 15) return { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' };
  return { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' };
}

export default function SafetyTab({ methodStatements = [], riskAssessments = [], onUpdate }) {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [editingDoc, setEditingDoc] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleAddDocument = () => {
    if (!selectedSector || !selectedType) return;
    
    const newDoc = {
      id: crypto.randomUUID(),
      sector: selectedSector,
      type: selectedType,
      created_at: new Date().toISOString(),
      created_by: 'current_user',
      updated_at: new Date().toISOString(),
      status: 'draft',
      data: selectedType === 'Method Statement' 
        ? createMethodStatementTemplate(selectedSector)
        : createRiskAssessmentTemplate(selectedSector)
    };

    setEditingDoc(newDoc);
    setShowEditor(true);
    setShowSelector(false);
  };

  const handleSaveDocument = (doc) => {
    const updatedDoc = { ...doc, updated_at: new Date().toISOString() };
    
    if (doc.type === 'Method Statement') {
      const existing = methodStatements.findIndex(ms => ms.id === doc.id);
      const updated = existing >= 0 
        ? methodStatements.map(ms => ms.id === doc.id ? updatedDoc : ms)
        : [...methodStatements, updatedDoc];
      onUpdate({ method_statements: updated });
    } else {
      const existing = riskAssessments.findIndex(ra => ra.id === doc.id);
      const updated = existing >= 0
        ? riskAssessments.map(ra => ra.id === doc.id ? updatedDoc : ra)
        : [...riskAssessments, updatedDoc];
      onUpdate({ risk_assessments: updated });
    }

    setShowEditor(false);
    setEditingDoc(null);
  };

  const handleDeleteDocument = (doc) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    if (doc.type === 'Method Statement') {
      onUpdate({ method_statements: methodStatements.filter(ms => ms.id !== doc.id) });
    } else {
      onUpdate({ risk_assessments: riskAssessments.filter(ra => ra.id !== doc.id) });
    }
  };

  const handleEditDocument = (doc) => {
    setEditingDoc(doc);
    setShowEditor(true);
  };

  return (
    <div className="space-y-6">
      {/* Method Statements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Method Statements
            </CardTitle>
            <Button 
              size="sm" 
              className="gap-2"
              onClick={() => {
                setSelectedType('Method Statement');
                setShowSelector(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Method Statement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {methodStatements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No method statements added yet</p>
              <p className="text-sm mt-2">Click "Add Method Statement" to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {methodStatements.map((ms) => (
                <DocumentCard
                  key={ms.id}
                  doc={{ ...ms, type: 'Method Statement' }}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Assessments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Risk Assessments
            </CardTitle>
            <Button 
              size="sm" 
              className="gap-2"
              onClick={() => {
                setSelectedType('Risk Assessment');
                setShowSelector(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Risk Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {riskAssessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No risk assessments added yet</p>
              <p className="text-sm mt-2">Click "Add Risk Assessment" to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {riskAssessments.map((ra) => (
                <DocumentCard
                  key={ra.id}
                  doc={{ ...ra, type: 'Risk Assessment' }}
                  onEdit={handleEditDocument}
                  onDelete={handleDeleteDocument}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sector Selection Dialog */}
      <Dialog open={showSelector} onOpenChange={setShowSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Sector for {selectedType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Sector</Label>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a sector..." />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelector(false)}>Cancel</Button>
            <Button onClick={handleAddDocument} disabled={!selectedSector}>
              Create {selectedType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Editor Dialog */}
      {showEditor && editingDoc && (
        <DocumentEditor
          doc={editingDoc}
          onSave={handleSaveDocument}
          onCancel={() => {
            setShowEditor(false);
            setEditingDoc(null);
          }}
        />
      )}
    </div>
  );
}

function DocumentCard({ doc, onEdit, onDelete }) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    approved: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-800'
  };

  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium">{doc.sector}</h4>
            <Badge className={statusColors[doc.status]}>{doc.status}</Badge>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <div>Type: {doc.type}</div>
            <div>Created: {new Date(doc.created_at).toLocaleDateString()}</div>
            <div>Last Updated: {new Date(doc.updated_at).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(doc)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(doc)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocumentEditor({ doc, onSave, onCancel }) {
  const [formData, setFormData] = useState(doc);

  const updateField = (path, value) => {
    const keys = path.split('.');
    const newData = { ...formData };
    let current = newData.data;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setFormData(newData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {doc.type} - {doc.sector}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {doc.type === 'Method Statement' ? (
            <MethodStatementForm data={formData.data} onChange={updateField} />
          ) : (
            <RiskAssessmentForm data={formData.data} onChange={updateField} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)}>
            <Check className="w-4 h-4 mr-2" />
            Save Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodStatementForm({ data, onChange }) {
  return (
    <div className="space-y-6">
      {/* Project Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Project Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Project Name</Label>
            <Input
              value={data.project_info?.project_name || ''}
              onChange={(e) => onChange('project_info.project_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={data.project_info?.location || ''}
              onChange={(e) => onChange('project_info.location', e.target.value)}
            />
          </div>
          <div>
            <Label>Client Name</Label>
            <Input
              value={data.project_info?.client_name || ''}
              onChange={(e) => onChange('project_info.client_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Prepared By</Label>
            <Input
              value={data.project_info?.prepared_by || ''}
              onChange={(e) => onChange('project_info.prepared_by', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Scope of Work */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Scope of Work</h3>
        <div>
          <Label>Task Description</Label>
          <Textarea
            value={data.scope_of_work?.task_description || ''}
            onChange={(e) => onChange('scope_of_work.task_description', e.target.value)}
            rows={4}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={data.scope_of_work?.start_date || ''}
              onChange={(e) => onChange('scope_of_work.start_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Duration</Label>
            <Input
              value={data.scope_of_work?.duration || ''}
              onChange={(e) => onChange('scope_of_work.duration', e.target.value)}
              placeholder="e.g., 5 days"
            />
          </div>
          <div>
            <Label>Personnel Required</Label>
            <Input
              type="number"
              value={data.scope_of_work?.personnel_required || ''}
              onChange={(e) => onChange('scope_of_work.personnel_required', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Control Measures */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Control Measures</h3>
        <div>
          <Label>PPE Required</Label>
          <Textarea
            value={data.control_measures?.ppe_required?.join('\n') || ''}
            onChange={(e) => onChange('control_measures.ppe_required', e.target.value.split('\n'))}
            placeholder="Enter each PPE item on a new line"
            rows={3}
          />
        </div>
        <div>
          <Label>Engineering Controls</Label>
          <Textarea
            value={data.control_measures?.engineering_controls?.join('\n') || ''}
            onChange={(e) => onChange('control_measures.engineering_controls', e.target.value.split('\n'))}
            placeholder="Enter each control on a new line"
            rows={3}
          />
        </div>
      </div>

      {/* Emergency Procedures */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Emergency Procedures</h3>
        <div>
          <Label>First Aid Arrangements</Label>
          <Textarea
            value={data.emergency_procedures?.first_aid || ''}
            onChange={(e) => onChange('emergency_procedures.first_aid', e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <Label>Emergency Contacts</Label>
          <Textarea
            value={data.emergency_procedures?.emergency_contacts?.join('\n') || ''}
            onChange={(e) => onChange('emergency_procedures.emergency_contacts', e.target.value.split('\n'))}
            placeholder="Enter each contact on a new line"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

function RiskAssessmentForm({ data, onChange }) {
  const [hazards, setHazards] = useState(data.hazards || []);

  const addHazard = () => {
    const newHazard = {
      id: crypto.randomUUID(),
      description: '',
      who_affected: '',
      before_controls: { likelihood: 3, severity: 3, risk_score: 9 },
      existing_controls: [],
      after_existing_controls: { likelihood: 2, severity: 2, risk_score: 4 },
      additional_controls: []
    };
    const updated = [...hazards, newHazard];
    setHazards(updated);
    onChange('hazards', updated);
  };

  const updateHazard = (index, field, value) => {
    const updated = [...hazards];
    const keys = field.split('.');
    let current = updated[index];
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    // Recalculate risk scores
    if (field.includes('likelihood') || field.includes('severity')) {
      if (field.includes('before_controls')) {
        updated[index].before_controls.risk_score = 
          updated[index].before_controls.likelihood * updated[index].before_controls.severity;
      } else if (field.includes('after_existing_controls')) {
        updated[index].after_existing_controls.risk_score = 
          updated[index].after_existing_controls.likelihood * updated[index].after_existing_controls.severity;
      }
    }
    
    setHazards(updated);
    onChange('hazards', updated);
  };

  const removeHazard = (index) => {
    const updated = hazards.filter((_, i) => i !== index);
    setHazards(updated);
    onChange('hazards', updated);
  };

  return (
    <div className="space-y-6">
      {/* Assessment Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b pb-2">Assessment Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Activity/Process</Label>
            <Input
              value={data.assessment_details?.activity || ''}
              onChange={(e) => onChange('assessment_details.activity', e.target.value)}
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={data.assessment_details?.location || ''}
              onChange={(e) => onChange('assessment_details.location', e.target.value)}
            />
          </div>
          <div>
            <Label>Assessor Name</Label>
            <Input
              value={data.assessment_details?.assessor_name || ''}
              onChange={(e) => onChange('assessment_details.assessor_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Review Date</Label>
            <Input
              type="date"
              value={data.assessment_details?.review_date || ''}
              onChange={(e) => onChange('assessment_details.review_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Risk Matrix Legend */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Risk Matrix Guide</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2">Likelihood (1-5)</div>
            {LIKELIHOOD_SCALE.map(l => (
              <div key={l.value} className="mb-1">
                <span className="font-medium">{l.value}.</span> {l.label}
              </div>
            ))}
          </div>
          <div>
            <div className="font-medium mb-2">Severity (1-5)</div>
            {SEVERITY_SCALE.map(s => (
              <div key={s.value} className="mb-1">
                <span className="font-medium">{s.value}.</span> {s.label}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <div className="font-medium mb-2">Risk Levels</div>
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-green-100 text-green-800">1-4: Low</Badge>
            <Badge className="bg-yellow-100 text-yellow-800">5-9: Medium</Badge>
            <Badge className="bg-orange-100 text-orange-800">10-15: High</Badge>
            <Badge className="bg-red-100 text-red-800">16-25: Critical</Badge>
          </div>
        </div>
      </div>

      {/* Hazards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-lg">Hazards & Risk Assessment</h3>
          <Button size="sm" onClick={addHazard}>
            <Plus className="w-4 h-4 mr-2" />
            Add Hazard
          </Button>
        </div>

        {hazards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hazards added yet</p>
            <p className="text-sm mt-2">Click "Add Hazard" to start the risk assessment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {hazards.map((hazard, index) => (
              <div key={hazard.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Hazard #{index + 1}</h4>
                  <Button size="sm" variant="outline" onClick={() => removeHazard(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <Label>Hazard Description</Label>
                  <Textarea
                    value={hazard.description}
                    onChange={(e) => updateHazard(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Who Might Be Affected</Label>
                  <Input
                    value={hazard.who_affected}
                    onChange={(e) => updateHazard(index, 'who_affected', e.target.value)}
                    placeholder="e.g., Employees, Contractors, Visitors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Before Controls</Label>
                    <div>
                      <Label className="text-sm">Likelihood (1-5)</Label>
                      <Select
                        value={String(hazard.before_controls.likelihood)}
                        onValueChange={(v) => updateHazard(index, 'before_controls.likelihood', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIKELIHOOD_SCALE.map(l => (
                            <SelectItem key={l.value} value={String(l.value)}>
                              {l.value} - {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Severity (1-5)</Label>
                      <Select
                        value={String(hazard.before_controls.severity)}
                        onValueChange={(v) => updateHazard(index, 'before_controls.severity', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITY_SCALE.map(s => (
                            <SelectItem key={s.value} value={String(s.value)}>
                              {s.value} - {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Risk Score</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold">{hazard.before_controls.risk_score}</span>
                        <Badge className={getRiskLevel(hazard.before_controls.risk_score).color}>
                          {getRiskLevel(hazard.before_controls.risk_score).label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">After Controls</Label>
                    <div>
                      <Label className="text-sm">Likelihood (1-5)</Label>
                      <Select
                        value={String(hazard.after_existing_controls.likelihood)}
                        onValueChange={(v) => updateHazard(index, 'after_existing_controls.likelihood', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIKELIHOOD_SCALE.map(l => (
                            <SelectItem key={l.value} value={String(l.value)}>
                              {l.value} - {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Severity (1-5)</Label>
                      <Select
                        value={String(hazard.after_existing_controls.severity)}
                        onValueChange={(v) => updateHazard(index, 'after_existing_controls.severity', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITY_SCALE.map(s => (
                            <SelectItem key={s.value} value={String(s.value)}>
                              {s.value} - {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm text-gray-600">Risk Score</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl font-bold">{hazard.after_existing_controls.risk_score}</span>
                        <Badge className={getRiskLevel(hazard.after_existing_controls.risk_score).color}>
                          {getRiskLevel(hazard.after_existing_controls.risk_score).label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Existing Control Measures</Label>
                  <Textarea
                    value={hazard.existing_controls?.join('\n') || ''}
                    onChange={(e) => updateHazard(index, 'existing_controls', e.target.value.split('\n').filter(Boolean))}
                    placeholder="Enter each control measure on a new line"
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Template creation functions
function createMethodStatementTemplate(sector) {
  return {
    project_info: {
      project_name: '',
      location: '',
      client_name: '',
      prepared_by: '',
      reviewed_by: '',
      approved_by: ''
    },
    scope_of_work: {
      task_description: '',
      start_date: '',
      duration: '',
      working_hours: '',
      personnel_required: 0,
      qualifications_required: []
    },
    hazards: [],
    control_measures: {
      engineering_controls: [],
      administrative_controls: [],
      ppe_required: [],
      environmental_controls: []
    },
    emergency_procedures: {
      first_aid: '',
      emergency_contacts: [],
      evacuation: '',
      incident_reporting: ''
    },
    permits: {
      hot_work: false,
      confined_space: false,
      working_at_height: false,
      rams_approval: false
    }
  };
}

function createRiskAssessmentTemplate(sector) {
  return {
    assessment_details: {
      reference_number: '',
      activity: '',
      location: '',
      assessor_name: '',
      review_date: ''
    },
    people_at_risk: {
      employees: true,
      contractors: false,
      visitors: false,
      public: false
    },
    hazards: []
  };
}
