-- Optional static-ID registration; no accounts or reviewer privileges are seeded.
BEGIN;
ALTER TABLE users ADD COLUMN static_id text UNIQUE
  CHECK (static_id IS NULL OR (length(static_id)=7 AND static_id ~ '^[0-9]{3}-[0-9]{3}$'));
CREATE TABLE registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  static_id text NOT NULL UNIQUE CHECK (length(static_id)=7 AND static_id ~ '^[0-9]{3}-[0-9]{3}$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 3 AND 120),
  password_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note text NOT NULL DEFAULT '' CHECK (length(review_note)<=1000),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  user_id uuid UNIQUE REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='approved' AND user_id IS NOT NULL AND password_hash IS NULL)
    OR (status<>'approved' AND user_id IS NULL AND password_hash IS NOT NULL))
);
CREATE INDEX registration_pending_idx ON registration_requests(created_at) WHERE status='pending';
REVOKE ALL ON registration_requests FROM PUBLIC;
-- Keep legacy keys stable for existing assignments, adapt their displayed names.
UPDATE custom_roles SET name='Оператор ВП',description='Проверки военной полиции и архив проверок'
 WHERE key='ab_operator';
UPDATE custom_roles SET name='Инструктор ВА',description='Заявления, тестирование, FAQ и обучение военной академии'
 WHERE key='orp_operator';
COMMIT;
