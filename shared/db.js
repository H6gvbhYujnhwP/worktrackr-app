const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query helper
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get organization context for multi-tenancy
async function getOrgContext(userId, activeOrgId = null) {
  // Check if user is a partner admin
  const partnerCheck = await query(
    'SELECT pm.partner_id FROM partner_memberships pm WHERE pm.user_id = $1 AND pm.role = $2',
    [userId, 'partner_admin']
  );

  if (partnerCheck.rows.length > 0) {
    const partnerId = partnerCheck.rows[0].partner_id;
    
    if (!activeOrgId) {
      // Return list of organizations this partner can access
      const orgs = await query(
        'SELECT id, name FROM organisations WHERE partner_id = $1 ORDER BY name',
        [partnerId]
      );
      return { type: 'partner_admin', partnerId, organizations: orgs.rows };
    }

    // Verify the active org belongs to this partner
    const orgCheck = await query(
      'SELECT id, name FROM organisations WHERE id = $1 AND partner_id = $2',
      [activeOrgId, partnerId]
    );

    if (orgCheck.rows.length === 0) {
      throw new Error('Organization not accessible by this partner');
    }

    return { 
      type: 'partner_admin', 
      partnerId, 
      organizationId: activeOrgId,
      organization: orgCheck.rows[0]
    };
  }

  // Regular user - get their organization membership
  const membership = await query(
    'SELECT m.organisation_id, m.role, o.name as org_name FROM memberships m JOIN organisations o ON m.organisation_id = o.id WHERE m.user_id = $1',
    [userId]
  );

  if (membership.rows.length === 0) {
    throw new Error('User has no organization membership');
  }

  const { organisation_id, role, org_name } = membership.rows[0];
  
  return {
    type: 'org_member',
    organizationId: organisation_id,
    role,
    organization: { id: organisation_id, name: org_name }
  };
}

// Middleware for organization-scoped queries
function withOrgScope(organizationId) {
  return {
    query: async (text, params = []) => {
      // Add organization_id as first parameter for scoped queries
      return query(text, [organizationId, ...params]);
    }
  };
}

module.exports = {
  pool,
  query,
  transaction,
  getOrgContext,
  withOrgScope
};

