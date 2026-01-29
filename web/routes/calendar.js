const express = require('express');
const router = express.Router();
const { query } = require('@worktrackr/shared/db');

// GET all calendar events for organization
router.get('/events', async (req, res) => {
  try {
    const organizationId = req.orgContext.organizationId;
    
    const result = await query(
      `SELECT e.*, u.name as user_name
       FROM calendar_events e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.organisation_id = $1
       ORDER BY e.event_date ASC, e.start_time ASC`,
      [organizationId]
    );
    
    // Transform snake_case to camelCase for frontend
    const events = result.rows.map(event => ({
      id: event.id,
      organisationId: event.organisation_id,
      userId: event.user_id,
      userName: event.user_name,
      title: event.title,
      description: event.description,
      eventDate: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      notes: event.notes,
      eventType: event.event_type,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }));
    
    res.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events', details: error.message });
  }
});

// POST create calendar event
router.post('/events', async (req, res) => {
  try {
    const organizationId = req.orgContext.organizationId;
    const userId = req.user.userId;
    const { title, description, eventDate, startTime, endTime, notes, eventType } = req.body;
    
    console.log('Creating calendar event:', { organizationId, userId, title, eventDate, startTime, endTime });
    
    // Validate required fields
    if (!title || !eventDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields: title, eventDate, startTime, endTime' });
    }
    
    const result = await query(
      `INSERT INTO calendar_events 
        (organisation_id, user_id, title, description, event_date, start_time, end_time, notes, event_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [organizationId, userId, title, description || null, eventDate, startTime, endTime, notes || null, eventType || 'work']
    );
    
    const event = result.rows[0];
    
    console.log('Calendar event created successfully:', event.id);
    
    // Transform snake_case to camelCase for frontend
    res.status(201).json({ 
      event: {
        id: event.id,
        organisationId: event.organisation_id,
        userId: event.user_id,
        title: event.title,
        description: event.description,
        eventDate: event.event_date,
        startTime: event.start_time,
        endTime: event.end_time,
        notes: event.notes,
        eventType: event.event_type,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event', details: error.message });
  }
});

// PUT update calendar event
router.put('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;
    const { title, description, eventDate, startTime, endTime, notes, eventType } = req.body;
    
    const result = await query(
      `UPDATE calendar_events 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description), 
           event_date = COALESCE($3, event_date), 
           start_time = COALESCE($4, start_time), 
           end_time = COALESCE($5, end_time), 
           notes = COALESCE($6, notes),
           event_type = COALESCE($7, event_type),
           updated_at = NOW()
       WHERE id = $8 AND organisation_id = $9
       RETURNING *`,
      [title, description, eventDate, startTime, endTime, notes, eventType, id, organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const event = result.rows[0];
    
    res.json({ 
      event: {
        id: event.id,
        organisationId: event.organisation_id,
        userId: event.user_id,
        title: event.title,
        description: event.description,
        eventDate: event.event_date,
        startTime: event.start_time,
        endTime: event.end_time,
        notes: event.notes,
        eventType: event.event_type,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: 'Failed to update calendar event', details: error.message });
  }
});

// DELETE calendar event
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.orgContext.organizationId;
    
    const result = await query(
      'DELETE FROM calendar_events WHERE id = $1 AND organisation_id = $2 RETURNING id',
      [id, organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Failed to delete calendar event', details: error.message });
  }
});

module.exports = router;
