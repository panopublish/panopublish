
drop policy if exists "tour-photos read" on storage.objects;
create policy "tour-photos read own" on storage.objects for select
  using (bucket_id = 'tour-photos' and auth.uid()::text = (storage.foldername(name))[1]);

revoke execute on function public.handle_new_user() from public, anon, authenticated;
