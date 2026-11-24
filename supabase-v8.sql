-- Nursing: مخزن الملفات خاص. التحميل بلينك مؤقت للطالب المسجّل فقط (شغّله بعد v7)
create policy "materials files read" on storage.objects for select to authenticated
  using (bucket_id = 'materials');
update storage.buckets set public = false where id = 'materials';
