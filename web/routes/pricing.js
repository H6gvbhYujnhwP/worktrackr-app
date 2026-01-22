const express = require('express');
const router = express.Router();
const { query } = require('@worktrackr/shared/db');
const { authenticateToken } = require('../middleware/auth');

// Get organisation pricing configuration
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { organisationId } = req.user;

    const result = await query(
      `SELECT * FROM organisation_pricing WHERE organisation_id = $1`,
      [organisationId]
    );

    if (result.rows.length === 0) {
      // Create default pricing if it doesn't exist
      const defaultPricing = {
        standard_day_rate: 680.00,
        senior_day_rate: 850.00,
        junior_day_rate: 510.00,
        standard_hourly_rate: 85.00,
        senior_hourly_rate: 106.25,
        junior_hourly_rate: 63.75,
        default_markup_percent: 30.00,
        default_margin_percent: 25.00,
        common_services: []
      };

      const insertResult = await query(
        `INSERT INTO organisation_pricing 
         (organisation_id, standard_day_rate, senior_day_rate, junior_day_rate, 
          standard_hourly_rate, senior_hourly_rate, junior_hourly_rate,
          default_markup_percent, default_margin_percent, common_services)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          organisationId,
          defaultPricing.standard_day_rate,
          defaultPricing.senior_day_rate,
          defaultPricing.junior_day_rate,
          defaultPricing.standard_hourly_rate,
          defaultPricing.senior_hourly_rate,
          defaultPricing.junior_hourly_rate,
          defaultPricing.default_markup_percent,
          defaultPricing.default_margin_percent,
          JSON.stringify(defaultPricing.common_services)
        ]
      );

      return res.json(insertResult.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    res.status(500).json({ error: 'Failed to fetch pricing configuration' });
  }
});

// Update organisation pricing configuration
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { organisationId } = req.user;
    const {
      standard_day_rate,
      senior_day_rate,
      junior_day_rate,
      standard_hourly_rate,
      senior_hourly_rate,
      junior_hourly_rate,
      default_markup_percent,
      default_margin_percent,
      common_services
    } = req.body;

    const result = await query(
      `UPDATE organisation_pricing
       SET standard_day_rate = $2,
           senior_day_rate = $3,
           junior_day_rate = $4,
           standard_hourly_rate = $5,
           senior_hourly_rate = $6,
           junior_hourly_rate = $7,
           default_markup_percent = $8,
           default_margin_percent = $9,
           common_services = $10,
           updated_at = NOW()
       WHERE organisation_id = $1
       RETURNING *`,
      [
        organisationId,
        standard_day_rate,
        senior_day_rate,
        junior_day_rate,
        standard_hourly_rate,
        senior_hourly_rate,
        junior_hourly_rate,
        default_markup_percent,
        default_margin_percent,
        JSON.stringify(common_services || [])
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pricing configuration not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating pricing config:', error);
    res.status(500).json({ error: 'Failed to update pricing configuration' });
  }
});

module.exports = router;
