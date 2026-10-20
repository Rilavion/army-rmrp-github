BEGIN;
-- Nullable for historical requests; new submissions and approvals require all fields.
ALTER TABLE registration_requests
 ADD COLUMN position text CHECK (position IS NULL OR length(position) BETWEEN 2 AND 120),
 ADD COLUMN military_rank text CHECK (military_rank IS NULL OR length(military_rank) BETWEEN 2 AND 80),
 ADD COLUMN discord text CHECK (discord IS NULL OR length(discord) BETWEEN 2 AND 80);
CREATE TABLE registration_identity_documents (
 request_id uuid PRIMARY KEY REFERENCES registration_requests(id) ON DELETE CASCADE,
 image bytea NOT NULL CHECK (octet_length(image) BETWEEN 1 AND 1048576),
 mime_type text NOT NULL DEFAULT 'image/jpeg' CHECK (mime_type='image/jpeg'),
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON registration_identity_documents FROM PUBLIC;
-- Email login is removed. Old sessions must not keep accounts without a verified static active.
DELETE FROM auth_sessions;
COMMIT;
