alter table public.home_saves add column personalization jsonb not null default '{"floorColors":{},"decorations":{},"catName":"","room":"living"}';
alter table public.home_saves add constraint home_personalization_shape check (
 jsonb_typeof(personalization) = 'object'
 and jsonb_typeof(personalization->'floorColors') = 'object'
 and jsonb_typeof(personalization->'decorations') = 'object'
 and jsonb_typeof(personalization->'catName') = 'string'
 and length(personalization->>'catName') <= 24
 and personalization->>'room' in ('living','bedroom','kitchen','bathroom')
);
