# Live Supabase schema snapshot (introspected 2026-07)

Source of truth for the REAL database. `supabase-schema.sql` is aspirational and
has diverged repeatedly (users.id text vs uuid, transactions.status missing, …).
When in doubt, trust this file / re-run the introspection query below.

State BEFORE `stripe-sales-schema.sql` (run that migration to add the sales columns).

## users
| column | type | notes |
|---|---|---|
| id | uuid | PK, default gen_random_uuid() |
| email | text | |
| created_at | timestamp | default now() |
| clerk_id | text | UNIQUE (users_clerk_id_key) |
| name | text | (NOT full_name) |

## businesses
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK → users(id) |
| name / description / website / support_email / logo_url / cover_url | text | |
| created_at | timestamp | default now() |

## products
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| business_id | uuid | FK → businesses(id) |
| name / description | text | |
| price | integer → numeric(10,2) after migration | currency units |
| type | text | default 'curso' |
| status | text | default 'draft' |
| access_type | text | default 'manual' |
| is_public | boolean | default false |
| currency | text | default 'USD' |
| billing_period | text | default 'one_time' |
| slug | text | partial unique idx (slug is not null) |
| cover_url / thumbnail_url | text | |

## members  (team table; subscription columns added by migration)
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users(id) |
| business_id | uuid | FK → businesses(id) |
| role | text | default 'member' |
| created_at | timestamp | default now() |
| product_id* | uuid | FK → products(id), added by stripe-sales-schema |
| status* | text | default 'active', added |
| stripe_subscription_id* | text | added |
| current_period_end* | timestamptz | added |

## transactions
| column | type | notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users(id) |
| business_id | uuid | FK → businesses(id) |
| product_id | uuid | FK → products(id) |
| amount | integer → numeric(10,2) after migration | currency units |
| currency | text | |
| created_at | timestamp | default now() |
| status* | text | default 'succeeded', added by stripe-sales-schema |
| stripe_payment_intent_id* | text | added, partial unique idx |
| stripe_session_id* | text | added, partial unique idx |
| member_id* | uuid | FK → members(id), added |

`*` = added by `stripe-sales-schema.sql`.

Not introspected yet (exist in live DB, used by webhook/checkout): `purchases`,
`product_members`, `user_profiles`, `direct_conversations`, `direct_messages`,
`analytics_widgets`, `analytics_share_preferences`.

## Re-run introspection

```sql
select c.table_name, 'column' as kind, c.column_name as name,
       c.data_type || case when c.is_nullable='NO' then ' NOT NULL' else '' end
         || coalesce(' DEFAULT '||c.column_default,'') as detail, c.ordinal_position as ord
from information_schema.columns c
where c.table_schema='public' and c.table_name in ('transactions','members','products','businesses','users')
union all
select conrelid::regclass::text, 'constraint', conname, pg_get_constraintdef(oid), 999
from pg_constraint
where connamespace='public'::regnamespace
  and conrelid::regclass::text in ('transactions','members','products','businesses','users')
union all
select tablename, 'index', indexname, indexdef, 1000
from pg_indexes
where schemaname='public' and tablename in ('transactions','members','products','businesses','users')
order by 1, 5, 3;
```
