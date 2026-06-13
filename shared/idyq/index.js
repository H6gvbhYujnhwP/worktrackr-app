/**
 * @worktrackr/shared/idyq
 * Re-exports the IDYQ signed client and the sync logic so both the web routes
 * and the worker can `require('@worktrackr/shared/idyq')`.
 */
const client = require('./idyqClient');
const sync = require('./idyqSync');

module.exports = {
  ...client,
  ...sync,
};
