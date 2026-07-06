-- ============================================================
-- Magsad — seed data, Part A: places + offers
-- Safe to run standalone via the SQL Editor (no auth dependency).
-- Uses fixed UUIDs so Part B (lists/reviews/role assignment,
-- run after seed accounts exist) can reference these places.
-- ============================================================

insert into public.places (
  id, name, name_en, type, category, district, address, image, images,
  price_level, rating, review_count, is_family_friendly, is_kids_friendly,
  is_work_friendly, has_outdoor_seating, has_parking, opening_hours, is_open,
  is_new, is_verified, description, tags, order_link, latitude, longitude
) values
  ('a1111111-1111-1111-1111-111111111111', 'ماتشا تايم', 'Matcha Time', 'كافيه', 'مشروبات', 'العليا',
   'طريق الملك فهد، العليا، الرياض',
   'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop&auto=format',
   ARRAY[
     'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=600&fit=crop&auto=format'
   ],
   2, 4.8, 234, true, false, true, true, true, '٨ص – ١١م', true, true, true,
   'كافيه متخصص في الماتشا الياباني والمشروبات الصحية. بيئة هادئة تناسب العمل والدراسة.',
   ARRAY['ماتشا','صحي','هادئ','للعمل'], null, 24.6877, 46.7219),

  ('a2222222-2222-2222-2222-222222222222', 'بلو ووتر', 'Blue Water', 'كافيه', 'قهوة مختصة', 'حي السفارات',
   'شارع الأمير سلطان، حي السفارات، الرياض',
   'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop&auto=format',
   ARRAY[
     'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop&auto=format'
   ],
   3, 4.9, 512, true, true, true, true, true, '٧ص – ١٢م', true, false, true,
   'من أفضل كافيهات القهوة المختصة في الرياض. يقدمون قهوة من أجود المصادر العالمية.',
   ARRAY['قهوة مختصة','فخم','للعائلة'], null, 24.6910, 46.6895),

  ('a3333333-3333-3333-3333-333333333333', 'مطعم نوره', 'Noura Restaurant', 'مطعم', 'سعودي', 'الملقا',
   'طريق أنس بن مالك، الملقا، الرياض',
   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format',
   ARRAY[
     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&auto=format'
   ],
   2, 4.7, 891, true, true, false, false, true, '١ظ – ١١م', true, false, true,
   'مطعم سعودي أصيل يقدم أشهى المأكولات المحلية بطريقة عصرية.',
   ARRAY['سعودي','عائلي','أطفال'], null, 24.7512, 46.6734),

  ('a4444444-4444-4444-4444-444444444444', 'ذا روستري', 'The Roastery', 'كافيه', 'قهوة مختصة', 'النخيل',
   'طريق الملك عبدالله، النخيل، الرياض',
   'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop&auto=format',
   ARRAY[
     'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=600&fit=crop&auto=format'
   ],
   2, 4.6, 367, false, false, true, false, false, '٩ص – ١٠م', true, true, true,
   'كافيه متخصص في تحميص القهوة. يقدمون تجربة فريدة لمحبي القهوة.',
   ARRAY['قهوة','للعمل','هادئ','جديد'], null, 24.7234, 46.6987),

  ('a5555555-5555-5555-5555-555555555555', 'جلسة', 'Jalsa', 'كافيه', 'كافيه', 'الربوة',
   'شارع الوادي، الربوة، الرياض',
   'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&h=600&fit=crop&auto=format',
   ARRAY['https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800&h=600&fit=crop&auto=format'],
   1, 4.5, 198, true, true, false, true, true, '٤م – ١٢م', false, false, false,
   'كافيه دافئ بأجواء عائلية رائعة. مثالي للجلسات الخارجية مساءً.',
   ARRAY['عائلي','خارجي','دافئ','أطفال'], null, 24.6712, 46.7345),

  ('a6666666-6666-6666-6666-666666666666', 'سحاب', 'Sahab', 'مطعم', 'فطور وغداء', 'الغدير',
   'طريق الدائري الشمالي، الغدير، الرياض',
   'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop&auto=format',
   ARRAY[
     'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1484723091739-30990106e50b?w=800&h=600&fit=crop&auto=format'
   ],
   2, 4.8, 445, true, true, false, true, true, '٦ص – ٤م', true, false, true,
   'أفضل مكان للفطور في الرياض. يقدم فطاير شام وبيض وكل أصناف الفطور.',
   ARRAY['فطور','عائلي','أطفال'], null, 24.7892, 46.7123),

  ('a7777777-7777-7777-7777-777777777777', 'هايد', 'Hyde', 'كافيه', 'كافيه عصري', 'العليا',
   'برج المملكة، العليا، الرياض',
   'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format',
   ARRAY['https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop&auto=format'],
   3, 4.7, 623, false, false, true, false, true, '٨ص – ١م', true, false, true,
   'كافيه فاخر في قلب العليا. تجربة راقية بإطلالة مميزة.',
   ARRAY['فاخر','للعمل','راقي'], 'https://app.com', 24.6891, 46.7034),

  ('a8888888-8888-8888-8888-888888888888', 'فيراندا', 'Veranda', 'مطعم', 'متنوع', 'الورود',
   'شارع العروبة، الورود، الرياض',
   'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop&auto=format',
   ARRAY[
     'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop&auto=format',
     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&auto=format'
   ],
   2, 4.6, 312, true, true, false, true, true, '١٢ظ – ١١م', true, true, false,
   'مطعم برازيلي عصري بأجواء جميلة وجلسات خارجية رائعة.',
   ARRAY['عائلي','خارجي','أطفال','جديد'], null, 24.6634, 46.6823)
on conflict (id) do nothing;

insert into public.offers (place_id, title, description, discount, end_date, is_active) values
  ('a2222222-2222-2222-2222-222222222222', '٢٠٪ على كل مشروبات الماتشا',
   'طوال الأسبوع الجاري على كل مشروبات الماتشا الباردة والساخنة', '٢٠٪', '2026-06-20', true),
  ('a6666666-6666-6666-6666-666666666666', 'فطور اثنين بسعر واحد',
   'كل خميس وجمعة - فطور اثنين بسعر واحد عند الطلب قبل ١٠ص', '٥٠٪', '2026-06-30', true),
  ('a7777777-7777-7777-7777-777777777777', 'قهوة مجانية مع كل كيكة',
   'اطلب أي كيكة واحصل على قهوتك مجاناً', null, '2026-07-15', true),
  ('a4444444-4444-4444-4444-444444444444', 'قهوة العصر مجاناً',
   'بين ٣ و٥ عصراً — اطلب أي مشروب واحصل على قهوتك مجاناً', null, '2026-06-25', true),
  ('a3333333-3333-3333-3333-333333333333', 'عشاء عائلي - وجبة رابعة مجاناً',
   'لمجموعات ٤ أشخاص وأكثر', '٢٥٪', '2026-06-30', true)
on conflict do nothing;

-- ============================================================
-- Part B (lists, reviews, business/admin role assignment) needs
-- real auth.users rows, which only exist once seed accounts sign
-- up through the app. See supabase/seed-part-b-template.sql,
-- generated after those accounts are created (Phase 1 verification).
-- ============================================================
