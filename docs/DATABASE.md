# PostgreSQL: схема данных

Миграции применяются к новой БД в порядке 001 → 006. Полные CREATE TABLE, индексы, внешние ключи и функции находятся в SQL-файлах этого каталога. Этот справочник сформирован из применённой схемы, содержит 69 таблиц.

## Основные группы

- Авторизация: users, user_roles, custom_roles, auth_sessions.
- Экзамены: tests, test_categories, test_questions, exam_runs, test_attempts, test_blocks.
- Обучение: train_categories, train_lessons, learn_materials, lesson_completions.
- Обращения: request_forms, requests, complaint_form, complaints, история рассмотрения.
- Поставки: supply_form, supply_requests, supply_entries.
- ВП и премии: vp_checks, vp_archive, payroll_drafts, payroll_archive.
- Уведомления: webhook_routes, outbox, *_send_requests, audit_log.

Часть таблиц (ds_sync_requests, ds_channels, bot_status, telegram_*, refresh_tokens) сохранена для совместимости исходных модулей. Автоматическое чтение Discord и Telegram не запускается. Текущие сессии хранятся в auth_sessions. Пароли users.password_hash — scrypt, не bcrypt. auth.uid() получает ID из транзакционной настройки сервера, не из браузера.

API работает под ограниченной ролью, схема закрыта от PUBLIC. Развёртывание не включает PostgREST и роли anon/authenticated. PostgreSQL runtime-логин не выдаётся пользователям сайта.

## Справочник колонок

### applications

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| source | text | NO | 'discord'::text |
| external_id | text | YES | — |
| message_link | text | YES | — |
| app_type | text | YES | — |
| fields | jsonb | NO | '{}'::jsonb |
| raw_text | text | YES | — |
| submitter_name | text | YES | — |
| submitter_discord | text | YES | — |
| submitter_avatar | text | YES | — |
| status | text | NO | 'new'::text |
| reject_reason | text | YES | — |
| responded_by | uuid | YES | — |
| responded_by_name | text | YES | — |
| responded_at | timestamp with time zone | YES | — |
| result_message_id | text | YES | — |
| result_sent_at | timestamp with time zone | YES | — |
| created_at | timestamp with time zone | NO | now() |

### apps_settings

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| guild_id | text | YES | — |
| incoming_channel_id | text | YES | — |
| results_channel_id | text | YES | — |
| ping_role_id | text | YES | — |
| reviewer_role_id | text | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| updated_by_name | text | YES | — |
| verdict_channel_id | text | YES | — |
| ping_role_id_2 | text | YES | — |

### audit_log

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | bigint | NO | — |
| actor_id | uuid | YES | — |
| action | text | NO | — |
| entity_type | text | YES | — |
| entity_id | text | YES | — |
| details | jsonb | NO | '{}'::jsonb |
| created_at | timestamp with time zone | NO | now() |

### auth_sessions

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| token_hash | text | NO | — |
| user_id | uuid | NO | — |
| expires_at | timestamp with time zone | NO | — |

### bot_messages

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| channel_id | text | YES | — |
| content | text | YES | — |
| embed_title | text | YES | — |
| embed_description | text | YES | — |
| embed_color | integer | YES | — |
| embed_image_url | text | YES | — |
| embed_footer | text | YES | — |
| ping_type | text | YES | — |
| ping_value | text | YES | — |
| attachments | jsonb | NO | '[]'::jsonb |
| status | text | NO | 'pending'::text |
| error_message | text | YES | — |
| sent_message_id | text | YES | — |
| sent_channel_id | text | YES | — |
| sent_at | timestamp with time zone | YES | — |
| created_by | uuid | YES | — |
| created_by_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |

### bot_status

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| online | boolean | NO | false |
| tag | text | YES | — |
| guilds | jsonb | NO | '[]'::jsonb |
| last_seen | timestamp with time zone | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| version | text | YES | — |
| guild_name | text | YES | — |
| members_count | integer | YES | — |
| channels_count | integer | YES | — |

### complaint_form

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| title | text | YES | — |
| intro | text | YES | — |
| fields | jsonb | NO | '[]'::jsonb |
| channels | jsonb | NO | '{}'::jsonb |
| ping_role_id | text | YES | — |
| enabled | boolean | NO | true |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| description | text | YES | — |

### complaint_history

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| complaint_id | uuid | YES | — |
| action | text | YES | — |
| changed_by_uid | uuid | YES | — |
| changed_by_name | text | YES | — |
| changes | jsonb | NO | '{}'::jsonb |
| note | text | YES | — |
| created_at | timestamp with time zone | NO | now() |

### complaints

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| code | text | YES | — |
| values | jsonb | NO | '{}'::jsonb |
| submitter_fio | text | YES | — |
| submitter_static | text | YES | — |
| submitter_discord | text | YES | — |
| target_fio | text | YES | — |
| target_static | text | YES | — |
| target_discord_id | text | YES | — |
| evidence_url | text | YES | — |
| status | text | NO | 'new'::text |
| verdict_kind | text | YES | — |
| verdict | text | YES | — |
| verdict_comment | text | YES | — |
| verdict_at | timestamp with time zone | YES | — |
| verdict_by_uid | uuid | YES | — |
| verdict_by_name | text | YES | — |
| note | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| ds_channel_id | text | YES | — |
| ds_message_id | text | YES | — |
| verdict_ds_message_id | text | YES | — |
| edited_at | timestamp with time zone | YES | — |
| edited_by_uid | uuid | YES | — |
| edited_by_name | text | YES | — |

### composition

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| state | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| updated_by_name | text | YES | — |

### custom_roles

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| key | text | YES | — |
| name | text | YES | — |
| description | text | YES | — |
| color | text | YES | — |
| permissions | jsonb | NO | '{}'::jsonb |
| default_perms | jsonb | NO | '{}'::jsonb |
| sort | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| base_role | text | YES | — |

### ds_channels

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| channel_id | text | NO | — |
| name | text | YES | — |
| parent_id | text | YES | — |
| parent_name | text | YES | — |
| position | integer | YES | — |
| kind | text | YES | — |
| synced_at | timestamp with time zone | NO | now() |
| type | text | YES | — |
| updated_at | timestamp with time zone | NO | now() |

### ds_guild_roles

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| role_id | text | NO | — |
| name | text | YES | — |
| color | integer | YES | — |
| position | integer | YES | — |
| synced_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### ds_members

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| discord_id | text | NO | — |
| display_name | text | YES | — |
| raw_nick | text | YES | — |
| parsed_fio | text | YES | — |
| parsed_static | text | YES | — |
| parsed_dept | text | YES | — |
| role_ids | jsonb | NO | '[]'::jsonb |
| role_names | jsonb | NO | '[]'::jsonb |
| avatar_url | text | YES | — |
| active | boolean | NO | true |
| updated_at | timestamp with time zone | NO | now() |
| created_at | timestamp with time zone | NO | now() |
| username | text | YES | — |
| global_name | text | YES | — |
| is_bot | boolean | NO | false |
| joined_at | timestamp with time zone | YES | — |
| last_seen | timestamp with time zone | YES | — |

### ds_roles

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| role_id | text | NO | — |
| name | text | YES | — |
| color | integer | YES | — |
| position | integer | YES | — |
| synced_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### ds_sync_requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| requested_by | uuid | YES | — |
| requested_by_name | text | YES | — |
| status | text | NO | 'pending'::text |
| created_at | timestamp with time zone | NO | now() |
| processed_at | timestamp with time zone | YES | — |
| message | text | YES | — |
| members_scanned | integer | YES | — |
| finished_at | timestamp with time zone | YES | — |

### exam_runs

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| test_id | uuid | NO | — |
| token_hash | text | NO | — |
| fio | text | NO | — |
| static_id | text | NO | — |
| discord | text | NO | — |
| questions | jsonb | NO | — |
| pass_score | integer | NO | — |
| started_at | timestamp with time zone | NO | now() |
| deadline | timestamp with time zone | NO | — |
| finished_at | timestamp with time zone | YES | — |
| result_id | uuid | YES | — |
| invalidated | boolean | NO | false |

### faq

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | bigint | NO | — |
| title | text | YES | — |
| desc | text | YES | — |
| image | text | YES | — |
| sort | bigint | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| cat | text | YES | — |
| q | text | YES | — |
| a | text | YES | — |

### holiday_state

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| state | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| updated_by_name | text | YES | — |

### info_page

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| data | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |

### learn_materials

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title | text | YES | — |
| url | text | YES | — |
| description | text | YES | — |
| category | text | YES | — |
| kind | text | YES | — |
| cover_url | text | YES | — |
| sort | integer | NO | 0 |
| created_by | uuid | YES | — |
| created_by_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### lesson_completions

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| user_id | uuid | NO | — |
| lesson_id | uuid | NO | — |
| completed_at | timestamp with time zone | NO | now() |

### news

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | bigint | NO | — |
| title | text | YES | — |
| excerpt | text | YES | — |
| body | text | YES | — |
| tag | text | YES | — |
| dept | text | YES | — |
| image | text | YES | — |
| images | jsonb | YES | '[]'::jsonb |
| date | date | YES | CURRENT_DATE |
| author_name | text | YES | — |
| author_email | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### outbox

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| route_id | text | YES | — |
| entity_type | text | NO | — |
| entity_id | text | NO | — |
| payload | jsonb | NO | — |
| status | text | NO | 'pending'::text |
| attempts | integer | NO | 0 |
| next_attempt | timestamp with time zone | NO | now() |
| message_id | text | YES | — |
| last_error | text | YES | — |
| version | integer | NO | 1 |
| sent_version | integer | NO | 0 |
| updated_at | timestamp with time zone | NO | now() |
| created_at | timestamp with time zone | NO | now() |

### payroll_archive

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title | text | YES | — |
| fund_amount | numeric | NO | 0 |
| pct_manual | boolean | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| sent_at | timestamp with time zone | YES | — |
| sent_by | uuid | YES | — |
| sent_by_name | text | YES | — |
| ds_message_id | text | YES | — |
| ds_channel_id | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| period_from | date | YES | — |
| period_to | date | YES | — |

### payroll_drafts

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title | text | YES | — |
| fund_amount | numeric | NO | 0 |
| pct_manual | boolean | NO | true |
| data | jsonb | NO | '{"departments": []}'::jsonb |
| status | text | NO | 'draft'::text |
| sent_at | timestamp with time zone | YES | — |
| sent_by | uuid | YES | — |
| sent_by_name | text | YES | — |
| ds_message_id | text | YES | — |
| ds_channel_id | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| period_from | date | YES | — |
| period_to | date | YES | — |

### payroll_send_requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| draft_id | uuid | YES | — |
| channel_id | text | YES | — |
| payload | jsonb | YES | — |
| status | text | NO | 'pending'::text |
| requested_by | uuid | YES | — |
| requested_by_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| processed_at | timestamp with time zone | YES | — |
| message | text | YES | — |
| output_mode | text | YES | — |
| split_by_dept | boolean | YES | — |
| image_data | text | YES | — |
| image_parts | jsonb | YES | — |
| finished_at | timestamp with time zone | YES | — |

### payroll_settings

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| channel_id | text | YES | — |
| ping_role_id | text | YES | — |
| header_text | text | YES | 'ПРИКАЗ О ПРЕМИРОВАНИИ'::text |
| footer_text | text | YES | — |
| output_mode | text | NO | 'both'::text |
| split_by_dept | boolean | NO | false |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |

### raids_events

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| kind | text | YES | — |
| title | text | YES | — |
| ds_author_name | text | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| created_at | timestamp with time zone | NO | now() |
| channel_id | text | YES | — |
| channel_name | text | YES | — |
| ds_message_id | text | YES | — |
| ds_author_id | text | YES | — |
| content_preview | text | YES | — |

### raids_settings

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| channel_success_id | text | YES | — |
| channel_fail_id | text | YES | — |
| success_role_id | text | YES | — |
| fail_role_id | text | YES | — |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |

### refresh_tokens

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| token_hash | text | NO | — |
| expires_at | timestamp with time zone | NO | — |
| revoked_at | timestamp with time zone | YES | — |
| created_at | timestamp with time zone | NO | now() |
| user_agent | text | YES | — |
| ip | inet | YES | — |

### report_forms

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | text | NO | — |
| label | text | YES | — |
| icon | text | YES | — |
| color | integer | YES | — |
| fields | jsonb | NO | '[]'::jsonb |
| channel_id | text | YES | — |
| ping_role_id | text | YES | — |
| active | boolean | NO | true |
| sort_order | integer | NO | 0 |
| ping_role_id_2 | text | YES | — |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| updated_by_name | text | YES | — |

### report_send_requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| form_id | text | YES | — |
| submitter_uid | uuid | YES | — |
| submitter_email | text | YES | — |
| submitter_fio | text | YES | — |
| submitter_static | text | YES | — |
| submitter_position | text | YES | — |
| values | jsonb | NO | '{}'::jsonb |
| status | text | NO | 'pending'::text |
| message | text | YES | — |
| ds_message_id | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| processed_at | timestamp with time zone | YES | — |
| ds_channel_id | text | YES | — |
| finished_at | timestamp with time zone | YES | — |
| requested_at | timestamp with time zone | NO | now() |

### request_forms

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | text | NO | — |
| title | text | YES | — |
| description | text | YES | — |
| fields | jsonb | NO | '[]'::jsonb |
| rank_matrix | jsonb | YES | — |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| channel_id | text | YES | — |
| verdict_channel_id | text | YES | — |
| ping_role_id | text | YES | — |
| ping_role_id_2 | text | YES | — |

### requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| code | text | YES | — |
| kind | text | YES | — |
| values | jsonb | NO | '{}'::jsonb |
| submitter_uid | uuid | YES | — |
| submitter_fio | text | YES | — |
| submitter_static | text | YES | — |
| submitter_discord | text | YES | — |
| status | text | NO | 'pending'::text |
| verdict_comment | text | YES | — |
| verdict_at | timestamp with time zone | YES | — |
| verdict_by_uid | uuid | YES | — |
| verdict_by_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| ds_channel_id | text | YES | — |
| ds_message_id | text | YES | — |
| ds_message_id_2 | text | YES | — |

### requests_settings

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| max_leave_minutes | integer | NO | 60 |
| min_leave_rank | text | YES | — |
| min_vac_rank | text | YES | — |
| channels | jsonb | NO | '{}'::jsonb |
| ping_roles | jsonb | NO | '{}'::jsonb |
| data | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| min_rank_leave | text | YES | — |
| min_rank_vacation | text | YES | — |
| max_vacation_days | integer | YES | — |
| weekday_start | text | YES | — |
| weekday_end | text | YES | — |
| weekend_end | text | YES | — |
| holiday_end | text | YES | — |
| lunch_start | text | YES | — |
| lunch_end | text | YES | — |
| poverka_time | text | YES | — |
| poverka_window_min | integer | YES | — |
| block_if_violations | boolean | YES | — |
| notify_verdict | boolean | YES | — |
| supply_score | jsonb | YES | — |

### site_data

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| key | text | NO | — |
| data | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |

### supply_entries

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| request_id | uuid | YES | — |
| static_id | text | YES | — |
| fio | text | YES | — |
| kind | text | YES | — |
| amount | numeric | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| rejected_at | timestamp with time zone | YES | — |
| rejected_by_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |

### supply_form

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| title | text | YES | — |
| intro | text | YES | — |
| fields | jsonb | NO | '[]'::jsonb |
| channel_id | text | YES | — |
| ping_role_id | text | YES | — |
| enabled | boolean | NO | true |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| channel_name | text | YES | — |
| ping_role_name | text | YES | — |
| status_emoji | jsonb | YES | — |

### supply_requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| code | text | YES | — |
| fio | text | YES | — |
| static_id | text | YES | — |
| discord | text | YES | — |
| values | jsonb | NO | '{}'::jsonb |
| photo_url | text | YES | — |
| status | text | NO | 'pending'::text |
| reviewed_by | uuid | YES | — |
| reviewed_by_name | text | YES | — |
| reviewed_at | timestamp with time zone | YES | — |
| reject_reason | text | YES | — |
| merged_into | uuid | YES | — |
| note | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| channel_id | text | YES | — |
| message_id | text | YES | — |
| sent_at | timestamp with time zone | YES | — |
| error_message | text | YES | — |
| emoji_status | text | YES | — |
| emoji_status_note | text | YES | — |
| dispute_resolution | text | YES | — |
| resolved_by | uuid | YES | — |
| resolved_by_name | text | YES | — |
| resolved_at | timestamp with time zone | YES | — |
| replaced_at | timestamp with time zone | YES | — |
| replaced_by | uuid | YES | — |
| replaced_by_name | text | YES | — |
| departed | integer | YES | — |
| arrived | integer | YES | — |
| webhook_requested | boolean | NO | false |

### supply_rescan_requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| from_date | date | YES | — |
| to_date | date | YES | — |
| requested_by | uuid | YES | — |
| requested_by_name | text | YES | — |
| status | text | NO | 'pending'::text |
| created_at | timestamp with time zone | NO | now() |
| processed_at | timestamp with time zone | YES | — |
| message | text | YES | — |
| scanned | integer | YES | — |
| finished_at | timestamp with time zone | YES | — |

### telegram_bot_status

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | smallint | NO | 1 |
| online | boolean | NO | false |
| bot_id | bigint | YES | — |
| bot_username | text | YES | — |
| bot_name | text | YES | — |
| version | text | YES | — |
| last_seen_at | timestamp with time zone | YES | — |
| last_error | text | YES | — |
| updated_at | timestamp with time zone | NO | now() |
| update_request_id | bigint | YES | — |
| update_offset | bigint | NO | 0 |

### telegram_notifications

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| event_key | text | NO | — |
| route_key | text | NO | — |
| event_kind | text | NO | — |
| source_table | text | YES | — |
| source_id | text | YES | — |
| payload | jsonb | NO | '{}'::jsonb |
| status | text | NO | 'pending'::text |
| attempts | integer | NO | 0 |
| next_attempt_at | timestamp with time zone | YES | — |
| telegram_message_id | bigint | YES | — |
| error_message | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| sent_at | timestamp with time zone | YES | — |
| net_request_id | bigint | YES | — |
| dispatched_at | timestamp with time zone | YES | — |

### telegram_settings

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | smallint | NO | 1 |
| enabled | boolean | NO | false |
| routes | jsonb | NO | '{}'::jsonb |
| activated_at | timestamp with time zone | YES | — |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| updated_by_name | text | YES | — |

### telegram_topics

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| chat_id | bigint | NO | — |
| thread_id | bigint | NO | 0 |
| chat_title | text | YES | — |
| topic_title | text | YES | — |
| chat_type | text | YES | — |
| is_forum | boolean | NO | false |
| registered_by_name | text | YES | — |
| last_seen_at | timestamp with time zone | NO | now() |

### test_attempts

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| test_id | uuid | YES | — |
| fio | text | YES | — |
| static_id | text | YES | — |
| discord | text | YES | — |
| answers | jsonb | NO | '{}'::jsonb |
| score | integer | YES | — |
| total | integer | YES | — |
| percent | numeric | YES | — |
| passed | boolean | YES | — |
| started_at | timestamp with time zone | YES | — |
| finished_at | timestamp with time zone | NO | now() |
| review_status | text | NO | 'pending'::text |
| reviewed_by | uuid | YES | — |
| reviewed_by_name | text | YES | — |
| reviewed_at | timestamp with time zone | YES | — |
| review_history | jsonb | NO | '[]'::jsonb |
| created_at | timestamp with time zone | NO | now() |
| channel_sent_id | text | YES | — |
| channel_message_id | text | YES | — |
| channel_sent_at | timestamp with time zone | YES | — |
| user_id | uuid | YES | — |
| invalidated | boolean | NO | false |

### test_blocks

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| test_id | uuid | YES | — |
| value | text | YES | — |
| reason | text | YES | — |
| blocked_by | uuid | YES | — |
| blocked_by_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| kind | text | YES | — |

### test_categories

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | YES | — |
| color | integer | YES | — |
| title | text | YES | — |
| sort | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |

### test_ping_lines

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| test_id | uuid | YES | — |
| text | text | YES | — |
| sort | integer | NO | 0 |

### test_questions

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| test_id | uuid | YES | — |
| prompt | text | YES | — |
| type | text | NO | 'single'::text |
| options | jsonb | NO | '[]'::jsonb |
| correct | jsonb | NO | '[]'::jsonb |
| points | integer | NO | 1 |
| image_url | text | YES | — |
| sort | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| kind | text | YES | — |
| text | text | YES | — |
| images | jsonb | NO | '[]'::jsonb |
| option_images | jsonb | NO | '[]'::jsonb |
| prefilled_value | text | YES | — |

### test_result_requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| attempt_id | uuid | YES | — |
| channel_id | text | YES | — |
| ping_discord | text | YES | — |
| is_repeat | boolean | NO | false |
| requested_by | uuid | YES | — |
| requested_by_name | text | YES | — |
| status | text | NO | 'pending'::text |
| created_at | timestamp with time zone | NO | now() |
| processed_at | timestamp with time zone | YES | — |
| message | text | YES | — |
| sent_message_id | text | YES | — |
| sent_at | timestamp with time zone | YES | — |

### tests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| slug | text | YES | — |
| title | text | YES | — |
| description | text | YES | — |
| intro | text | YES | — |
| icon | text | YES | — |
| category_id | uuid | YES | — |
| pass_score | integer | NO | 70 |
| max_attempts | integer | NO | 0 |
| time_limit_minutes | integer | YES | — |
| result_channel_id | text | YES | — |
| published | boolean | NO | false |
| show_answers_after | boolean | NO | false |
| shuffle_questions | boolean | NO | false |
| questions_per_run | integer | YES | — |
| sort | integer | NO | 0 |
| created_by | uuid | YES | — |
| created_by_name | text | YES | — |
| author_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### train_categories

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title | text | YES | — |
| parent | uuid | YES | — |
| sort | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| name | text | YES | — |
| color | text | YES | — |

### train_lessons

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title | text | YES | — |
| excerpt | text | YES | — |
| content | text | YES | — |
| category | uuid | YES | — |
| sort | integer | NO | 0 |
| author_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| test_url | text | YES | — |

### user_roles

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| user_id | uuid | NO | — |
| role | text | YES | — |
| display_name | text | YES | — |
| custom_role_id | uuid | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### users

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| email | text | NO | — |
| password_hash | text | YES | — |
| user_metadata | jsonb | NO | '{}'::jsonb |
| email_confirmed_at | timestamp with time zone | YES | — |
| password_reset_required | boolean | NO | true |
| disabled | boolean | NO | false |
| last_sign_in_at | timestamp with time zone | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### ustavy

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | bigint | NO | — |
| slug | text | YES | — |
| title | text | YES | — |
| theme | text | YES | — |
| code | text | YES | — |
| meta | text | YES | — |
| emblem | text | YES | — |
| content | jsonb | NO | '{}'::jsonb |
| sort_order | integer | NO | 0 |
| updated_at | timestamp with time zone | NO | now() |
| updated_by_name | text | YES | — |

### vehicles

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | bigint | NO | — |
| title | text | YES | — |
| tag | text | YES | — |
| image | text | YES | — |
| crew | text | YES | — |
| speed | text | YES | — |
| price | text | YES | — |
| rank | text | YES | — |
| purpose | text | YES | — |
| sort | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| updated_by_name | text | YES | — |

### violations_history

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| violation_id | uuid | YES | — |
| action | text | YES | — |
| status | text | YES | — |
| before_data | jsonb | YES | — |
| after_data | jsonb | YES | — |
| comment | text | YES | — |
| changed_by_uid | uuid | YES | — |
| changed_by_name | text | YES | — |
| created_at | timestamp with time zone | NO | now() |

### violations_registry

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| code | text | YES | — |
| target_fio | text | YES | — |
| target_static | text | YES | — |
| target_discord_id | text | YES | — |
| target_position | text | YES | — |
| kind | text | YES | — |
| reason | text | YES | — |
| evidence_url | text | YES | — |
| complaint_id | uuid | YES | — |
| status | text | NO | 'active'::text |
| notify_mode | text | YES | — |
| expires_at | timestamp with time zone | YES | — |
| confinement_minutes | integer | YES | — |
| issued_by_uid | uuid | YES | — |
| issued_by_name | text | YES | — |
| issued_by_discord_id | text | YES | — |
| requested_by_uid | uuid | YES | — |
| requested_by_name | text | YES | — |
| requested_by_static | text | YES | — |
| requested_by_discord_id | text | YES | — |
| reviewed_by_uid | uuid | YES | — |
| reviewed_by_name | text | YES | — |
| reviewed_at | timestamp with time zone | YES | — |
| reviewer_comment | text | YES | — |
| removed_at | timestamp with time zone | YES | — |
| removed_by_uid | uuid | YES | — |
| removed_by_name | text | YES | — |
| removed_reason | text | YES | — |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |
| ds_channel_id | text | YES | — |
| ds_message_id | text | YES | — |
| verdict_ds_message_id | text | YES | — |
| removed_ds_message_id | text | YES | — |
| requested_at | timestamp with time zone | YES | — |
| request_source | text | YES | — |
| request_extra | jsonb | YES | — |
| escalated_from | jsonb | YES | — |
| confinement_hours | numeric | YES | — |
| requested_by_position | text | YES | — |

### violations_settings

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| verdict_channel_id | text | YES | — |
| orders_channel_id | text | YES | — |
| ping_role_id | text | YES | — |
| confinement_default_minutes | integer | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| active_kinds | jsonb | NO | '[]'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| complaints_channel_id | text | YES | — |
| verdicts_channel_id | text | YES | — |
| report_channel_id | text | YES | — |
| confinement_channel_id | text | YES | — |
| removal_channel_id | text | YES | — |
| expire_warn_days | integer | YES | — |
| expire_reproach_days | integer | YES | — |
| expire_talk_days | integer | YES | — |
| expire_confinement_hours | integer | YES | — |
| expire_confinement_minutes | integer | YES | — |
| warn_to_reproach_threshold | integer | YES | — |

### vp_archive

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| title | text | YES | — |
| period_from | timestamp with time zone | YES | — |
| period_to | timestamp with time zone | YES | — |
| saved_by | uuid | YES | — |
| saved_by_name | text | YES | — |
| saved_at | timestamp with time zone | NO | now() |
| snapshot | jsonb | YES | — |
| stats | jsonb | NO | '{}'::jsonb |
| members_total | integer | YES | — |
| members_checked | integer | YES | — |
| members_partial | integer | YES | — |
| report_message_id | text | YES | — |
| report_sent_at | timestamp with time zone | YES | — |
| report_sent_by_name | text | YES | — |
| notes | text | YES | — |
| report_channel_id | text | YES | — |
| report_sent_by | uuid | YES | — |
| updated_at | timestamp with time zone | NO | now() |

### vp_checks

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| discord_id | text | NO | — |
| medbook | text | YES | — |
| narko | text | YES | — |
| driver | text | YES | — |
| passport | text | YES | — |
| personal_file | text | YES | — |
| weapon_license | text | YES | — |
| attestation | text | YES | — |
| evidence_url | text | YES | — |
| notes | text | YES | — |
| checked_by | uuid | YES | — |
| checked_by_name | text | YES | — |
| checked_at | timestamp with time zone | YES | — |
| updated_at | timestamp with time zone | NO | now() |

### vp_report_requests

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| archive_id | uuid | YES | — |
| channel_id | text | YES | — |
| requested_by | uuid | YES | — |
| requested_by_name | text | YES | — |
| status | text | NO | 'pending'::text |
| created_at | timestamp with time zone | NO | now() |
| processed_at | timestamp with time zone | YES | — |
| message | text | YES | — |
| sent_message_id | text | YES | — |
| sent_at | timestamp with time zone | YES | — |

### vp_reports

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| archive_id | uuid | YES | — |
| fio | text | YES | — |
| static_id | text | YES | — |
| discord_id | text | YES | — |
| dept | text | YES | — |
| status | text | YES | — |
| notes | text | YES | — |
| checked_at | timestamp with time zone | YES | — |
| checked_by_name | text | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| created_at | timestamp with time zone | NO | now() |

### vp_request_forms

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | text | NO | — |
| label | text | YES | — |
| icon | text | YES | — |
| color | integer | YES | — |
| fields | jsonb | NO | '[]'::jsonb |
| channel_id | text | YES | — |
| ping_role_id | text | YES | — |
| active | boolean | NO | true |
| sort_order | integer | NO | 0 |
| verdict_channel_id | text | YES | — |
| ping_role_id_2 | text | YES | — |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |
| updated_by_name | text | YES | — |

### vp_role_mapping

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| role_id | text | NO | — |
| dept | text | YES | — |
| rank | text | YES | — |
| updated_at | timestamp with time zone | NO | now() |
| show | text | YES | — |
| role_kind | text | YES | — |
| kind | text | YES | — |
| label | text | YES | — |
| sort | integer | YES | — |

### vp_settings

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | integer | NO | 1 |
| guild_id | text | YES | — |
| report_channel_id | text | YES | — |
| report_channel_name | text | YES | — |
| ping_role_id | text | YES | — |
| data | jsonb | NO | '{}'::jsonb |
| updated_at | timestamp with time zone | NO | now() |
| updated_by | uuid | YES | — |

### webhook_routes

| Колонка | Тип | NULL | По умолчанию |
|---|---|---|---|
| id | text | NO | — |
| label | text | NO | — |
| encrypted_url | text | YES | — |
| enabled | boolean | NO | false |
| updated_at | timestamp with time zone | NO | now() |

## Диагностика

```sql
SELECT route_id,status,count(*) FROM outbox GROUP BY route_id,status;
SELECT actor_id,action,entity_type,created_at FROM audit_log ORDER BY id DESC LIMIT 100;
SELECT test_id,user_id,count(*) FROM exam_runs WHERE NOT invalidated GROUP BY test_id,user_id;
SELECT id,departed,arrived,round(100.0*arrived/nullif(departed,0),1) delivered_percent FROM supply_requests;
```

Не публикуйте результаты запросов с персональными данными. Отчёт не включает реальные записи.


