import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileText, Shield, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';

const SECTORS = [
  { value: 'health_safety', label: 'Health & Safety Compliance' },
  { value: 'construction', label: 'Construction/Maintenance Work' },
  { value: 'field_service', label: 'Field Service Operations' },
  { value: 'regulated', label: 'Regulated Industries' }
];

const getRiskLevel = (score) => {
  if (score <= 4) return { level: 'Low', color: 'bg-green-100 text-green-800' };
  if (score <= 9) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
  if (score <= 15) return { level: 'High', color: 'bg-orange-100 text-orange-800' };
  return { level: 'Critical', color: 'bg-red-100 text-red-800' };
};

export default function SafetyTabComprehensive({ ticket, onUpdate }) {
  const [methodStatements, setMethodStatements] = useState([]);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  const [documentType, setDocumentType] = useState(''); // 'method_statement' or 'risk_assessment'
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState({});

  // Load existing documents from ticket
  useEffect(() => {
    if (ticket?.method_statement) {
      try {
        const parsed = typeof ticket.method_statement === 'string' 
          ? JSON.parse(ticket.method_statement) 
          : ticket.method_statement;
        setMethodStatements(Array.isArray(parsed) ? parsed : (parsed.documents || []));
      } catch (e) {
        setMethodStatements([]);
      }
    }
    if (ticket?.risk_assessment) {
      try {
        const parsed = typeof ticket.risk_assessment === 'string'
          ? JSON.parse(ticket.risk_assessment)
          : ticket.risk_assessment;
        setRiskAssessments(Array.isArray(parsed) ? parsed : (parsed.documents || []));
      } catch (e) {
        setRiskAssessments([]);
      }
    }
  }, [ticket]);

  const handleAddDocument = (type) => {
    setDocumentType(type);
    setSelectedSector('');
    setEditingDocument(null);
    setFormData({});
    setShowSectorModal(true);
  };

  const handleSectorSelected = () => {
    if (!selectedSector) return;
    setShowSectorModal(false);
    setShowEditorModal(true);
    initializeFormData();
  };

  const initializeFormData = () => {
    const initialData = {
      id: editingDocument?.id || `doc_${Date.now()}`,
      sector: selectedSector,
      type: documentType,
      created_at: editingDocument?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: editingDocument?.status || 'draft'
    };
    setFormData(editingDocument || initialData);
  };

  const handleSaveDocument = () => {
    const updatedDoc = { ...formData, updated_at: new Date().toISOString() };
    
    if (documentType === 'method_statement') {
      const updated = editingDocument
        ? methodStatements.map(doc => doc.id === editingDocument.id ? updatedDoc : doc)
        : [...methodStatements, updatedDoc];
      setMethodStatements(updated);
      onUpdate({ method_statement: JSON.stringify(updated) });
    } else {
      const updated = editingDocument
        ? riskAssessments.map(doc => doc.id === editingDocument.id ? updatedDoc : doc)
        : [...riskAssessments, updatedDoc];
      setRiskAssessments(updated);
      onUpdate({ risk_assessment: JSON.stringify(updated) });
    }
    
    setShowEditorModal(false);
    setFormData({});
  };

  const handleDeleteDocument = (id, type) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    if (type === 'method_statement') {
      const updated = methodStatements.filter(doc => doc.id !== id);
      setMethodStatements(updated);
      onUpdate({ method_statement: JSON.stringify(updated) });
    } else {
      const updated = riskAssessments.filter(doc => doc.id !== id);
      setRiskAssessments(updated);
      onUpdate({ risk_assessment: JSON.stringify(updated) });
    }
  };

  const handleEditDocument = (doc, type) => {
    setEditingDocument(doc);
    setDocumentType(type);
    setSelectedSector(doc.sector);
    setFormData(doc);
    setShowEditorModal(true);
  };

  const renderTemplateForm = () => {
    const sectorLabel = SECTORS.find(s => s.value === selectedSector)?.label || '';
    const isMethodStatement = documentType === 'method_statement';
    
    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
        {/* Header */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg">
            {isMethodStatement ? 'Method Statement' : 'Risk Assessment'} - {sectorLabel}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Complete all required fields. All information will be saved to the ticket.
          </p>
        </div>

        {/* Render sector-specific template */}
        {selectedSector === 'health_safety' && isMethodStatement && renderHealthSafetyMS()}
        {selectedSector === 'health_safety' && !isMethodStatement && renderHealthSafetyRA()}
        {selectedSector === 'construction' && isMethodStatement && renderConstructionMS()}
        {selectedSector === 'construction' && !isMethodStatement && renderConstructionRA()}
        {selectedSector === 'field_service' && isMethodStatement && renderFieldServiceMS()}
        {selectedSector === 'field_service' && !isMethodStatement && renderFieldServiceRA()}
        {selectedSector === 'regulated' && isMethodStatement && renderRegulatedMS()}
        {selectedSector === 'regulated' && !isMethodStatement && renderRegulatedRA()}
      </div>
    );
  };

  // Health & Safety - Method Statement
  const renderHealthSafetyMS = () => (
    <>
      <FormSection title="Project Details">
        <FormField label="Project Name *" name="project_name" />
        <FormField label="Location *" name="location" />
        <FormField label="Prepared By *" name="prepared_by" />
        <FormField label="Date" name="date" type="date" />
      </FormSection>

      <FormSection title="Task Description">
        <FormField label="Task Summary *" name="task_summary" type="textarea" 
          placeholder="Clear, concise summary of the job from start to finish" />
        <FormField label="Scope of Work *" name="scope_of_work" type="textarea" />
      </FormSection>

      <FormSection title="Hazard Identification">
        <FormField label="Environmental Hazards" name="environmental_hazards" type="textarea"
          placeholder="Slippery surfaces, poor lighting, weather conditions" />
        <FormField label="Equipment Hazards" name="equipment_hazards" type="textarea"
          placeholder="Unguarded machinery, damaged cables, tools" />
        <FormField label="Substance Hazards" name="substance_hazards" type="textarea"
          placeholder="Dust, chemicals, fumes, materials" />
        <FormField label="People Hazards" name="people_hazards" type="textarea"
          placeholder="Untrained workers, other trades nearby, public access" />
      </FormSection>

      <FormSection title="Control Measures (Hierarchy of Control)">
        <FormField label="Elimination - Remove hazard entirely" name="elimination" type="textarea" />
        <FormField label="Substitution - Use safer alternative" name="substitution" type="textarea" />
        <FormField label="Engineering Controls" name="engineering_controls" type="textarea"
          placeholder="Guards, barriers, ventilation" />
        <FormField label="Administrative Controls" name="administrative_controls" type="textarea"
          placeholder="Training, supervision, permits" />
        <FormField label="PPE Required *" name="ppe_required" type="textarea"
          placeholder="Hard hat, safety glasses, gloves, high-vis, safety boots" />
      </FormSection>

      <FormSection title="Work Method (Step-by-Step)">
        <FormField label="Work Steps *" name="work_steps" type="textarea"
          placeholder="Enter each step on a new line" />
        <FormField label="Personnel Required" name="personnel_required" type="number" />
        <FormField label="Supervision Requirements" name="supervision" type="textarea" />
      </FormSection>

      <FormSection title="Emergency Procedures">
        <FormField label="First Aid Arrangements *" name="first_aid" type="textarea" />
        <FormField label="Emergency Contacts *" name="emergency_contacts" type="textarea"
          placeholder="Enter each contact on a new line" />
        <FormField label="Nearest Hospital" name="nearest_hospital" />
      </FormSection>

      <FormSection title="Training & Competence">
        <FormField label="Required Qualifications" name="qualifications" type="textarea"
          placeholder="CSCS cards, machine licenses, certifications" />
        <FormField label="Training Completed" name="training_completed" type="textarea" />
      </FormSection>

      <FormSection title="Sign-Off">
        <FormField label="Prepared By (Name) *" name="prepared_by_name" />
        <FormField label="Position" name="prepared_by_position" />
        <FormField label="Reviewed By" name="reviewed_by" />
        <FormField label="Approved By" name="approved_by" />
      </FormSection>
    </>
  );

  // Health & Safety - Risk Assessment
  const renderHealthSafetyRA = () => (
    <>
      <FormSection title="Assessment Details">
        <FormField label="Assessment Title *" name="assessment_title" />
        <FormField label="Assessor Name *" name="assessor_name" />
        <FormField label="Location *" name="location" />
        <FormField label="Assessment Date *" name="assessment_date" type="date" />
        <FormField label="Review Date *" name="review_date" type="date" />
        <FormField label="Activity Description *" name="activity_description" type="textarea" />
      </FormSection>

      <FormSection title="Hazard Identification & Risk Assessment">
        <FormField label="Identified Hazards *" name="hazards" type="textarea"
          placeholder="List all identified hazards (one per line)" />
        <FormField label="Who Might Be Harmed *" name="who_harmed" type="textarea"
          placeholder="Workers, visitors, public, contractors" />
        <FormField label="Existing Control Measures" name="existing_controls" type="textarea" />
      </FormSection>

      <FormSection title="Risk Matrix (5×5)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Likelihood (1-5) *</Label>
            <Select value={formData.likelihood?.toString() || ''} 
              onValueChange={(val) => updateFormData('likelihood', parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select likelihood" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Rare</SelectItem>
                <SelectItem value="2">2 - Unlikely</SelectItem>
                <SelectItem value="3">3 - Possible</SelectItem>
                <SelectItem value="4">4 - Likely</SelectItem>
                <SelectItem value="5">5 - Almost Certain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity (1-5) *</Label>
            <Select value={formData.severity?.toString() || ''}
              onValueChange={(val) => updateFormData('severity', parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Insignificant</SelectItem>
                <SelectItem value="2">2 - Minor</SelectItem>
                <SelectItem value="3">3 - Moderate</SelectItem>
                <SelectItem value="4">4 - Major</SelectItem>
                <SelectItem value="5">5 - Catastrophic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {formData.likelihood && formData.severity && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Risk Score:</span>
              <span className="text-2xl font-bold">{formData.likelihood * formData.severity}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold">Risk Level:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskLevel(formData.likelihood * formData.severity).color}`}>
                {getRiskLevel(formData.likelihood * formData.severity).level}
              </span>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="Additional Control Measures Required">
        <FormField label="Control Measures *" name="additional_controls" type="textarea"
          placeholder="What additional controls are needed to reduce the risk?" />
        <FormField label="Action By (Person)" name="action_by" />
        <FormField label="Action By (Date)" name="action_date" type="date" />
      </FormSection>

      <FormSection title="Residual Risk (After Controls)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Residual Likelihood (1-5)</Label>
            <Select value={formData.residual_likelihood?.toString() || ''}
              onValueChange={(val) => updateFormData('residual_likelihood', parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Rare</SelectItem>
                <SelectItem value="2">2 - Unlikely</SelectItem>
                <SelectItem value="3">3 - Possible</SelectItem>
                <SelectItem value="4">4 - Likely</SelectItem>
                <SelectItem value="5">5 - Almost Certain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Residual Severity (1-5)</Label>
            <Select value={formData.residual_severity?.toString() || ''}
              onValueChange={(val) => updateFormData('residual_severity', parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Insignificant</SelectItem>
                <SelectItem value="2">2 - Minor</SelectItem>
                <SelectItem value="3">3 - Moderate</SelectItem>
                <SelectItem value="4">4 - Major</SelectItem>
                <SelectItem value="5">5 - Catastrophic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {formData.residual_likelihood && formData.residual_severity && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Residual Risk Score:</span>
              <span className="text-2xl font-bold">{formData.residual_likelihood * formData.residual_severity}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold">Residual Risk Level:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskLevel(formData.residual_likelihood * formData.residual_severity).color}`}>
                {getRiskLevel(formData.residual_likelihood * formData.residual_severity).level}
              </span>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="Approval">
        <FormField label="Assessor Signature *" name="assessor_signature" />
        <FormField label="Manager Approval" name="manager_approval" />
      </FormSection>
    </>
  );

  // Construction - Method Statement
  const renderConstructionMS = () => (
    <>
      <FormSection title="Project Details (CDM 2015 Compliant)">
        <FormField label="Project Name *" name="project_name" />
        <FormField label="Project Address *" name="project_address" type="textarea" />
        <FormField label="Principal Contractor *" name="principal_contractor" />
        <FormField label="Contractor Company *" name="contractor_company" />
        <FormField label="CDM Coordinator/Principal Designer" name="cdm_coordinator" />
        <FormField label="F10 Reference Number" name="f10_reference" />
      </FormSection>

      <FormSection title="Scope of Works">
        <FormField label="Description of Works *" name="work_description" type="textarea" />
        <FormField label="Work Location on Site" name="work_location" type="textarea" />
        <FormField label="Estimated Duration" name="work_duration" />
        <FormField label="Gang Size (Number of Operatives)" name="gang_size" type="number" />
      </FormSection>

      <FormSection title="Site Conditions">
        <FormField label="Site Access Arrangements" name="site_access" type="textarea" />
        <FormField label="Welfare Facilities" name="welfare_facilities" type="textarea" />
        <FormField label="Underground/Overhead Services" name="services_location" type="textarea" />
        <FormField label="Adjacent Operations/Trades" name="adjacent_operations" type="textarea" />
      </FormSection>

      <FormSection title="Plant, Equipment and Materials">
        <FormField label="Plant Required" name="plant_required" type="textarea"
          placeholder="Excavators, cranes, scaffolding, etc." />
        <FormField label="Equipment and Tools" name="equipment_list" type="textarea" />
        <FormField label="Materials Required" name="materials_list" type="textarea" />
        <FormField label="Inspection/Certification Requirements" name="inspection_requirements" type="textarea"
          placeholder="LOLER, PUWER, etc." />
      </FormSection>

      <FormSection title="Hazards and Risks">
        <FormField label="Work at Height" name="work_at_height" type="textarea" />
        <FormField label="Excavations" name="excavations" type="textarea" />
        <FormField label="Lifting Operations" name="lifting_operations" type="textarea" />
        <FormField label="Confined Spaces" name="confined_spaces" type="textarea" />
        <FormField label="Noise and Vibration" name="noise_vibration" type="textarea" />
        <FormField label="Manual Handling" name="manual_handling" type="textarea" />
      </FormSection>

      <FormSection title="Control Measures">
        <FormField label="General Control Measures *" name="general_controls" type="textarea" />
        <FormField label="Task-Specific Controls *" name="specific_controls" type="textarea" />
        <FormField label="PPE Required *" name="ppe_required" type="textarea" />
        <FormField label="Barriers and Signage" name="barriers_signage" type="textarea" />
      </FormSection>

      <FormSection title="Work Sequence">
        <FormField label="Sequential Work Steps *" name="sequence_steps" type="textarea"
          placeholder="Enter each step on a new line" />
      </FormSection>

      <FormSection title="Permits and Notifications">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Permit to Work Required" name="permit_to_work" type="radio" 
            options={['Yes', 'No']} />
          <FormField label="Hot Works Permit" name="hot_works_permit" type="radio"
            options={['Yes', 'No']} />
          <FormField label="Confined Space Permit" name="confined_space_permit" type="radio"
            options={['Yes', 'No']} />
          <FormField label="Temporary Works Design" name="temporary_works" type="radio"
            options={['Yes', 'No']} />
        </div>
      </FormSection>

      <FormSection title="Training and Competence">
        <FormField label="CSCS Cards Required" name="cscs_cards" type="textarea" />
        <FormField label="Plant Operator Tickets" name="plant_tickets" type="textarea" />
        <FormField label="Specialist Training Required" name="specialist_training" type="textarea" />
      </FormSection>

      <FormSection title="Emergency Arrangements">
        <FormField label="First Aiders on Site" name="first_aiders" />
        <FormField label="Emergency Assembly Point" name="emergency_assembly" />
        <FormField label="Emergency Contact Numbers *" name="emergency_contacts" type="textarea" />
      </FormSection>

      <FormSection title="Sign-Off">
        <FormField label="Prepared By *" name="prepared_by_name" />
        <FormField label="Site Manager Approval" name="site_manager_name" />
        <FormField label="Principal Contractor Approval" name="principal_contractor_approval" />
      </FormSection>
    </>
  );

  // Construction - Risk Assessment
  const renderConstructionRA = () => (
    <>
      <FormSection title="Assessment Details">
        <FormField label="Assessment Title *" name="assessment_title" />
        <FormField label="Project Name *" name="project_name" />
        <FormField label="Assessor Name *" name="assessor_name" />
        <FormField label="Assessment Date *" name="assessment_date" type="date" />
        <FormField label="Activity Description *" name="activity_description" type="textarea" />
      </FormSection>

      <FormSection title="Construction-Specific Hazards">
        <FormField label="Work at Height Hazards" name="height_hazards" type="textarea"
          placeholder="Falls from scaffolding, ladders, roofs" />
        <FormField label="Excavation Hazards" name="excavation_hazards" type="textarea"
          placeholder="Collapse, buried services, falls into excavation" />
        <FormField label="Lifting and Handling Hazards" name="lifting_hazards" type="textarea"
          placeholder="Crane operations, manual handling, load securing" />
        <FormField label="Plant and Equipment Hazards" name="plant_hazards" type="textarea"
          placeholder="Moving vehicles, unguarded machinery" />
        <FormField label="Structural Hazards" name="structural_hazards" type="textarea"
          placeholder="Unstable structures, demolition risks" />
      </FormSection>

      <FormSection title="Risk Assessment">
        <FormField label="Identified Hazards *" name="hazards" type="textarea" />
        <FormField label="Who Might Be Harmed *" name="who_harmed" type="textarea" />
        <FormField label="Existing Controls" name="existing_controls" type="textarea" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Likelihood (1-5) *</Label>
            <Select value={formData.likelihood?.toString() || ''}
              onValueChange={(val) => updateFormData('likelihood', parseInt(val))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Rare</SelectItem>
                <SelectItem value="2">2 - Unlikely</SelectItem>
                <SelectItem value="3">3 - Possible</SelectItem>
                <SelectItem value="4">4 - Likely</SelectItem>
                <SelectItem value="5">5 - Almost Certain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity (1-5) *</Label>
            <Select value={formData.severity?.toString() || ''}
              onValueChange={(val) => updateFormData('severity', parseInt(val))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Insignificant</SelectItem>
                <SelectItem value="2">2 - Minor</SelectItem>
                <SelectItem value="3">3 - Moderate</SelectItem>
                <SelectItem value="4">4 - Major</SelectItem>
                <SelectItem value="5">5 - Catastrophic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {formData.likelihood && formData.severity && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Risk Score:</span>
              <span className="text-2xl font-bold">{formData.likelihood * formData.severity}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold">Risk Level:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskLevel(formData.likelihood * formData.severity).color}`}>
                {getRiskLevel(formData.likelihood * formData.severity).level}
              </span>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="Control Measures">
        <FormField label="Additional Controls Required *" name="additional_controls" type="textarea" />
        <FormField label="CDM-Specific Controls" name="cdm_controls" type="textarea"
          placeholder="Pre-construction information, construction phase plan requirements" />
        <FormField label="Action By" name="action_by" />
        <FormField label="Action Date" name="action_date" type="date" />
      </FormSection>

      <FormSection title="Approval">
        <FormField label="Assessor Signature *" name="assessor_signature" />
        <FormField label="Site Manager Approval" name="site_manager_approval" />
        <FormField label="Principal Contractor Approval" name="principal_contractor_approval" />
      </FormSection>
    </>
  );

  // Field Service - Method Statement
  const renderFieldServiceMS = () => (
    <>
      <FormSection title="Service Call Details">
        <FormField label="Service Call Reference *" name="service_reference" />
        <FormField label="Customer Name *" name="customer_name" />
        <FormField label="Customer Address *" name="customer_address" type="textarea" />
        <FormField label="Engineer Name *" name="engineer_name" />
        <FormField label="Service Date *" name="service_date" type="date" />
      </FormSection>

      <FormSection title="Task Description">
        <FormField label="Service Task Description *" name="task_description" type="textarea"
          placeholder="Installation, maintenance, repair, inspection" />
        <FormField label="Equipment/System Being Serviced" name="equipment_serviced" type="textarea" />
        <FormField label="Estimated Duration" name="estimated_duration" />
      </FormSection>

      <FormSection title="Customer Site Hazards">
        <FormField label="Site Access Hazards" name="site_access_hazards" type="textarea"
          placeholder="Stairs, narrow passages, security gates" />
        <FormField label="Customer Site Conditions" name="site_conditions" type="textarea"
          placeholder="Occupied premises, children/pets present, restricted areas" />
        <FormField label="Environmental Hazards" name="environmental_hazards" type="textarea"
          placeholder="Weather, lighting, temperature" />
        <FormField label="Lone Working Considerations" name="lone_working" type="textarea" />
      </FormSection>

      <FormSection title="Equipment and Tools">
        <FormField label="Tools Required" name="tools_required" type="textarea" />
        <FormField label="Test Equipment" name="test_equipment" type="textarea" />
        <FormField label="Materials/Parts" name="materials_parts" type="textarea" />
        <FormField label="Vehicle/Transport" name="vehicle_transport" type="textarea" />
      </FormSection>

      <FormSection title="Control Measures">
        <FormField label="General Safety Measures *" name="general_safety" type="textarea" />
        <FormField label="Customer Liaison" name="customer_liaison" type="textarea"
          placeholder="Inform customer of work, obtain access permissions" />
        <FormField label="PPE Required *" name="ppe_required" type="textarea" />
        <FormField label="Isolation Procedures" name="isolation_procedures" type="textarea"
          placeholder="Electrical, mechanical, fluid systems" />
      </FormSection>

      <FormSection title="Work Method">
        <FormField label="Work Steps *" name="work_steps" type="textarea"
          placeholder="Step-by-step procedure" />
        <FormField label="Quality Checks" name="quality_checks" type="textarea" />
        <FormField label="Testing Requirements" name="testing_requirements" type="textarea" />
      </FormSection>

      <FormSection title="Emergency Procedures">
        <FormField label="Emergency Contact (Base)" name="emergency_contact_base" />
        <FormField label="Customer Emergency Contact" name="customer_emergency_contact" />
        <FormField label="Nearest Hospital" name="nearest_hospital" />
        <FormField label="Incident Reporting Procedure" name="incident_reporting" type="textarea" />
      </FormSection>

      <FormSection title="Communication">
        <FormField label="Check-in Procedures" name="checkin_procedures" type="textarea"
          placeholder="Lone worker check-ins, completion notification" />
        <FormField label="Customer Sign-Off Requirements" name="customer_signoff" type="textarea" />
      </FormSection>

      <FormSection title="Sign-Off">
        <FormField label="Engineer Name *" name="engineer_signature" />
        <FormField label="Supervisor Approval" name="supervisor_approval" />
      </FormSection>
    </>
  );

  // Field Service - Risk Assessment
  const renderFieldServiceRA = () => (
    <>
      <FormSection title="Assessment Details">
        <FormField label="Assessment Title *" name="assessment_title" />
        <FormField label="Service Type *" name="service_type" 
          placeholder="Installation, Maintenance, Repair, Inspection" />
        <FormField label="Assessor Name *" name="assessor_name" />
        <FormField label="Assessment Date *" name="assessment_date" type="date" />
      </FormSection>

      <FormSection title="Field Service Hazards">
        <FormField label="Driving Hazards" name="driving_hazards" type="textarea"
          placeholder="Road accidents, fatigue, weather conditions" />
        <FormField label="Lone Working Hazards" name="lone_working_hazards" type="textarea"
          placeholder="Medical emergency, violence, communication failure" />
        <FormField label="Customer Site Hazards" name="customer_site_hazards" type="textarea"
          placeholder="Unfamiliar premises, dogs, aggressive customers" />
        <FormField label="Equipment Hazards" name="equipment_hazards" type="textarea"
          placeholder="Electrical, mechanical, chemical" />
        <FormField label="Manual Handling" name="manual_handling" type="textarea"
          placeholder="Heavy equipment, awkward access" />
      </FormSection>

      <FormSection title="Risk Assessment">
        <FormField label="Identified Hazards *" name="hazards" type="textarea" />
        <FormField label="Who Might Be Harmed *" name="who_harmed" type="textarea"
          placeholder="Engineer, customer, public" />
        <FormField label="Existing Controls" name="existing_controls" type="textarea" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>Likelihood (1-5) *</Label>
            <Select value={formData.likelihood?.toString() || ''}
              onValueChange={(val) => updateFormData('likelihood', parseInt(val))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Rare</SelectItem>
                <SelectItem value="2">2 - Unlikely</SelectItem>
                <SelectItem value="3">3 - Possible</SelectItem>
                <SelectItem value="4">4 - Likely</SelectItem>
                <SelectItem value="5">5 - Almost Certain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity (1-5) *</Label>
            <Select value={formData.severity?.toString() || ''}
              onValueChange={(val) => updateFormData('severity', parseInt(val))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Insignificant</SelectItem>
                <SelectItem value="2">2 - Minor</SelectItem>
                <SelectItem value="3">3 - Moderate</SelectItem>
                <SelectItem value="4">4 - Major</SelectItem>
                <SelectItem value="5">5 - Catastrophic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {formData.likelihood && formData.severity && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Risk Score:</span>
              <span className="text-2xl font-bold">{formData.likelihood * formData.severity}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="font-semibold">Risk Level:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskLevel(formData.likelihood * formData.severity).color}`}>
                {getRiskLevel(formData.likelihood * formData.severity).level}
              </span>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="Control Measures">
        <FormField label="Additional Controls Required *" name="additional_controls" type="textarea" />
        <FormField label="Lone Worker Procedures" name="lone_worker_procedures" type="textarea"
          placeholder="Check-in schedule, buddy system, panic alarm" />
        <FormField label="Customer Communication" name="customer_communication" type="textarea" />
      </FormSection>

      <FormSection title="Approval">
        <FormField label="Assessor Signature *" name="assessor_signature" />
        <FormField label="Manager Approval" name="manager_approval" />
      </FormSection>
    </>
  );

  // Regulated Industries - Method Statement
  const renderRegulatedMS = () => (
    <>
      <FormSection title="Document Control">
        <FormField label="Document Number *" name="document_number" />
        <FormField label="Version/Revision *" name="version" />
        <FormField label="Effective Date *" name="effective_date" type="date" />
        <FormField label="Review Date *" name="review_date" type="date" />
      </FormSection>

      <FormSection title="Process/Activity Description">
        <FormField label="Process Name *" name="process_name" />
        <FormField label="Scope and Objectives *" name="scope_objectives" type="textarea" />
        <FormField label="Equipment and Materials" name="equipment_materials" type="textarea" />
        <FormField label="Personnel Requirements" name="personnel_requirements" type="textarea" />
      </FormSection>

      <FormSection title="Regulatory Requirements">
        <FormField label="Applicable Regulations *" name="applicable_regulations" type="textarea"
          placeholder="FDA, EMA, GMP, HACCP, ISO standards" />
        <FormField label="Compliance References" name="compliance_references" type="textarea" />
      </FormSection>

      <FormSection title="Hazard Analysis">
        <FormField label="Biological Hazards" name="biological_hazards" type="textarea" />
        <FormField label="Chemical Hazards" name="chemical_hazards" type="textarea" />
        <FormField label="Physical Hazards" name="physical_hazards" type="textarea" />
        <FormField label="Cross-Contamination Risks" name="cross_contamination" type="textarea" />
        <FormField label="Allergen Controls" name="allergen_controls" type="textarea" />
      </FormSection>

      <FormSection title="Critical Control Points (HACCP)">
        <FormField label="CCP Identification" name="ccp_identification" type="textarea"
          placeholder="Points where control is essential" />
        <FormField label="Critical Limits" name="critical_limits" type="textarea"
          placeholder="Temperature, time, pH, etc." />
        <FormField label="Monitoring Procedures" name="monitoring_procedures" type="textarea" />
        <FormField label="Corrective Actions" name="corrective_actions" type="textarea" />
      </FormSection>

      <FormSection title="Control Measures">
        <FormField label="Process Controls *" name="process_controls" type="textarea" />
        <FormField label="Environmental Controls" name="environmental_controls" type="textarea"
          placeholder="Temperature, humidity, air quality" />
        <FormField label="Personnel Controls" name="personnel_controls" type="textarea"
          placeholder="Hygiene, gowning, training" />
        <FormField label="Equipment Controls" name="equipment_controls" type="textarea" />
      </FormSection>

      <FormSection title="Standard Operating Procedures">
        <FormField label="Step-by-Step Instructions *" name="sop_instructions" type="textarea" />
        <FormField label="Process Parameters" name="process_parameters" type="textarea"
          placeholder="Critical parameters and acceptable ranges" />
        <FormField label="Hold Times" name="hold_times" type="textarea" />
      </FormSection>

      <FormSection title="Quality Control">
        <FormField label="In-Process Checks" name="inprocess_checks" type="textarea" />
        <FormField label="Testing Requirements" name="testing_requirements" type="textarea" />
        <FormField label="Acceptance Criteria" name="acceptance_criteria" type="textarea" />
        <FormField label="Sampling Plans" name="sampling_plans" type="textarea" />
      </FormSection>

      <FormSection title="Training and Competence">
        <FormField label="Required Qualifications *" name="required_qualifications" type="textarea" />
        <FormField label="Training Completed" name="training_completed" type="textarea" />
        <FormField label="Competency Assessment" name="competency_assessment" type="textarea" />
      </FormSection>

      <FormSection title="Record Keeping">
        <FormField label="Records to be Maintained *" name="records_maintained" type="textarea" />
        <FormField label="Retention Period" name="retention_period" />
        <FormField label="Review Requirements" name="review_requirements" type="textarea" />
      </FormSection>

      <FormSection title="Deviation and CAPA">
        <FormField label="Deviation Reporting" name="deviation_reporting" type="textarea" />
        <FormField label="Investigation Procedures" name="investigation_procedures" type="textarea" />
        <FormField label="Corrective and Preventive Actions" name="capa" type="textarea" />
      </FormSection>

      <FormSection title="Approval">
        <FormField label="Prepared By *" name="prepared_by" />
        <FormField label="Quality Assurance Approval *" name="qa_approval" />
        <FormField label="Management Approval *" name="management_approval" />
      </FormSection>
    </>
  );

  // Regulated Industries - Risk Assessment
  const renderRegulatedRA = () => (
    <>
      <FormSection title="Risk Assessment Header">
        <FormField label="Product/Process Name *" name="product_process" />
        <FormField label="Assessment Date *" name="assessment_date" type="date" />
        <FormField label="Assessment Team *" name="assessment_team" type="textarea"
          placeholder="Names and roles of team members" />
        <FormField label="Regulatory Framework *" name="regulatory_framework" 
          placeholder="ICH Q9, FMEA, HACCP, etc." />
      </FormSection>

      <FormSection title="Risk Identification">
        <FormField label="Potential Hazards/Failure Modes *" name="potential_hazards" type="textarea" />
        <FormField label="Sources of Risk" name="sources_of_risk" type="textarea" />
        <FormField label="Affected Areas/Processes" name="affected_areas" type="textarea" />
      </FormSection>

      <FormSection title="Risk Analysis Method">
        <Label>Select Risk Analysis Method *</Label>
        <Select value={formData.risk_method || ''}
          onValueChange={(val) => updateFormData('risk_method', val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fmea">FMEA (Failure Mode and Effects Analysis)</SelectItem>
            <SelectItem value="haccp">HACCP (Hazard Analysis Critical Control Point)</SelectItem>
            <SelectItem value="risk_matrix">Risk Matrix (5×5)</SelectItem>
          </SelectContent>
        </Select>
      </FormSection>

      {formData.risk_method === 'fmea' && (
        <FormSection title="FMEA Analysis">
          <FormField label="Potential Failure Mode" name="failure_mode" type="textarea" />
          <FormField label="Potential Effects of Failure" name="effects_of_failure" type="textarea" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Severity (1-10) *</Label>
              <Input type="number" min="1" max="10" 
                value={formData.fmea_severity || ''}
                onChange={(e) => updateFormData('fmea_severity', parseInt(e.target.value))} />
            </div>
            <div>
              <Label>Occurrence (1-10) *</Label>
              <Input type="number" min="1" max="10"
                value={formData.fmea_occurrence || ''}
                onChange={(e) => updateFormData('fmea_occurrence', parseInt(e.target.value))} />
            </div>
            <div>
              <Label>Detection (1-10) *</Label>
              <Input type="number" min="1" max="10"
                value={formData.fmea_detection || ''}
                onChange={(e) => updateFormData('fmea_detection', parseInt(e.target.value))} />
            </div>
          </div>
          {formData.fmea_severity && formData.fmea_occurrence && formData.fmea_detection && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold">RPN (Risk Priority Number):</span>
                <span className="text-2xl font-bold">
                  {formData.fmea_severity * formData.fmea_occurrence * formData.fmea_detection}
                </span>
              </div>
            </div>
          )}
          <FormField label="Potential Causes" name="potential_causes" type="textarea" />
          <FormField label="Current Controls" name="current_controls" type="textarea" />
        </FormSection>
      )}

      {formData.risk_method === 'haccp' && (
        <FormSection title="HACCP Analysis">
          <FormField label="Hazard Significance" name="hazard_significance" type="textarea" />
          <FormField label="Is this a CCP?" name="is_ccp" type="radio" options={['Yes', 'No']} />
          <FormField label="Critical Limits" name="critical_limits_haccp" type="textarea" />
          <FormField label="Monitoring Procedures" name="monitoring_procedures_haccp" type="textarea" />
          <FormField label="Corrective Actions" name="corrective_actions_haccp" type="textarea" />
          <FormField label="Verification Procedures" name="verification_procedures" type="textarea" />
        </FormSection>
      )}

      {formData.risk_method === 'risk_matrix' && (
        <FormSection title="Risk Matrix">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Probability (1-5) *</Label>
              <Select value={formData.probability?.toString() || ''}
                onValueChange={(val) => updateFormData('probability', parseInt(val))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Rare</SelectItem>
                  <SelectItem value="2">2 - Unlikely</SelectItem>
                  <SelectItem value="3">3 - Possible</SelectItem>
                  <SelectItem value="4">4 - Likely</SelectItem>
                  <SelectItem value="5">5 - Almost Certain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact (1-5) *</Label>
              <Select value={formData.impact?.toString() || ''}
                onValueChange={(val) => updateFormData('impact', parseInt(val))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Insignificant</SelectItem>
                  <SelectItem value="2">2 - Minor</SelectItem>
                  <SelectItem value="3">3 - Moderate</SelectItem>
                  <SelectItem value="4">4 - Major</SelectItem>
                  <SelectItem value="5">5 - Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {formData.probability && formData.impact && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Risk Score:</span>
                <span className="text-2xl font-bold">{formData.probability * formData.impact}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold">Risk Level:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskLevel(formData.probability * formData.impact).color}`}>
                  {getRiskLevel(formData.probability * formData.impact).level}
                </span>
              </div>
            </div>
          )}
        </FormSection>
      )}

      <FormSection title="Risk Control Measures">
        <FormField label="Elimination" name="elimination_measures" type="textarea" />
        <FormField label="Reduction" name="reduction_measures" type="textarea" />
        <FormField label="Transfer" name="transfer_measures" type="textarea" />
        <FormField label="Acceptance" name="acceptance_measures" type="textarea" />
        <FormField label="Implementation Plan *" name="implementation_plan" type="textarea" />
      </FormSection>

      <FormSection title="Residual Risk">
        <FormField label="Risk After Controls" name="residual_risk" type="textarea" />
        <FormField label="Acceptability Assessment" name="acceptability_assessment" type="textarea" />
        <FormField label="Further Actions Needed" name="further_actions" type="textarea" />
      </FormSection>

      <FormSection title="Monitoring and Review">
        <FormField label="KPIs for Monitoring" name="kpis" type="textarea" />
        <FormField label="Review Frequency" name="review_frequency" />
        <FormField label="Trigger for Reassessment" name="reassessment_trigger" type="textarea" />
      </FormSection>

      <FormSection title="Approval">
        <FormField label="Quality Assurance Approval *" name="qa_approval" />
        <FormField label="Management Approval *" name="management_approval" />
        <FormField label="Regulatory Compliance Confirmation" name="regulatory_confirmation" />
      </FormSection>
    </>
  );

  // Helper components
  const FormSection = ({ title, children }) => (
    <div className="border-b pb-6">
      <h4 className="text-lg font-semibold mb-4">{title}</h4>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const FormField = ({ label, name, type = 'text', placeholder = '', options = [], required = false }) => {
    const value = formData[name] || '';
    
    if (type === 'textarea') {
      return (
        <div>
          <Label>{label}</Label>
          <Textarea
            value={value}
            onChange={(e) => updateFormData(name, e.target.value)}
            placeholder={placeholder}
            rows={3}
            required={required}
          />
        </div>
      );
    }
    
    if (type === 'radio') {
      return (
        <div>
          <Label>{label}</Label>
          <div className="flex gap-4 mt-2">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => updateFormData(name, e.target.value)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div>
        <Label>{label}</Label>
        <Input
          type={type}
          value={value}
          onChange={(e) => updateFormData(name, e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      </div>
    );
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderDocumentCard = (doc, type) => {
    const sectorLabel = SECTORS.find(s => s.value === doc.sector)?.label || doc.sector;
    const isMS = type === 'method_statement';
    
    return (
      <Card key={doc.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isMS ? <FileText className="h-5 w-5 text-blue-600" /> : <Shield className="h-5 w-5 text-orange-600" />}
                <h4 className="font-semibold">{isMS ? 'Method Statement' : 'Risk Assessment'}</h4>
                <span className="text-sm text-gray-500">- {sectorLabel}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {doc.project_name || doc.assessment_title || doc.service_reference || doc.process_name || 'Untitled Document'}
              </p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Created: {new Date(doc.created_at).toLocaleDateString()}</span>
                <span>Updated: {new Date(doc.updated_at).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded ${doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {doc.status || 'draft'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEditDocument(doc, type)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDeleteDocument(doc.id, type)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Method Statements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Method Statements
              </CardTitle>
              <CardDescription>
                Detailed procedures for safe work execution
              </CardDescription>
            </div>
            <Button onClick={() => handleAddDocument('method_statement')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Method Statement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {methodStatements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No method statements yet</p>
              <p className="text-sm">Click "Add Method Statement" to create one</p>
            </div>
          ) : (
            methodStatements.map(doc => renderDocumentCard(doc, 'method_statement'))
          )}
        </CardContent>
      </Card>

      {/* Risk Assessments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Assessments
              </CardTitle>
              <CardDescription>
                Systematic evaluation of workplace hazards and risks
              </CardDescription>
            </div>
            <Button onClick={() => handleAddDocument('risk_assessment')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Risk Assessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {riskAssessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No risk assessments yet</p>
              <p className="text-sm">Click "Add Risk Assessment" to create one</p>
            </div>
          ) : (
            riskAssessments.map(doc => renderDocumentCard(doc, 'risk_assessment'))
          )}
        </CardContent>
      </Card>

      {/* Sector Selection Modal */}
      <Dialog open={showSectorModal} onOpenChange={setShowSectorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Select Sector for {documentType === 'method_statement' ? 'Method Statement' : 'Risk Assessment'}
            </DialogTitle>
            <DialogDescription>
              Choose the industry sector to load the appropriate template
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Sector *</Label>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a sector..." />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map(sector => (
                  <SelectItem key={sector.value} value={sector.value}>
                    {sector.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectorModal(false)}>Cancel</Button>
            <Button onClick={handleSectorSelected} disabled={!selectedSector}>
              Create {documentType === 'method_statement' ? 'Method Statement' : 'Risk Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor Modal */}
      <Dialog open={showEditorModal} onOpenChange={setShowEditorModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingDocument ? 'Edit' : 'Create'} {documentType === 'method_statement' ? 'Method Statement' : 'Risk Assessment'}
            </DialogTitle>
            <DialogDescription>
              Fill out the form below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          {renderTemplateForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditorModal(false)}>Cancel</Button>
            <Button onClick={handleSaveDocument}>Save Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
