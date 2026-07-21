-- Second enum value in its own transaction (ALTER TYPE ADD VALUE cannot
-- share a transaction with statements that use the value).
alter type audit_action add value if not exists 'sync_reject';
