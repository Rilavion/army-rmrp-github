-- Referential and role invariants independent of browser controls.
ALTER TABLE user_roles ADD CONSTRAINT user_roles_account_fk FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_name_check CHECK(role IN ('admin','ss','user'));
ALTER TABLE user_roles ADD CONSTRAINT user_roles_custom_fk FOREIGN KEY(custom_role_id) REFERENCES custom_roles(id);
INSERT INTO custom_roles(key,name,base_role,permissions) VALUES('user','Сотрудник','user','{"composition":{"view":true},"tests":{"view":true},"training":{"view":true},"docs":{"view":true}}') ON CONFLICT(key) DO UPDATE SET permissions=excluded.permissions;
