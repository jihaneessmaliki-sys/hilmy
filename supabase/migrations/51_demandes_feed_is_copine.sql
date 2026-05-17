CREATE OR REPLACE VIEW demandes_feed AS
 SELECT d.id, d.user_id, d.title, d.content, d.category, d.canton, d.city,
    d.country, d.urgency, d.status, d.flag_count, d.response_count,
    d.created_at, d.updated_at, up.prenom, up.avatar_url, up.is_copine
   FROM demandes d
     LEFT JOIN user_profiles up ON up.user_id = d.user_id
  WHERE d.status = ANY (ARRAY['open'::text, 'resolved'::text]);
