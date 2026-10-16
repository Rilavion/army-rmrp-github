-- Additional server-side security; no public registration or permissive RLS.
CREATE TABLE auth_sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),expires_at timestamptz NOT NULL);
CREATE TABLE audit_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_id uuid,action text NOT NULL,entity_type text,entity_id text,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE exam_runs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),test_id uuid NOT NULL REFERENCES tests(id),token_hash text UNIQUE NOT NULL,fio text NOT NULL,static_id text NOT NULL,discord text NOT NULL,questions jsonb NOT NULL,pass_score int NOT NULL,started_at timestamptz NOT NULL DEFAULT now(),deadline timestamptz NOT NULL,finished_at timestamptz,result_id uuid REFERENCES test_attempts(id),invalidated boolean NOT NULL DEFAULT false);
CREATE INDEX exam_runs_limit ON exam_runs(test_id,user_id) WHERE NOT invalidated;
ALTER TABLE test_attempts ADD COLUMN user_id uuid REFERENCES users(id);
ALTER TABLE test_attempts ADD COLUMN invalidated boolean NOT NULL DEFAULT false;
ALTER TABLE test_blocks ADD COLUMN IF NOT EXISTS kind text;
CREATE TABLE lesson_completions(user_id uuid REFERENCES users(id),lesson_id uuid REFERENCES train_lessons(id),completed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,lesson_id));
CREATE TABLE webhook_routes(id text PRIMARY KEY,label text NOT NULL,encrypted_url text,enabled boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE outbox(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),route_id text REFERENCES webhook_routes(id),entity_type text NOT NULL,entity_id text NOT NULL,payload jsonb NOT NULL,status text NOT NULL DEFAULT 'pending',attempts int NOT NULL DEFAULT 0,next_attempt timestamptz NOT NULL DEFAULT now(),message_id text,last_error text,version int NOT NULL DEFAULT 1,sent_version int NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(route_id,entity_type,entity_id));
INSERT INTO webhook_routes(id,label) VALUES('supplies','Отчёты поставок'),('supply_requests','Запросы поставок'),('requests','Заявки и рапорты'),('complaints','Жалобы и обжалования'),('exams','Результаты экзаменов'),('reports','Служебные отчёты'),('payroll','Премирование'),('vp','Военная полиция'),('warehouse','Аудит склада');
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS departed int;
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS arrived int;
ALTER TABLE supply_requests ADD CONSTRAINT supply_vehicle_counts CHECK ((departed IS NULL AND arrived IS NULL) OR (departed>0 AND departed<=10000 AND arrived>=0 AND arrived<=departed));
ALTER TABLE supply_requests ADD COLUMN IF NOT EXISTS webhook_requested boolean NOT NULL DEFAULT false;
-- Eliminate the legacy bootstrap even for callers with direct function execution.
CREATE OR REPLACE FUNCTION public.staff_upsert_role(p_user_id uuid,p_role text DEFAULT NULL,p_display_name text DEFAULT NULL,p_custom_role_id uuid DEFAULT NULL) RETURNS json LANGUAGE plpgsql SET search_path=public AS $$
DECLARE chosen text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'Cannot modify own role'; END IF;
 IF EXISTS(SELECT 1 FROM user_roles WHERE user_id=p_user_id AND role='admin') THEN RAISE EXCEPTION 'Administrator protected; use offline maintenance'; END IF;
 chosen:=coalesce(p_role,'user');
 IF chosen NOT IN ('ss','user') THEN RAISE EXCEPTION 'Unsupported role; administrator provisioning is offline'; END IF;
 IF p_custom_role_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM custom_roles WHERE id=p_custom_role_id AND coalesce(base_role,'user')<>'admin' AND key<>'admin') THEN RAISE EXCEPTION 'Invalid custom role'; END IF;
 INSERT INTO user_roles(user_id,role,display_name,custom_role_id) VALUES(p_user_id,chosen,p_display_name,p_custom_role_id) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,display_name=excluded.display_name,custom_role_id=excluded.custom_role_id,updated_at=now();
 DELETE FROM auth_sessions WHERE user_id=p_user_id;
 RETURN json_build_object('ok',true);
END $$;
DROP FUNCTION IF EXISTS public.submit_test_attempt(uuid,text,text,text,jsonb,integer,integer,numeric,boolean,timestamptz);
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

ALTER TABLE outbox ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
