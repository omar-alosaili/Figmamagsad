-- Audit action for admin broadcast notifications.
alter type audit_action add value if not exists 'broadcast_sent';
