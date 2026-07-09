-- Audit action for admin user-management operations (grant/revoke
-- creator, promote/demote admin, assign place ownership).
alter type audit_action add value if not exists 'user_update';
